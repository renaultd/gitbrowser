class RemoveUserIdFromRoles < ActiveRecord::Migration[5.1]
  def change
    drop_table :roles
    create_table :roles do |t|
      t.column :title, :string
    end
  end
end
