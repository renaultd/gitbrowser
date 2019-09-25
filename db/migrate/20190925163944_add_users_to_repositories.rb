class AddUsersToRepositories < ActiveRecord::Migration[5.1]
  def change
    create_table :user_repositories do |t|
        t.references :user
        t.references :repository
    end
  end
end
