class Repository < ApplicationRecord
  validates :address, presence: true
  validates :filter, presence: true

  def git_dir
    return File.join(self.address, ".git")
  end

  def revisions
    git_cmd = `git --git-dir #{self.git_dir} rev-list --max-count=10 HEAD`
    return git_cmd.lines.collect(&:strip)
  end

  def files(revision)
    git_cmd = "git --git-dir #{self.git_dir} " +
              "ls-tree -r --name-only #{revision}"
    files = `#{git_cmd}`.lines.collect(&:strip)
    regexp = Regexp.new(self.filter.
                         gsub(".", "\\.").
                         gsub("*", ".*"))
    return files.select { |f| regexp.match(f) }
  end

  def file(file, revision)
    git_cmd = "git --git-dir #{self.git_dir} show #{revision}:#{file}"
    return `#{git_cmd}`
  end

end
