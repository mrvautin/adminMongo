$(document).ready(function(){
    // paginate if value is set
    if($('#to_paginate').val() === 'true'){
        if(localStorage.getItem('message_text')){
            show_notification(localStorage.getItem('message_text'), 'success');
            localStorage.setItem('message_text', '');
        }
        paginate();
    }

    // checks localstorage for sidemenu being opened/closed state
    $('.mainMenu').each(function(index){
        var menu = $(this).text().trim().toString();
        if(window.localStorage.getItem(menu) === 'closed'){
            $(this).addClass('collapsed');
            $(this).nextUntil('.mainMenu').slideUp('fast');
        }
    });

    // inital stage of docs per page
    if(localStorage.getItem('docsPerPage')){
        $('#docsPerPage').val(localStorage.getItem('docsPerPage'));
    }

    // toggle the sidebar, resize the main view
    $(document).on('click', '#sidebarToggle', function(){
        $('.row-offcanvas').toggleClass('active');
        $('#sidebar').toggleClass('hidden-xs');
        $('#sidebar').toggleClass('hidden-sm');
        $('#sidebar').toggleClass('hidden-md');
        $('#sidebar').toggleClass('hidden-lg');
        if($('.row-offcanvas').hasClass('active')){
            $('#main').removeClass('col-sm-9 col-lg-10');
            $('#main').addClass('col-sm-12 col-lg-12');
        }else{
            $('#main').removeClass('col-sm-12 col-lg-12');
            $('#main').addClass('col-sm-9 col-lg-10');
        }
    });

    // allow collapsable side menu's
    $(document).on('click', '.mainMenuToggle', function(){
        if($(this).parent().hasClass('collapsed')){
            window.localStorage.setItem($(this).prev().text().trim(), 'opened');
            $(this).parent().removeClass('collapsed');
            $(this).parent().nextUntil('.mainMenu').slideDown('fast');
        }else{
            window.localStorage.setItem($(this).prev().text().trim(), 'closed');
            $(this).parent().addClass('collapsed');
            $(this).parent().nextUntil('.mainMenu').slideUp('fast');
        }
    });

    // To reset we call paginate() with no query object
    $(document).on('click', '#searchReset', function(){
        if(!$('#searchReset').hasClass('disabled')){
            localStorage.removeItem('searchQuery');
            window.location.href = $('#app_context').val() + '/app/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/view/1';
        }
    });

    $(document).on('click', '#queryDocumentsAction', function(){
        var editor = ace.edit('json');
        var editor_val = editor.getValue();

        if(editor_val !== ''){
            // set the query in localStorage
            localStorage.setItem('searchQuery', editor_val);

            // go to page 1 to remove any issues being on page X from another query/view
            window.location.href = $('#app_context').val() + '/app/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/view/1';

            // close the queryDocuments
            $('#queryDocuments').modal('hide');
        }else{
            show_notification('Please enter a query', 'danger');
        }
    });

    // redirect to export
    $(document).on('click', '#exportModalAction', function(){
        var exportId = $('#exportExcludeID').is(':checked') ? 'true' : 'false';
        window.location.href = $('#app_context').val() + '/collection/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/' + $('#export_coll').val() + '/export/' + exportId;
    });

    // sets the collection name to be used later to export entire collection
    $(document).on('click', '.exportLink', function(){
        $('#exportExcludeID').prop('checked', false);
        $('#export_coll').val($(this).attr('id'));
    });

    // when docs per page is changed
    $(document).on('change', '#docsPerPage', function(){
        localStorage.setItem('docsPerPage', $('#docsPerPage').val());
        window.location = $('#app_context').val() + '/app/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/view/1';
    });

    // set the URL search parameters
    $(document).on('click', '#searchModalAction', function(){
        var key_name = $('#search_key_fields option:selected').text();
        var val = $('#search_value_value').val();

        if(key_name !== '' && val !== ''){
            // build the simply key/value query object and call paginate();
            var qry_obj = {};

            // check if value is a number/integer
            var intReg = new RegExp('^[0-9]+$');
            if(val.match(intReg)){
                val = parseInt(val);
            }else{
            // if we find an integer wrapped in quotes
                var strIntReg = new RegExp('^"[0-9]"+$');
                if(val.match(strIntReg)){
                    val = val.replace(/"/g, '');
                }
            }

            qry_obj[key_name] = val;

            // set the object to local storage to be used if page changes
            localStorage.setItem('searchQuery', JSON.stringify(qry_obj));

            // check if the key_name is "_id"
            if (key_name == '_id')
            {
                var query_string = toEJSON.serializeString('{"_id":ObjectId("' + val + '")}');
                localStorage.setItem('searchQuery', query_string);
            }
            
            // go to page 1 to remove any issues being on page X from another query/view
            window.location.href = $('#app_context').val() + '/app/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/view/1';

            // close the searchModal
            $('#searchModal').modal('hide');
        }else{
            show_notification('Please enter a key (field) and a value to search for', 'danger');
        }
    });

    $(document).on('click', '#coll_name_edit', function(){
        var newCollName = $('#coll_name_newval').val();
        if(newCollName !== ''){
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/collection/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/coll_name_edit',
                data: {'new_collection_name': newCollName}
            })
            .done(function(data){
                $('#headCollectionName').text(newCollName);
                $('#collectioName').modal('toggle');
                localStorage.setItem('message_text', data.msg);
                window.location.href = $('#app_context').val() + '/app/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/' + newCollName + '/view?page=1';
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }else{
            show_notification('Please enter an index', 'danger');
        }
    });

    $(document).on('click', '#coll_create', function(){
        if($('#new_coll_name').val() !== ''){
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/collection/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/coll_create',
                data: {'collection_name': $('#new_coll_name').val()}
            })
            .done(function(data){
                $('#del_coll_name').append('<option>' + $('#new_coll_name').val() + '</option>');
                $('#new_coll_name').val('');
                show_notification(data.msg, 'success');
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }else{
            show_notification('Please enter a collection name', 'danger');
        }
    });

    $(document).on('click', '#coll_delete', function(){
        if(confirm('WARNING: Are you sure you want to delete this collection and all documents?') === true){
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/collection/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/coll_delete',
                data: {'collection_name': $('#del_coll_name option:selected').text()}
            })
            .done(function(data){
                $("#del_coll_name option:contains('" + data.coll_name + "')").remove();
                $('#del_coll_name').val($('#del_coll_name option:first').val());
                show_notification(data.msg, 'success');
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }
    });

    $(document).on('click', '#db_create', function(){
        if($('#new_db_name').val() !== ''){
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/database/' + $('#conn_name').val() + '/db_create',
                data: {'db_name': $('#new_db_name').val()}
            })
            .done(function(data){
                $('#del_db_name').append('<option>' + $('#new_db_name').val() + '</option>');
                $('#new_db_name').val('');
                show_notification(data.msg, 'success');
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }else{
            show_notification('Please enter a database name', 'danger');
        }
    });

    $(document).on('click', '#db_delete', function(){
        if(confirm('WARNING: Are you sure you want to delete this database and all collections?') === true){
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/database/' + $('#conn_name').val() + '/db_delete',
                data: {'db_name': $('#del_db_name option:selected').text()}
            })
            .done(function(data){
                $("#del_db_name option:contains('" + data.db_name + "')").remove();
                $('#del_db_name').val($('#del_db_name option:first').val());
                show_notification(data.msg, 'success', true);
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }
    });

    $(document).on('click', '#user_create', function(){
        if($('#new_username').val() === ''){
            show_notification('Please enter a Username', 'danger');
            return;
        }
        if($('#new_password').val() === '' || $('#new_password_confirm').val() === ''){
            show_notification('Please enter a password and confirm', 'danger');
            return;
        }
        if($('#new_password').val() !== $('#new_password_confirm').val()){
            show_notification('Passwords do not match', 'danger');
            return;
        }

        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/users/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/user_create',
            data: {
                'username': $('#new_username').val(),
                'user_password': $('#new_password').val(),
                'roles_text': $('#new_user_roles').val()
            }
        })
        .done(function(data){
            $('#del_user_name').append('<option>' + $('#new_username').val() + '</option>');
            show_notification(data.msg, 'success');

        // clear items
            $('#new_username').val('');
            $('#new_password').val('');
            $('#new_password_confirm').val('');
            $('#new_user_roles').val('');
        })
        .fail(function(data){
            show_notification(data.responseJSON.msg, 'danger');
        });
    });

    $(document).on('click', '#btnqueryDocuments', function(){
        var editor = ace.edit('json');
        if(localStorage.getItem('searchQuery')){
            editor.setValue(localStorage.getItem('searchQuery'));
        }else{
            editor.setValue('{}');
        }
    });

    $(document).on('click', '#user_delete', function(){
        if(confirm('WARNING: Are you sure you want to delete this user?') === true){
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/users/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/user_delete',
                data: {'username': $('#del_user_name option:selected').text()}
            })
            .done(function(data){
                $("#del_user_name option:contains('" + $('#del_user_name option:selected').text() + "')").remove();
                $('#del_user_name').val($('#del_user_name option:first').val());
                show_notification(data.msg, 'success');
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }
    });

    $(document).on('click', '#add_config', function(){
        if($('#new_conf_conn_name').val() !== '' && $('#new_conf_conn_string').val() !== ''){
            var editor = ace.edit('json');
            var editor_val = editor.getValue();

            if(editor_val === ''){
                editor_val = {};
            }

            var data_obj = {};
            data_obj[0] = $('#new_conf_conn_name').val();
            data_obj[1] = $('#new_conf_conn_string').val();
            data_obj[2] = editor_val;

            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/config/add_config',
                data: data_obj
            })
            .done(function(data){
                show_notification(data.msg, 'success');
                setInterval(function(){
                    location.reload();
                }, 2500);
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }else{
            show_notification('Please enter both a connection name and connection string', 'danger');
        }
    });

    $(document).on('click', '.btnConnDelete', function(){
        if(confirm('WARNING: Are you sure you want to delete this connection?') === true){
            var current_name = $(this).parents('.conn_id').attr('id');
            var rowElement = $(this).parents('.connectionRow');

            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/config/drop_config',
                data: {'curr_config': current_name}
            })
            .done(function(data){
                rowElement.remove();
                show_notification(data.msg, 'success');
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }
    });

    $(document).on('click', '.btnConnUpdate', function(){
        if($('#conf_conn_name').val() !== '' || $('#conf_conn_string').val() !== ''){
            var current_name = $(this).parents('.conn_id').attr('id');
            var new_name = $(this).parents('.connectionRow').find('.conf_conn_name').val();
            var new_string = $(this).parents('.connectionRow').find('.conf_conn_string').val();

            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/config/update_config',
                data: {'curr_config': current_name, 'conn_name': new_name, 'conn_string': new_string}
            })
            .done(function(data){
                $(this).parents('.connectionRow').find('.conf_conn_name').val(data.name);
                $(this).parents('.connectionRow').find('.conf_conn_string').val(data.string);
                show_notification(data.msg, 'success', true);
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }else{
            show_notification('Please enter a connection name and connection string', 'danger');
        }
    });

    // redirect to connection
    $(document).on('click', '.btnConnConnect', function(){
        window.location.href = $('#app_context').val() + '/app/' + $(this).parents('.conn_id').attr('id');
    });
});

