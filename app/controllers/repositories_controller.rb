require "file_ownerships"
require "file_modes"

class RepositoriesController < ApplicationController

  skip_before_action :verify_authenticity_token
  before_action :load_repository, except: [:create, :index, :new]

  def new
    @repository = Repository.new
  end

  def create
    @repository = Repository.new(repository_params)
    if @repository.save
      redirect_to :action => "index"
    else
      render :new
    end
  end

  def index
    @repositories = Repository.all
  end

  def show
    @selected_file = params[:file]
    @revisions = @repository.revisions
    if params[:revision] and params[:revision] != "null"
      possibles = @revisions.select { |r|
        r[:revision].start_with?(params[:revision]) }
      @selected_revision = possibles.empty? ? { revision: "HEAD" } :
                             possibles.first
    else
      @selected_revision = @revisions.empty? ? { revision: "HEAD" } :
                             @revisions.first
    end
  end

  def edit

  end

  def update
    if @repository.update_attributes(repository_params)
      flash[:success] = "Repository updated"
      redirect_to @repository, format: :html
    else
      render 'edit'
    end
  end

  def fetch_file_list
    @revision = params[:revision]
    files = @repository.files(@revision)
    @comments = Comment.where(repository_id: @repository.id).
                collect(&:file).uniq
    @owns = FileOwnerships.new()
    files.each{ |f| @owns.add(f, false, @comments.include?(f)) }
    respond_to do |format|
      format.js { render :json => @owns.owns }
    end
  end

  def fetch_file
    @revision = params[:revision]
    @file     = params[:file]
    render json: { mode: FileModes.mode_for(@file),
                   contents: @repository.file(@file, @revision) }
  end

  def add_comment
    @range    = JSON.parse(params[:range])
    @revision = params[:revision]
    @file     = params[:file]
    @type     = params[:type]
    c = Comment.new(repository_id: @repository.id,
                    file: @file,
                    revision: @revision,
                    range: @range,
                    ctype: @type)
    c.save
    render :json => c.to_json
  end

  def del_comment
    @comment = Comment.find(params[:comment_id])
    @comment.destroy
  end

  def save_comment_description
    @comment = Comment.find(params[:comment_id])
    @comment.description = params[:description]
    @comment.save
  end

  def fetch_comments
    @revision = params[:revision]
    @file     = params[:file]
    @comments = Comment.where(repository_id: @repository.id,
                              file: @file)
    respond_to do |format|
      format.js { render :json => @comments }
    end
  end

  def load_repository
    @repository = Repository.find(params[:id])
  end

  private

  def repository_params
    params.require(:repository).
      permit(:address, :filter)
  end

end
