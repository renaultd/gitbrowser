class Comment < ApplicationRecord
  serialize :range, Hash
  enum ctype: [ :warning, :error ]
end
