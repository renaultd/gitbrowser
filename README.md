# Git Browser

## Installation

In order to fully install gitbrowser :

- `bundle update`

- `rake db:migrate`

- `rake assets:precompile`

   or if installing in a different root :

   `RAILS_RELATIVE_URL_ROOT=/browse bundle exec rake assets:precompile`

In *production* environment, one must also :

- Install a correct key in `config/secrets.yml`

Finally :

- `./script/rails server`

## About Jstree

The jstree installation requires the gem to be installed, but sometimes
it fails to correctly substitute the lines in the SCSS files. The procedure
to get the correct SCSS lines is indicated in the Jstree page :

	cd 'vendor/bundle/path/to/jstree-rails-4-version'
	ruby -r './lib/jstree-rails-4/source_file.rb' -e 'SourceFile.new.fetch'
	ruby -r './lib/jstree-rails-4/source_file.rb' -e 'SourceFile.new.convert'

The step about fetching the files may not be necessary. Normally, the SCSS
files should contain links to "throbber.gif" surrounded by "image-url".
