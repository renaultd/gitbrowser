//= require jquery2
//= require jquery_ujs
//= require ace-rails-ap
//= require jquery-ui
//= require_tree .

// Global Range object defined in Ace.js
const Range = require("ace/range").Range;

// Returns the first revision on the revision_selector
function get_first_revision() {
    return $("#revision_selector option:first").val();
}

// Hook called when selecting the revision `sha`, calling the server
// for a list of file and filling the page with it. If `sha` is not
// provided, it is searched into $('#revision_selector').val().
// Otherwise, this function is the callback for this selector.
function fetch_file_list(viewer, sha) {
    var real_sha;
    if (sha) {
        real_sha = sha;
        $('#revision_selector').val(sha);
    } else {
        real_sha = $('#revision_selector').val();
    }
    $.ajax({
        dataType: 'json',
        url: '/repositories/fetch_file_list' +
            '?id=' + $("#repository_id").val() +
            '&sha=' + real_sha })
        .done(function(data) {
            $("#revision").val(real_sha);
            load_files(data, viewer);
            const file = $("#filename").val();
            if (file) { load_file(file, real_sha, viewer, true); }
        });
}

// Remove a comment from a viewer -- does *not* remove the comment
// from the server.
function clear_comment(id, viewer) {
    const comment = comments[id];
    if (comment.marker_id) {
        unhighlight_range(id, viewer);
        if (comment.anchor)
            comment.anchor.detach();
        $("#overlay_" + id).remove();
        viewer.session.removeListener("changeScrollTop", comment.callb);
    }
    $("#comment_" + id).remove();
    delete comments[id];
}

