$(document).ready(function() {    
    $("#coll_create").click(function() {
        if($("#new_coll_name").val() != ""){
            $.ajax({
                method: "POST",
                url: "/" + $("#conn_name").val() + "/" + $("#db_name").val()+ "/coll_create",
                data: {"collection_name" : $("#new_coll_name").val()}
            })
            .success(function(msg) {
                show_notification(msg,"success", true);
            })
            .error(function(msg) {
                show_notification(msg.responseText,"danger");
            });
        }else{
            show_notification("Please enter a collection name","danger");
        }
    });
    
    // reset the search URL to base page 1
    $("#searchReset").click(function() {
        window.location.href = "/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/" + $("#coll_name").val() + "/view/1";
    });
    
    // redirect to export
    $("#exportModalAction").click(function() {
        var exportId = $("#exportExcludeID").is(":checked") ? "true" : "false";
        window.location.href = "/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/" + $('#export_coll').val() + "/export/" + exportId;
    });
    
    // sets the collection name to be used later to export entire collection
    $(".exportLink").click(function() {  
        $('#exportExcludeID').prop('checked', false);
        $('#export_coll').val($(this).attr("id"));
    });
    
    // set the URL search parameters
    $("#searchModalAction").click(function() {
        if($("#search_key_value").val() != "" && $("#search_value_value").val() != ""){
            window.location.href = "/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/" + $("#coll_name").val() + "/view/1/" + $("#search_key_value").val() + "/" + $("#search_value_value").val();
        }else{
            show_notification("Please enter a key (field) and a value to search for","danger");
        }
    });
    
    $("#coll_name_edit").click(function() {
        var data = $("#coll_name_newval").val();
        if(data != ""){
            $.ajax({
                method: "POST",
                url: "/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/" + $("#coll_name").val() + "/coll_name_edit",
                data: {"new_collection_name" : data}
            })
            .success(function(msg) {
                show_notification(msg,"success");
                window.location.href = "/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/" + data + "/view?page=1";
            })
            .error(function(msg) {
                show_notification(msg.responseText,"danger");
            });
        }
        else{
            show_notification("Please enter an index","danger");
        }
    });
    
    $("#coll_delete").click(function() {
        if (confirm("WARNING: Are you sure you want to delete this collection and all documents?") == true) {
            $.ajax({
                method: "POST",
                url: "/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/coll_delete",
                data: {"collection_name" : $("#del_coll_name option:selected" ).text()}
            })
            .success(function(msg) {
                show_notification(msg,"success", true);
            })
            .error(function(msg) {
                show_notification(msg.responseText,"danger");
            });
        }
    });
    
    $("#db_create").click(function() {
        if($("#new_db_name").val() != ""){
            $.ajax({
                method: "POST",
                url: "/" + $("#conn_name").val() + "/db_create",
                data: {"db_name" : $("#new_db_name").val()}
            })
            .success(function(msg) {
                show_notification(msg,"success", true);
            })
            .error(function(msg) {
                show_notification(msg.responseText,"danger");
            });
        }else{
            show_notification("Please enter a database name","danger");
        }
    });
    
    $("#db_delete").click(function() {
        if (confirm("WARNING: Are you sure you want to delete this collection and all documents?") == true) {
            $.ajax({
                method: "POST",
                url: "/" + $("#conn_name").val() + "/db_delete",
                data: {"db_name" : $("#del_db_name option:selected" ).text()}
            })
            .success(function(msg) {
                show_notification(msg,"success", true);
            })
            .error(function(msg) {
                show_notification(msg.responseText,"danger");
            });
        }else{
            show_notification("Please enter a database name","danger");
        }
    });
    
    $("#coll_addindex").click(function() {
        var edit = ace.edit("json");
        var json = $.parseJSON(edit.getValue());
       
        if(json != "{}"){
            var data_obj = {};
            data_obj[0] = JSON.stringify(json);
            data_obj[1] = $("#index_unique").is(":checked") ? "true" : "false";
            data_obj[2] = $("#index_sparse").is(":checked") ? "true" : "false";
            
            $.ajax({
                method: "POST",
                url: "/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/" + $("#coll_name").val() + "/create_index",
                data: data_obj 
            })
            .success(function(msg) {
                show_notification(msg,"success", true);
            })
            .error(function(msg) {
                show_notification(msg.responseText,"danger");
            });
        }
        else{
            show_notification("Please enter an index","danger");
        }
    });
    
    $("#user_create").click(function() {
        if($("#new_username").val() == ""){
            show_notification("Please enter a Username","danger");
            return;
        }
        if($("#new_password").val() == "" || $("#new_password_confirm").val() == ""){
            show_notification("Please enter a password and confirm","danger");
            return;
        }
        if($("#new_password").val() != $("#new_password_confirm").val()){
            show_notification("Passwords do not match","danger");
            return;
        }

        $.ajax({
            method: "POST",
            url: "/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/" + $("#coll_name").val() + "/user_create",
                data: {
                    "username": $("#new_username").val(),
                    "user_password": $("#new_password").val(),
                    "roles_text": $("#new_user_roles").val()
                }
        })
        .success(function(msg) {
            show_notification(msg,"success");
            setInterval(function() {
                window.location = "/" + $("#conn_name").val() + "/" + $("#db_name").val();
            }, 2000);
        })
        .error(function(msg) {
            show_notification(msg.responseText,"danger");
        });
    });
    
    $("#user_delete").click(function() {
        if(confirm("WARNING: Are you sure you want to delete this user?") == true) {
            $.ajax({
                method: "POST",
                url: "/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/" + $("#coll_name").val() + "/user_delete",
                data: {"username": $("#del_user_name option:selected" ).text()}
            })
            .success(function(msg) {
                show_notification(msg,"success");
                setInterval(function() {
                    window.location = "/" + $("#conn_name").val() + "/" + $("#db_name").val();
                }, 2000);
            })
            .error(function(msg) {
                show_notification(msg.responseText,"danger");
            });
        }
    });
    
    $("#add_config").click(function() {
        if($("#new_conf_conn_name").val() != "" && $("#new_conf_conn_string").val() != ""){
            var data_obj = {};
            data_obj[0] = $("#new_conf_conn_name").val();
            data_obj[1] = $("#new_conf_conn_string").val();

            $.ajax({
                method: "POST",
                url: "/add_config",
                data: data_obj
            })
            .success(function(msg) {
                show_notification(msg,"success");
                setInterval(function() {
                    location.reload();
                }, 2500);
            })
            .error(function(msg) {
                show_notification(msg.responseText,"danger");
            });
        }else{
            show_notification("Please enter both a connection name and connection string","danger");
        }
    });
    
    function redirect(url){
        window.location = url;
    }
});

