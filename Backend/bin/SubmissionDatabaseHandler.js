class SubmissionDatabaseHandler {

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

        this.instance = await new SubmissionDatabaseHandler();
        return this.instance;
    }



    async get_submission (submission_key) {
        let submission_data = await this.get_submission_data(submission_key);

        let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();
        let assignment_data = await assignment_db_handler.get_assignment_id_title_and_points(submission_data['assignment']);

        return { submission: submission_data, assignment: assignment_data };
    }



    async get_all_submissions (submission_keys) {

        let submissions = [];

        for (let submission_key of submission_keys) {
            let submission = await this.get_submission_data(submission_key);
            submissions.push(submission);
        }

        return submissions;
    }



    async create_submission_for_each_user_and_return_keys (course_key, assignment_key) {
        let user_db_handler = await UserDatabaseHandler.get_instance();
        let submitter_db_handler = await SubmitterDatabaseHandler.get_instance();

        let all_users = await user_db_handler.get_all_course_users(course_key);
        let students = all_users['students'].map((student) => {
            return KeyDictionary.key_dictionary['user'] + student.id;
        });

        let submission_keys = [];

        for (let student of students) {
            console.log(student);
            let largest_submission_key = await this.get_largest_submission_key();
            let submission_key = KeyDictionary.key_dictionary['submission'] + (largest_submission_key + 1);

            submission_keys.push(submission_key);

            await this.set_submission_data(submission_key, 'id', largest_submission_key + 1);
            await this.set_submission_data(submission_key, 'submission_status', 'Not Submitted');
            await this.set_submission_data(submission_key, 'mark', '');
            await this.set_submission_data(submission_key, 'submission_time', '');
            await this.set_submission_data(submission_key, 'assignment', assignment_key);
            await this.set_submission_data(submission_key, 'group', '');
            await this.set_submission_data(submission_key, 'current_submission', '');
            await this.set_submission_data(submission_key, 'past_submissions', '[]');

            let submitter_key = await submitter_db_handler.create_submitter_and_return_key([student],
                submission_key, '');

            await this.set_submission_data(submission_key, 'submitter', submitter_key);
        }

        return submission_keys;
    }



    async create_submission_for_each_course_group_and_return_keys (course_key, assignment_key) {
        let course_group_db_handler = await CourseGroupDatabaseHandler.get_instance();
        let submitter_db_handler = await SubmitterDatabaseHandler.get_instance();

        let submission_keys = [];

        let course_groups = (await course_group_db_handler.get_all_course_groups(course_key))['active_course_groups'];
        for (let course_group of course_groups) {
            let course_group_key = KeyDictionary.key_dictionary['course_group'] + course_group.id;

            let largest_submission_key = await this.get_largest_submission_key();
            let submission_key = KeyDictionary.key_dictionary['submission'] + (largest_submission_key + 1);

            submission_keys.push(submission_key);

            let course_group_data = await course_group_db_handler.get_course_group_data(course_group_key);
            let course_group_members = course_group_data['users'];

            await this.set_submission_data(submission_key, 'id', largest_submission_key + 1);
            await this.set_submission_data(submission_key, 'submission_status', 'Not Submitted');
            await this.set_submission_data(submission_key, 'mark', '');
            await this.set_submission_data(submission_key, 'submission_time', '');
            await this.set_submission_data(submission_key, 'assignment', assignment_key);
            await this.set_submission_data(submission_key, 'group', '');
            await this.set_submission_data(submission_key, 'current_submission', '');
            await this.set_submission_data(submission_key, 'past_submissions', '[]');

            let submitter_key = await submitter_db_handler.create_submitter_and_return_key(course_group_members,
                submission_key, course_group_key);

            await this.set_submission_data(submission_key, 'submitter', submitter_key);

            await course_group_db_handler.add_submitter_to_course_group(submitter_key, course_group_key);
        }

        return submission_keys;
    }


    async get_submission_owner (submission_key) {
        let submitter_db_hanlder = await SubmitterDatabaseHandler.get_instance();

        let submission_data = await this.get_submission_data(submission_key);

        let submitter_data = await submitter_db_hanlder.get_submitter_data(submission_data['submitter']);

        if (submitter_data['course_group'] !== '') {
            let course_group_db_handler = await CourseGroupDatabaseHandler.get_instance();
            let course_group_data = await course_group_db_handler.get_course_group_data(submitter_data['course_group']);
            return { name: course_group_data['name'], key: submitter_data['course_group'] };
        }

        let user_db_handler = await UserDatabaseHandler.get_instance();
        let user_data = await user_db_handler.get_user_data(submitter_data['members'][0]);
        return { name: user_data['display_name'], key: submitter_data['members'][0] };
    }


    get_largest_submission_key () {
        return new Promise((resolve, reject) => {
            this.db_handler.client.keys(KeyDictionary.key_dictionary['submission'] + '*', (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('KEY result -> ' + result);
                result = result.map((key) => {
                    return parseInt(key.replace(KeyDictionary.key_dictionary['submission'], ''));
                });
                result.push(0);
                result.sort((a, b) => {
                    return a - b;
                });
                resolve(result[result.length - 1]);
            });
        })
    }



    get_submission_data (submission_key) {
        return new Promise((resolve, reject) => {
            console.log('Redis request to key: ' + submission_key);
            this.db_handler.client.hgetall(submission_key, (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('GET result -> ' + { result });

                let parsed_data = RedisToJSONParser.parse_data_to_JSON(result);
                resolve(parsed_data);
            });
        });
    }



    async add_group_to_comment_submission (submission_key, group_key) {
        await this.set_submission_data(submission_key, 'group', group_key);
    }



    async add_group_to_document_submission (submission_key, group_key) {
        let submission_data = await this.get_submission_data(submission_key);
        let group = submission_data['group'];

        if (group !== "") {
            let past_submissions = submission_data['past_submissions'];
            past_submissions.push(group);
            await this.set_submission_data(submission_key, 'past_submissions', JSON.stringify(past_submissions));
        }

        await this.set_submission_data(submission_key, 'group', group_key);
        await this.set_submission_data(submission_key, 'current_submission', group_key);

        await this.set_submission_data(submission_key, 'submission_status', 'Submitted');
        await this.set_submission_data(submission_key, 'submission_time', new Date().toISOString());
    }



    async update_submission_grade (submission_key, mark) {
        await this.set_submission_data(submission_key, 'mark', mark);
    }



    async set_submission_status_to_submitted (submission_key) {
        await this.set_submission_data(submission_key, 'submission_status', 'Submitted');
        await this.set_submission_data(submission_key, 'submission_time', new Date().toISOString());
    }



    async submit_comment_submission (submission_key, group_key) {
        let doc_db_handler = await DocumentDatabaseHandler.get_instance();
        let group_db_handler = await GroupDatabaseHandler.get_instance();
        let cmd_db_handler = await CmdDatabaseHandler.get_instance();
        let log_db_handler = await LogDatabaseHandler.get_instance();
        let submitter_db_handler = await SubmitterDatabaseHandler.get_instance();
        let user_db_handler = await UserDatabaseHandler.get_instance();

        let group_data = await group_db_handler.get_group_data(group_key);
        let instructor_id = group_data['userid_n'];

        let doc_data = await doc_db_handler.get_doc_data(group_data['docid']);

        let new_doc_key = await doc_db_handler.create_doc(instructor_id, doc_data['pdfid']);

        let new_group_key = await group_db_handler.create_group(instructor_id, new_doc_key);
        await group_db_handler.add_submission_to_group(new_group_key, submission_key);

        await doc_db_handler.add_group_to_doc(new_doc_key, new_group_key);

        let cmd_key = KeyDictionary.key_dictionary['command'] + group_key.replace(KeyDictionary.key_dictionary['group'], '');
        let cmd_data = await cmd_db_handler.get_cmd_data(cmd_key, 0);
        let new_cmd_key = KeyDictionary.key_dictionary['command'] + new_group_key.replace(KeyDictionary.key_dictionary['group'], '');

        let log_key = 'log:' + group_key.replace(KeyDictionary.key_dictionary['group'], '');
        let log_data = await log_db_handler.get_logs(log_key);
        let new_log_key = 'log:' + new_group_key.replace(KeyDictionary.key_dictionary['group'], '');

        for (let cmd of cmd_data) {
            await cmd_db_handler.update_cmd(new_cmd_key,JSON.stringify(cmd));
        }

        await log_db_handler.update_logs(new_log_key, log_data);

        let submission_data = await this.get_submission_data(submission_key);

        if (submission_data['current_submission'] !== '') {
            let past_submissions = submission_data['past_submissions'];
            past_submissions.push(submission_data['current_submission']);
            await this.set_submission_data(submission_key, 'past_submissions', JSON.stringify(past_submissions));
        }

        await this.set_submission_data(submission_key, 'current_submission', new_group_key);
        await this.set_submission_status_to_submitted(submission_key);

        let submitter_key = submission_data['submitter'];
        let submitter_data = await submitter_db_handler.get_submitter_data(submitter_key);

        for (let member of submitter_data['members']) {
            let member_id = member.replace(KeyDictionary.key_dictionary['user'], '');
            await group_db_handler.add_user_to_group(member_id, new_group_key);
            await user_db_handler.add_group_to_user(member, new_group_key);
            await group_db_handler.remove_user_write_permissions(member_id, new_group_key);
        }
    }



    set_submission_data(submission_key, field, value) {

        return new Promise((resolve, reject) => {
            console.log('Redis hset request to key: ' + submission_key);
            this.db_handler.client.hset(submission_key, field, value, (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('SET result -> ' + result);
                resolve();
            });
        })
    }



    async delete_submission (submission_key) {
        let submitter_db_handler = await SubmitterDatabaseHandler.get_instance();

        let submission_data = await this.get_submission_data(submission_key);
        await submitter_db_handler.delete_submitter(submission_data['submitter']);

        await this.db_handler.client.del(submission_key, (error, result) => {
            if (error) {
                console.log(error);
                throw error;
            }
            console.log('DEL result -> ' + result);
        });
    }



    async is_user_owner_of_submission (user_key, submission_key) {
        let submitter_db_handler = await SubmitterDatabaseHandler.get_instance();

        let submission_data = await this.get_submission_data(submission_key);
        let submitter_key = submission_data['submitter'];

        return await submitter_db_handler.is_user_owner_of_submitter(user_key, submitter_key);
    }


    async is_course_group_owner_of_submission (course_group_key, submission_key) {
        let submitter_db_handler = await SubmitterDatabaseHandler.get_instance();

        let submission_data = await this.get_submission_data(submission_key);
        let submitter_key = submission_data['submitter'];

        return await submitter_db_handler.is_course_group_owner_of_submitter(course_group_key, submitter_key);
    }
}

module.exports = SubmissionDatabaseHandler;


/*
 ** Module exports are at the end of the file to fix the circular dependency between:
 **  - UserDatabaseHandler
 **  - CourseDatabaseHandler
 **  - AssignmentDatabaseHandler
 */
const RedisClient = require("./RedisClient");
const RedisToJSONParser = require("./RedisToJSONParser");
const AssignmentDatabaseHandler = require("./AssignmentDatabaseHandler");
const UserDatabaseHandler = require("./UserDatabaseHandler");
const SubmitterDatabaseHandler = require("./SubmitterDatabaseHandler");
const CourseGroupDatabaseHandler = require("./CourseGroupDatabaseHandler");
const GroupDatabaseHandler = require("./GroupDatabaseHandler");
const DocumentDatabaseHandler = require("./DocumentDatabaseHandler");
const CmdDatabaseHandler = require("./CmdDatabaseHandler");
const LogDatabaseHandler = require("./LogDatabaseHandler");
const KeyDictionary = require("./KeyDictionary");




