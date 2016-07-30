$(document).ready(function() {
    var editor = ace.edit("json");
    editor.setTheme("ace/theme/github");
    editor.session.setMode("ace/mode/json");
    editor.setFontSize(14);
    editor.getSession().setUseWorker(false);
    editor.$blockScrolling = Infinity;
    
    $(document).on('click', '#submit_json', function(){
        try {
            // convert BSON string to EJSON
            var ejson = toEJSON.serializeString(editor.getValue());
            
            $.ajax({
                method: "POST",
                contentType: 'application/json',
                url: $("#app_context").val() + "/document/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/" + $("#coll_name").val() + "/" + $("#edit_request_type").val(),
                data: JSON.stringify({ "objectData": ejson})
            })
            .success(function(data) {
                show_notification(data.msg,"success");
            })
            .error(function(data) {
                show_notification(data.responseJSON.msg,"danger");
            });
        }
        catch (err) {
            show_notification(err,"danger");
        }
    });
});