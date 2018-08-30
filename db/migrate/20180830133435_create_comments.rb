class CreateComments < ActiveRecord::Migration[5.1]
  def change
    create_table :comments do |t|
      t.integer :repository_id, null: false
      t.string  :file,          null: false
      t.string  :revision,      null: false
      t.string  :range
      t.string  :comments
    end
  end
end
