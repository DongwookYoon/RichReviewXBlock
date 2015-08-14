/**
 * Created by Dongwook on 2/4/2015.
 */

var SERVER_URL;
if(document.location.hostname == "localhost")
{SERVER_URL = "https://localhost:8001/";}
else
{SERVER_URL = "https://richreview.net/";}

var selecteddoc = null;
var selectedgroup = null;


function AnimateUiBtn(btn, to_animate){
    btn.toggleClass("disabled", to_animate);
    btn.find("i").toggleClass("faa-flash animated", to_animate);
}

var InitGroup = function(docid_n, groupid_n){
    $("#grouptitle_"+groupid_n).editable({
      tpl: "<input type='text' style='font-family: inherit;font-weight: 400;line-height: 1.1;font-size:14px;width:400px;'>",
      placement: 'bottom'
    });
};

var PostToDbs = function(op, msg, cb){
    var url = SERVER_URL+'dbs?op=' + op;
    var posting = $.post(url, msg);
    posting.success(function(resp){
        if(cb)
            cb(null, resp);
    });
    posting.fail(function(resp){
        if(cb)
            cb(resp, null);
    });
};

var HandleError = function(err, toreport){
    toreport = typeof toreport == "undefined" ? true : toreport;
    if(toreport){
        alert("Oops, there was an internal server error while processing your request. "+
            "If this error persist, please report the following error message to the system manager.\n\n" +
            JSON.stringify(err.status + ": " +err.responseText));
    }
    else{
        alert((err.responseText));
    }
};

function RefreshPage(){
    window.top.location.replace( SERVER_URL + "mydocs" );
}

function AddNewGroup(docid){
    var btn = $("#AddNewGroupBtn_" + docid.substring(4));
    AnimateUiBtn(btn, true);
    PostToDbs("MyDoc_AddNewGroup", {"docid":docid}, function(err, resp){
        if(err){
            HandleError(err);
            AnimateUiBtn(btn, false);
        }
        else{
            RefreshPage();
        }
    });
}

function SelectGroup(doc_id, group_id){
    SelectDoc(doc_id);
    if(selectedgroup){
        $("#group_"+selectedgroup).toggleClass("selected", false);
    }
    selectedgroup = group_id;
    $("#group_"+group_id).toggleClass("selected", true);
}

function SelectDoc(doc_id){
    if(selecteddoc){
        $("#panel_"+selecteddoc).toggleClass("selected", false);
    }
    selecteddoc = doc_id;
    $("#panel_"+doc_id).toggleClass("selected", true);

    if(selectedgroup){
        $("#group_"+selectedgroup).toggleClass("selected", false);
        selectedgroup = null;
    }
}

function DeleteGroup(doc_id_n, group_id_n){
    if(confirm('Do you really want to delete this group?' +
        '\n\nThis operation is NOT reversible.')){
        var btn = $("#DeleteBtn_" + doc_id_n + "_" + group_id_n);
        AnimateUiBtn(btn, true);
        PostToDbs("DeleteGroup", {"docid_n":doc_id_n, "groupid_n":group_id_n}, function(err){
            if(err){
                HandleError(err);
                AnimateUiBtn(btn, false);
            }
            else{
                RefreshPage();
            }
        });
    }

}

function DeleteDocument(docid_n){
    if(confirm('Do you really want to delete this document,' +
        ' and all the groups belonging to this document?' +
        '\n\nThis operation is NOT reversible.')){

        var btn = $("#DeleteDocumentBtn_" + docid_n);
        AnimateUiBtn(btn, true);
        PostToDbs(
            "DeleteDocument",
            {"docid_n": docid_n},
            function(err){
                if(err){
                    HandleError(err);
                    AnimateUiBtn(btn, false);
                }
                else{
                    RefreshPage();
                }
            }
        );
    }
}

function AddMyselfToGroup(){
    var btn = $("#addnewgroup_group");
    AnimateUiBtn(btn, true);

    var group_codes = $("#addnewgroup_input")[0].value.trim().split(/\s+/);
    if(group_codes.length == 1){
        PostToDbs(
            "AddMyselfToGroup",
            {
                "groupcode": group_codes[0]
            },
            function(err){
                if(err){
                    HandleError(err, false);
                    RefreshPage();
                }
                else{
                    RefreshPage();
                }
            }
        );
    }
    else{
        alert("Sorry, that's an invalid Group Code.");
        AnimateUiBtn(btn, false);
    }
}

function RemoveGroupMember(groupid, userid_n){
    PostToDbs("RemoveGroupMember", {"groupid": groupid, "userid_n": userid_n}, function(err, msg){
        if(err){HandleError(err);}
        else{
            if(msg){
                aleart(msg);
            }
            RefreshPage();
        }
    });
}

function ShareGroup(groupid){
    window.prompt("Share this GroupCode with your fellow workers!", groupid);
}