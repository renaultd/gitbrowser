class FileOwnerships

  def initialize()
    @owns = {}
  end

  def owns
    @owns.collect { |k,v|
      { id: k,
        parent: v[:parent],
        text: v[:name],
        type: v[:is_dir] ? "folder" :
          (v[:has_comm] ? "commented-file" : "normal-file"),
        li_attr: v[:is_dir] ? { class: "directory" } :
          (v[:has_comm] ? { class: "commented_file" } :
             { class: "normal_file" })
      }
    }
  end

  def add(file, is_dir, has_comm)
    sfile = file.split('/')
    if not(@owns.key?(file))
      @owns[file] = { parent: "#", is_dir: is_dir,
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
