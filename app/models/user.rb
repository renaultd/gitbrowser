class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :validatable

  has_many :user_roles,:dependent => :destroy
  has_many :roles, :through => :user_roles
  has_and_belongs_to_many :repositories, join_table: "user_repositories"

  # Returns the list of roles symbols associated to the user
  def role_symbols
    (roles || []).map {|r| r.title.to_sym}
  end
end
