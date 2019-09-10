//= require jquery2
//= require jquery_ujs
//= require bootstrap-sprockets
//= require ace-rails-ap
//= require ace/theme-chrome
//= require jquery-ui/effects/effect-highlight
//= require jquery-ui/widgets/autocomplete
//= require jstree
//= require_tree .

// Global Range object defined in Ace.js
const Range = require("ace/range").Range;

// Comparison for revisions. The revisions are supposed to be stored
// chronologically inside the array `revisions`.
function revision_lt(sha1, sha2) {
    return revisions.indexOf(sha1) > revisions.indexOf(sha2);
}

// Function updating the list of files. It's called when selecting the
// revision `sha`, calling the server for a list of file and filling
// the page with it. If `sha` is not provided, it is searched into
// $('#revision_selector').val().  Otherwise, this function is the
// callback for this selector.
function fetch_file_list(viewer, sha) {
    let real_sha;
    if (sha) {
        real_sha = sha;
        $('#revision_selector').val(sha.substring(0,6));
    } else {
        real_sha = $('#revision_selector').val();
    }
    $.ajax({
        dataType: 'json',
        url: 'fetch_file_list' +
            '?id=' + $("#repository_id").val() +
            '&sha=' + real_sha })
        .done(function(data) {
            $("#revision").val(real_sha);
            $('#file_tree').jstree().settings.core.data = data;
            $('#file_tree').jstree(true).deselect_all();
            $("#file_tree").jstree(true).refresh();
            const file = $("#filename").val();
            if (file) { load_file(file, real_sha, viewer, true);
            } else { load_empty_file(viewer); }
        });
}

// Remove a comment from a viewer
//
// Concretely, removes the highlighting, the anchor (if any) and the
// overlay associated to a comment. It does *not* remove the comment
// from the server. The comments are removed from the `comments`
// local database if `delete_after`.
function clear_comment(id, viewer, delete_after) {
    const comment = comments[id];
    if (comment.marker_id) {
        unhighlight_range(id, viewer);
    }
    if (comment.anchor) {
        destroy_overlay(id, viewer);
    }
    $("#comment_" + id).remove();
    if (delete_after)
        delete comments[id];
}

function clear_comments(viewer, delete_after) {
    Object.keys(comments).forEach((c) => clear_comment(c, viewer, delete_after));
    $("#current_comments_div").empty();
    $("#other_comments_div").empty();
    $("#ancient_comments_div").empty();
    $(".comments_head").css("display", "none");
}

// Load an Ace viewer with `data` as its contents.
function init_viewer(viewer, data) {
    $(viewer.container).css("height", $(window).height() - 60);
    viewer.$blockScrolling = Infinity; // fix logs
    viewer.setOptions({
        highlightActiveLine: false,
        fontSize: "13pt",
        theme: 'ace/theme/chrome',
    });
    viewer.renderer.setAnimatedScroll(true);
    const json = JSON.parse(data);
    viewer.setValue(json["contents"]);
    viewer.session.setMode(json["mode"]);
    viewer.clearSelection();
    viewer.navigateFileStart();
}

// Initialize the instance of the (JStree) file tree
function init_file_tree(viewer) {
  $("#file_tree").jstree({
      "core" : {
          "multiple" : false,
          "animation" : 0
      },
      "data" : [],
      "types" : {
          "folder"         : { "icon" : "jstree-folder directory" },
          "normal-file"    : { "icon" : "jstree-file" },
          "commented-file" : { "icon" : "jstree-file commented_file",
                               "style": {"backgroundColor": "green"} },
      },"plugins" : [ "types" ]
  });
  $('#file_tree').on("refresh.jstree", function (e, data) {
      $('#file_tree').jstree(true).open_all();
  });
  $('#file_tree').on("select_node.jstree", function (e, data) {
      if (data.node.li_attr.class != "directory")
          load_file(data.node.id, $("#revision").val(), viewer, true);
  });
}

