class RepositoriesController < ApplicationController

  skip_before_action :verify_authenticity_token
  before_action :load_repository, except: [:index]

  class FileOwnerships

    def initialize()
      @owns = {}
    end

    def owns
      @owns
    end

    def add(file, is_dir)
      sfile = file.split('/')
      if not(@owns.key?(file))
        @owns[file] = { parent: "", is_dir: is_dir, name: sfile.last }
      end
      sfile.pop()
      if (sfile.length > 0)
        parent = sfile.join("/")
        @owns[file][:parent] = parent
        self.add(parent, "true")
      end
    end

  end

  def index
    @repositories = Repository.all
  end

  def show
    git_cmd = `git --git-dir #{@repository.address} rev-list --max-count=10 HEAD`
    @revisions = [ "HEAD" ] + git_cmd.lines.collect(&:strip)
    @selected_revision = params[:revision]
  end

  def fetch_file_list
    @revision = params[:revision]
    git_cmd = `git --git-dir #{@repository.address} ls-tree -r --name-only #{@revision}`
    files = git_cmd.lines.collect(&:strip).select { |f| f.end_with?(".py") }
    @owns = FileOwnerships.new()
    files.each{ |f| @owns.add(f, false) }
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
    c = Comment.new(repository_id: @repository.id,
                    file: @file,
                    revision: @revision,
                    range: @range)
    c.save
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
