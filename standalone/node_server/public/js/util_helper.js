/**
 * Created by dongwook on 4/9/15.
 */

var Helper ={};

Helper.Util = {
    HandleError: function(err){
        var s = '';
        if(err.message){
            s = err.message + '\n\n';
        }
        if(err.statusText){
            s = err.statusText + '\n\n';
        }
        if(err.responseText){
            if(err.responseText != '')
                s = err.responseText + '\n\n';
        }
        if(err.stack){
            s += err.stack;
        }
        if(typeof err === 'string'){
            s = err;
        }
        if(s===''){
            s += 'Unknown Error';
        }
        alert(s);
    }
};