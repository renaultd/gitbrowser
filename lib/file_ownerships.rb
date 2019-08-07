class FileOwnerships

  def initialize()
    @owns = {}
  end

  def owns
    @owns
  end

  def add(file, is_dir, has_comm)
    sfile = file.split('/')
    if not(@owns.key?(file))
      @owns[file] = { parent: "", is_dir: is_dir,
                      name: sfile.last, has_comm: has_comm }
    end
    sfile.pop()
    if (sfile.length > 0)
      parent = sfile.join("/")
      @owns[file][:parent] = parent
      self.add(parent, "true", false)
    end
  end

end
