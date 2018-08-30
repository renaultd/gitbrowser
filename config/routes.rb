Rails.application.routes.draw do
  # Remember to put the ajax routes *before* the resources
  get '/repositories/add_comment' => "repositories#add_comment"
  get '/repositories/fetch_comments' => "repositories#fetch_comments"
  get '/repositories/fetch_file' => "repositories#fetch_file"
  get '/repositories/fetch_file_list' => "repositories#fetch_file_list"
  get '/repositories/del_comment' => "repositories#del_comment"
  resources :repositories
end
