//= require jquery2
//= require jquery_ujs
//= require ace-rails-ap
//= require jquery-ui
//= require_tree .

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
            if (file) { load_file(file, real_sha, viewer); }
        });
}

// Remove a comment from a viewer -- does *not* remove the comment
// from the server.
function clear_comment(id, viewer) {
    const comment = comments[id];
    if (comment.marker_id) {
        viewer.getSession().removeMarker(comment.marker_id);
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
    let json = JSON.parse(data);
    viewer.setValue(json["contents"]);
    viewer.session.setMode(json["mode"]);
    viewer.clearSelection();
    viewer.navigateFileStart();
    clear_comments(viewer);
}

// Fetch a file's contents on the server with the possible comments,
// and display them in the viewer.
function load_file(filename, sha, viewer) {
    $.ajax({
        dataType: 'text',
        url : '/repositories/fetch_file' +
            '?id=' + $("#repository_id").val() +
            '&sha=' + sha +
            "&file=" + filename })
        .done(function(data) {
            $("#filename").val(filename);
            init_viewer(viewer, data);
            load_comments(filename, sha, viewer);
        });
}

function load_file_and_revisions(filename, sha, viewer) {
    $("#filename").val(filename);
    fetch_file_list(viewer, sha); // also loads the file
}

function load_head_revision(viewer) {
    fetch_file_list(viewer, $("#revision_selector option:first").val());
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
                                      $("#revision").val(), viewer));
}

// Create a new comment connected to a viewer -- does *not* create the
// comment on the server.
function create_new_comment(comment, viewer) {
    if (comment.sha == $("#revision").val()) { // Current revision
        const div = "<div>" + comment.description +
              "</div> <a class='goto_line' onclick='viewer.gotoLine(" +
              (comment.range.start.row+1) + ", " +
              comment.range.start.column +
              ", false)'>(l. " + (comment.range.start.row+1) +
              "-" + (comment.range.end.row+1) + ")</a>";
        $("#current_comments").append($("<div id='comment_" +
                                        comment.id + "'>").html(div));
        const Range = require("ace/range").Range;
        const range = new Range(comment.range.start.row,
                                comment.range.start.column,
                                comment.range.end.row,
                                comment.range.end.column);
        const marker = viewer.session.addMarker(range,
                                                "viewer_sel_" + comment.ctype,
                                                "line");
        comments[comment.id] = { marker_id: marker,
                                 range: range,
                                 ctype: comment.ctype,
                                 desc: comment.description };
        create_overlay(comment.id, viewer);
    } else { // Comment for an older revision
        const handler = "load_file_and_revisions(\"" +
              comment.file + "\",\"" + comment.sha + "\"," +
              "ace.edit(\"" + viewer.container.id + "\"));"
        const div = "<div>" + comment.description + "</div>" +
              " (<a class='goto_line' onClick='" + handler + "'>rev. " +
              comment.sha.substring(0,6) + "</a>" + " / " +
              "<a href='#' onClick='alert(\"Bump\");'>Bump</a>" +
              ") ";
        $("#other_comments").append($("<div id='comment_" +
                                      comment.id + "'>").html(div));
        comments[comment.id] = { desc: comment.description };
    }
    $("a[data-file='" + comment.file + "']").addClass("commented_file");
}

// Save a comment on the server, then display it in the viewer.
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
            .done(function(data) {
                create_new_comment(data, viewer);
                $("#overlay_" + data["id"] + " textarea").select();
            });
    }
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
            const overlay = $("#overlay_" + comment_id + " textarea");
            comments[comment_id].desc = text;
            overlay.val(text);
            overlay.effect("highlight", {color:"#fff"});
            $("#comment_" + comment_id + " div").html(text);
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
    console.log(position.pageX + " / " + viewer.container.offsetWidth);
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
      '<textarea data-comment="' + id +
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
