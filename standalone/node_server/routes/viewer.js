var querystring = require('querystring');
var azure = require('../lib/azure');
var js_utils = require("../lib/js_utils");

exports.page = function (req, res) {
    req.session.latestUrl = req.originalUrl;

    if(!req.query.hasOwnProperty('access_code') || req.query['access_code'] == ""){
        res.render('viewer_page',
            {
                cur_page: 'Viewer',
                user: req.user
            }
        );
        return;
    }
    {
        var urlqueries = req.originalUrl.replace("/viewer?", "");
        if(req.user){
            urlqueries += "&user="+req.user.id;
        }
        urlqueries = querystring.parse(urlqueries);

        var r2_ctx = {
            pdfid: urlqueries["access_code"] || "",
            docid: urlqueries["docid"] || "",
            groupid: urlqueries["groupid"] || "",
            pdf_url: azure.BLOB_HOST + urlqueries["access_code"] + "/doc.pdf",
            pdfjs_url: azure.BLOB_HOST + urlqueries["access_code"] + "/doc.vs_doc",
            serve_dbs_url: js_utils.getHostname() + '/dbs?',
            pmo: urlqueries["pmo"] || "",
            comment: urlqueries["comment"] || ""
        };

        res.render(
            'viewer_webapp',
            {
                cur_page: 'Viewer',
                user: req.user,
                r2_ctx: encodeURIComponent(JSON.stringify(r2_ctx))
            }
        );
    }
};