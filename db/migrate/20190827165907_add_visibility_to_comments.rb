class AddVisibilityToComments < ActiveRecord::Migration[5.1]
  def change
    add_column :comments, :visible, :boolean, default: true
  end
end
