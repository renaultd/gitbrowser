require 'file_ownerships'

class RepositoriesController < ApplicationController

  skip_before_action :verify_authenticity_token
  before_action :load_repository, except: [:create, :index, :new]

  def new
    @repository = Repository.new
  end

  def create
    @repository = Repository.new(params.require(:repository).permit(:address, :filter))
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
    git_cmd = `git --git-dir #{@repository.address} log --pretty="format:%H,%an,%ad" --date=short --max-count=10 HEAD`
    @revisions = [ { revision: "HEAD", author: "", date: "" } ] +
                 git_cmd.lines.collect { |l|
      arr = l.strip.split(",")
      { revision: arr[0], author: arr[1], date: arr[2] }
    }
    @selected_revision = params[:revision]
    @selected_file     = params[:file]
  end

  def fetch_file_list
    @revision = params[:revision]
    git_cmd = `git --git-dir #{@repository.address} ls-tree -r --name-only #{@revision}`
    files = git_cmd.lines.collect(&:strip)
    if @repository.filter
      regexp = Regexp.new(@repository.filter)
      files = files.select { |f| !(regexp.match(f).nil?) }
    end
    @comments = Comment.where(repository_id: @repository.id)
                  .collect(&:file).uniq
    @owns = FileOwnerships.new()
    files.each{ |f| @owns.add(f, false, @comments.include?(f)) }
    respond_to do |format|
      format.js { render :json => @owns.owns }
    end
  end

  def fetch_file
    @revision = params[:revision]
    @file     = params[:file]
    git_cmd = `git --git-dir #{@repository.address} show #{@revision}:#{@file}`
    render plain: git_cmd
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
                              file: @file,
                              revision: @revision)
    respond_to do |format|
      format.js { render :json => @comments }
    end
  end

  def load_repository
    @repository = Repository.find(params[:id])
  end

end
