class Comment < ApplicationRecord
  serialize :range, Hash
  enum ctype: [ :warning, :error ]
  belongs_to :parent, class_name: "Comment",
             foreign_key: :parent_id, optional: true
end