function paginate(){
    $('#doc_load_placeholder').show();

    var page_num = $('#page_num').val();
    var page_len = $('#docs_per_page').val();
    var coll_name = $('#coll_name').val();
    var conn_name = $('#conn_name').val();
    var db_name = $('#db_name').val();
    var doc_id = $('#doc_id').val();

    // check local storage for pagination
    if(localStorage.getItem('docsPerPage')){
        page_len = localStorage.getItem('docsPerPage');
    }else{
        localStorage.setItem('docsPerPage', page_len);
    }

    // get the query (if any)
    if(doc_id){
        query_string = toEJSON.serializeString('{"_id":ObjectId("' + doc_id + '")}');
    }else{
        var query_string = localStorage.getItem('searchQuery');
        query_string = toEJSON.serializeString(query_string);
    }

    // add search to the API URL if it exists
    var api_url = $('#app_context').val() + '/api/' + conn_name + '/' + db_name + '/' + coll_name + '/' + page_num;
    var pager_href = $('#app_context').val() + '/app/' + conn_name + '/' + db_name + '/' + coll_name + '/view/{{number}}';

    $.ajax({
        type: 'POST',
        dataType: 'json',
        url: api_url,
        data: {'query': query_string, 'docsPerPage': page_len}
    })
    .done(function(response){
        // show message when none are found
        if(response.data === '' || response.total_docs === 0){
            $('#doc_none_found').removeClass('hidden');
        }else{
            $('#doc_none_found').addClass('hidden');
        }

        var total_docs = Math.ceil(response.total_docs / page_len);

        // remove the doc class when single doc is retured
        var docClass = 'doc_view';
        if(response.total_docs === 1){
            docClass = '';
        }

        if(total_docs > 1){
            $('#pager').show();
            $('#pager').bootpag({
                total: total_docs,
                page: page_num,
                maxVisible: 5,
                href: pager_href,
                firstLastUse: true
            });
        }else{
            $('#pager').hide();
        }

        var isFiltered = '';

        // enable/disable the reset filter button
        if(query_string == null){
            $('#searchReset').addClass('disabled');
        }else{
            $('#searchReset').removeClass('disabled');
            isFiltered = " <span class='text-danger'>(filtered)</span>";
        }

        // set the total record count
        $('#recordCount').html(response.total_docs + isFiltered);

        // if filtered, change button text
        if(query_string !== null){
            $('#btnMassDelete').html('Delete selected');
        }

        // disable/enable the mass delete button if records are returned
        if(total_docs === 0){
            $('#btnMassDelete').prop('disabled', true);
        }else{
            $('#btnMassDelete').prop('disabled', false);
        }

        // clear the div first
        $('#coll_docs').empty();
        var escaper = $('<div></div>');
        for(var i = 0; i < response.data.length; i++){
            escaper[0].textContent = JSON.stringify(response.data[i], null, 4);
            var inner_html = '<div class="col-xs-12 col-md-10 col-lg-10 no-side-pad"><pre class="code-block ' + docClass + '"><i class="fa fa-chevron-down code-block_expand"></i><code class="json">' + escaper[0].innerHTML + '</code></pre></div>';
            inner_html += '<div class="col-md-2 col-lg-2 pad-bottom no-pad-right justifiedButtons">';
            inner_html += '<div class="btn-group btn-group-justified justifiedButtons" role="group" aria-label="...">';
            inner_html += '<a href="#" class="btn btn-danger btn-sm" onclick="deleteDoc(\'' + response.data[i]._id + '\')">' + response.deleteButton + '</a>';
            inner_html += '<a href="' + $('#app_context').val() + '/app/' + conn_name + '/' + db_name + '/' + coll_name + '/' + response.data[i]._id + '" class="btn btn-info btn-sm">' + response.linkButton + '</a>';
            inner_html += '<a href="' + $('#app_context').val() + '/app/' + conn_name + '/' + db_name + '/' + coll_name + '/edit/' + response.data[i]._id + '" class="btn btn-success btn-sm">' + response.editButton + '</a>';
            inner_html += '</div></div>';
            $('#coll_docs').append(inner_html);
        };
        // Bind the DropDown Select For Fields
        var option = '';
        for(var x = 0; x < response.fields.length; x++){
            option += '<option value="' + response.fields[x] + '">' + response.fields[x] + '</option>';
        }
        $('#search_key_fields').append(option);

        // hide the loading placeholder
        $('#doc_load_placeholder').hide();

        // hook up the syntax highlight and prettify the json
        hljs.configure({languages: ['json']});
        $('.code-block').each(function (i, block){
            hljs.highlightBlock(block);
            $(block).find('.code-block_expand').click(function (event){
                $(block).toggleClass('expanded');
            });
        });

        // Show extended message if API returns an invalid query
        if(response.validQuery === false){
            show_notification('Invalid query syntax' + response.queryMessage, 'danger', false, 3000);
        }
    })
    .fail(function(){
        show_notification('Error getting data from Query API', 'danger');
    });
}

