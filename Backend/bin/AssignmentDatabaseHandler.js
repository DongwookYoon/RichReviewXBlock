const RedisClient = require("./RedisClient");
const RedisToJSONParser = require("./RedisToJSONParser");
const KeyDictionary = require("./KeyDictionary");
const DateHelper = require("./DateHelper");
const NotAuthorizedError = require("../errors/NotAuthorizedError");
const RichReviewError = require("../errors/RichReviewError");
const late = require('../lib/late');

class AssignmentDatabaseHandler {

    constructor(){
        RedisClient.get_instance().then((db_handler) => {
            this.db_handler = db_handler;
        });
    }



    static async get_instance() {
        if (this.instance) {
            console.log('Database handler instance found');
            return this.instance;
        }

        this.instance = await new AssignmentDatabaseHandler();
        return this.instance;
    }



    async set_assignment_extensions (import_handler, user_key, course_key, assignment_key, extensions) {
        let user_db_handler = await import_handler.user_db_handler;
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'ta' && permissions !== 'instructor')
            throw new NotAuthorizedError('You are not authorized to change assignment extensions');

        await this.set_assignment_data(assignment_key, 'extensions', JSON.stringify(extensions));
    }



    async edit_assignment (import_handler, user_key, assignment_key, edits) {

        if(!(await this.is_valid_assignment_key(assignment_key)))
            throw new RichReviewError('Invalid assignment key');

        let user_db_handler = await import_handler.user_db_handler;

        let user_data = await user_db_handler.get_user_data(user_key);

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);

        if(assignment_data === undefined ||
            (!user_data['teaching'].includes(assignment_data['course']) &&
            !user_data['taing'].includes(assignment_data['course'])))
            throw new NotAuthorizedError('You are not authorized to edit this assignment');

        for (const field in edits) {
            let value = edits[field];

            if (DateHelper.is_date(field))
                value = DateHelper.format_date(value);

            await this.set_assignment_data(assignment_key, field, value);
        }
    }



    async create_assignment (import_handler, course_key, assignment_data) {
        if(!this.is_valid_assignment_data(assignment_data))
            throw new RichReviewError('Invalid assignment data');

        let course_db_handler = await import_handler.course_db_handler;

        if (!(await course_db_handler.is_valid_course_key(course_key)))
            throw new RichReviewError('Invalid course key');

        let highest_key = await this.get_largest_assignment_key();

        let assignment_key = KeyDictionary.key_dictionary['assignment'] + (highest_key + 1);

        for (const field in assignment_data) {
            let value = assignment_data[field];

            if (DateHelper.is_date(field))
                value = DateHelper.format_date(value);

            await this.set_assignment_data(assignment_key, field, value);
        }

        //Set default assignment data
        await this.set_assignment_data(assignment_key, 'id', highest_key + 1);
        await this.set_assignment_data(assignment_key, 'course', course_key);
        await this.set_assignment_data(assignment_key, 'group', '');
        await this.set_assignment_data(assignment_key, 'creation_date', new Date().toISOString());
        await this.set_assignment_data(assignment_key, 'extensions', '[]');

        await course_db_handler.add_assignment_to_course(assignment_key, course_key);

        return assignment_key;
    }



    async create_document_submission_assignment (import_handler, course_key, assignment_data) {

        let course_db_handler = await import_handler.course_db_handler;

        if (course_key === undefined)
            throw new RichReviewError ('No course key');
        if (assignment_data === undefined)
            throw new RichReviewError ('No assignment data');
        if (!(await course_db_handler.is_valid_course_key(course_key)))
            throw new RichReviewError('Invalid course key');

        let course_data = await course_db_handler.get_course_data(course_key);
        if (assignment_data['group_assignment'] && course_data['active_course_groups'].length === 0)
            throw new RichReviewError('The course does not have any course groups');


        let assignment_key = await this.create_assignment(import_handler, course_key, assignment_data);

        // Create submissions / submitters for each user/group
        let submission_db_handler = await import_handler.submission_db_handler;

        let submission_keys = [];

        if (!assignment_data['group_assignment']) {
            submission_keys = await submission_db_handler.create_submission_for_each_user_and_return_keys(
                import_handler,
                course_key,
                assignment_key);

        } else {
            submission_keys = await submission_db_handler.create_submission_for_each_course_group_and_return_keys(
                import_handler,
                course_key,
                assignment_key);
        }

        await this.set_assignment_data(assignment_key, 'submissions', JSON.stringify(submission_keys));

        return assignment_key;
    }



    async create_comment_submission_assignment (import_handler, user_key, course_key, assignment_data, files) {

        let course_db_handler = await import_handler.course_db_handler;
        let user_db_handler = await import_handler.user_db_handler;

        if (course_key === undefined)
            throw new RichReviewError ('No course key');
        if (assignment_data === undefined)
            throw new RichReviewError ('No assignment data');
        if (files === undefined)
            throw new RichReviewError('No assignment files');
        if (!(await user_db_handler.is_valid_user_key(user_key)))
            throw new RichReviewError('Invalid user key');
        if (!(await course_db_handler.is_valid_course_key(course_key)))
            throw new RichReviewError('Invalid course key');
        if (Object.keys(assignment_data).length === 0)
            throw new RichReviewError('Invalid assignment data');
        if(!this.is_valid_assignment_data(assignment_data))
            throw new RichReviewError('Invalid assignment data');
        if (Object.keys(files).length === 0)
            throw new RichReviewError('No assignment files');

        let course_data = await course_db_handler.get_course_data(course_key);
        if (assignment_data['group_assignment'] && course_data['active_course_groups'].length === 0)
            throw new RichReviewError('The course does not have any course groups');


        let document_upload_handler = await import_handler.doc_upload_handler;
        let document_db_handler = await import_handler.doc_db_handler;
        let group_db_handler = await import_handler.group_db_handler;
        let submission_db_handler = await import_handler.submission_db_handler;
        let submitter_db_handler = await import_handler.submitter_db_handler;

        // Upload pdf to azure
        let main_context = await document_upload_handler.upload_documents(files);

        // Add doc and grp to redis
        let user_id = user_key.replace(KeyDictionary.key_dictionary['user'], '');
        let main_doc_key = await document_db_handler.create_doc(user_id, main_context.container);
        let main_group_key = await group_db_handler.create_group(user_id, main_doc_key);
        await document_db_handler.add_group_to_doc(main_doc_key, main_group_key);
        await user_db_handler.add_group_to_user(user_key, main_group_key);

        let assignment_key = await this.create_assignment(import_handler, course_key, assignment_data);

        await this.set_assignment_data(assignment_key, 'group', main_group_key);


        let submission_keys = [];

        if (!assignment_data['group_assignment']) {
            submission_keys = await submission_db_handler.create_submission_for_each_user_and_return_keys(
                import_handler,
                course_key,
                assignment_key);

        } else {
            submission_keys = await submission_db_handler.create_submission_for_each_course_group_and_return_keys(
                import_handler,
                course_key,
                assignment_key);
        }


        for (let submission_key of submission_keys) {

            // Upload pdf to azure
            let context = await document_upload_handler.upload_documents(files);

            // Add doc and grp to redis
            let doc_key = await document_db_handler.create_doc(user_id, context.container);

            let group_key = await group_db_handler.create_group(user_id, doc_key);
            await group_db_handler.add_submission_to_group(group_key, submission_key);

            await document_db_handler.add_group_to_doc(doc_key, group_key);

            await user_db_handler.add_group_to_user(user_key, group_key);

            await submission_db_handler.add_group_to_comment_submission(submission_key, group_key);

            let submission_data = await submission_db_handler.get_submission_data(submission_key);

            let submitter_key = submission_data['submitter'];

            let submitter_data = await submitter_db_handler.get_submitter_data(submitter_key);

            let members = submitter_data['members'];

            for (let member of members) {
                await user_db_handler.add_group_to_user(member, group_key);
                let member_id = member.replace(KeyDictionary.key_dictionary['user'], '');
                await group_db_handler.add_user_to_group(member_id, group_key);
            }
        }

        await this.set_assignment_data(assignment_key, 'submissions', JSON.stringify(submission_keys));

        return assignment_key;
    }



    async submit_document_assignment (import_handler, user_id, course_key, assignment_key, files) {
        let document_upload_handler = await import_handler.doc_upload_handler;
        let document_db_handler = await import_handler.doc_db_handler;
        let group_db_handler = await import_handler.group_db_handler;
        let user_db_handler = await import_handler.user_db_handler;
        let submission_db_handler = await import_handler.submission_db_handler;
        let submitter_db_handler = await import_handler.submitter_db_handler;
        let course_db_handler = await import_handler.course_db_handler;

        let user_key = KeyDictionary.key_dictionary['user'] + user_id;

        // Associate group with submission
        let submission_key = await this.get_users_submission_key(import_handler, user_key, assignment_key);
        let submission_data = await submission_db_handler.get_submission_data(submission_key);

        if (submission_data['submission_time'] !== '') {
            let assignment_data = await this.get_assignment_data(user_key, assignment_key);
            if (!assignment_data['allow_multiple_submissions'])
                throw new RichReviewError('This assignment doesn\'t allow multiple submissions');
        }

        let context = await document_upload_handler.upload_documents(files);

        // Add doc and grp to redis
        let doc_key = await document_db_handler.create_doc(user_id, context.container);
        let group_key = await group_db_handler.create_group(user_id, doc_key);

        await document_db_handler.add_group_to_doc(doc_key, group_key);


        let submitter_key = await submission_data['submitter'];
        let submitter_data = await submitter_db_handler.get_submitter_data(submitter_key);

        for (let member of submitter_data['members']) {
            if (member !== user_key) {
                await user_db_handler.add_group_to_user(member, group_key);
                member = member.replace(KeyDictionary.key_dictionary['user'], '');
                await group_db_handler.add_user_to_group(member, group_key);
            }
        }

        await group_db_handler.add_submission_to_group(group_key, submission_key);
        await submission_db_handler.add_group_to_document_submission(submission_key, group_key);

        // Add tas and instructors to the group
        let tas_and_instructors = await course_db_handler.get_course_tas_and_instructors(course_key);

        for (let ta of tas_and_instructors['tas']) {
            let ta_id = ta.replace(KeyDictionary.key_dictionary['user'], '');
            await group_db_handler.add_user_to_group(ta_id, group_key);
        }

        for (let instructor of tas_and_instructors['instructors']) {
            let instructor_id = instructor.replace(KeyDictionary.key_dictionary['user'], '');
            await group_db_handler.add_user_to_group(instructor_id, group_key);
        }

        return submission_key;
    }



    get_largest_assignment_key () {
        return new Promise((resolve, reject) => {
            this.db_handler.client.keys(KeyDictionary.key_dictionary['assignment'] + '*', (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('KEY result -> ' + result);

                result = result.map((key) => {
                    return parseInt(key.replace(KeyDictionary.key_dictionary['assignment'], ''));
                });
                result.push(0);
                result.sort((a, b) => {
                    return a - b;
                });
                resolve(result[result.length - 1]);
            });
        })
    }



    async get_assignment (import_handler, user_key, course_key, assignment_key) {
        let user_db_handler = await import_handler.user_db_handler;
        let course_db_handler = await import_handler.course_db_handler;

        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);
        let course_data = await course_db_handler.get_course_data(course_key);
        let data = {};

        if (permissions === 'student') {
            data = await this.get_assignment_for_students(import_handler, user_key, assignment_key);
        } else if (permissions === 'instructor' || permissions === 'ta') {
            data = await this.get_assignment_for_tas_and_instructors(import_handler, user_key, assignment_key);
        }

        data['permissions'] = permissions;
        data['course_title'] = course_data['title'];
        return data
    }



    async get_assignment_for_students (import_handler, user_key, assignment_key) {
        let submission_db_handler = await import_handler.submission_db_handler;
        let group_db_handler = await import_handler.group_db_handler;
        let doc_db_handler = await import_handler.doc_db_handler;

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        delete assignment_data['display_grade_as'];
        delete assignment_data['count_toward_final_grade'];
        delete assignment_data['creation_date'];
        delete assignment_data['submissions'];

        let submission_key = await this.get_users_submission_key(
            import_handler,
            user_key,
            assignment_key);

        let link = '';
        let submission_status;

        if (submission_key) {
            let submission_data = await submission_db_handler.get_submission_data(submission_key);

            if (submission_data)
                submission_status = submission_data['submission_status'];

            if (submission_data['group'] && submission_data['group'] !== '') {
                let group_id = submission_data['group'].replace(KeyDictionary.key_dictionary['group'], '');
                let group_data = await group_db_handler.get_group_data(submission_data['group']);

                let doc_id = group_data['docid'].replace(KeyDictionary.key_dictionary['document'], '');
                let doc_data = await doc_db_handler.get_doc_data(group_data['docid']);

                let access_code = doc_data['pdfid'];

                link = `access_code=${access_code}&docid=${doc_id}&groupid=${group_id}`;
            }
        }

        return {
            assignment: assignment_data,
            grader_link: '',
            link: link,
            submission_status
        };
    }



    async get_assignment_for_tas_and_instructors (import_handler, user_key, assignment_key) {
        let course_db_handler = await import_handler.course_db_handler;

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        delete assignment_data['display_grade_as'];
        delete assignment_data['count_toward_final_grade'];
        delete assignment_data['creation_date'];
        delete assignment_data['submissions'];

        let submission_data = await this.get_first_assignment_submissions_for_grader(
            import_handler,
            user_key,
            assignment_key);

        let student_or_group_list;
        if (assignment_data['group_assignment'])
            student_or_group_list = await course_db_handler.get_course_course_groups(import_handler, assignment_data['course']);
        else
            student_or_group_list = await course_db_handler.get_course_active_students(import_handler, assignment_data['course']);

        student_or_group_list = student_or_group_list.filter(student_or_group => {
            for (let extension of assignment_data['extensions']) {
                if (extension['user'] === student_or_group['key'])
                    return false;
            }
            return true;
        });

        return {
            assignment: assignment_data,
            grader_link: submission_data.link,
            grader_submission_id: submission_data.id,
            link: '',
            student_or_group_list: student_or_group_list
        };
    }


    async get_first_assignment_submissions_for_grader (import_handler, user_key, assignment_key) {
        let submissions = await this.get_assignment_submissions_for_grader(import_handler, user_key, assignment_key);

        if (submissions.length > 0)
            return submissions[0];

        return { id: '', link: ''};
    }



    async get_assignment_submissions_for_grader (import_handler, user_key, assignment_key) {
        let submission_db_handler = await import_handler.submission_db_handler;
        let group_db_handler = await import_handler.group_db_handler;
        let doc_db_handler = await import_handler.doc_db_handler;

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        let submission_keys = assignment_data['submissions'];

        let submissions = [];
        for (let submission_key of submission_keys) {
            let link = '';

            let submission_data = await submission_db_handler.get_submission_data(submission_key);

            if (submission_data['group'] && submission_data['group'] !== '') {

                let group_id = submission_data['group'].replace(KeyDictionary.key_dictionary['group'], '');
                let group_data = await group_db_handler.get_group_data(submission_data['group']);

                let doc_id = group_data['docid'].replace(KeyDictionary.key_dictionary['document'], '');
                let doc_data = await doc_db_handler.get_doc_data(group_data['docid']);

                let access_code = doc_data['pdfid'];

                link = `access_code=${access_code}&docid=${doc_id}&groupid=${group_id}`;
            }
            submissions.push({ id: submission_data.id, link: link });
        }
        return submissions
    }



    async get_all_assignments_visible_to_user (import_handler, user_key, enrolments) {
        let user_db_handler = await import_handler.user_db_handler;
        if (!(await user_db_handler.is_valid_user_key(user_key)))
            throw new RichReviewError('Invalid user key');

        let assignments = [];
        for (let enrolment of enrolments['enrolments']) {
            for (let assignment_key of enrolment['assignments']) {
                let assignment_data = await this.get_assignment_data(user_key, assignment_key);

                if (await AssignmentDatabaseHandler.user_has_permission_to_view(import_handler, user_key, assignment_data)) {
                    assignments.push({
                        course_id: enrolment['id'],
                        assignment_id: assignment_data['id'],
                        course: enrolment['title'],
                        title: assignment_data['title'],
                        due: assignment_data['due_date'],
                        group_assignment: assignment_data['group_assignment'],
                        role: 'Student'
                    })
                }
            }
        }

        for (let enrolment of enrolments['taing']) {
            for (let assignment_key of enrolment['assignments']) {
                let assignment_data = await this.get_assignment_data(user_key, assignment_key);

                if (await AssignmentDatabaseHandler.user_has_permission_to_view(import_handler, user_key, assignment_data)) {
                    assignments.push({
                        course_id: enrolment['id'],
                        assignment_id: assignment_data['id'],
                        course: enrolment['title'],
                        title: assignment_data['title'],
                        due: assignment_data['due_date'],
                        group_assignment: assignment_data['group_assignment'],
                        role: 'Ta'
                    })
                }
            }
        }

        for (let enrolment of enrolments['teaching']) {
            for (let assignment_key of enrolment['assignments']) {
                let assignment_data = await this.get_assignment_data(user_key, assignment_key);

                if (await AssignmentDatabaseHandler.user_has_permission_to_view(import_handler, user_key, assignment_data)) {
                    assignments.push({
                        course_id: enrolment['id'],
                        assignment_id: assignment_data['id'],
                        course: enrolment['title'],
                        title: assignment_data['title'],
                        due: assignment_data['due_date'],
                        group_assignment: assignment_data['group_assignment'],
                        role: 'Instructor'
                    })
                }
            }
        }
        return assignments;
    }



    async get_all_users_upcoming_assignments (import_handler, user_key) {

        let user_db_handler = await import_handler.user_db_handler;
        let course_db_handler = await import_handler.course_db_handler;

        if (!(await user_db_handler.is_valid_user_key(user_key)))
            throw new RichReviewError('Invalid user key');

        let user_data = await user_db_handler.get_user_data(user_key);

        let enrolments = user_data['enrolments'];

        let upcoming_assignments = [];

        for (let course_key of enrolments) {
            let course_data = await course_db_handler.get_course_data(course_key);

            let assignments = course_data['assignments'];

            for (let assignment_key of assignments) {

                let assignment_data = await this.get_assignment_data(user_key, assignment_key);

                if (assignment_data && (assignment_data['due_date'] === '' || new Date(assignment_data['due_date']) > new Date())) {
                    let submission_status = await this.get_user_submission_status(import_handler, user_key, assignment_key);

                    let data = {
                        assignment_id: assignment_key.replace(KeyDictionary.key_dictionary['assignment'], ''),
                        course_id: assignment_data['course'].replace(KeyDictionary.key_dictionary['course'], ''),
                        title: assignment_data['title'],
                        submission_status: submission_status.submission_status,
                        late: submission_status.late
                    };

                    upcoming_assignments.push(data);
                }
            }
        }

        return upcoming_assignments;
    }



    async get_course_assignments_for_student (import_handler, user_key, assignment_keys) {

        let user_db_handler = await import_handler.user_db_handler;
        if (!(await user_db_handler.is_valid_user_key(user_key)))
            throw new RichReviewError('Invalid user key');

        let assignments = [];
        let submission_db_handler = await import_handler.submission_db_handler;
        let submitter_db_handler = await import_handler.submitter_db_handler;

        for (let assignment_key of assignment_keys) {

            if (!(await this.is_valid_assignment_key(assignment_key)))
                throw new RichReviewError('Invalid assignment key');

            let assignment_data = await this.get_assignment_data(user_key, assignment_key);

            if (assignment_data && !assignment_data['hidden']) {
                let submission_key = await this.get_users_submission_key(import_handler, user_key, assignment_key);
                let submission_data = await submission_db_handler.get_submission_data(submission_key);
                let submission_status = await submission_db_handler.get_submission_status(submission_key);

                assignment_data['submission'] = { submission_status };

                let submitter_data = await submitter_db_handler.get_submitter_data(submission_data['submitter']);
                assignment_data['late'] = late.is_late(assignment_data, submission_data, submitter_data['course_group'] === '' ?
                    submitter_data['members'][0] :
                    submitter_data['course_group']);

                assignment_data = {
                    id: assignment_data.id,
                    title: assignment_data.title,
                    group_assignment: assignment_data.group_assignment,
                    due_date: assignment_data.due_date,
                    submission: assignment_data.submission,
                    late: assignment_data.late };

                assignments.push(assignment_data);
            }
        }

        return assignments;
    }



    async get_course_assignments_for_tas_and_instructors (import_handler, user_key, assignment_keys) {
        let assignments = await this.get_course_assignments(import_handler, user_key, assignment_keys);

        assignments = assignments.map(assignment => {
            return {
                id: assignment.id,
                title: assignment.title,
                hidden: assignment.hidden,
                group_assignment: assignment.group_assignment,
                due_date: assignment.due_date
            }
        });

        return assignments;
    }



    async get_course_assignments (import_handler, user_key, assignment_keys) {

        let user_db_handler = await import_handler.user_db_handler;
        if (!(await user_db_handler.is_valid_user_key(user_key)))
            throw new RichReviewError('Invalid user key');

        let assignment_promises = assignment_keys.map(async (assignment_key) => {
            if(!(await this.is_valid_assignment_key(assignment_key)))
                throw new RichReviewError('Invalid assignment key');

            return await this.get_assignment_data(user_key, assignment_key);
        });

        return Promise.all(assignment_promises).then((assignments) => {
            return assignments.filter((assignment) => assignment !== undefined);
        });
    }



    get_assignment_data (user_key, assignment_key) {

        return new Promise((resolve, reject) => {
            console.log('Redis request to key: ' + assignment_key);
            this.db_handler.client.hgetall(assignment_key, (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('GET result -> ' + { result });

                let assignment_data = RedisToJSONParser.parse_data_to_JSON(result);

                resolve(assignment_data);
            });
        })
    }


    async get_assignment_submissions (import_handler, user_key, course_key, assignment_key) {
        let user_db_handler = await import_handler.user_db_handler;
        let submission_db_handler = await import_handler.submission_db_handler;
        let submitter_db_handler = await import_handler.submitter_db_handler;
        let group_db_handler = await import_handler.group_db_handler;
        let doc_db_handler = await import_handler.doc_db_handler;
        let course_db_handler = await import_handler.course_db_handler;

        if(!(await user_db_handler.is_valid_user_key(user_key)))
            throw new RichReviewError('Invalid user key');
        if(!(await course_db_handler.is_valid_course_key(course_key)))
            throw new RichReviewError('Invalid course key');
        if(!(await this.is_valid_assignment_key(assignment_key)))
            throw new RichReviewError('Invalid assignment key');

        let user_permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (user_permissions !== 'instructor' && user_permissions !== 'ta')
            throw new NotAuthorizedError('You are not authorized to see this assignment\'s submissions');

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        let submissions = assignment_data['submissions'];

        let assignment_submissions = [];

        for (let submission_key of submissions) {
            let submission_data = await submission_db_handler.get_submission_data(submission_key);
            let submitter_data = await submitter_db_handler.get_submitter_data(submission_data['submitter']);

            let submitter_name = '';
            if (submitter_data['course_group'] !== '')
                submitter_name = await this.get_course_group_assignment_submission_name(
                    import_handler,
                    submitter_data['course_group']);
            else
                submitter_name = await this.get_individual_assignment_submission_name(
                    import_handler,
                    submitter_data['members'][0]);

            let link = '';

            if (submission_data['current_submission'] !== '') {
                let group_id = submission_data['current_submission'].replace(KeyDictionary.key_dictionary['group'], '');
                let group_data = await group_db_handler.get_group_data(submission_data['current_submission']);

                let doc_id = group_data['docid'].replace(KeyDictionary.key_dictionary['document'], '');
                let doc_data = await doc_db_handler.get_doc_data(group_data['docid']);

                let access_code = doc_data['pdfid'];

                link = `access_code=${access_code}&docid=${doc_id}&groupid=${group_id}`;
            }

            let late = late.is_late(assignment_data, submission_data, submitter_data['course_group'] === '' ?
                                                                            submitter_data['members'][0] :
                                                                            submitter_data['course_group']);

            let assignment_submission = {
                submitter_name: submitter_name,
                points: assignment_data['points'],
                mark: submission_data['mark'],
                submission_status: submission_data['submission_status'],
                submission_time: submission_data['submission_time'],
                group: submission_data['current_submission'],
                late: late,
                link: link,
                submission_id: submission_data['id']
            };

            assignment_submissions.push(assignment_submission);
        }

        return assignment_submissions;
    }



    async get_assignment_submission_links_and_id (import_handler, user_key, assignment_key) {
        let submission_db_handler = await import_handler.submission_db_handler;
        let group_db_handler = await import_handler.group_db_handler;
        let doc_db_handler = await import_handler.doc_db_handler;
        let user_db_handler = await import_handler.user_db_handler;

        if(!(await user_db_handler.is_valid_user_key(user_key)))
            throw new RichReviewError('Invalid user key');
        if(!(await this.is_valid_assignment_key(assignment_key)))
            throw new RichReviewError('Invalid assignment key');

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        let submissions = assignment_data['submissions'];

        let submissions_data = await submission_db_handler.get_all_submissions(submissions);

        let submissions_links_and_id = [];

        for (let submission_data of submissions_data) {
            if (submission_data['group'] && submission_data['group'] !== '') {
                let group_id = submission_data['group'].replace(KeyDictionary.key_dictionary['group'], '');
                let group_data = await group_db_handler.get_group_data(submission_data['group']);

                let doc_id = group_data['docid'].replace(KeyDictionary.key_dictionary['document'], '');
                let doc_data = await doc_db_handler.get_doc_data(group_data['docid']);

                let access_code = doc_data['pdfid'];

                submissions_links_and_id.push({
                    link: `access_code=${access_code}&docid=${doc_id}&groupid=${group_id}`,
                    id: submission_data['id']
                });
            }
        }

        return submissions_links_and_id;
    }


    async get_first_assignment_submission_link_and_id (import_handler, user_key, assignment_key) {
        let submissions_links_and_ids = await this.get_assignment_submission_links_and_id(
            import_handler,
            user_key,
            assignment_key);

        if (submissions_links_and_ids.length > 0)
            return submissions_links_and_ids[0];

        return { link: '', id: '' };
    }



    async get_previous_assignment_submission_link (import_handler, user_key, assignment_key, submission_id) {
        let submissions_links_and_ids = await this.get_assignment_submissions_for_grader(
            import_handler,
            user_key,
            assignment_key);

        for(let i = 0; i < submissions_links_and_ids.length; i++) {
            if (submissions_links_and_ids[i].id === submission_id && i > 0)
                return submissions_links_and_ids[i - 1];
        }
        return { link: '', id: '' };
    }



    async get_next_assignment_submission_link (import_handler, user_key, assignment_key, submission_id) {
        let submissions_links_and_ids = await this.get_assignment_submissions_for_grader(
            import_handler,
            user_key,
            assignment_key);

        let found = false;

        for (let submissions_link_and_id of submissions_links_and_ids) {
            if(found)
                return submissions_link_and_id;

            if (submissions_link_and_id.id === submission_id)
                found = true;
        }

        return { link: '', id: '' };
    }



    async get_individual_assignment_submission_name (import_handler, user_key) {
        let user_db_handler = await import_handler.user_db_handler;
        let user_data = await user_db_handler.get_user_data(user_key);
        return user_data['display_name'];
    }



    async get_course_group_assignment_submission_name (import_handler, course_group_key) {
        let course_group_db_handler = await import_handler.course_group_db_handler;
        let course_group_data = await course_group_db_handler.get_course_group_data(course_group_key);
        return course_group_data['name'];
    }


    async get_users_submission_key (import_handler, user_key, assignment_key) {
        let submission_db_handler = await import_handler.submission_db_handler;

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        let submissions = assignment_data['submissions'];

        for (let submission_key of submissions) {
            if (await submission_db_handler.is_user_owner_of_submission(import_handler, user_key, submission_key))
                return submission_key;
        }

        return undefined;
    }




    async get_course_groups_submission_key (import_handler, user_key, course_group_key, assignment_key) {
        let submission_db_handler = await import_handler.submission_db_handler;

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        let submissions = assignment_data['submissions'];

        for (let submission_key of submissions) {
            if (await submission_db_handler.is_course_group_owner_of_submission(
                import_handler,
                course_group_key,
                submission_key))
                return submission_key;
        }

        return undefined;
    }



    set_assignment_data (assignment_key, field, value) {

        return new Promise((resolve, reject) => {
            console.log('Redis hset request to key: ' + assignment_key);
            this.db_handler.client.hset(assignment_key, field, value, (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('SET result -> ' + result);
                resolve();
            });
        })
    }



    get_assignment_id_title_and_points (assignment_key) {
        return new Promise((resolve, reject) => {
            console.log('Redis request to key: ' + assignment_key);
            this.db_handler.client.hgetall(assignment_key, (error, result) => {
                if (error || result === null) {
                    console.log(error);
                    reject(error);
                }
                console.log('GET result -> ' + { result });

                let assignment_data = RedisToJSONParser.parse_data_to_JSON(result);

                resolve({
                    id: assignment_data['id'],
                    title: assignment_data['title'],
                    points: assignment_data['points'] });
            });
        })
    }



    async delete_assignment (import_handler, user_key, course_key, assignment_key) {
        let user_db_handler = await import_handler.user_db_handler;
        let course_db_handler = await import_handler.course_db_handler;
        let submission_db_handler = await import_handler.submission_db_handler;

        let user_permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (user_permissions !== 'ta' && user_permissions !== 'instructor')
            throw new NotAuthorizedError('You are not authorized to delete this assignment');

        await course_db_handler.delete_assignment_from_course(assignment_key, course_key);

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        let submissions = assignment_data['submissions'];

        for (let submission of submissions) {
            await submission_db_handler.delete_submission(import_handler, submission);
        }

        await this.db_handler.client.del(assignment_key, (error, result) => {
            if (error) {
                console.log(error);
                throw error;
            }
            console.log('DEL result -> ' + result);
        });
    }



    static async user_has_permission_to_view (import_handler, user_key, assignment_data) {

        let user_db_handler = await import_handler.user_db_handler;

        if(!(await user_db_handler.is_valid_user_key(user_key)))
            throw new RichReviewError('Invalid user key');

        if (assignment_data['course'] === undefined ||
            assignment_data['hidden'] === undefined ||
            assignment_data['available_date'] === undefined ||
            assignment_data['until_date'] === undefined)
            throw new RichReviewError('Invalid assignment data');

        let user_data = await user_db_handler.get_user_data(user_key);

        if (user_data['teaching'].includes(assignment_data['course']) ||
                user_data['taing'].includes(assignment_data['course']))
            return true;

        if (assignment_data['hidden'])
            return false;

        if (assignment_data['available_date'] !== 'Invalid Date' &&
                Date.parse(assignment_data['available_date']) > Date.now())
            return false;

        if (assignment_data['until_date'] !== 'Invalid Date' &&
                Date.parse(assignment_data['until_date']) < Date.now())
            return false;

        return true;
    }



    async get_user_submission_status (import_handler, user_key, assignment_key) {
        let submission_db_handler = await import_handler.submission_db_handler;
        let user_db_handler = await import_handler.user_db_handler;

        if(!(await user_db_handler.is_valid_user_key(user_key)))
            throw new RichReviewError('Invalid user key');
        if(!(await this.is_valid_assignment_key(assignment_key)))
            throw new RichReviewError('Invalid assignment key');

        let submission_key = await this.get_users_submission_key(import_handler, user_key, assignment_key);
        let submission_data = await submission_db_handler.get_submission_data(submission_key);

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);

        let late = late.is_late(assignment_data, submission_data);

        return {
            submission_status: submission_data['submission_status'],
            late: late
        };
    }


    is_valid_assignment_data (assignment_data) {
        return assignment_data.title !== undefined &&
            assignment_data.description !== undefined &&
            (assignment_data.type === 'document_submission' ||
                assignment_data.type === 'comment_submission') &&
            assignment_data.count_toward_final_grade !== undefined &&
            assignment_data.allow_multiple_submissions !== undefined &&
            assignment_data.group_assignment !== undefined &&
            assignment_data.hidden !== undefined &&
            assignment_data.due_date !== undefined &&
            assignment_data.available_date !== undefined &&
            assignment_data.until_date !== undefined;
    }



    async is_valid_assignment_key (assignment_key) {
        return new Promise((resolve, reject) => {
            console.log('Redis request to key: ' + assignment_key);
            this.db_handler.client.hgetall(assignment_key, (error, result) => {
                if (error || result === null) {
                    resolve(false);
                }

                resolve(true);
            });
        })
    }
}

module.exports = AssignmentDatabaseHandler;