function deleteDoc(doc_id){
    if(confirm("WARNING: Are you sure you want to delete this document?") == true) {
        $.ajax({
            method: "POST",
            url: "/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/" + $("#coll_name").val() + "/doc_delete",
            data: {"doc_id": doc_id}
        })
        .success(function(msg) {
            show_notification(msg,"success", true);
        })
        .error(function(msg) {
            show_notification(msg.responseText,"danger");
        });
    }
}

function dropIndex(index_index){
    $.ajax({
        method: "POST",
        url: "/" + $("#conn_name").val() + "/" + $("#db_name").val() + "/" + $("#coll_name").val() + "/drop_index",
        data: {"index": index_index}
    })
    .success(function(msg) {
        show_notification(msg,"success", true);
    })
    .error(function(msg) {
        show_notification(msg.responseText,"danger");
    });
}

function dropConfig(config_index){
    if(confirm("WARNING: Are you sure you want to delete this connection?") == true) {
        $.ajax({
            method: "POST",
            url: "/drop_config",
            data: {"curr_config":  $("#curr_conf_conn_name_" + config_index).val()}
        })
        .success(function(msg) {
            show_notification(msg,"success");
            setInterval(function() {
                location.reload();
            }, 2500);
        })
        .error(function(msg) {
            show_notification(msg.responseText,"danger");
        });
    }
}

function updateConfig(config_index){
    if($("#conf_conn_name").val() != "" || $("#conf_conn_string").val() != "") {
        $.ajax({
            method: "POST",
            url: "/update_config",
            data: {"curr_config":  $("#curr_conf_conn_name_" + config_index).val(),"conn_name": $("#conf_conn_name_" + config_index).val(), "conn_string": $("#conf_conn_string_" + config_index).val()}
        })
        .success(function(msg) {
            show_notification(msg,"success");
            setInterval(function() {
                location.reload();
            }, 2500);
        })
        .error(function(msg) {
            show_notification(msg.responseText,"danger");
        });
    }else{
        show_notification("Please enter a connection name and connection string","danger");
    }
}



// show notification popup
function show_notification(msg, type, reload_page){
    // defaults to false
    reload_page = reload_page || false;
   
    $("#notify_message").removeClass();
    $("#notify_message").addClass('notify_message-' + type);
    $("#notify_message").html(msg);
    $('#notify_message').slideDown(600).delay(1200).slideUp(600, function() {
        if(reload_page == true){
            location.reload();
        }
    });
}