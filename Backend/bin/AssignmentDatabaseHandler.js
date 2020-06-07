const RedisClient = require("./RedisClient");
const AsyncRedisClient = require("./AsyncRedisClient");
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
        let course_db_handler = await import_handler.course_db_handler;
        let group_db_handler = await import_handler.group_db_handler;
        let submission_db_handler = await import_handler.submission_db_handler;

        let user_data = await user_db_handler.get_user_data(user_key);
        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        let group_data = await group_db_handler.get_group_data(assignment_data['template_group']);
        let course_key = assignment_data['course'];
        let submissions = assignment_data['submissions'];

        /*Avoid using deprecated redis array toString() approach*/
        assignment_data['submissions'] = JSON.stringify(submissions);
        assignment_data['extensions'] = JSON.stringify(assignment_data['extensions']);
        
        if(assignment_data === undefined ||
            (!user_data['teaching'].includes(course_key) &&
            !user_data['taing'].includes(course_key)))
            throw new NotAuthorizedError('You are not authorized to edit this assignment');

        /*If we are NOT changing to a group assignment or vice versa, 
          updates can be done on existing assignment key. */
        if (edits['group_assignment'] === assignment_data['group_assignment']) {
            for (const field in edits) {
                let value = edits[field];

                if (DateHelper.is_date(field))
                    value = DateHelper.format_date(value);

                await this.set_assignment_data(assignment_key, field, value);
            }

            return;
        }

        /*Otherwise, we need to recreate the assignment using identical id
          and with modified group_assignment field. */
        assignment_data['group_assignment'] = edits['group_assignment'];
        
        if(assignment_data['group_assignment'] === true) {
            assignment_data['course_group_set'] = edits['course_group_set'];
        }

        /*Delete existing assignment and associated keys. 
          Note that edit operation can continue, even if error occurs during delete.*/
        try {
            await course_db_handler.delete_assignment_from_course(course_key, assignment_key);
            await this.delete_assignment(import_handler, user_key, course_key, assignment_key);
        } catch (err) {
            console.warn(err);
        }
               
        /*Recreate the correct type of assignment with the existing id */
        if (assignment_data['type'] === 'document_submission') {
            await this.create_document_submission_assignment(import_handler, 
                course_key, 
                assignment_data,
                assignment_data['id']);
        }
        else {
            let docid = group_data['docid'];

            await this.create_comment_submission_assignment(import_handler, 
                user_key, 
                course_key, 
                assignment_data, 
                null,
                assignment_data['id'], 
                group_data['docid']);
        }

    }

    

    async add_submission_to_assignment (assignment_key, submission_key) {
        let assignment_data = await this.get_assignment_data('', assignment_key);
        let submissions = assignment_data['submissions'];

        if (!submissions) {
            await this.set_assignment_data(assignment_key, 'submissions', JSON.stringify([submission_key]));
            return;
        }

        if (!submissions.includes(submission_key)) {
            submissions.push(submission_key);
            await this.set_assignment_data(assignment_key, 'submissions', JSON.stringify(submissions));
        }
    }



    async create_assignment (import_handler, course_key, assignment_data, existing_assignment_key = null) {
        /*Allow 'blank' assignment with only assignment key for lti assignments */
        if(!assignment_data.lti && !assignment_data.assignment_key &&
            !this.is_valid_assignment_data(assignment_data)) {
            throw new RichReviewError(`Invalid assignment data:\n ${JSON.stringify(assignment_data)}`);
        }

        let course_db_handler = await import_handler.course_db_handler;

        if (!(await course_db_handler.is_valid_course_key(course_key)))
            throw new RichReviewError('Invalid course key');

        let id = '';
        let assignment_key = '';

        /*Generate an assignment key if no existing key is provided */
        if (existing_assignment_key === null) {
            id = `${course_key.replace(KeyDictionary.key_dictionary['course'], '')}_${Date.now()}_${Math.floor((Math.random() * 100000) + 1)}`;
        }
        else {
            if (this.is_valid_assignment_key(existing_assignment_key) === false)
                throw new RichReviewError(`Invalid assignment key provided as existing key: ${existing_assignment_key}`);
            id = existing_assignment_key.replace(KeyDictionary.key_dictionary['assignment'], '');
        }

        assignment_key = KeyDictionary.key_dictionary['assignment'] + id;

        for (const field in assignment_data) {
            let value = assignment_data[field];

            if (DateHelper.is_date(field))
                value = DateHelper.format_date(value);

            await this.set_assignment_data(assignment_key, field, value);
        }

        //Set default assignment data
        await this.set_assignment_data(assignment_key, 'id', id);
        await this.set_assignment_data(assignment_key, 'course', course_key);
        await this.set_assignment_data(assignment_key, 'template_group', '');
        await this.set_assignment_data(assignment_key, 'creation_date', new Date().toISOString());
        await this.set_assignment_data(assignment_key, 'extensions', '[]');

        await course_db_handler.add_assignment_to_course(assignment_key, course_key);

        return assignment_key;
    }



    async create_document_submission_assignment (import_handler, course_key, assignment_data, existing_key = null) {

        let course_db_handler = await import_handler.course_db_handler;

        if (course_key === undefined)
            throw new RichReviewError ('No course key');
        if (assignment_data === undefined)
            throw new RichReviewError ('No assignment data');
        if (!(await course_db_handler.is_valid_course_key(course_key)))
            throw new RichReviewError('Invalid course key');

        if (assignment_data['group_assignment'] && assignment_data['course_group_set'] === 'default')
            throw new RichReviewError('No course group set selected');

        let assignment_key = await this.create_assignment(import_handler, course_key, assignment_data, existing_key);

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
                assignment_key,
                assignment_data['course_group_set']);
        }

        await this.set_assignment_data(assignment_key, 'submissions', JSON.stringify(submission_keys));

        return assignment_key;
    }



    async create_comment_submission_assignment (import_handler,
         user_key,
         course_key, 
         assignment_data, 
         files = null, 
         existing_key = null, 
         doc_key = null,
         upload = true) {

        let course_db_handler = await import_handler.course_db_handler;
        let user_db_handler = await import_handler.user_db_handler;

        if (course_key === undefined)
            throw new RichReviewError ('No course key');
        if (assignment_data === undefined)
            throw new RichReviewError ('No assignment data');
        
        if ( (files == null || Object.keys(files).length < 1) && doc_key == null )
            throw new RichReviewError ('Must provide at least one file or a doc_key for an existing upload');

        if (!(await user_db_handler.is_valid_user_key(user_key)))
            throw new RichReviewError('Invalid user key');
        if (!(await course_db_handler.is_valid_course_key(course_key)))
            throw new RichReviewError('Invalid course key');
        if (Object.keys(assignment_data).length === 0)
            throw new RichReviewError('Invalid assignment data');
        if(!this.is_valid_assignment_data(assignment_data))
            throw new RichReviewError('Invalid assignment data');
      

        if (assignment_data['group_assignment'] && assignment_data['course_group_set'] === 'default')
            throw new RichReviewError('No course group set selected');


        let document_upload_handler = await import_handler.doc_upload_handler;
        let document_db_handler = await import_handler.doc_db_handler;
        let group_db_handler = await import_handler.group_db_handler;
        let submission_db_handler = await import_handler.submission_db_handler;
        let submitter_db_handler = await import_handler.submitter_db_handler;

        let user_id = user_key.replace(KeyDictionary.key_dictionary['user'], '');

        /*No existing doc_key accessible through doc_key, so upload files and get a doc_key */
        if (doc_key == null && upload == true) {
            // Upload pdf to azure
            let main_context = await document_upload_handler.upload_documents(files);
            doc_key = await document_db_handler.create_doc(user_id, main_context.container);
        }

        /* Add doc and grp to redis */
        let template_group_key = await group_db_handler.create_group(user_id, doc_key);
        await document_db_handler.add_group_to_doc(doc_key, template_group_key);
        await user_db_handler.add_group_to_user(user_key, template_group_key);

        let assignment_key = await this.create_assignment(import_handler, course_key, assignment_data, existing_key);

        await this.set_assignment_data(assignment_key, 'template_group', template_group_key);


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
                assignment_key,
                assignment_data['course_group_set']);
        }


        for (let submission_key of submission_keys) {

            let submission_data = await submission_db_handler.get_submission_data(submission_key);

            let submitter_key = submission_data['submitter'];
            let submitter_data = await submitter_db_handler.get_submitter_data(submitter_key);

            let members = submitter_data['members'];

            let first_student = members.pop();
            let first_student_id = first_student.replace(KeyDictionary.key_dictionary['user'], '');

            let group_key = await group_db_handler.create_group(first_student_id, doc_key, template_group_key);
            await group_db_handler.add_submission_to_group(group_key, submission_key);

            await document_db_handler.add_group_to_doc(doc_key, group_key);

            await user_db_handler.add_group_to_user(first_student, group_key);

            try {
                await submission_db_handler.add_group_to_comment_submission(submission_key, group_key);
            } catch (e) {
                console.warn(e);
            }

            for (let member of members) {
                await user_db_handler.add_group_to_user(member, group_key);
                let member_id = member.replace(KeyDictionary.key_dictionary['user'], '');
                await group_db_handler.add_user_to_group(member_id, group_key);
            }
        }

        await this.set_assignment_data(assignment_key, 'submissions', JSON.stringify(submission_keys));

        return assignment_key;
    }




    async submit_document_assignment (import_handler, user_id, course_key, assignment_key, files, upload = true) {
        let document_upload_handler = await import_handler.doc_upload_handler;
        let document_db_handler = await import_handler.doc_db_handler;
        let group_db_handler = await import_handler.group_db_handler;
        let user_db_handler = await import_handler.user_db_handler;
        let submission_db_handler = await import_handler.submission_db_handler;
        let submitter_db_handler = await import_handler.submitter_db_handler;
        
        let user_key = KeyDictionary.key_dictionary['user'] + user_id;

        let assignment_data = await this.get_assignment_data('', assignment_key);

        if(!(await AssignmentDatabaseHandler.user_has_permission_to_view(import_handler, user_key, assignment_data)))
            throw new NotAuthorizedError('You are not authorized to submit this assignment');

        let has_extension = await this.has_extension(assignment_key, user_key);

        if (!has_extension && assignment_data['due_date'] !== '' &&
                Date.now() > new Date(assignment_data['due_date']) &&
                !assignment_data['allow_late_submissions'])
            throw new NotAuthorizedError('You are not authorized to submit this assignment');

        if (!has_extension && assignment_data['until_date'] !== '' &&
                Date.now() > new Date(assignment_data['until_date']))
            throw new NotAuthorizedError('You are not authorized to submit this assignment');

        if (assignment_data['available_date'] !== '' &&
                Date.now() < new Date(assignment_data['available_date']))
            throw new NotAuthorizedError('You are not authorized to submit this assignment');

        // Associate group with submission
        let submission_key = await this.get_users_submission_key(import_handler, user_key, assignment_key);
        let submission_data = await submission_db_handler.get_submission_data(submission_key);

        if (submission_data['submission_time'] !== '') {
            let assignment_data = await this.get_assignment_data(user_key, assignment_key);
            if (!assignment_data['allow_multiple_submissions'])
                throw new RichReviewError('This assignment doesn\'t allow multiple submissions');
        }

        let context = '_';

        if (upload === true)
            context = await document_upload_handler.upload_documents(files);
        
        // Add doc and grp to redis
        let doc_key = await document_db_handler.create_doc(user_id, context.container);
        let group_key = await group_db_handler.create_group(user_id, doc_key);

        await document_db_handler.add_group_to_doc(doc_key, group_key);


        let submitter_key = await submission_data['submitter'];
        let submitter_data = await submitter_db_handler.get_submitter_data(submitter_key);

        for (let member of submitter_data['members']) {
            await user_db_handler.add_group_to_user(member, group_key);
            member = member.replace(KeyDictionary.key_dictionary['user'], '');
            await group_db_handler.add_user_to_group(member, group_key);
        }

        await group_db_handler.add_submission_to_group(group_key, submission_key);
        await submission_db_handler.add_group_to_document_submission(submission_key, group_key);

        // Add tas and instructors to the group
        // let tas_and_instructors = await course_db_handler.get_course_tas_and_instructors(course_key);
        //
        // for (let ta of tas_and_instructors['tas']) {
        //     let ta_id = ta.replace(KeyDictionary.key_dictionary['user'], '');
        //     await group_db_handler.add_user_to_group(ta_id, group_key);
        // }
        //
        // for (let instructor of tas_and_instructors['instructors']) {
        //     let instructor_id = instructor.replace(KeyDictionary.key_dictionary['user'], '');
        //     await group_db_handler.add_user_to_group(instructor_id, group_key);
        // }

        return submission_key;
    }



    async get_assignment (import_handler, user_key, course_key, assignment_key) {
        let user_db_handler = await import_handler.user_db_handler;
        let course_db_handler = await import_handler.course_db_handler;

        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);
        let course_data = await course_db_handler.get_course_data(course_key);
        let data = {};

        if (permissions === 'student') {
            let assignment_data = await this.get_assignment_data('', assignment_key);
            if(!(await AssignmentDatabaseHandler.user_has_permission_to_view(import_handler, user_key, assignment_data)))
                throw new NotAuthorizedError('You are not authorized to view this assignment');
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
        let extension_date;
        for (let extension of assignment_data['extensions']) {
            if (extension['user'] === user_key)
                extension_date = extension['date']
        }
        delete assignment_data['extensions'];
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
                link = await group_db_handler.get_group_link(import_handler, submission_data['group'])
            }
        }

        return {
            assignment: assignment_data,
            grader_link: '',
            link: link,
            submission_status,
            extension_date
        };
    }



    async get_assignment_for_tas_and_instructors (import_handler, user_key, assignment_key) {
        let course_db_handler = await import_handler.course_db_handler;
        let course_group_db_handler = await import_handler.course_group_db_handler;
        let group_db_handler = await import_handler.group_db_handler;

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
        if (assignment_data['group_assignment']) {
            let course_group_set_data = await course_group_db_handler.get_course_group_set_data(assignment_data['course_group_set']);
            student_or_group_list = await Promise.all(course_group_set_data['course_groups'].map(async course_group => {
                let course_group_data = await course_group_db_handler.get_course_group_data(course_group);
                return {key: course_group, name: course_group_data['name'], id: course_group_data['id']};
            }));
        } else
            student_or_group_list = await course_db_handler.get_course_active_students(import_handler, assignment_data['course']);


        student_or_group_list = student_or_group_list.filter(student_or_group => {
            for (let extension of assignment_data['extensions']) {
                if (extension['user'] === student_or_group['key'])
                    return false;
            }
            return true;
        });

        let template_link = '';
        if (assignment_data['template_group'] && assignment_data['template_link'] !== '')
            template_link = await group_db_handler.get_group_link(import_handler, assignment_data['template_group']);

        
            

        //if (submission_data_student['group'] && submission_data_student['group'] !== '') {
        //        link = await group_db_handler.get_group_link(import_handler, submission_data['group'])
        return {
            assignment: assignment_data,
            grader_link: submission_data.link,
            grader_submission_id: submission_data.id,
            link: '',
            student_or_group_list: student_or_group_list,
            template_link: template_link
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
        let user_db_handler = await import_handler.user_db_handler;
        let submitter_db_handler = await import_handler.submitter_db_handler;
        let course_group_db_handler = await import_handler.course_group_db_handler;

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        let submission_keys = assignment_data['submissions'];

        if (!submission_keys) {
            await this.set_assignment_data(assignment_key, 'submissions', '[]');
            return [];
        }

        let submissions = [];
        for (let submission_key of submission_keys) {
            let link = '';

            let submission_data = await submission_db_handler.get_submission_data(submission_key);

            if (submission_data['group'] && submission_data['group'] !== '') {

                link = await group_db_handler.get_group_link(import_handler, submission_data['group']);
            }
            let submitter_data = await submitter_db_handler.get_submitter_data(submission_data['submitter']);

            let name = '';
            if (submitter_data['course_group'] === '')
                name = await submission_db_handler.get_submission_last_name(import_handler, submission_key);
            else
                name = await submission_db_handler.get_submission_group_name(import_handler, submission_key);

            submissions.push({ id: submission_data.id, link: link, name: name });
        }

        return submissions.sort(function (a, b) {
            return ('' + a.name).localeCompare(b.name);
        });
    }



    async get_all_assignments_visible_to_user (import_handler, user_key, enrolments) {
        let user_db_handler = await import_handler.user_db_handler;
        let submitter_db_handler = await import_handler.submitter_db_handler;

        if (!(await user_db_handler.is_valid_user_key(user_key)))
            throw new RichReviewError('Invalid user key');

        let assignments = [];
        for (let enrolment of enrolments['enrolments']) {
            for (let assignment_key of enrolment['assignments']) {
                let submitter_exists = await submitter_db_handler.does_user_have_submitter(import_handler, user_key, assignment_key);
                if (submitter_exists) {
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
        let submitter_db_handler = await import_handler.submitter_db_handler;

        if (!(await user_db_handler.is_valid_user_key(user_key)))
            throw new RichReviewError('Invalid user key');

        let user_data = await user_db_handler.get_user_data(user_key);

        let enrolments = user_data['enrolments'];

        let upcoming_assignments = [];

        for (let course_key of enrolments) {
            let course_data = await course_db_handler.get_course_data(course_key);

            let assignments = course_data['assignments'];

            for (let assignment_key of assignments) {

                let submitter_exists = await submitter_db_handler.does_user_have_submitter(import_handler, user_key, assignment_key);

                if (submitter_exists) {
                    let assignment_data = await this.get_assignment_data(user_key, assignment_key);

                    if((await AssignmentDatabaseHandler.user_has_permission_to_view(import_handler, user_key, assignment_data))) {
                        if (assignment_data && (assignment_data['due_date'] === '' || new Date(assignment_data['due_date']) > new Date() || assignment_data['allow_late_submissions'])) {
                            if (assignment_data['until_date'] === '' || new Date(assignment_data['until_date']) > new Date()) {
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
            let submitter_exists = await submitter_db_handler.does_user_have_submitter(import_handler, user_key, assignment_key);

            if (submitter_exists) {
                let assignment_data = await this.get_assignment_data(user_key, assignment_key);

                if (assignment_data && (await AssignmentDatabaseHandler.user_has_permission_to_view(import_handler, user_key, assignment_data))) {
                    let submission_key = await this.get_users_submission_key(import_handler, user_key, assignment_key);
                    let submission_data = await submission_db_handler.get_submission_data(submission_key);
                    let submission_status = await submission_db_handler.get_submission_status(submission_key);

                    assignment_data['submission'] = {submission_status};

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
                        late: assignment_data.late
                    };

                    assignments.push(assignment_data);
                }
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
            this.db_handler.client.hgetall(assignment_key, (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
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

            let group_data = {};

            if (submission_data['current_submission'] !== '')
                group_data = await group_db_handler.get_group_data(submission_data['current_submission']);

            let submitter_name = '';
            let name = '';
            if (submitter_data['course_group'] !== '') {
                submitter_name = await this.get_course_group_assignment_submission_name(
                    import_handler,
                    submitter_data['course_group']);
                name = await submission_db_handler.get_submission_group_name(import_handler, submission_key);
            } else {
                submitter_name = await this.get_individual_assignment_submission_name(
                    import_handler,
                    submitter_data['members'][0]);
                name = await submission_db_handler.get_submission_last_name(import_handler, submission_key);
            }

            let link = '';

            if (submission_data['current_submission'] !== '') {
                link = await group_db_handler.get_group_link(import_handler, submission_data['current_submission']);
            }

            let assignment_submission = {
                submitter_name: submitter_name,
                points: assignment_data['points'],
                mark: submission_data['mark'],
                submission_status: submission_data['submission_status'],
                submission_time: submission_data['submission_time'],
                group: submission_data['current_submission'],
                late: late.is_late(assignment_data, submission_data, submitter_data['course_group'] === '' ?
                    submitter_data['members'][0] :
                    submitter_data['course_group']),
                link: link,
                submission_id: submission_data['id'],
                name: name,
                muted: Object.keys(group_data).length === 0 ? '' : group_data['muted'],
                current_submission: submission_data['current_submission']
            };

            assignment_submissions.push(assignment_submission);
        }

        return assignment_submissions.sort(function (a, b) {
            return ('' + a.name).localeCompare(b.name);
        });
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
        return user_data['display_name'] || 'UBC User';
    }



    async get_course_group_assignment_submission_name (import_handler, course_group_key) {
        let course_group_db_handler = await import_handler.course_group_db_handler;
        let course_group_data = await course_group_db_handler.get_course_group_data(course_group_key);
        return course_group_data['name'];
    }


    async get_users_submission_key (import_handler, user_key, assignment_key) {
        let submission_db_handler = await import_handler.submission_db_handler;
        let course_db_handler = await import_handler.course_db_handler;

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        let submissions = assignment_data['submissions'];

        if(!submissions) {
            await this.set_assignment_data(assignment_key, 'submissions', '[]');
            // await course_db_handler.verify_course_submitters(import_handler, user_key, assignment_data['course']);
            assignment_data = await this.get_assignment_data(user_key, assignment_key);
            submissions = assignment_data['submissions'];
        }

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
            this.db_handler.client.hset(assignment_key, field, value, (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                resolve();
            });
        })
    }



    get_assignment_id_title_and_points (assignment_key) {
        return new Promise((resolve, reject) => {
            this.db_handler.client.hgetall(assignment_key, (error, result) => {
                if (error || result === null) {
                    console.log(error);
                    reject(error);
                }

                let assignment_data = RedisToJSONParser.parse_data_to_JSON(result);

                resolve({
                    id: assignment_data['id'],
                    title: assignment_data['title'],
                    points: assignment_data['points'] });
            });
        })
    }



    async delete_assignment (import_handler, user_key, course_key, assignment_key, added_to_deleted = true) {
        let user_db_handler = await import_handler.user_db_handler;
        let course_db_handler = await import_handler.course_db_handler;
        let submission_db_handler = await import_handler.submission_db_handler;
        let group_db_handler = await import_handler.group_db_handler;

        let user_permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (user_permissions !== 'ta' && user_permissions !== 'instructor')
            throw new NotAuthorizedError('You are not authorized to delete this assignment');
        
        if (added_to_deleted === true){        
            try {
                await course_db_handler.delete_assignment_from_deleted_assignments(assignment_key, course_key);
            } catch (e) {
                console.warn(e)
            }
        }
        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        let submissions = assignment_data['submissions'];

        try {
            await submission_db_handler.delete_all_groups_for_submissions(import_handler, submissions);
            if (assignment_data['template_group'])
                 await group_db_handler.delete_group(assignment_data['template_group']);
        } catch (err ) {
            console.warn(err);
        }
        
        for (let submission of submissions) {
            try {
                await submission_db_handler.delete_submission(import_handler, submission);
            } catch(e) {
                console.warn(e);
            }
        }

        await this.db_handler.client.del(assignment_key, (error, result) => {
            if (error) {
                console.log(error);
                throw error;
            }
        });
    }



    static async user_has_permission_to_view (import_handler, user_key, assignment_data) {

        let user_db_handler = await import_handler.user_db_handler;

        if(!(await user_db_handler.is_valid_user_key(user_key))) {
            console.log(`invalid user key ${user_key}`);
            throw new RichReviewError('Invalid user key');
        }

        if (assignment_data['course'] === undefined ||
            assignment_data['hidden'] === undefined ||
            assignment_data['available_date'] === undefined ||
            assignment_data['until_date'] === undefined) {
            console.log('Invalid assignment data');
            console.log(assignment_data);
            throw new RichReviewError('Invalid assignment data');
        }

        let user_data = await user_db_handler.get_user_data(user_key);

        if (user_data['teaching'].includes(assignment_data['course']) ||
                user_data['taing'].includes(assignment_data['course']))
            return true;

        if (assignment_data['hidden']) {
            console.log('User does not have permission to view hidden assignment');
            return false;
        }
            

         if (assignment_data['available_date'] !== 'Invalid Date' &&
                 Date.parse(assignment_data['available_date']) > Date.now()) {
                 console.log('User does have permission to view assignment that is not yet available');
             return false;
        }

         if (assignment_data['until_date'] !== 'Invalid Date' &&
                 Date.parse(assignment_data['until_date']) < Date.now()) {
                 console.log('User does have permission to view assignment after assignment is closed');
             return false;
        }
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

        return {
            submission_status: submission_data['submission_status'],
            late: late.is_late(assignment_data, submission_data)
        };
    }




    async mute_all_submissions (import_handler, user_key, course_key, assignment_key) {
        let group_db_handler = await import_handler.group_db_handler;

        let submissions = await this.get_assignment_submissions(import_handler, user_key, course_key, assignment_key);
        for (let submission of submissions) {
            if (submission['current_submission'] && submission['current_submission'] !== "") {
                let group_key = submission['current_submission'];
                await group_db_handler.mute_group(group_key);
            }
        }
    }


    async unmute_all_submissions (import_handler, user_key, course_key, assignment_key) {
        let group_db_handler = await import_handler.group_db_handler;

        let submissions = await this.get_assignment_submissions(import_handler, user_key, course_key, assignment_key);
        for (let submission of submissions) {
            if (submission['current_submission'] && submission['current_submission'] !== "") {
                let group_key = submission['current_submission'];
                await group_db_handler.unmute_group(group_key);
            }
        }
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
            this.db_handler.client.hgetall(assignment_key, (error, result) => {
                if (error || result === null) {
                    resolve(false);
                }

                resolve(true);
            });
        })
    }


    async has_extension (assignment_key, user_key) {
        let assignment_data = await this.get_assignment_data('', assignment_key);

        for (let extension of assignment_data['extensions']) {
            if (extension['user'] === user_key)
                return true;
        }

        return false;
    }
}

module.exports = AssignmentDatabaseHandler;

