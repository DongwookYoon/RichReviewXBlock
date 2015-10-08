(function(r2){
    'use strict';

    var host = null;
    var blob_host = null;
    var course_id = null;
    var user_type = null;

    r2.course = (function(){
        var pub = {};

        pub.init = function(_blob_host, _host, _course_id, _user_type){
            host = _host;
            blob_host = _blob_host;
            course_id = _course_id;
            user_type = _user_type;

            announcements.init();
            surveys.init();
            submissions.init();
        };

        var announcements = (function(){
            var pub_an = {};

            pub_an.init = function(){
                postCourse('getAnnouncements').then(
                    function(announcements){
                        var x = 0;
                    }
                ).catch(
                    function(err){
                        Helper.Util.HandleError(err);
                    }
                );
            };

            return pub_an;
        }());

        var surveys = (function(){
            var pub_sv = {};

            pub_sv.init = function(){

            };

            return pub_sv;
        }());

        var submissions = (function(){
            var pub_sb = {};

            pub_sb.init = function(){

            };

            return pub_sb;
        }());

        var postCourse = function(op, msg){
            return new Promise(function(resolve, reject){
                var url = host+'course?op=' + op;
                var posting = $.post(url, msg);
                posting.success(function(resp){
                    resolve(resp);
                });
                posting.fail(function(resp){
                    reject(resp);
                });
            });
        };

        return pub;
    }());

}(window.r2 = window.r2 || {}));