/**
 * Created by ukka123 on 12/6/14.
 */
var js_utils = require("../lib/js_utils");
var azure = require('../lib/azure');
var fs = require('fs');
var PATH_LOGFILE = '../cache/log.txt';
var S = require('string');

var docids = [
    '017bd78bbe0f861a6630d9831568ad379cd3a2f1',
    'b8b707d8cbd35590d1dbd26d793954a7fd6002c6',
    'c4e68bd51266a40a428856e2253aad62c047c415',
    'fca11be52323d519b47877c2c65d18f8f3b79631',
    '0fda5518d67af04cfc2d414096a1659a53697c78',
    '925e9916b179e2b931c91fb13092faf393617ae2',
    '931c58b138af1abd5aacf7fdda4a6ae72d6084e2',
    '0195152a1eb938fc3da4a6cd0e266cb02918f34f',
    '750347d373bfdc9465a2ffb83d609b7ec24d7c50',
    'cca7e4d22700b5d9380f9383afe65470d7015de6',
    'e9671b091667194eeb40a82d35359cdf30978650',
    'da23ffc83e9e2dce8e6932237c1ebd9dc991f6f3',
    '3c6c8122dcfed50d0ab5e94a6a3bea4f96d97dd2',
    '329b32e629b5cfe291c24643c3347952198cbc7c',
    '9cfb79887a92a4360a2a7822081060ed1e3482e7',
    '2c2977503dba69b16d71429cfce30352eb56f494'];

function RawDataToCSV(rawData){
    var csv = 'Event Time, Event, User, Action\n';

    for (var i = 0; i < docids.length; ++i) {

        var pdata = rawData[docids[i]];
        for (var j = 0; j < pdata.length; ++j) {
            var op = null;

            var action = JSON.parse(pdata[j].LOGSTR);
            if (action.op == 'AudioPlay') {
                switch (action.type) {
                    case 'waveform':
                        op = "Indexing Waveform";
                        break;
                    case 'strokepen':
                        op = "Indexing Pen Stroke";
                        break;
                    case 'spotlight':
                        op = "Indexing Spotlight";
                        break;
                    case 'space':
                        op = "Pressing Keyboard (space)";
                        break;
                    case 'click_play':
                        op = "Clicking Play Button on Menu";
                        break;
                    case 'radialmenu0':
                        op = "Clicking Marking Menu";
                        break;
                    case 'radialmenu1':
                        op = "Clicking Marking Menu";
                        break;
                    case 'auto':
                        op = "Autoplay";
                        break;
                    default:
                        console.log(action.type);
                        break;
                }
            }

            if (action.op == 'Nav') {
                switch (action.input) {
                    case 'mouse':
                        op = "Mouse Drag";
                        break;
                    case 'touch':
                        op = "Mouse Drag";
                        break;
                    case 'wheel':
                        op = "Mouse Wheel-Down/Up";
                        break;
                    case 'click_zoomin':
                        op = "Zoom-in/out";
                        break;
                    case 'click_zoomout':
                        op = "Zoom-in/out";
                        break;
                    case 'click_goto_page':
                        op = "Move Page";
                        break;
                    default:
                        console.log(action.input);
                        break;
                }
            }

            if (action.op == 'Collapse') {
                switch (action.what) {
                    case 'all':
                        op = "Collapse Entire Page";
                        break;
                    default:
                        op = "Collapse Individual Piece";
                        break;
                }
            }
            if (action.op == 'Expand') {
                switch (action.what) {
                    case 'all':
                        op = "Expand Entire Page";
                        break;
                    default:
                        op = "Expand Individual Piece";
                        break;
                }
            }
            if(op != null && action.user==''){
                csv += pdata[j].TIME + ',' + js_utils.JSDateStrToExcelDateStr(pdata[j].TIME.substring(0, 24)) + ',' + pdata[j].DOCID + ',' + op + '\n';
            }
        }
    }
    return csv;
}


function GetRawData_GetSql_Doc(i, raw_data, callback){
    var c_name = docids[i];
    var cmd = "SELECT * from LOGS WHERE DOCID = '" + c_name + "'";
    azure.sqlQuery(cmd, function (error, result) {
        if (error) {
            callback(error, null)
        }
        else {
            raw_data[docids[i]] = result;
            if(Object.keys(raw_data).length == docids.length){
                callback(null, raw_data);
            }
        }
    });
}

function GetRawData_GetSql(callback) {
    var raw_data = {};
    for(var i = 0; i < docids.length; ++i){
        GetRawData_GetSql_Doc(i, raw_data, callback);
    }
}

function GetRawData_UpdateCache(callback){
    GetRawData_GetSql(function(error, result){
        if(error){
            callback(error, null);
        }
        else{
            //var s = RawDataToCSV(result);
            var s = JSON.stringify(result);
            fs.writeFile(PATH_LOGFILE, s, function(error){
                callback(error, s);
            });
        }
    });
}

function GetRawData_LoadCache(callback){
    fs.stat(PATH_LOGFILE, function(error, result){
        if(error){
            callback(error, null)
        }
        else{
            var diff = (new Date()).getMinutes()-(new Date(result.mtime)).getMinutes();
            if(diff > 10){
                callback('obsolete cache', null)
            }
            else{
                fs.readFile(PATH_LOGFILE, 'utf8', function(error, result){
                    callback(error, result)
                });
            }
        }
    });
}

function GetRawData(res, req){
    GetRawData_LoadCache(function(error, result){
        if(error){
            GetRawData_UpdateCache(function(error, result){
                if(error){
                    js_utils.PostResp(res, req, 500);
                }
                else{
                    js_utils.PostResp(res, req, 200, result);
                }
            });
        }
        else{
            js_utils.PostResp(res, req, 200, result);
        }
    });
}


exports.post = function (req, res) {
    switch(req.query['op']){
        case 'getRawData':
            GetRawData(res, req);
            break;
        default:
            break;
    }
};

exports.get = function (req, res) {
    switch(req.query['op']){
        case 'getRawData':
            GetRawData(res);
            break;
        default:
            break;
    }
};