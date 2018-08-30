class AddFilterToRepositories < ActiveRecord::Migration[5.1]
  def change
    add_column :repositories, :filter, :string
  end
end
