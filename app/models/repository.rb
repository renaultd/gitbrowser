class Repository < ApplicationRecord
  validates :address, presence: true
  validates :filter, presence: true
  has_many :comments

  def git_dir
    return File.join(self.address, ".git")
  end

  def revisions
    git_cmd = "git --git-dir #{self.git_dir} log " +
              "--pretty='format:%H,%an,%ad' --date=short --max-count=100 HEAD"
    revs = `#{git_cmd}`.lines.collect { |l|
      arr = l.strip.split(",")
      { sha: arr[0], author: arr[1], date: arr[2] }
    }
    return revs
  end

  def files(sha)
    git_cmd = "git --git-dir #{self.git_dir} " +
              "ls-tree -r --name-only #{sha}"
    files = `#{git_cmd}`.lines.collect(&:strip)
    regexp = Regexp.new(self.filter.
                         gsub(".", "\\.").
                         gsub("*", ".*").
                         gsub(",", "|"))
    return files.select { |f| regexp.match(f) }
  end

  def file(file, sha)
    git_cmd = "git --git-dir #{self.git_dir} show #{sha}:#{file}"
    return `#{git_cmd}`
  end

end
