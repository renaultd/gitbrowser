class AddNameToRepositories < ActiveRecord::Migration[5.1]
  def change
    add_column :repositories, :name, :string
  end
end
