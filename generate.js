const util = require('util')
const fs = require('fs');
const handlebars = require('handlebars');
const { performance } = require('perf_hooks');

// Config options
const CONFIG = {
  site: './src/site.json',
  templateDir: './src/templates',
  outputDir: './dist',
};

// Promisify
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

// Compiles a handlebar template that has already been read in
function processTemplate(source, page, root) {
  const template = handlebars.compile(source);
  const context = {
    ...page,
    root,
  }
  const output = template(context);
  return output;
}

function safeMkDir(path) {
  return new Promise((resolve) => {
    fs.access(path, fs.constants.F_OK, (err) => {
      if (err) {
        fs.mkdir(
          path,
          { recursive: true },
          (err) => {
            if (err) throw err;
            resolve();
          },
        );
      } else {
        resolve();
      }
    });
  });
}

// Use handlebars to generate templates
function compilePage(page, root) {
  const templatePath = CONFIG.templateDir + '/' + page.template + '.handlebars';
  let output;
  let subCompileJobs;
  return readFile(templatePath, 'utf8')
    .then((source) => {
      // Turn the handlebars template into HTML
      output = processTemplate(source, page, root);

      // If this page has children, compile them too
      subCompileJobs = page.children.map(child => compilePage(child, root))

      return safeMkDir(CONFIG.outputDir + page.path);
    }).then(() => writeFile(
      `${CONFIG.outputDir}${page.path}index.html`,
      output,
      'utf8'
    )).then(() => {
      console.log(`${page.path}index.html`);
      return Promise.all(subCompileJobs)
    });
}

function attachPath(page, parentPath) {
  page.path = `${parentPath}${page.slug}/`

  page.children.forEach((childPage) => {
    attachPath(childPage, page.path);
  });
}

// Entry point - Read site json and compile root
const startTime = performance.now();

readFile(CONFIG.site, 'utf8')
  .then((siteJson) => {
    const root = JSON.parse(siteJson);
    attachPath(root, '');
    return compilePage(root, root);
  })
  .then(() => {
    const elapsed = Math.round(performance.now() - startTime);
    console.log(`Finished in ${elapsed}ms`);
  });