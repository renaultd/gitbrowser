class Repository < ApplicationRecord
  validates :address, presence: true
  validates :filter, presence: true
  has_many :comments

  # Return the list of revisions of a repository.
  def revisions
    rugged = self.rugged
    walker = Rugged::Walker.new(rugged)
    walker.push(rugged.head.target)
    revs = walker.entries.collect { |el|
      { sha: el.oid, author: el.author[:name],
        date: el.time.strftime("%Y-%m-%d %H:%M") } }
    return revs
  end

  # Return the list of files in the repository at a given revision,
  # and matching the filters associated to the repository.
  def files(sha)
    files = self.rugged.lookup(sha).tree.walk(:postorder).to_a.
              collect { |el| el[0] + el[1][:name] }
    regexp = Regexp.new(self.filter.
                         gsub(".", "\\.").
                         gsub("*", ".*").
                         gsub(",", "|"))
    return files.select { |f| regexp.match(f) }
  end

  # Return the contents of a file at a given revision.
  def file(file, sha)
    rugged  = self.rugged
    blob_id = rugged.lookup(sha).tree.path(file)[:oid]
    return rugged.lookup(blob_id).content()
  end

  # Return the Rugged equivalent of the repository. Moreover these
  # objects are cached and therefore not recreated each time. The
  # Rugged repository then accesses its information via libgit2.
  def rugged
    if @@repositories.key?(self.id)
      @@repositories[self.id]
    else
      r = Rugged::Repository.new(self.address)
      @@repositories[self.id] = r
      r
    end
  end

  private
  # Cache the repositories objects for rugged
  @@repositories = {}

end
