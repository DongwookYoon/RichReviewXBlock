(function(r2){
    'use strict';

    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    var host = null;
    var blob_host = null;
    var course_id = null;
    var user_type = null;
    var user_email = null;
    var user_key = null;
    var review = null;

    r2.course = (function(){
        var pub = {};

        pub.init = function(_blob_host, _host, _course_id, _user_type, _user_email, _user_key, _review){
            host = _host;
            blob_host = _blob_host;
            course_id = _course_id;
            user_type = _user_type;
            user_email = _user_email;
            user_key = _user_key;
            review = _review;

            announcements.init();
            surveys.init();
            if(_user_type === 'instructor'){
                submissions_instructor.init();
            }
            else if(_user_type === 'instructor_review'){
                reviews.init();
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
                //$('#announcement_items').append($p);
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
            var pub_si = {};

            pub_si.init = function(){
                pub_si.submissions.init().then(
                    pub_si.enrollment.init
                ).catch(
                    function(err){
                        Helper.Util.HandleError(err);
                    }
                );
            };

            pub_si.submissions = (function(){
                var pub_sbs = {};

                pub_sbs.init = function(){
                    return postCourse('getSubmissions', {course_id: course_id}).then(
                        function(submissions_dict){
                            var submissions = [];
                            for (var id in submissions_dict) {
                                if (submissions_dict.hasOwnProperty(id)) {
                                    var sub = submissions_dict[id];
                                    sub.id = id;
                                    submissions.push(sub);
                                }
                            }
                            submissions.forEach(function(submission){
                                submission.due = new Date(submission.due);
                            });
                            submissions.sort(sortByDueDate);
                            submissions.forEach(pub_sbs.add);
                        }
                    )
                };

                pub_sbs.add = function(submission){
                    var $tr = $(document.createElement('tr'));
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

                        var $submitted = $(document.createElement('td'));
                        $submitted.text(submission.submitted);
                        $tr.append($submitted);


                        var $review = $(document.createElement('td'));
                        {
                            var $btn = createNewDomElement('a', ['btn', 'btn-default','btn-sm'], $review);
                            $btn.text('Open');
                            $btn.click(function(){
                                window.open(host+course_id+'?review='+submission.id);
                            });
                        }
                        $tr.append($review);
                    }
                    $('#submission_items').append($tr);
                };

                return pub_sbs;
            }());

            pub_si.enrollment = (function(){
                var pub_sie = {};

                pub_sie.init = function(){
                    $('#enrollment_items').find('tr').remove();
                    $('#enrollment_add_student_input').find('.form-group').remove();
                    return postCourse('getEnrollment', {course_id: course_id}).then(
                        function(enrollment){
                            enrollment.sort();
                            enrollment.forEach(addDom);
                            addStudentInputGroup();
                        }
                    );
                };

                var addDom = function(email){
                    var $tr = $(document.createElement('tr'));
                    {
                        var $title = $(document.createElement('td'));
                        $title.text($('#enrollment_items').children().length+1);
                        $tr.append($title);

                        var $email = $(document.createElement('td'));
                        $email.text(email);
                        $tr.append($email);

                        var $status = $(document.createElement('td'));
                        $status.text('Enrolled');
                        $tr.append($status);

                        var $manage = $(document.createElement('td'));
                        {
                            var $btn_group = createNewDomElement('div', ['btn-group'], $manage);
                            var $btn_delete = createNewDomElement('a', ['btn', 'btn-danger','btn-sm'], $btn_group);
                            $btn_delete.append(getIcon('fa-user-times'));
                            setDropDownBtn($btn_group, 'Remove '+email, function(){
                                removeStudent(email).then(
                                    function(){
                                        pub_sie.init();
                                        return null;
                                    }
                                ).catch(
                                    function(err){
                                        Helper.Util.HandleError(err);
                                    }
                                );
                            });
                        }
                        $tr.append($manage);
                    }
                    $('#enrollment_items').append($tr);
                };

                var removeDom = function(email){
                    $('#enrollment_items').find('enrollment_'+email).remove();
                };

                var addStudentInputGroup = function(){
                    var $form_group = createNewDomElement('div', ['form-group', 'add_student_input'], $('#enrollment_add_student_input'));
                    {
                        var $input_group = createNewDomElement('span', ['input-group'], $form_group);
                        {
                            var $input = createNewDomElement('input', ['form-control', 'input-sm'], $input_group);
                            $input.attr('placeholder', 'student email(s), comma-separated');

                            var $button = createNewDomElement('button', ['btn', 'btn-primary', 'btn-sm'], $input_group);
                            $button.append(getIcon('fa-user-plus'));
                            $button.click(function(){
                                addStudents($input[0].value).then(
                                    function(emails){
                                        pub_sie.init();
                                    }
                                ).catch(
                                    function(err){
                                        Helper.Util.HandleError(err);
                                    }
                                );
                            });
                        }
                    }
                };

                var addStudents = function(emails){
                    return postCourse('addEnrollment', {course_id: course_id, emails: emails});
                };

                var removeStudent = function(email){
                    return postCourse('removeEnrollment', {course_id: course_id, email: email});
                };

                return pub_sie;
            }());

            return pub_si;
        }());

        var submission_student = (function(){
            var pub_ss = {};

            pub_ss.init = function(){
                return pub_ss.submissions.init().catch(
                    function(err){
                        Helper.Util.HandleError(err);
                    }
                );
            };

            pub_ss.submissions = (function(){
                var pub_sss = {};

                pub_sss.init = function(){
                    $('#submission_items').find('tr').remove();
                    return postCourse('student_getSubmissions', {course_id: course_id, email: user_email}).then(
                        function(submissions_dict){
                            var submissions = [];
                            for (var id in submissions_dict) {
                                if (submissions_dict.hasOwnProperty(id)) {
                                    var sub = submissions_dict[id];
                                    sub.id = id;
                                    submissions.push(sub);
                                }
                            }
                            submissions.forEach(function(submission){
                                submission.due = new Date(submission.due);
                            });
                            submissions.sort(sortByDueDate);
                            submissions.forEach(pub_sss.add);
                        }
                    )
                };

                pub_sss.add = function(submission){
                    var $tr = $(document.createElement('tr'));
                    {
                        var $title = $(document.createElement('td'));
                        $title.text(submission.title);
                        $tr.append($title);

                        var $review = $(document.createElement('td'));
                        if(submission.status === 'ReadyForReview'){
                            var $btn = createNewDomElement('a', ['btn', 'btn-default','btn-sm'], $review);
                            $btn.text('Open');
                            $btn.click(function(){
                                window.open(host+'viewer?'+
                                    'access_code='+submission.group.pdf_hash +
                                    '&docid=' + submission.group.doc_id.substring(4) +
                                    '&groupid=' + submission.group.group_id.substring(4)
                                );
                            });
                        }
                        else{
                            $review.text('Pending');
                        }
                        $tr.append($review);
                    }
                    $('#submission_items').append($tr);
                };

                var uploadPdf = (function(){
                    var pub_sssu = {};

                    pub_sssu.getFileInput = function(){
                        var $input = createNewDomElement('input', ['file', 'pdf-file-input']);
                        $input.attr('name', 'File');
                        $input.attr('type', 'file');
                        return $input;
                    };

                    pub_sssu.getUploadBtn = function(submission_id){
                        var $btn = createNewDomElement('a', ['btn', 'btn-default','btn-sm']);
                        $btn.text('Upload');
                        $btn.toggleClass('disabled', true);
                        return $btn;
                    };

                    pub_sssu.link = function($btn, $file_input, submission_id){
                        var onfilechange = function(e){

                            if(e.target.files.length === 0 || e.target.files[0].type !== 'application/pdf' ){
                                alert('We take a PDF file only.')
                            }
                            else{
                                this.pdf_file = e.target.files[0];
                                $btn.toggleClass('disabled', false);
                            }
                        };
                        var onerror = function(xhr, desc, err) {
                            console.log(desc);
                            console.log(err);
                            alert('File uploading failed: ', err, desc);
                            progressModal.hide();
                        };
                        var onprogress = function(evt){
                            if (evt.lengthComputable) {
                                progressModal.updateProgress(100*evt.loaded/evt.total);
                            }
                        };
                        var onload = function(evt){
                            postCourse(
                                'student__doneUploadPdf',
                                {
                                    course_id: course_id,
                                    email: user_email,
                                    submission_id: submission_id
                                }
                            ).then(
                                function(){
                                    pub_sss.init();
                                    progressModal.hide();
                                }
                            ).catch(
                                function(err){
                                    Helper.Util.HandleError(err);
                                }
                            );
                        };

                        // actual binding
                        $file_input.bind('change', onfilechange);
                        $btn.click(function(){
                            var filename = submission_id+'.pdf';
                            postCourse(
                                'student__getUploadSas',
                                {
                                    course_id: course_id,
                                    email: user_email,
                                    filename: filename
                                }
                            ).then(
                                function(sas){
                                    progressModal.show('Uploading ' + filename);
                                    var url = blob_host+course_id.replace('_', '-')+'/'+user_key+'/'+filename;
                                    if(typeof $file_input[0].pdf_file === 'undefined'){
                                        alert('I think you did\'t select any file yet.');
                                    }
                                    else {
                                        var reader = new FileReader();
                                        reader.onloadend = function(evt){
                                            if (evt.target.readyState === FileReader.DONE) {
                                                var requestData = new Uint8Array(evt.target.result);

                                                $.ajax({
                                                    url: url+'?'+sas,
                                                    type: 'PUT',
                                                    data: requestData,
                                                    processData: false,
                                                    beforeSend: function(xhr) {
                                                        xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
                                                    },
                                                    xhr: function(){
                                                        var xhr = new window.XMLHttpRequest();
                                                        xhr.upload.addEventListener('progress', onprogress, false);
                                                        xhr.upload.addEventListener('load', onload, false);
                                                        return xhr;
                                                    },
                                                    error: onerror
                                                });
                                            }
                                        };
                                        reader.readAsArrayBuffer($file_input[0].pdf_file);
                                    }
                                }
                            ).catch(
                                function(err){
                                    Helper.Util.HandleError(err);
                                }
                            );
                        });
                    };

                    return pub_sssu;
                }());

                return pub_sss;
            }());

            return pub_ss;
        }());

        var reviews = (function(){
            var pub_rv = {};

            pub_rv.init = function(){
                postCourse('getSubmissions', {course_id: course_id}).then(
                    function(submissions_dict){
                        $('#reviews').find('.panel-heading').find('.title').text(
                            submissions_dict[review].title
                        );
                        return null;
                    }
                ).then(
                    review_items.init
                ).catch(
                    function(err){
                        Helper.Util.HandleError(err);
                    }
                );
            };

            var review_items = (function(){
                var pub_rvr = {};

                pub_rvr.init = function(){
                    return postCourse(
                        'getReviewItems',
                        {
                            course_id: course_id,
                            review: review
                        }
                    ).then(
                        function(review_items){
                            review_items.sort(sortByGroupAndEmail);
                            review_items.forEach(function(item){
                                add(item);
                            });
                        }
                    );
                };

                var add = function(item){
                    var submitted = item.submission_time !== null &&
                        (item.status === 'Submitted' || item.status === 'ReadyForReview');
                    var ready = item.status === 'ReadyForReview';
                    var $tr = $(document.createElement('tr'));
                    {
                        var $n = $(document.createElement('td'));
                        $n.text($('#review_items').children().length+1);
                        $tr.append($n);

                        var $email = $(document.createElement('td'));
                        $email.text(item.email);
                        $tr.append($email);

                        var $due = $(document.createElement('td'));
                        $due.text(formatDate(new Date(item.due)));
                        $tr.append($due);

                        var $review = $(document.createElement('td'));
                        {
                            if (ready){
                                var $btn = createNewDomElement('a', ['btn', 'btn-default','btn-sm'], $review);
                                $btn.text('Open');
                                $btn.click(function(){
                                    window.open(host+'viewer?'+
                                        'access_code='+item.group.pdf_hash +
                                        '&docid=' + item.group.doc_id.substring(4) +
                                        '&groupid=' + item.group.group_id.substring(4)
                                    );
                                });
                            }
                            else if(submitted)
                            {
                                var $p = $(document.createElement('p'));
                                $p.text('Pending');
                                $review.append($p);

                                var $btn = createNewDomElement('a', ['btn', 'btn-default','btn-sm'], $review);
                                $btn.text('?');
                                $btn.click(function(){
                                    alert('The student ' + item.email + ' has made the submission successfully in time. ' +
                                    'Researchers are processing the submission file into the format ' +
                                    'to which the instructors can give a feedback.' );
                                });
                                $p.append($btn);
                            }
                            else{
                                $review.text('-');
                            }
                        }
                        $tr.append($review);
                    }
                    $('#review_items').append($tr);
                };

                return pub_rvr;
            }());

            return pub_rv;
        }());

        var progressModal = (function(){
            var pub = {};

            var $dom = $('#progress-modal');

            pub.show = function(title){
                $dom.attr('title', title);
                $dom.dialog({
                    resizable: false,
                    width: 600,
                    minHeight: 10,
                    modal: true
                });
                pub.updateProgress(0);
            };

            pub.hide = function(){
                $dom.dialog( "close" );
            };

            pub.updateProgress = function(percent){
                $dom.find('#progress-bar').progressbar({value:percent});
            };

            return pub;
        }());

        var sortByDueDate = function(a, b) {
            if (a.due > b.due)
                return 1;
            if (a.due < b.due)
                return -1;
            return 0;
        };

        var sortByGroupAndEmail = function(a, b) {
            if(a.group !== null && b.group === null)
                return -1;
            if(a.group === null && b.group !== null)
                return 1;

            if (a.email > b.email)
                return 1;
            if (a.email < b.email)
                return -1;
            return 0;
        };

        var formatDate = function(d){
            var str = '';
            str += MONTHS[d.getMonth()] + ' ';
            str += d.getDate() + ' (';
            str += DAYS[d.getDay()] + '), ';
            str += d.getHours() + ':';
            str += d.getMinutes() + ' ';
            str += d.getHours() < 12 ? 'AM' : 'PM' ;
            return str;
        };

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

        var createNewDomElement = function(type, classes, parent){
            var $dom = $(document.createElement(type));
            classes.forEach(function(cls){
                $dom.toggleClass(cls, true);
            });
            if(parent)
                parent.append($dom);
            return $dom;
        };

        var getIcon = function(icon){
            var $icon = $(document.createElement('i'));
            $icon.toggleClass('fa');
            $icon.toggleClass(icon);
            return $icon;
        };

        var setDropDownBtn = function($btn_group, dropdn_msg, cb){
            $btn_group.attr('role', 'group');

            var $btn = $btn_group.find('.btn');
            $btn.attr('data-toggle', 'dropdown');
            $btn.toggleClass('dropdown-toggle', true);

            var $ul = createNewDomElement('ul', ['dropdown-menu'], $btn_group);
            $ul.attr('role', 'menu');
            var $li = createNewDomElement('li', [], $ul);

            var $btn_confirm = createNewDomElement('a', ['btn', 'btn-default','btn-sm'], $li);
            $btn_confirm.text(dropdn_msg);
            $btn_confirm.click(cb);
            return $btn_confirm;
        };

        return pub;
    }());

}(window.r2 = window.r2 || {}));