// Fetch a file's contents on the server with the possible comments,
// and display them in the viewer. `comments` indicate whether to load
// the comments as well (associated to the same viewer).
function load_file(filename, sha, viewer, comments) {
    $.ajax({
        dataType: 'text',
        url : 'fetch_file' +
            '?id=' + $("#repository_id").val() +
            '&sha=' + sha +
            "&file=" + filename })
        .done(function(data) {
            $("#filename").val(filename);
            $("#home").css("display", "none");
            $("#viewer").css("display", "inline");
            $(viewer.container).siblings(".viewer_header").
                html(filename + " @ " + sha.substring(0,6));
            init_viewer(viewer, data);
            if (comments) {
                clear_comments(viewer, true);
                load_comments(filename, sha, viewer);
                $("#overlays").css("display", "inline");
            }
        });
}

function load_file_and_revisions(filename, sha, viewer) {
    $("#filename").val(filename);
    fetch_file_list(viewer, sha); // also loads the file
}

function load_head_revision(viewer) {
    fetch_file_list(viewer, revisions[0]);
}

function load_empty_file(viewer) {
    $("#home").css("display", "inline");
    $("#viewer").css("display", "none");
    $("#overlays").css("display", "none");
    $("#all_comments_div").empty();
    clear_comments(viewer, true);
    $.ajax({
        dataType: 'json',
        url: 'fetch_comments' +
            '?id=' + $("#repository_id").val() })
        .done(function(data) {
            data.sort((c1,c2) =>
                      c1.visible ? (c2.visible ? (c1.id - c2.id) : -1) : 1).
                forEach((c) => {
                $("#all_comments_div").
                    append($('<div>').html(
                        render_comment(c, viewer, {
                            detailed: true, linkable: true,
                            class: c.visible ? "visible_comment" : "disabled_comment" }
                                      )));
            }
        )});
}

function goto_line(viewer, id) {
    const range_start = comments[id].range.start;
    viewer.gotoLine(range_start.row+1,
                    range_start.column);
}

// Generic function that generates a comment div
//
// Options are : {
//    editable:   bool
//    linkable:   bool
//    bumpable:   bool
//    selectable: string    Id of the viewer into which code is selected
//    detailed:   bool
//    class:      string
// }
function render_comment(id, viewer, options) {
    let comment;
    if (isNaN(id))
        comment = id;
    else
        comment = comments[id];
    let hdiv;
    if (options.editable)
        hdiv = "<textarea class='edit_comment' data-comment='" +
        comment.id + "' onkeyup='watch_area(event, this)'>" +
        comment.description + "</textarea>";
    else {
        hdiv = "<div class='show_comment' data-comment='" +
            comment.id + "'>"
        if (options.detailed)
            hdiv += comment.file + " : ";
        hdiv += comment.description + "</div>";
    }
    if (options.linkable) {
        hdiv += "<a class='goto_line' onclick='load_file_and_revisions(\"" +
            comment.file + "\", \"" + comment.sha + "\", ace.edit(\"" +
            viewer.container.id + "\"))'>rev." + comment.sha.substring(0,6) +
            ", l. " + (comment.range.start.row+1) + "-" + (comment.range.end.row+1) +
            "</a>";
    } else {
        hdiv += "<a class='goto_line' onclick='goto_line(ace.edit(\"" +
            viewer.container.id + "\"), " + comment.id +
            ")'>Goto l. " + (comment.range.start.row+1) +
            "-" + (comment.range.end.row+1) + "</a>";
    }
    if (options.editable) {
        hdiv += " / <a class='goto_line' onclick='resize_comment(" +
            id + ", ace.edit(\"" + viewer.container.id + "\"))'>Resize</a>";
    }
    if (options.bumpable) {
        hdiv += " / <a class='goto_line' onClick='bump_comment(ace.edit(\"" +
            viewer.container.id + "\"),\"" +
            comment.file + "\", " + comment.id + ")'>Bump</a>";
    } else {
        if (comment.visible && revision_lt(comment.sha, $('#revision').val()))
            hdiv += ", bumpable";
    }
    if (options.selectable) {
        hdiv += " / <a class='goto_line' " +
        "onclick='append_diff_new_comment(" + id +
        ", ace.edit(\"" + options.selectable + "\"))'>Select</a>";
    }
    let hclass = options.class ? options.class : "visible_comment";
    return $("<div id='comment_" + comment.id + "' " +
             "class='" + hclass + "'>").html(hdiv);
}

