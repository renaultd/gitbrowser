# Git Browser

## Installation

- `bundle update`

- `rake db:migrate`

- `rake assets:precompile`

   or if installing in a different root :

   `RAILS_RELATIVE_URL_ROOT=/browse bundle exec rake assets:precompile`

In *production* environment, one must also :

- Install a correct key in `config/secrets.yml`

Finally :

- `./script/rails server`

