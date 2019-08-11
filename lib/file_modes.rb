module FileModes

  MODES = {
    "c"   => "ace/mode/c_cpp",
    "py"  => "ace/mode/python",
    "rb"  => "ace/mode/ruby",
    "rkt" => "ace/mode/scheme",
  }

  DEFAULT_MODE = "ace/mode/text"

  def mode_for(file)
    ext = file.split(".").last
    return MODES[ext] || DEFAULT_MODE
  end

  module_function :mode_for

end
