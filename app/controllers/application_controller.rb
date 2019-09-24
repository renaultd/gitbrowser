class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception
  before_action :authenticate_user!

  def index

  end

  def permission_denied
    respond_to do |format|
        format.html { render file: "public/403.html",
                             layout: false, status: :forbidden }
    end
  end

end
