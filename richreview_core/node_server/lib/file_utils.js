/**
 *
 * Created by Colin / Dongwook
 */

const path = require('path');

exports.walkSync = (dir, filelist) => {
    var fs = fs || require('fs'),
        files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function(item) {
        var item_path = path.join(dir, item);
        if (fs.statSync(item_path).isDirectory()) {
            filelist = exports.walkSync(item_path, filelist);
        }
        else {
            filelist.push(item_path);
        }
    });
    return filelist;
};

exports.getWebAppUrls = function(start_path, prefix, exclude){
    var filelist = [];
    const full_start_path = path.join(__dirname, "../..", start_path);
    exports.walkSync(full_start_path, filelist);
    filelist.forEach(function(file, i){
        filelist[i] = file.substring(full_start_path.length + 1);
    });
    var urls = {};
    filelist.forEach(function(file, i) {
        if(file.match(exclude)===null){
            urls[file] = prefix + file;
        }
    });
    // for(var key in urls) { console.log(key + " : " + urls[key]); }
    return urls;
};