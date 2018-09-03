class RenameCommentsDescription < ActiveRecord::Migration[5.1]
  def change
    rename_column :comments, :comments, :description
  end
end
