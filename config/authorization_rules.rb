authorization do
  role :manager do
    has_permission_on :repositories, :to => [ :show, :new, :create ]
  end

  role :teacher do
    has_permission_on :repositories, :to => [ :show ]
  end

  role :student do
    has_permission_on :repositories do
      to [ :show ]
      if_attribute :users => contains { user }
    end

  end

end
