require 'json'
require 'liquid'
require 'fileutils'

CONFIG = {
  'site' => './src/site.json',
  'templateDir' => './src/templates',
  'outputDir' => './dist'
}

def process_template (template, page, root)
  @template = Liquid::Template.parse(template)
  parameters = {
    'root' => root
  }.merge(page)
  @template.render(parameters)
end

def attach_path (page, parent_path)
  page['path'] = "#{parent_path}#{page['slug']}/"
  page['children'].each do |childPage|
    attach_path(childPage, page['path'])
  end
end

def write_file (output, path)
  dir_name = CONFIG['outputDir'] + path
  unless File.directory?(dir_name)
    FileUtils.mkdir_p(dir_name)
  end
  File.write(dir_name + 'index.html', output)
end

def compile_page (page, root)
  template_path = CONFIG['templateDir'] + '/' + page['template'] + '.liquid';
  template_string = File.read(template_path)
  output = process_template(template_string, page, root)
  write_file(output, page['path'])

  page['children'].each do |childPage|
    compile_page(childPage, root)
  end
end

starting = Process.clock_gettime(Process::CLOCK_MONOTONIC)

siteRaw = File.read(CONFIG['site'])
root = JSON.parse(siteRaw)
withPath = attach_path(root, '')
compile_page(root, root)

ending = Process.clock_gettime(Process::CLOCK_MONOTONIC)
elapsed = (ending - starting) * 1000
puts "Finished in #{elapsed.round(1)} milliseconds"