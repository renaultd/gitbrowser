//= require jquery2
//= require jquery_ujs
//= require ace-rails-ap
//= require jquery-ui
//= require_tree .

////////////////////////////////////////////////////////////////
function fetch_file_list() {
    const sha = $('#revision_selector').val();
    $.ajax({
        dataType: 'json',
        url: '/repositories/fetch_file_list' +
            '?id=' + $("#repository_id").val() +
            '&sha=' + sha })
        .done(function(data) {
            $("#revision").val(sha);
            load_files(data);
        });
}

function clear_comment(id) {
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

function clear_comments() {
    Object.keys(comments).forEach(clear_comment);
}

function init_viewer(data) {
    let json = JSON.parse(data);
    viewer.setValue(json["contents"]);
    viewer.session.setMode(json["mode"]);
    viewer.clearSelection();
    viewer.navigateFileStart();
    clear_comments();
}

function load_file(filename, sha) {
    $.ajax({
        dataType: 'text',
        url : '/repositories/fetch_file' +
            '?id=' + $("#repository_id").val() +
            '&sha=' + sha +
            "&file=" + filename })
        .done(function(data) {
            $("#filename").val(filename);
            init_viewer(data);
            load_comments(filename, sha);
        });
}

function load_files(data) {
    $("#file_tree").empty();
    const revision = $("#revision_selector").val();
    const keys = Object.keys(data);

    function fill_level(level) {
        const els = keys.filter((el) => data[el].parent == level);
        els.forEach(function (el) {
            const txtel = data[el].name;
            const domel = (level == "") ? $("#file_tree") : $("ul[data-file='" + level + "']");
            if(data[el].is_dir) {
                domel.append($('<li>').text(txtel))
                    .append($('<ul data-file="' + el + '">'));
                fill_level(el);
            } else {
                const tel = data[el].has_comm ? "<a data-file='" + el + "' class='comment_line'>" +
                      txtel + "</a>" : "<a data-file='" + el + "'>" + txtel + "</a>";
                domel.append($('<li>').html(tel));
            }
        });
    }

    fill_level("");
    $("#file_tree a").click((event) =>
                            load_file($(event.target).data("file"),
                                      $("#revision").val()));
}

function create_new_comment(comment) {
    if (comment.sha == $("#revision").val()) {
      const div = "<div>" + comment.description +
            "</div> <a class='goto_line' onclick='viewer.gotoLine(" +
            (comment.range.start.row+1) + ", " +
            comment.range.start.column +
            ", false)'>(l. " + comment.range.start.row +
          "-" + comment.range.end.row + ")</a>";
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
      create_overlay(comment.id);
    } else {
      const url = "/repositories/" + $("#repository_id").val() +
        "?sha=" + comment.sha +
        "&file=" + comment.file;
      const div = "<div>" + comment.description + "</div>" +
        " (<a class='goto_line' href='" + url + "'>rev. " +
          comment.sha.substring(0,6) + "</a>) ";
      $("#other_comments").append($("<div id='comment_" +
                            comment.id + "'>").html(div));
      comments[comment.id] = { desc: comment.description };
    }
    $("a[data-file='" + comment.file + "']").addClass("comment_line");
}

function save_new_comment(type) {
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
                create_new_comment(data);
                $("#overlay_" + data["id"] + " textarea").select();
            });
    }
}

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

function destroy_comment(comment_id) {
    $.ajax({
        dataType: 'json',
        url: '/repositories/del_comment' +
            '?id=' + $("#repository_id").val() +
            '&comment_id=' + comment_id })
        .done(function () {
            clear_comment(comment_id);
            if ($("#current_comments a").length +
                  $("#other_comments a").length == 0)
                $("a[data-file='" + $("#filename").val() + "']").
                   removeClass("comment_line");
        });
}

function load_comments(filename, sha) {
    $.ajax({
        dataType: 'json',
        url: '/repositories/fetch_comments' +
            '?id=' + $("#repository_id").val() +
            '&file=' + filename })
        .done(function(data) {
            $("#current_comments").empty();
            data.forEach(create_new_comment);
        });
}

function update_overlay(id, position){
    var div = $("#overlay_" + id)[0];
    div.style.left = (position.pageX + 800) + 'px'; // 800 is the offset
    if (position.pageY >= 900)
        div.style.display = "none";
    else {
        div.style.display = "";
        div.style.top = position.pageY + 'px';
    }
}

function watch_area(event, elem) {
    if (event.keyCode == 13) { // Enter keypress
        elem.value = elem.value.replace(/\r?\n|\r/g, "");
        save_comment_description(elem.dataset["comment"], elem.value);
    }
}

function create_overlay(id) {
    const comment = comments[id];
    var session = viewer.getSession();
    var document = session.getDocument();
    var anchor = document.createAnchor(comment.range.start.row, 0);
    comment.anchor = anchor;

    $('<div id="overlay_' + id + '" class="viewer_overlay viewer_overlay_' +
      comment.ctype + '">' +
      '<div class="destroy_button"><a onclick="destroy_comment(' + id +
      ')">&#10060;</a></div>' +
      '<textarea data-comment="' + id +
      '" onkeyup="watch_area(event, this)">' +
      comment.desc + '</textarea>' + '</div>').
        appendTo('#overlays');

    update_overlay(id, viewer.renderer.
                   textToScreenCoordinates(anchor.getPosition()));
    const callb = function(scrollTop){
        update_overlay(id, viewer.renderer.
                       textToScreenCoordinates(anchor.getPosition()));
    };
    session.on("changeScrollTop", callb);
    comment.callb = callb;
}

function toggle_comments() {
    if ($("#overlays").css("display") == "block")
        $("#overlays").css("display", "none");
    else
        $("#overlays").css("display", "block");
}
