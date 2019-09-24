require "file_ownerships"
require "file_modes"

class RepositoriesController < ApplicationController

  skip_before_action :verify_authenticity_token
  before_action :load_repository, except: [:create, :index, :new]
  filter_access_to [ :show ], :attribute_check => true

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
    if params[:sha] and params[:sha] != "null"
      possibles = @revisions.select { |r|
        r[:sha].start_with?(params[:sha]) }
      @selected_revision = possibles.empty? ? { sha: "HEAD" } :
                             possibles.first
    else
      @selected_revision = @revisions.empty? ? { sha: "HEAD" } :
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
    sha   = params[:sha]
    files = @repository.files(sha)
    @comments = Comment.where(repository_id: @repository.id).
                collect(&:file).uniq
    @owns = FileOwnerships.new()
    files.each{ |f| @owns.add(f, false, @comments.include?(f)) }
    respond_to do |format|
      format.js { render :json => @owns.owns }
    end
  end

  def fetch_file
    sha  = params[:sha]
    file = params[:file]
    render json: { mode: FileModes.mode_for(file),
                   contents: @repository.file(file, sha) }
  end

  def add_comment
    range = JSON.parse(params[:range])
    sha   = params[:sha]
    raise "SHA ERROR" if sha.length < 8
    file  = params[:file]
    type  = params[:type]
    c = Comment.new(repository_id: @repository.id,
                    file:  file,
                    sha:   sha,
                    range: range,
                    ctype: type)
    if (params[:description])
      c[:description] = params[:description]
    else
      c[:description] = "(empty)"
    end
    if (params[:parent_id] && Comment.exists?(params[:parent_id]))
      c[:parent_id] = params[:parent_id]
    end
    c.save
    if c.parent
      c.parent.update_attributes(visible: false)
    end
    render :json => c.to_json
  end

  def del_comment
    @comment = Comment.find(params[:comment_id])
    @comment.destroy
  end

  def bump_comment
    @comment = Comment.find(params[:comment_id])
    @sha     = params[:sha]
    # Very stupid analysis to check if the blobs are the same
    rugged   = @repository.rugged
    file     = @comment.file
    ref_c    = rugged.lookup(@comment.sha).tree.path(file)[:oid]
    ref_h    = rugged.lookup(@sha).tree.path(file)[:oid]
    if (ref_c != ref_h)
      render :json => { success: false }
    else
      @new_comment = @comment.bump(@sha)
      if (@new_comment.save)
        @comment.update_attributes(visible: false)
        render :json => { success: true, comment: @new_comment }
      else
        render :json => { success: false }
      end
    end
  end

  def save_comment_description
    @comment = Comment.find(params[:comment_id])
    @comment.description = params[:description]
    @comment.save
  end

  def save_comment_range
    @comment = Comment.find(params[:comment_id])
    @comment.range = JSON.parse(params[:range])
    @comment.save
  end

  def fetch_comments
    if params[:file]
      @comments = Comment.where(repository_id: @repository.id,
                                file: params[:file])
    else
      @comments = Comment.where(repository_id: @repository.id)
    end
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
      permit(:address, :name, :filter)
  end

end