// Attempt to call the server to try to automatically bump the commit,
// and if impossible, open a special "diff" view to bump it by hand.
function bump_comment(viewer, filename, id) {
    $.ajax({
        dataType: 'json',
        url: 'bump_comment' +
            '?id=' + $("#repository_id").val() +
            '&comment_id=' + id +
            '&sha=' + $("#revision").val() })
        .done(function(data) {
            if (data.success) {
                create_new_comment(data.comment, viewer);
                comments[id].visible = false;
                clear_comment(id, viewer, false);
                create_new_comment(comments[id], viewer);
            } else {
                open_diff_view(viewer, filename, id);
            }
        });
}

// Displays the second viewer to have a diff between the two
// files. The existing viewer is passed as a parameter so it can be
// resized.
function open_diff_view(viewer, filename, id) {
    $("#revisions").css("display", "none");
    $("#overlays").css("display", "none");
    $("#comments").css("display", "none");
    $("#side_viewer").css("display", "inline");
    $("#side_comments").css("display", "inline");
    $("#old_side_comment_div").empty();
    $("#new_side_comment_div").empty();
    const side_viewer = ace.edit("side_viewer_div");
    const current_sha = $("#revision").val();
    load_file(filename, comments[id].sha, side_viewer, false);
    viewer.resize();
    Object.keys(comments).forEach((c) => {
        if (comments[c].id == id) {
            highlight_range(c, side_viewer);
            append_diff_old_comment(c, "old_side_comment_div",
                                viewer, side_viewer);
        }
        if (comments[c].sha == current_sha) {
            unhighlight_range(c, viewer);
        }
    });
}

// Close the diff view. The remaining viewer is passed as a parameter
// so it can be resized.
function close_diff_view(viewer) {
    $("#revisions").css("display", "inline");
    $("#overlays").css("display", "inline");
    $("#comments").css("display", "inline");
    $("#side_viewer").css("display", "none");
    $("#side_comments").css("display", "none");
    ace.edit("side_viewer_div").destroy();
    viewer.resize();
    const current_sha = $("#revision").val();
    clear_comments(viewer, false);
    Object.keys(comments).forEach((c) => {
        create_new_comment(comments[c], viewer);
    });
    reload_comment_heads();
}

// Add a new highlighted section into the viewer.
// The range is saved inside the comment with a `marker_id`.
function highlight_range(id, viewer) {
    const marker = viewer.session.addMarker(comments[id].range,
                                            "viewer_sel_" + comments[id].ctype,
                                            "line");
    comments[id].marker_id = marker;
}

// Removes a highlighted section in a viewer.
function unhighlight_range(id, viewer) {
    if (comments[id].marker_id) {
        viewer.getSession().removeMarker(comments[id].marker_id);
        delete comments[id]['marker_id'];
    }
}

