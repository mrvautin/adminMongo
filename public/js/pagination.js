$(document).ready(function() {  
    $('#doc_load_placeholder').show();
      
    var page_num = $('#page_num').val();
    var page_len = $('#docs_per_page').val();
    var coll_name = $('#coll_name').val();
    var conn_name = $('#conn_name').val();
    var db_name = $('#db_name').val();
    
    // optional search stuff
    var key_val = $('#key_val').val();
    var value_val = $('#value_val').val();
    
    // add search to the API URL if it exists
    var api_url = '/api/' +  conn_name + '/' + db_name + '/' + coll_name + '/' + page_num;
    var pager_href = '/' +  conn_name + '/' + db_name + '/' + coll_name + '/view/{{number}}';
    if(key_val != "" && value_val != ""){
        pager_href = '/' +  conn_name + '/' + db_name + '/' + coll_name + '/view/{{number}}/' + key_val + '/' + value_val;
        api_url = '/api/' +  conn_name + '/' + db_name + '/' + coll_name + '/' + page_num + "/" + key_val + "/" + value_val;
    }
    
    $.getJSON(api_url, function(data){
        data = data.data;
        
        // show message when non are found
        if(data == ""){
            $('#doc_none_found').removeClass('hidden');
        }else{
            $('#doc_none_found').addClass('hidden');
        }
        
        $('#pager').bootpag({
            total: Math.ceil($('#coll_count').val() / page_len),
            page: page_num,
            maxVisible: 4,
            href: pager_href,
            next: null,
            prev: null
        });
        
        //clear the div first
        $('#coll_docs').html();
        for (var i = 0; i < data.length; i++) {
            var inner_html = '<div class="col-xs-12 col-md-8 col-lg-10 no-pad-left"><pre class="code-block doc_view"><code class="json">' + JSON.stringify(data[i]) + '</code></pre></div>';
            inner_html += '<div class="col-xs-6 col-md-2 col-lg-1 text-left pad-bottom"><a href="#"  class="btn btn-danger btn-sm" onclick="deleteDoc(\''+data[i]._id+'\')" style="margin-right: 15px; margin-left: 15px;">Delete</a></div>';
            inner_html += '<div class="col-xs-6 col-md-2 col-lg-1 text-right pad-bottom"><a href="/'+ conn_name +"/" + db_name + "/" + coll_name + "/edit/" + data[i]._id+'" class="btn btn-success btn-sm">Edit</a></div>';
            $('#coll_docs').append(inner_html);
        };
        
        $('#doc_load_placeholder').hide();
        
        // hook up the syntax highlight and prettify the json
        $(".code-block").each(function (i, block) { 
            var jsonString = this.textContent;
            var jsonPretty = JSON.stringify(JSON.parse(jsonString),null,2);
            $(this).html(jsonPretty);
            hljs.highlightBlock(block);
        });
    });   
    
    function getParam(name){
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results==null){
            return 0;
        }else{
            return results[1] || 0;
        }
    }
});