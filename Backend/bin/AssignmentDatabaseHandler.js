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



    async edit_assignment (user_key, assignment_key, edits) {

        let user_db_handler = await UserDatabaseHandler.get_instance();

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);

        if (assignment_data === undefined)
            throw new NotAuthorizedError('You are not authorized to edit this assignment');

        let user_data = await user_db_handler.get_user_data(user_key);

        if(!user_data['teaching'].includes(assignment_data['course']) &&
                !user_data['taing'].includes(assignment_data['course']))
            throw new NotAuthorizedError('You are not authorized to edit this assignment');

        for (const field in edits) {
            let value = edits[field];

            if (DateHelper.is_date(field))
                value = DateHelper.format_date(value);

            await this.set_assignment_data(assignment_key, field, value);
        }
    }



    async create_assignment (course_key, assignment_data) {
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

        let course_db_handler = await CourseDatabaseHandler.get_instance();
        await course_db_handler.add_assignment_to_course(assignment_key, course_key);

        return assignment_key;
    }



    async create_document_submission_assignment (course_key, assignment_data) {

        let assignment_key = await this.create_assignment(course_key, assignment_data);

        // Create submissions / submitters for each user/group
        let submission_db_handler = await SubmissionDatabaseHandler.get_instance();

        let submission_keys = [];

        if (!assignment_data['group_assignment']) {
            submission_keys = await submission_db_handler.create_submission_for_each_user_and_return_keys(course_key,
                assignment_key);

        } else {
            submission_keys = await submission_db_handler.create_submission_for_each_course_group_and_return_keys(course_key,
                assignment_key);
        }

        await this.set_assignment_data(assignment_key, 'submissions', JSON.stringify(submission_keys));
    }



    async create_comment_submission_assignment (user_key, course_key, assignment_data, files) {

        let document_upload_handler = await DocumentUploadHandler.get_instance();
        let document_db_handler = await DocumentDatabaseHandler.get_instance();
        let group_db_handler = await GroupDatabaseHandler.get_instance();
        let user_db_handler = await UserDatabaseHandler.get_instance();
        let submission_db_handler = await SubmissionDatabaseHandler.get_instance();
        let submitter_db_handler = await SubmitterDatabaseHandler.get_instance();

        // Upload pdf to azure
        let main_context = await document_upload_handler.upload_documents(files);

        // Add doc and grp to redis
        let user_id = user_key.replace(KeyDictionary.key_dictionary['user'], '');
        let main_doc_key = await document_db_handler.create_doc(user_id, main_context.container);
        let main_group_key = await group_db_handler.create_group(user_id, main_doc_key);
        await document_db_handler.add_group_to_doc(main_doc_key, main_group_key);
        await user_db_handler.add_group_to_user(user_key, main_group_key);

        let assignment_key = await this.create_assignment(course_key, assignment_data);

        await this.set_assignment_data(assignment_key, 'group', main_group_key);


        let submission_keys = [];

        if (!assignment_data['group_assignment']) {
            submission_keys = await submission_db_handler.create_submission_for_each_user_and_return_keys(course_key,
                assignment_key);

        } else {
            submission_keys = await submission_db_handler.create_submission_for_each_course_group_and_return_keys(course_key,
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
                result.sort();
                resolve(result[result.length - 1]);
            });
        })
    }



    async get_all_users_upcoming_assignments (user_key) {

        let user_db_handler = await UserDatabaseHandler.get_instance();
        let course_db_handler = await CourseDatabaseHandler.get_instance();

        let user_data = await user_db_handler.get_user_data(user_key);

        let enrolments = user_data['enrolments'];

        let upcoming_assignments = [];

        for (let course_key of enrolments) {
            let course_data = await course_db_handler.get_course_data(course_key);

            let assignments = course_data['assignments'];

            for (let assignment_key of assignments) {

                let assignment_data = await this.get_assignment_data(user_key, assignment_key);

                if (assignment_data && (assignment_data['due_date'] === '' || new Date(assignment_data['due_date']) > new Date())) {
                    let submission_status = await this.get_user_submission_status(user_key, assignment_key);

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



    async get_course_assignments_for_student (user_key, assignment_keys) {

        let assignments = [];
        let submission_db_handler = await SubmissionDatabaseHandler.get_instance();

        for (let assignment_key of assignment_keys) {

            let assignment_data = await this.get_assignment_data(user_key, assignment_key);

            if (assignment_data && !assignment_data['hidden']) {
                let submission_key = await this.get_users_submission_key(user_key, assignment_key);
                let submission_data = await submission_db_handler.get_submission_data(submission_key);

                assignment_data['submission'] = submission_data;

                let late = false;

                if (assignment_data['due_date'] !== '') {
                    let due_date = new Date(assignment_data['due_date']);
                    let now = new Date();

                    if (submission_data['submission_status'] === 'Not Submitted' &&
                        now - due_date > 0)
                        late = true;

                    if (submission_data['submission_status'] === 'Submitted' &&
                        new Date(submission_data['submission_time']) - due_date > 0)
                        late = true;
                }

                assignment_data['late'] = late;

                assignments.push(assignment_data);
            }
        }

        return assignments;
    }



    get_course_assignments (user_key, assignment_keys) {

        let assignment_promises = assignment_keys.map(async (assignment_key) => {

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

                // TODO reimplement permission checking for this
                // AssignmentDatabaseHandler.user_has_permission_to_view(user_key, assignment_data).then((can_view) => {
                //     if (can_view)
                //         resolve(result);
                //
                //     resolve(undefined);
                // });
            });
        })
    }


    async get_assignment_submisions (user_key, course_key, assignment_key) {
        let user_db_handler = await UserDatabaseHandler.get_instance();
        let submission_db_handler = await SubmissionDatabaseHandler.get_instance();
        let submitter_db_handler = await SubmitterDatabaseHandler.get_instance();
        let group_db_handler = await GroupDatabaseHandler.get_instance();
        let doc_db_handler = await DocumentDatabaseHandler.get_instance();

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
                submitter_name = await this.get_course_group_assignment_submission_name(submitter_data['course_group']);
            else
                submitter_name = await this.get_individual_assignment_submission_name(submitter_data['members'][0]);

            let link = '';

            if (submission_data['current_submission'] !== '') {
                let group_id = submission_data['current_submission'].replace(KeyDictionary.key_dictionary['group'], '');
                let group_data = await group_db_handler.get_group_data(submission_data['current_submission']);

                let doc_id = group_data['docid'].replace(KeyDictionary.key_dictionary['document'], '');
                let doc_data = await doc_db_handler.get_doc_data(group_data['docid']);

                let access_code = doc_data['pdfid'];

                link = `access_code=${access_code}&docid=${doc_id}&groupid=${group_id}`;
            }

            let late = false;

            if (assignment_data['due_date'] !== '') {
                let due_date = new Date(assignment_data['due_date']);
                let now = new Date();

                if (submission_data['submission_status'] === 'Not Submitted' &&
                    now - due_date > 0)
                    late = true;

                if (submission_data['submission_status'] === 'Submitted' &&
                    new Date(submission_data['submission_time']) - due_date > 0)
                    late = true;
            }

            let assignment_submission = {
                submitter_name: submitter_name,
                points: assignment_data['points'],
                mark: submission_data['mark'],
                submission_status: submission_data['submission_status'],
                group: submission_data['current_submission'],
                late: late,
                link: link
            };

            assignment_submissions.push(assignment_submission);
        }

        return assignment_submissions;
    }



    async get_assignment_submission_links_and_id (user_key, assignment_key) {
        let submission_db_handler = await SubmissionDatabaseHandler.get_instance();
        let group_db_handler = await GroupDatabaseHandler.get_instance();
        let doc_db_handler = await DocumentDatabaseHandler.get_instance();

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


    async get_first_assignment_submission_link_and_id (user_key, assignment_key) {
        let submissions_links_and_ids = await this.get_assignment_submission_links_and_id(user_key, assignment_key);

        if (submissions_links_and_ids.length > 0)
            return submissions_links_and_ids[0];

        return { link: '', id: '' };
    }



    async get_previous_assignment_submission_link (user_key, assignment_key, submission_id) {
        let submissions_links_and_ids = await this.get_assignment_submission_links_and_id(user_key, assignment_key);

        for(let i = 0; i < submissions_links_and_ids.length; i++) {
            if (submissions_links_and_ids[i].id === submission_id && i > 0)
                return submissions_links_and_ids[i - 1];
        }
        return { link: '', id: '' };
    }



    async get_next_assignment_submission_link (user_key, assignment_key, submission_id) {
        let submissions_links_and_ids = await this.get_assignment_submission_links_and_id(user_key, assignment_key);
        let found = false;

        for (let submissions_link_and_id of submissions_links_and_ids) {
            if(found)
                return submissions_link_and_id;

            if (submissions_link_and_id.id === submission_id)
                found = true;
        }

        return { link: '', id: '' };
    }



    async get_individual_assignment_submission_name (user_key) {
        let user_db_handler = await UserDatabaseHandler.get_instance();
        let user_data = await user_db_handler.get_user_data(user_key);
        return user_data['display_name'];
    }



    async get_course_group_assignment_submission_name (course_group_key) {
        let course_group_db_handler = await CourseGroupDatabaseHandler.get_instance();
        let course_group_data = await course_group_db_handler.get_course_group_data(course_group_key);
        return course_group_data['name'];
    }


    async get_users_submission_key (user_key, assignment_key) {
        let submission_db_handler = await SubmissionDatabaseHandler.get_instance();

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        let submissions = assignment_data['submissions'];

        for (let submission_key of submissions) {
            if (await submission_db_handler.is_user_owner_of_submission(user_key, submission_key))
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
                if (error) {
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



    async delete_assignment (user_key, course_key, assignment_key) {
        let user_db_handler = await UserDatabaseHandler.get_instance();
        let course_db_handler = await CourseDatabaseHandler.get_instance();
        let submission_db_handler = await SubmissionDatabaseHandler.get_instance();

        let user_permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (user_permissions !== 'ta' && user_permissions !== 'instructor')
            throw new NotAuthorizedError('You are not authorized to delete this assignment');

        await course_db_handler.delete_assignment_from_course(assignment_key, course_key);

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);
        let submissions = assignment_data['submissions'];

        for (let submission of submissions) {
            await submission_db_handler.delete_submission(submission);
        }

        await this.db_handler.client.del(assignment_key, (error, result) => {
            if (error) {
                console.log(error);
                throw error;
            }
            console.log('DEL result -> ' + result);
        });
    }



    static async user_has_permission_to_view (user_key, assignment_data) {

        let user_db_handler = await UserDatabaseHandler.get_instance();
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



    async get_user_submission_status (user_key, assignment_key) {
        let submission_db_handler = await SubmissionDatabaseHandler.get_instance();

        let submission_key = await this.get_users_submission_key(user_key, assignment_key);
        let submission_data = await submission_db_handler.get_submission_data(submission_key);

        let assignment_data = await this.get_assignment_data(user_key, assignment_key);

        let late = false;

        if (assignment_data['due_date'] !== '') {
            let due_date = new Date(assignment_data['due_date']);
            let now = new Date();

            if (submission_data['submission_status'] === 'Not Submitted' &&
                now - due_date > 0)
                late = true;

            if (submission_data['submission_status'] === 'Submitted' &&
                new Date(submission_data['submission_time']) - due_date > 0)
                late = true;
        }

        return {
            submission_status: submission_data['submission_status'],
            late: late
        };
    }
}

module.exports = AssignmentDatabaseHandler;


/*
 ** Module exports are at the end of the file to fix the circular dependency between:
 **  - UserDatabaseHandler
 **  - CourseDatabaseHandler
 **  - AssignmentDatabaseHandler
 */
const RedisClient = require("./RedisClient");
const UserDatabaseHandler = require("./UserDatabaseHandler");
const CourseDatabaseHandler = require("./CourseDatabaseHandler");
const SubmissionDatabaseHandler = require("./SubmissionDatabaseHandler");
const SubmitterDatabaseHandler = require("./SubmitterDatabaseHandler");
const CourseGroupDatabaseHandler = require("./CourseGroupDatabaseHandler");
const DocumentUploadHandler = require('../bin/DocumentUploadHandler');
const DocumentDatabaseHandler = require('../bin/DocumentDatabaseHandler');
const GroupDatabaseHandler = require('../bin/GroupDatabaseHandler');
const RedisToJSONParser = require("./RedisToJSONParser");
const KeyDictionary = require("./KeyDictionary");
const DateHelper = require("./DateHelper");
const NotAuthorizedError = require("../errors/NotAuthorizedError");