function clear_comments(viewer) {
    Object.keys(comments).forEach((c) => clear_comment(c, viewer));
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

// Fetch a file's contents on the server with the possible comments,
// and display them in the viewer. `comments` indicate whether to load
// the comments as well (associated to the same viewer).
function load_file(filename, sha, viewer, comments) {
    $.ajax({
        dataType: 'text',
        url : '/repositories/fetch_file' +
            '?id=' + $("#repository_id").val() +
            '&sha=' + sha +
            "&file=" + filename })
        .done(function(data) {
            $("#filename").val(filename);
            $(viewer.container).siblings(".viewer_header").
                html(filename + " @ " + sha.substring(0,6));
            init_viewer(viewer, data);
            if (comments) {
                clear_comments(viewer);
                load_comments(filename, sha, viewer);
            }
        });
}

function load_file_and_revisions(filename, sha, viewer) {
    $("#filename").val(filename);
    fetch_file_list(viewer, sha); // also loads the file
}

function load_head_revision(viewer) {
    fetch_file_list(viewer, get_first_revision());
}

// Given a list of files retrieved with `fetch_file_list`, populate a
// tree of the files in the viewer.
function load_files(data, viewer) {
    $("#file_tree").empty();
    const revision = $("#revision_selector").val();
    const keys = Object.keys(data);

    function fill_level(level) {
        const els = keys.filter((el) => data[el].parent == level);
        els.forEach(function (el) {
            const txtel = data[el].name;
            const domel = (level == "") ? $("#file_tree") :
                  $("ul[data-file='" + level + "']");
            if(data[el].is_dir) {
                domel.append($('<li>').text(txtel))
                    .append($('<ul data-file="' + el + '">'));
                fill_level(el);
            } else {
                const tel = data[el].has_comm ? "<a data-file='" + el +
                      "' class='commented_file'>" +
                      txtel + "</a>" : "<a data-file='" + el + "'>" +
                      txtel + "</a>";
                domel.append($('<li>').html(tel));
            }
        });
    }

    fill_level("");
    $("#file_tree a").click((event) =>
                            load_file($(event.target).data("file"),
                                      $("#revision").val(),
                                      viewer, true));
}

// Displays the second viewer to have a diff between the two
// files. The existing viewer is passed as a parameter so it can be
// resized.
function open_diff_view(viewer, filename, id) {
    $("#revisions").css("visibility", "collapse");
    $("#overlays").css("visibility", "collapse");
    $("#comments").css("visibility", "collapse");
    $("#side_viewer").css("visibility", "visible");
    $("#side_comments").css("visibility", "visible");
    $("#old_side_comment_div").empty();
    $("#new_side_comment_div").empty();
    const side_viewer = ace.edit("side_viewer_div");
    const current_sha = $("#revision").val();
    load_file(filename, comments[id].sha, side_viewer, false);
    viewer.resize();
    Object.keys(comments).forEach((c) => {
        if (comments[c].id == id) {
            highlight_range(c, side_viewer);
            append_diff_comment(c, "old_side_comment_div",
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
    $("#revisions").css("visibility", "visible");
    $("#overlays").css("visibility", "visible");
    $("#comments").css("visibility", "visible");
    $("#side_viewer").css("visibility", "collapse");
    $("#side_comments").css("visibility", "collapse");
    ace.edit("side_viewer_div").destroy();
    viewer.resize();
    const current_sha = $("#revision").val();
    Object.keys(comments).forEach((c) => {
        if (comments[c].sha == current_sha) {
            highlight_range(c, viewer);
        }
    });
}

// Add a new highlighted section into the viewer.
// The range is saved inside the comment with a `marker_id`.
function highlight_range(id, viewer) {
    const marker = viewer.session.addMarker(comments[id].range,
                                            "viewer_sel_" + comments[id].ctype,
                                            "line");
    comments[id].marker_id = marker;
}

function unhighlight_range(id, viewer) {
    viewer.getSession().removeMarker(comments[id].marker_id);
}

// Append a comment line to the list of comments
function append_current_comment(id, div, viewer) {
    const comment = comments[id];
    var hdiv = "<textarea class='edit_comment' data-comment='" +
        id + "' onkeyup='watch_area(event, this)'>" +
        comment.desc + "</textarea>";
    hdiv += "<a class='goto_line' onclick='ace.edit(\"" +
        viewer.container.id + "\").gotoLine(" +
        (comment.range.start.row+1) + ", " +
        comment.range.start.column +
        ", false)'>Goto l. " + (comment.range.start.row+1) +
        "-" + (comment.range.end.row+1) + "</a>";
    hdiv += " / <a class='goto_line' onclick='resize_comment(" +
        id + ", ace.edit(\"" + viewer.container.id + "\"))'>Resize</a>";
    $("div#" + div).append($("<div id='comment_" +
                             comment.id + "' " +
                             "class='current_comment'>").html(hdiv));
}

function append_other_comment(id, div, viewer) {
    const comment = comments[id];
    const handler = "load_file_and_revisions(\"" +
          comment.file + "\",\"" + comment.sha + "\"," +
          "ace.edit(\"" + viewer.container.id + "\"));"
    const hdiv = "<div>" + comment.desc + "</div>" +
          " (<a class='goto_line' onClick='" + handler + "'>rev. " +
          comment.sha.substring(0,6) + "</a>" + " / " +
          "<a class='goto_line' onClick='open_diff_view(ace.edit(\"" +
          viewer.container.id + "\"),\"" +
          comment.file + "\", \"" + comment.id + "\")'>Bump</a>) ";
    $("#" + div).append($("<div id='comment_" +
                          comment.id + "' " +
                          "class='other_comment'>").html(hdiv));
}

function append_diff_comment(id, div, base_viewer, side_viewer) {
    const comment = comments[id];
    var hdiv = "<textarea class='edit_comment' data-comment='" +
        id + "'>" + comment.desc + "</textarea>";
    hdiv += "<a class='goto_line' onclick='ace.edit(\"" +
        side_viewer.container.id + "\").gotoLine(" +
        (comment.range.start.row+1) + ", " +
        comment.range.start.column +
        ", false)'>Goto l. " + (comment.range.start.row+1) +
        "-" + (comment.range.end.row+1) + "</a>";
    hdiv += " / <a class='goto_line' " +
        "onclick='append_diff_new_comment(" + id +
        ", ace.edit(\"" + base_viewer.container.id + "\"))'>Select</a>";
    $("div#" + div).append($("<div id='comment_" +
                             comment.id + "' " +
                             "class='current_comment'>").html(hdiv));
}

function append_diff_new_comment(id, viewer) {
    const range = viewer.getSelectionRange();
    if (!range.isEmpty()) {
        $.ajax({
            dataType: 'json',
            url: '/repositories/add_comment' +
                '?id=' + $("#repository_id").val() +
                '&sha=' + $("#revision").val() +
                "&file=" + $("#filename").val() +
                "&range=" + JSON.stringify(range) +
                "&description=" + comments[id].desc +
                "&type=" + comments[id].ctype})
            .done(function(comment) {
                add_to_comments(comment);
                highlight_range(comment.id, viewer);
                var hdiv = "<textarea class='edit_comment'" +
                    " data-comment='" + comment.id + "'" +
                    " onkeyup='watch_area(event, this)'>" +
                    comments[comment.id].desc + "</textarea>";
                $("div#new_side_comment_div").append(
                    $("<div id='comment_" + comment.id +
                      "' class='current_comment'>").html(hdiv));
            });
    }
}

function add_to_comments(comment) {
    const range = new Range(comment.range.start.row,
                            comment.range.start.column,
                            comment.range.end.row,
                            comment.range.end.column);
    comments[comment.id] = { id: comment.id,
                             sha: comment.sha,
                             file: comment.file,
                             range: range,
                             ctype: comment.ctype,
                             desc: comment.description };
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
    add_to_comments(comment);
    if (comment.sha == $("#revision").val()) { // Current revision
        append_current_comment(comment.id, "current_comments_div", viewer);
        highlight_range(comment.id, viewer);
        create_overlay(comment.id, viewer);
    } else { // Comment for an older revision
        append_other_comment(comment.id, "other_comments_div", viewer);
    }
    $("a[data-file='" + comment.file + "']").addClass("commented_file");
}

// Save a comment (as highlighted on a viewer) on the server, then
// display it in the viewer.
function save_new_comment(type, viewer) {
    return function () {
        const range = viewer.getSelectionRange();
        $.ajax({
            dataType: 'json',
            url: '/repositories/add_comment' +
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
                url: '/repositories/save_comment_range' +
                    '?id=' + $("#repository_id").val() +
                    '&comment_id=' + id +
                    '&range=' + JSON.stringify(range)})
                .done(function(data) {
                    const comment = comments[id];
                    unhighlight_range(id, viewer);
                    comments[id].range = range;
                    highlight_range(id, viewer);
                });
}

// Update a comment's description on the server and on the UI.
function save_comment_description(comment_id, text) {
    $.ajax({
        dataType: 'json',
        url: '/repositories/save_comment_description' +
            '?id=' + $("#repository_id").val() +
            '&comment_id=' + comment_id +
            '&description=' + text })
        .done(() => {
            const overlay  = $("#overlay_" + comment_id + " textarea");
            const textarea = $("#comment_" + comment_id + " textarea");
            comments[comment_id].desc = text;
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
        url: '/repositories/del_comment' +
            '?id=' + $("#repository_id").val() +
            '&comment_id=' + comment_id })
        .done(function () {
            clear_comment(comment_id, viewer);
            if ($("#current_comments a").length +
                  $("#other_comments a").length == 0)
                $("a[data-file='" + $("#filename").val() + "']").
                   removeClass("commented_file");
        });
}

// Load the comments for a given file from the server and display them
// on the viewer (typically with `create_new_comment`)
function load_comments(filename, sha, viewer) {
    $.ajax({
        dataType: 'json',
        url: '/repositories/fetch_comments' +
            '?id=' + $("#repository_id").val() +
            '&file=' + filename })
        .done(function(data) {
            $("#current_comments").empty();
            data.forEach((c) => create_new_comment(c, viewer));
        });
}

// Callback used to move a comment's "overlay" when the code is
// scrolled up or down.
function scroll_overlay(id, viewer){
    const anchor   = comments[id].anchor;
    const position = viewer.renderer.
          textToScreenCoordinates(anchor.getPosition());
    const offset   = position.pageX + viewer.container.offsetWidth -
          300; // pageX starts after the gutter, 300 is the width of the overlay
    const div = $("#overlay_" + id)[0];
    div.style.left = offset + 'px';
    if (position.pageY >= 900)
        div.style.display = "none";
    else {
        div.style.display = "";
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
    var session = viewer.getSession();
    var document = session.getDocument();
    var anchor = document.createAnchor(comment.range.start.row, 0);
    comment.anchor = anchor;

    $('<div id="overlay_' + id + '" class="viewer_overlay viewer_overlay_' +
      comment.ctype + '">' +
      '<div class="destroy_button">' +
      '<a onclick="destroy_comment(' + id + ", ace.edit('" +
      viewer.container.id + "'))\">&#10060;</a></div>" +
      '<textarea class="edit_comment" data-comment="' + id +
      '" onkeyup="watch_area(event, this)">' +
      comment.desc + '</textarea>' + '</div>').
        appendTo('#overlays');

    scroll_overlay(id, viewer);
    const callb = (scrollTop) => scroll_overlay(id, viewer)
    session.on("changeScrollTop", callb);
    comment.callb = callb;
}

// Toggle the visibility of the overlays.
function toggle_comments() {
    if ($("#overlays").css("display") == "block")
        $("#overlays").css("display", "none");
    else
        $("#overlays").css("display", "block");
}
