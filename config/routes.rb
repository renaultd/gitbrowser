Rails.application.routes.draw do
  # Devise authentication
  devise_for :users, controllers: { sessions: 'sessions' }, skip: [:sessions]
  as :user do
    get 'users/sign_in' => 'sessions#new', :as => :new_user_session
    post 'users/sign_in' => 'sessions#create', :as => :user_session
    delete 'users/sign_out' => 'sessions#destroy', :as => :destroy_user_session
  end

  # Remember to put the ajax routes *before* the resources
  get '/repositories/add_comment' => "repositories#add_comment"
  get '/repositories/del_comment' => "repositories#del_comment"
  get '/repositories/bump_comment' => "repositories#bump_comment"
  get '/repositories/fetch_comments' => "repositories#fetch_comments"
  get '/repositories/fetch_file' => "repositories#fetch_file"
  get '/repositories/fetch_file_list' => "repositories#fetch_file_list"
  get '/repositories/save_comment_description' => "repositories#save_comment_description"
  get '/repositories/save_comment_range' => "repositories#save_comment_range"
  resources :repositories

  # Route for '/'
  root to: "repositories#index"
end
