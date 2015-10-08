(function(r2){
    'use strict';

    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    var host = null;
    var blob_host = null;
    var course_id = null;
    var user_type = null;
    var user_email = null;

    r2.course = (function(){
        var pub = {};

        pub.init = function(_blob_host, _host, _course_id, _user_type, _user_email){
            host = _host;
            blob_host = _blob_host;
            course_id = _course_id;
            user_type = _user_type;
            user_email = _user_email;

            announcements.init();
            surveys.init();
            if(_user_type === 'instructor'){
                submissions_instructor.init();
            }
            else if(_user_type === 'student'){
                submission_student.init();
            }
        };

        var announcements = (function(){
            var pub_an = {};

            pub_an.init = function(){
                postCourse('getAnnouncements', {course_id: course_id}).then(
                    function(announcements){
                        announcements.forEach(addAnnouncements);
                    }
                ).catch(
                    function(err){
                        Helper.Util.HandleError(err);
                    }
                );
            };

            var addAnnouncements = function(str){
                var $p = $(document.createElement('p'));
                $p.text(str);
                $('#announcement_items').append($p);
            };

            return pub_an;
        }());

        var surveys = (function(){
            var pub_sv = {};

            pub_sv.init = function(){
                postCourse('getSurveys', {course_id: course_id}).then(
                    function(surveys){
                        surveys.forEach(addSurveys);
                    }
                ).catch(
                    function(err){
                        Helper.Util.HandleError(err);
                    }
                );
            };

            var addSurveys = function(str){
                var $p = $(document.createElement('p'));
                $p.text(str);
                $('#survey_items').append($p);
            };

            return pub_sv;
        }());

        var submissions_instructor = (function(){
            var pub_sb = {};

            pub_sb.init = function(){
                postCourse('getSubmissions', {course_id: course_id}).then(
                    function(submissions){
                        submissions.forEach(function(submission){
                            submission.due = new Date(submission.due);
                        });
                        submissions.sort(function(a, b) {
                            if (a.due > b.due)
                                return 1;
                            if (a.due < b.due)
                                return -1;
                            return 0;
                        });
                        submissions.forEach(addSubmissions);
                    }
                ).catch(
                    function(err){
                        Helper.Util.HandleError(err);
                    }
                );
            };

            var addSubmissions = function(submission){
                var $tr = $(document.createElement('tr'));
                $tr.click(function(){
                    window.open(host+course_id+'?submission='+submission.id);
                });
                {
                    var $title = $(document.createElement('td'));
                    $title.text(submission.title);
                    $tr.append($title);

                    var $due = $(document.createElement('td'));
                    $due.text(formatDate(submission.due));
                    $tr.append($due);

                    var $status = $(document.createElement('td'));
                    $status.text(submission.status);
                    $tr.append($status);

                    var $status = $(document.createElement('td'));
                    $status.text(submission.submitted);
                    $tr.append($status);
                }
                $('#submission_items').append($tr);
            };

            var formatDate = function(d){
                var str = '';
                str += DAYS[d.getDay()] + ', ';
                str += d.getMonth()+1 + '/';
                str += d.getDate() + '/';
                str += d.getFullYear() + ', ';
                str += d.getHours() + ':';
                str += d.getMinutes() + ' ';
                str += d.getHours() < 12 ? 'AM' : 'PM' ;
                str += ' (EDT)' ;
                return str;
            };

            return pub_sb;
        }());

        var submission_student = (function(){
            var pub_ss = {};

            pub_ss.init = function(){
                postCourse('getSubmissionStudent', {course_id: course_id, user_email: user_email}).then(
                    function(submissions){
                        submissions.forEach(function(submission){
                            submission.due = new Date(submission.due);
                        });
                        submissions.sort(function(a, b) {
                            if (a.due > b.due)
                                return 1;
                            if (a.due < b.due)
                                return -1;
                            return 0;
                        });
                    }
                ).catch(
                    function(err){
                        Helper.Util.HandleError(err);
                    }
                );
            };

            return pub_ss;
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