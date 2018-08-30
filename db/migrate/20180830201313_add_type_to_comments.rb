class AddTypeToComments < ActiveRecord::Migration[5.1]
  def change
    add_column :comments, :ctype, :integer
  end
end