function deleteDoc(doc_id){
    if(confirm('WARNING: Are you sure you want to delete this document?') === true){
        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/document/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/doc_delete',
            data: {'doc_id': doc_id}
        })
        .done(function(data){
            show_notification(data.msg, 'success');
            paginate();
        })
        .fail(function(data){
            show_notification(data.responseJSON.msg, 'danger');
        });
    }
}

$(document).on('click', '#btnMassDelete', function(){
    var doc_id = $('#doc_id').val();
    var coll_name = $('#coll_name').val();
    var conn_name = $('#conn_name').val();
    var db_name = $('#db_name').val();
    var query_string;

    // get the query (if any)
    if(doc_id){
        query_string = toEJSON.serializeString('{"_id":ObjectId("' + doc_id + '")}');
    }else{
        var local_query_string = localStorage.getItem('searchQuery');
        query_string = toEJSON.serializeString(local_query_string);
    }

    // set the default confirm text
    var confirmText = 'WARNING: Are you sure you want to delete all documents in this collection?';

    // if a query is specified, show the "selection" alternative text
    if(query_string){
        confirmText = 'WARNING: Are you sure you want to delete the selection of documents?';
    }

    if(confirm(confirmText) === true){
        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/document/' + conn_name + '/' + db_name + '/' + coll_name + '/mass_delete',
            data: {'query': query_string}
        })
        .done(function(data){
            localStorage.removeItem('searchQuery');
            show_notification(data.msg, 'success', true);
        })
        .fail(function(data){
            show_notification(data.responseJSON.msg, 'danger');
        });
    }
});

