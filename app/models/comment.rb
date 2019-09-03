class Comment < ApplicationRecord
  serialize :range, Hash
  enum ctype: [ :warning, :error ]
  belongs_to :parent, class_name: "Comment",
             foreign_key: :parent_id, optional: true

  def bump(sha)
    bumped_comment = self.dup
    bumped_comment.parent_id = self.id
    bumped_comment.sha = sha
    return bumped_comment
  end
end
