module FileModes

  MODES = {
    "c"        => "ace/mode/c_cpp",
    "cpp"      => "ace/mode/c_cpp",
    "h"        => "ace/mode/c_cpp",
    "hpp"      => "ace/mode/c_cpp",
    "html"     => "ace/mode/html",
    "js"       => "ace/mode/javascript",
    "Makefile" => "ace/mode/makefile",
    "py"       => "ace/mode/python",
    "rb"       => "ace/mode/ruby",
    "rkt"      => "ace/mode/scheme",
  }

  DEFAULT_MODE = "ace/mode/text"

  def mode_for(file)
    ext = file.split(".").last
    return MODES[ext] || DEFAULT_MODE
  end

  module_function :mode_for

end