// restore DB
$(document).on('click', '#db_restore', function(){
    if($('#restore_db_name').val() !== null){
        if(confirm('WARNING: Are you absolutely sure you want to restore the "' + $('#restore_db_name').val() + '" database?') === true){
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/database/' + $('#conn_name').val() + '/' + $('#restore_db_name').val() + '/db_restore/',
                data: {'dropTarget': $('#restore_db_action').val()}
            })
            .done(function(data){
                show_notification(data.msg, 'success', true);
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }
    }
});

// backup DB
$(document).on('click', '#db_backup', function(){
    $.ajax({
        method: 'POST',
        url: $('#app_context').val() + '/database/' + $('#conn_name').val() + '/' + $('#backup_db_name').val() + '/db_backup/',
        data: {}
    })
    .done(function(data){
        show_notification(data.msg, 'success', true);
    })
    .fail(function(data){
        show_notification(data.responseJSON.msg, 'danger');
    });
});

$(document).on('click', '#coll_addindex', function(){
    var edit = ace.edit('json');
    var json = $.parseJSON(edit.getValue());

    if(json !== '{}'){
        var data_obj = {};
        data_obj[0] = JSON.stringify(json);
        data_obj[1] = $('#index_unique').is(':checked') ? 'true' : 'false';
        data_obj[2] = $('#index_sparse').is(':checked') ? 'true' : 'false';

        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/collection/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/create_index',
            data: data_obj
        })
        .done(function(data){
            show_notification(data.msg, 'success', true);
        })
        .fail(function(data){
            show_notification(data.responseJSON.msg, 'danger');
        });
    }else{
        show_notification('Please enter an index', 'danger');
    }
});

function dropIndex(index_index){
    $.ajax({
        method: 'POST',
        url: $('#app_context').val() + '/collection/' + $('#conn_name').val() + '/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/drop_index',
        data: {'index': index_index}
    })
    .done(function(data){
        $('#index_row_' + index_index).remove();
        show_notification(data.msg, 'success');
    })
    .fail(function(data){
        show_notification(data.responseJSON.msg, 'danger');
    });
}

// show notification popup
function show_notification(msg, type, reload_page, timeout){
    // defaults to false
    reload_page = reload_page || false;
    timeout = timeout || 3000;

    $('#notify_message').removeClass();
    $('#notify_message').addClass('notify_message-' + type);
    $('#notify_message').html(msg);
    $('#notify_message').slideDown(600).delay(timeout).slideUp(600, function(){
        if(reload_page === true){
            location.reload();
        }
    });
}
