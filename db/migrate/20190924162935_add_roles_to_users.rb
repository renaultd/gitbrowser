class AddRolesToUsers < ActiveRecord::Migration[5.1]
  def change
    create_table :roles do |t|
      t.column :title, :string
      t.references :user
    end
    create_table :user_roles do |t|
        t.references :user
        t.references :role
        t.timestamps
    end
  end
end
