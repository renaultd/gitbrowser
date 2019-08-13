class RenameCommentsRevisionToSha < ActiveRecord::Migration[5.1]
  def change
    rename_column :comments, :revision, :sha
  end
end
