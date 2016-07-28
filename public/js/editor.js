$(document).ready(function() {
    var editor = ace.edit("json");
    editor.setTheme("ace/theme/github");
    editor.session.setMode("ace/mode/json");
    editor.setFontSize(14);
    editor.getSession().setUseWorker(false);
    editor.$blockScrolling = Infinity;
    
    $("#submit_json").click(function() {
        try {
            // convert BSON string to EJSON
            var ejson = toEJSON.serializeString(editor.getValue());
            
            $.ajax({
                method: "POST",
                contentType: 'application/json',
                url: $("#app_context").val() + "/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/" + $("#coll_name").val() + "/" + $("#edit_request_type").val(),
                data: JSON.stringify({ "objectData": ejson})
            })
            .done(function(data) {
                show_notification(data.msg,"success");
            })
            .fail(function(xhr, status, error) {
            var msg = JSON.parse(xhr.responseText).msg;
                show_notification(msg,"danger");
            });
        }
        catch (err) {
            show_notification(err,"danger");
        }
    });
});
