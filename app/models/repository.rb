class Repository < ApplicationRecord
  validates :address, presence: true
  validates :filter, presence: true

  def git_dir
    return File.join(self.address, ".git")
  end

  def revisions
    git_cmd = "git --git-dir #{self.git_dir} log " +
              "--pretty='format:%H,%an,%ad' --date=short --max-count=10 HEAD"
    revs = `#{git_cmd}`.lines.collect { |l|
      arr = l.strip.split(",")
      { revision: arr[0], author: arr[1], date: arr[2] }
    }
    return revs
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