// Append a comment for the current revision to the list of comments
function append_current_comment(id, div, viewer) {
    $("div#" + div).append(render_comment(id, viewer, { editable: true }));
}
// Append a comment for another revision to the list of comments
function append_other_comment(id, div, viewer) {
    let comment = comments[id];
    let options = { editable: false,
                    linkable: true };
    options.bumpable = comment.visible &&
        revision_lt(comment.sha, $("#revision").val());
    options.class    = comment.visible ? "other_comment" : "disabled_comment";
    $("div#" + div).append(render_comment(id, viewer, options));
}
// Append a comment that can be bumped to the list of comments
function append_diff_old_comment(id, div, base_viewer, side_viewer) {
    $("div#" + div).append(render_comment(id, side_viewer,
                                          { editable: false,
                                            selectable: base_viewer.container.id }));
}
// Append a comment that has been bumped to the list of comments, as
// well as saving it as a new comment on the server.
function append_diff_new_comment(id, viewer) {
    const range = viewer.getSelectionRange();
    if (!range.isEmpty()) {
        $.ajax({
            dataType: 'json',
            url: 'add_comment' +
                '?id=' + $("#repository_id").val() +
                '&parent_id=' + id +
                '&sha=' + $("#revision").val() +
                '&file=' + $("#filename").val() +
                '&range=' + JSON.stringify(range) +
                '&description=' + comments[id].description +
                '&type=' + comments[id].ctype})
            .done(function(comment) {
                comments[id].visible = false;
                register_comment(comment);
                highlight_range(comment.id, viewer);
                create_overlay(comment.id, viewer);
                $("div#new_side_comment_div").append(
                    render_comment(comment.id, base_viewer,
                                   { editable: true }));
                $("#comment_" + comment["id"] + " textarea").select();
            });
    }
}

// Save the comment in the `comments` database.
function register_comment(comment) {
    const range = new Range(comment.range.start.row,
                            comment.range.start.column,
                            comment.range.end.row,
                            comment.range.end.column);
    comments[comment.id] = { id: comment.id,
                             sha: comment.sha,
                             file: comment.file,
                             range: range,
                             ctype: comment.ctype,
                             visible: comment.visible,
                             description: comment.description };
}

// Create a new comment connected to a viewer. The comment is a hash
// object of the form :
// { id,
//   range: { start: { row, column },
//            end:   { row, column } },
//   ctype,
//   description,
//   sha,
//   file  }
//
// This comment can be another comment or a hash object. The function
// does *not* create the comment on the server, and does *not* check
// if the comment already exists (in this case it purely overwrites it).
function create_new_comment(comment, viewer) {
    register_comment(comment);
    if (comment.sha == $("#revision").val()) { // Current revision
        append_current_comment(comment.id, "current_comments_div", viewer);
        highlight_range(comment.id, viewer);
        create_overlay(comment.id, viewer);
    } else { // Comment for an older revision
        if (comment.visible)
            append_other_comment(comment.id, "other_comments_div", viewer);
        else
            append_other_comment(comment.id, "ancient_comments_div", viewer);
    }
    $("a[data-file='" + comment.file + "']").addClass("commented_file");
}

// Save a comment (as highlighted on a viewer) on the server, then
// display it in the viewer.
function save_new_comment(type, viewer) {
    return function () {
        const range = viewer.getSelectionRange();
        if (!range.isEmpty())
            $.ajax({
                dataType: 'json',
                url: 'add_comment' +
                    '?id=' + $("#repository_id").val() +
                    '&sha=' + $("#revision").val() +
                    "&file=" + $("#filename").val() +
                    "&range=" + JSON.stringify(range) +
                    "&type=" + type})
            .done(function(comment) {
                create_new_comment(comment, viewer);
                $("#overlay_" + comment["id"] + " textarea").select();
            });
    }
}

// Update the range of a comment on the server and on the UI.
function resize_comment(id, viewer) {
    const range = viewer.getSelectionRange();
    if (!range.isEmpty())
        $.ajax({
                dataType: 'json',
                url: 'save_comment_range' +
                    '?id=' + $("#repository_id").val() +
                    '&comment_id=' + id +
                    '&range=' + JSON.stringify(range)})
                .done(function(data) {
                    const comment = comments[id];
                    unhighlight_range(id, viewer);
                    destroy_overlay(id, viewer);
                    comments[id].range = range;
                    highlight_range(id, viewer);
                    create_overlay(id, viewer);
                });
}

// Update a comment's description on the server and on the UI.
function save_comment_description(comment_id, text) {
    $.ajax({
        dataType: 'json',
        url: 'save_comment_description' +
            '?id=' + $("#repository_id").val() +
            '&comment_id=' + comment_id +
            '&description=' + text })
        .done(() => {
            const overlay  = $("#overlay_" + comment_id + " textarea");
            const textarea = $("#comment_" + comment_id + " textarea");
            comments[comment_id].description = text;
            overlay.val(text);
            overlay.effect("highlight", {color:"#fff"});
            textarea.html(text);
            textarea.effect("highlight", {color:"#fff"});
        });
}

