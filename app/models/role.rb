class Role < ApplicationRecord
    has_many :user_roles, :dependent => :destroy
    has_many :users, :through => :user_roles

    def self.manager
      @@manager ||= Role.find_by title: 'manager'
      return @@manager
    end

    def self.teacher
      @@teacher ||= Role.find_by title: 'teacher'
      return @@teacher
    end

    def self.student
      @@student ||= Role.find_by title: 'student'
      return @@student
    end

    # Method to create all the base roles in the application
    def self.create_base_roles
      [ 'manager', 'teacher', 'student' ].each { |r|
        unless Role.find_by title: r
          Role.new(title: r).save
        end
      }
    end
end
