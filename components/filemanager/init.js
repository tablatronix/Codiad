/*
*  Copyright (c) Codiad & Kent Safranski (codiad.com), distributed
*  as-is and without warranty under the MIT License. See 
*  [root]/license.txt for more. This information must remain intact.
*/

//////////////////////////////////////////////////////////////////////
// Use window.load to delay until project scripts load
//////////////////////////////////////////////////////////////////////

$(window).load(function(){ filemanager.init(); });

var filemanager = {

    clipboard : '',
    
    no_open : ['jpg','jpeg','png','gif','svg','bmp','exe','zip','tar','tar.gz'],

    controller : 'components/filemanager/controller.php',
    dialog : 'components/filemanager/dialog.php',
    dialog_upload : 'components/filemanager/dialog_upload.php',
    
    init : function(){
        // Initialize node listener
        this.node_listener();
        // Context Menu Event Listener
        this.context_menu_event_listener();
        // Load uploader
        $.loadScript("components/filemanager/upload_scripts/jquery.ui.widget.js",true);
        $.loadScript("components/filemanager/upload_scripts/jquery.iframe-transport.js",true);
        $.loadScript("components/filemanager/upload_scripts/jquery.fileupload.js",true);        
    },
    
    //////////////////////////////////////////////////////////////////
    // Listen for dbclick events on nodes
    //////////////////////////////////////////////////////////////////
    
    node_listener : function(){
        $('#file-manager a').live('click',function(){ // Open or Expand
            if($(this).hasClass('directory')){
                filemanager.index($(this).attr('data-path'));
            }else{
                filemanager.open_file($(this).attr('data-path'));
            }
        })
        .live("contextmenu", function(e){ // Context Menu
            e.preventDefault();
            filemanager.context_menu_show(e,$(this).attr('data-path'),$(this).attr('data-type'));
            $(this).addClass('context-menu-active');
        });
    },
    
    //////////////////////////////////////////////////////////////////
    // Context Menu
    //////////////////////////////////////////////////////////////////
    
    context_menu_show : function(e,path,type){
        // Selective options
        switch(type){
            case 'directory':
                $('#context-menu .directory-only, #context-menu .non-root').show();
                $('#context-menu .file-only').hide();
                break;
            case 'file':
                $('#context-menu .directory-only').hide();
                $('#context-menu .file-only,#context-menu .non-root').show();
                break;
            case 'root':
                $('#context-menu .directory-only').show();
                $('#context-menu .non-root, #context-menu .file-only').hide();
                break;
        }
        // Show menu
        $('#context-menu').css({'top':(e.pageY-10)+'px','left':(e.pageX-10)+'px'})
            .fadeIn(200).attr('data-path',path).attr('data-type',type);
        // Show faded 'paste' if nothing in clipboard
        if(this.clipboard==''){ $('#context-menu a[data-action="paste"]').addClass('disabled');
        }else{ $('#context-menu a[data-action="paste"]').removeClass('disabled'); }
        // Hide menu
        $('#file-manager, #editor-region').on('mouseover',function(){ filemanager.context_menu_hide(); });
    },
    
    context_menu_hide : function(){
        $('#context-menu').fadeOut(200);
        $('#file-manager a').removeClass('context-menu-active');
    },
    
    context_menu_event_listener : function(){
        $('#context-menu a').live('click',function(){
            filemanager.context_menu_hide();
            var path = $('#context-menu').attr('data-path');
            var action = $(this).attr('data-action');
            switch(action){
                case 'new_file':
                    filemanager.create_node(path,'file');
                    break;
                case 'new_directory':
                    filemanager.create_node(path,'directory');
                    break;
                case 'copy':
                    filemanager.copy_node(path);
                    break;
                case 'paste':
                    filemanager.paste_node(path);
                    break;
                case 'rename':
                    filemanager.rename_node(path);
                    break;
                case 'delete':
                    filemanager.delete_node(path);
                    break;
                case 'upload':
                    filemanager.upload_to_node(path);
                    break;
                case 'backup':
                    filemanager.download(path);
                    break;
            }
        });
    },
    
    //////////////////////////////////////////////////////////////////
    // Return the node name (sans path)
    //////////////////////////////////////////////////////////////////
    
    get_short_name : function(path){ return path.split('/').pop(); },
    
    //////////////////////////////////////////////////////////////////
    // Return extension
    //////////////////////////////////////////////////////////////////
    
    get_extension : function(path){ return path.split('.').pop(); },
    
    //////////////////////////////////////////////////////////////////
    // Return type
    //////////////////////////////////////////////////////////////////
    
    get_type : function(path){ return $('#file-manager a[data-path="'+path+'"]').attr('data-type'); },
    
    //////////////////////////////////////////////////////////////////
    // Create node in file tree
    //////////////////////////////////////////////////////////////////
    
    create_object : function(parent,path,type){
        // NODE FORMAT: <li><a class="{type} {ext-file_extension}" data-type="{type}" data-path="{path}">{short_name}</a></li>
        var parent_node = $('#file-manager a[data-path="'+parent+'"]');
        if(!$('#file-manager a[data-path="'+path+'"]').length){ // Doesn't already exist
            if(parent_node.hasClass('open') && parent_node.hasClass('directory')){ // Only append node if parent is open (and a directory)
                var short_name = filemanager.get_short_name(path);
                if(type=='directory'){
                    var appendage = '<li><a class="directory" data-type="directory" data-path="'+path+'">'+short_name+'</a></li>';
                }else{
                    var appendage = '<li><a class="file ext-'+filemanager.get_extension(short_name)+'" data-type="file" data-path="'+path+'">'+short_name+'</a></li>';
                }
                if(parent_node.siblings('ul').length){ // UL exists, other children to play with
                    parent_node.siblings('ul').append(appendage);
                }else{
                    $('<ul>'+appendage+'</ul>').insertAfter(parent_node);
                }
            }
        } 
    },
    
    //////////////////////////////////////////////////////////////////
    // Loop out all files and folders in directory path
    //////////////////////////////////////////////////////////////////

    index : function(path){
        node = $('#file-manager a[data-path="'+path+'"]');
        node.addClass('loading');
        $.get(this.controller+'?action=index&path='+path,function(data){
            if(node.hasClass('open')){
                node.parent('li').children('ul').slideUp(100,function(){ 
                    $(this).remove(); 
                    node.removeClass('open');
                });
            }else{
                node.addClass('open');
                objects_response = jsend.parse(data);
                if(objects_response!='error'){
                    files = objects_response.index;
                    if(files.length>0){
                        var appendage = '<ul style="display: none;">';
                        $.each(files,function(index){
                            var ext = '';
                            var name = files[index].name.replace(path,'');
                            name = name.split('/').join(' ');
                            if(files[index].type=='file'){ var ext = ' ext-'+name.split('.').pop(); }
                            appendage += '<li><a class="'+files[index].type+ext+'" data-type="'+files[index].type+'" data-path="'+files[index].name+'">'+name+'</a></li>';
                        });
                        appendage += '</ul>';
                        $(appendage).insertAfter(node);
                        node.siblings('ul').slideDown(100);   
                    }
                }
            }
            node.removeClass('loading');
        });
        
    },
    
    //////////////////////////////////////////////////////////////////
    // Open File
    //////////////////////////////////////////////////////////////////
    
    open_file : function(path){
        var ext = filemanager.get_extension(path);
        if($.inArray(ext,filemanager.no_open)<0){
            $.get(this.controller+'?action=open&path='+path,function(data){
                open_response = jsend.parse(data);
                if(open_response!='error'){
                    editor.open(path,open_response.content);
                }
            });
        }else{
            filemanager.download(path);
        }
    },
    
    //////////////////////////////////////////////////////////////////
    // Open in browser
    //////////////////////////////////////////////////////////////////
    
    open_in_browser : function(path){
        $.get(this.controller+'?action=open_in_browser&path='+path,function(data){
            openib_response = jsend.parse(data);
            if(openib_response!='error'){
                window.open(openib_response.url,'_newtab');
            }
        });
    },
    
    //////////////////////////////////////////////////////////////////
    // Save file
    //////////////////////////////////////////////////////////////////
    
    save_file : function(path,content){
        $.post(this.controller+'?action=modify&path='+path,{content:content},function(data){
            save_response = jsend.parse(data);
            if(save_response!='error'){
                message.success('File Saved');
            }
        });
    },
    
    //////////////////////////////////////////////////////////////////
    // Create Object
    //////////////////////////////////////////////////////////////////
    
    create_node : function(path,type){
        modal.load(250,this.dialog+'?action=create&type='+type+'&path='+path);
        $('#modal-content form').live('submit',function(e){
            e.preventDefault();
            var short_name = $('#modal-content form input[name="object_name"]').val();
            var path = $('#modal-content form input[name="path"]').val();
            var type = $('#modal-content form input[name="type"]').val();
            var create_path = path + '/' + short_name;
            $.get(filemanager.controller+'?action=create&path='+create_path+'&type='+type,function(data){
                create_response = jsend.parse(data);
                if(create_response!='error'){
                    message.success(type.charAt(0).toUpperCase() + type.slice(1)+' Created');
                    modal.unload();
                    // Add new element to filemanager screen
                    filemanager.create_object(path,create_path,type);
                }
            });
        });
    },
    
    //////////////////////////////////////////////////////////////////
    // Copy to Clipboard
    //////////////////////////////////////////////////////////////////
    
    copy_node : function(path){ this.clipboard = path; message.success('Copied to Clipboard'); },
    
    //////////////////////////////////////////////////////////////////
    // Paste
    //////////////////////////////////////////////////////////////////
    
    paste_node : function(path){
        if(this.clipboard==''){ message.error('Nothing in Your Clipboard'); }
        else if(path==filemanager.clipboard){ message.error('Cannot Paste Directory Into Itself'); }
        else{
            var short_name = filemanager.get_short_name(filemanager.clipboard);
            if($('#file-manager a[data-path="'+path+'/'+short_name+'"]').length){ // Confirm overwrite?
                modal.load(400,this.dialog+'?action=overwrite&path='+path+'/'+short_name);
                $('#modal-content form').live('submit',function(e){
                    e.preventDefault();
                    filemanager.process_paste_node(path);
                });
            }else{ // No conflicts; proceed...
                filemanager.process_paste_node(path);
            }
        }
    },
    
    process_paste_node : function(path){
        var short_name = filemanager.get_short_name(filemanager.clipboard);
        var type = filemanager.get_type(filemanager.clipboard);
        $.get(filemanager.controller+'?action=duplicate&path='+filemanager.clipboard+'&destination='+path+'/'+short_name,function(data){
            paste_response = jsend.parse(data);
            if(paste_response!='error'){
                filemanager.create_object(path,path+'/'+short_name,type);
                modal.unload();
            }
        });
    },
    
    //////////////////////////////////////////////////////////////////
    // Rename
    //////////////////////////////////////////////////////////////////
    
    rename_node : function(path){
        var short_name = filemanager.get_short_name(path);
        var type = filemanager.get_type(path);
        modal.load(250,this.dialog+'?action=rename&path='+path+'&short_name='+short_name+'&type='+type);
        $('#modal-content form').live('submit',function(e){
            e.preventDefault();
            new_name = $('#modal-content form input[name="object_name"]').val();
            // Build new path
            var arr = path.split('/');
            var temp = new Array();
            for(i = 0; i < arr.length-1; i++){ temp.push(arr[i]) }
            new_path = temp.join('/') + '/'+new_name;
            $.get(filemanager.controller+'?action=modify&path='+path+'&new_name='+new_name,function(data){
                rename_response = jsend.parse(data);
                if(rename_response!='error'){
                    message.success(type.charAt(0).toUpperCase() + type.slice(1)+' Renamed');
                    var node = $('#file-manager a[data-path="'+path+'"]');
                    // Change pathing and name for node
                    node.attr('data-path',new_path).html(new_name);
                    if(type=='file'){ // Change icons for file
                        cur_ext_class = 'ext-'+filemanager.get_extension(path);
                        new_ext_class = 'ext-'+filemanager.get_extension(new_path);
                        $('#file-manager a[data-path="'+new_path+'"]').removeClass(cur_ext_class).addClass(new_ext_class);
                    }else{ // Change pathing on any sub-files/directories
                        filemanager.repath_subs(path,new_path);
                    }
                    // Change any active files
                    active.rename(path,new_path);
                    modal.unload();
                }
            });
        });
    },
    
    repath_subs : function(old_path,new_path){
        $('#file-manager a[data-path="'+new_path+'"]').siblings('ul').find('a').each(function(){
            // Hit the children, hit 'em hard
            var cur_path = $(this).attr('data-path');
            var revised_path = cur_path.replace(old_path,new_path);
            $(this).attr('data-path',revised_path);
        });
    },
    
    //////////////////////////////////////////////////////////////////
    // Delete
    //////////////////////////////////////////////////////////////////
    
    delete_node : function(path){
        modal.load(400,this.dialog+'?action=delete&path='+path);
        $('#modal-content form').live('submit',function(e){
            e.preventDefault();
            $.get(filemanager.controller+'?action=delete&path='+path,function(data){
                delete_response = jsend.parse(data);
                if(delete_response!='error'){
                    var node = $('#file-manager a[data-path="'+path+'"]');
                    node.parent('li').remove();
                    // Close any active files
                    $('#active-files a').each(function(){
                        var cur_path = $(this).attr('data-path');
                        if(cur_path.indexOf(path)==0){
                            active.remove(cur_path);
                        }
                    });
                }
                modal.unload();
            });                      
        });
    },
    
    //////////////////////////////////////////////////////////////////
    // Upload
    //////////////////////////////////////////////////////////////////
    
    upload_to_node : function(path){
        modal.load(500,this.dialog_upload+'?path='+path);
    },
    
    //////////////////////////////////////////////////////////////////
    // Download
    //////////////////////////////////////////////////////////////////
    
    download : function(path){
        var type = filemanager.get_type(path);
        $('#download').attr('src','components/filemanager/download.php?path='+path+'&type='+type);
    }
};