// Destroy a comment on the server and on the viewer.
function destroy_comment(comment_id, viewer) {
    $.ajax({
        dataType: 'json',
        url: 'del_comment' +
            '?id=' + $("#repository_id").val() +
            '&comment_id=' + comment_id })
        .done(function () {
            clear_comment(comment_id, viewer, true);
            if ($("#current_comments a").length +
                  $("#other_comments a").length == 0)
                $("a[data-file='" + $("#filename").val() + "']").
                   removeClass("commented_file");
        });
}

function reload_comment_heads() {
    ["current_comments", "other_comments", "ancient_comments"].
        forEach((c) => {
            if ($("#" + c + "_div").children().length > 0)
                $("#" + c + "_hd").css("display", "");
        });
}

// Load the comments for a given file from the server and display them
// on the viewer (typically with `create_new_comment`)
function load_comments(filename, sha, viewer) {
    $.ajax({
        dataType: 'json',
        url: 'fetch_comments' +
            '?id=' + $("#repository_id").val() +
            '&file=' + filename })
        .done(function(data) {
            data.forEach((c) => create_new_comment(c, viewer));
            reload_comment_heads();
        });
}

// Callback used to move a comment's "overlay" when the code is
// scrolled up or down.
function scroll_overlay(id, viewer){
    const anchor   = comments[id].anchor;
    if (!anchor) // Nothing to do
        return;
    const position = viewer.renderer.
          textToScreenCoordinates(anchor.getPosition());
    const offset   = position.pageX + viewer.container.offsetWidth -
          300; // pageX starts after the gutter, 300 is the width of the overlay
    const div = $("#overlay_" + id)[0];
    div.style.left = offset + 'px';
    if ((position.pageY >= $(viewer.container).height()) || (position.pageY <= 0))
        div.style.display = "none";
    else {
        div.style.display = "inline";
        div.style.top = position.pageY + 'px';
    }
}

// Callback used to watch the keypresses inside a comment's "overlay".
function watch_area(event, elem) {
    if (event.keyCode == 13) { // Enter keypress
        elem.value = elem.value.replace(/\r?\n|\r/g, "");
        save_comment_description(elem.dataset["comment"], elem.value);
    }
}

// Function that creates the overlay for a comment associated to the
// viewer, meaning the small text area that scrolls with the
// highlighted comment.
function create_overlay(id, viewer) {
    const comment = comments[id];
    const session = viewer.getSession();
    const document = session.getDocument();
    const anchor = document.createAnchor(comment.range.start.row, 0);
    comment.anchor = anchor;

    $('<div id="overlay_' + id + '" class="viewer_overlay viewer_overlay_' +
      comment.ctype + '">' +
      '<div class="viewer_overlay_button">' +
      '<button class="btn btn-xs btn-danger"' +
      'onclick="destroy_comment(' + id + ", ace.edit('" +
      viewer.container.id + "'))\">&times;</button></div>" +
      '<div class="viewer_overlay_text">' +
      '<textarea class="edit_comment" data-comment="' + id +
      '" onkeyup="watch_area(event, this)">' +
      comment.description + '</textarea></div></div>').
        appendTo('#overlays');

    scroll_overlay(id, viewer);
    const callb = (scrollTop) => scroll_overlay(id, viewer)
    session.on("changeScrollTop", callb);
    comment.callb = callb;
}

// Remove an overlay and its callback from the view
function destroy_overlay(id, viewer) {
    comments[id].anchor.detach();
    $("#overlay_" + id).remove();
    viewer.session.removeListener("changeScrollTop", comments[id].callb);
}

// Toggle the visibility of the overlays.
function toggle_comments() {
    if ($("#overlays").css("display") == "block")
        $("#overlays").css("display", "none");
    else
        $("#overlays").css("display", "block");
}
