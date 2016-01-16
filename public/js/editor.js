require.config({paths: {ace: "/js/ace"}});
define('aceeditor', ['ace/ace'],
    function(ace, langtools) {
        var editor = ace.edit("json");
        editor.setTheme("ace/theme/github");
        editor.session.setMode("ace/mode/json");
        editor.setFontSize(14);
        editor.$blockScrolling = "Infinity";
        
        $(document).ready(function() {
            var edit = ace.edit("json");
            $("#submit_json").click(function() {
                try {
                    var json = $.parseJSON(edit.getValue());
                    $.ajax({
                        method: "POST",
                        url: "/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/" + $("#coll_name").val() + "/save",
                        data: json
                    })
                    .success(function(msg) {
                        show_notification(msg,"success");
                    })
                    .error(function(msg) {
                        show_notification(msg.responseText,"danger");
                    });
                }
                catch (err) {
                    show_notification(err,"danger");
                }
            });
            
            // prettify the json
            var jsonString = edit.getValue();
            var jsonPretty = JSON.stringify(JSON.parse(jsonString),null,2);
            edit.setValue(jsonPretty);
        });
    }
);
require(['aceeditor']);