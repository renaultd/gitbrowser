authorization do
  role :manager do
    has_permission_on :repositories, :to => [ :show, :new, :create ]
  end

  role :teacher do
    has_permission_on :repositories, :to => [ :show ]
  end
end
