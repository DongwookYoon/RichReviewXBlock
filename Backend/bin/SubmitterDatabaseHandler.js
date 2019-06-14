class SubmitterDatabaseHandler {

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

        this.instance = await new SubmitterDatabaseHandler();
        return this.instance;
    }



    async get_submitter (user_key, course_key, submitter_key) {

        let user_db_handler = await UserDatabaseHandler.get_instance();
        let user_permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        let submitter_data = await this.get_submitter_data(submitter_key);

        if (!submitter_data['members'].includes(user_key) &&
                user_permissions !== 'instructor' &&
                user_permissions !== 'ta')
            throw new NotAuthorizedError('User is not authorized to view this submission');

        let submission_db_handler = await SubmissionDatabaseHandler.get_instance();
        let submission = await submission_db_handler.get_submission(submitter_data['submission']);

        submission['submitter'] = submitter_data;

        return submission;
    }


    async create_submitter_and_return_key (user_keys, submission_key, course_group_key) {
        let largest_submitter_key = await this.get_largest_submitter_key();

        let submitter_key = KeyDictionary.key_dictionary['submitter'] + (largest_submitter_key + 1);

        await this.set_submitter_data(submitter_key, 'members', JSON.stringify(user_keys));
        await this.set_submitter_data(submitter_key, 'submission', submission_key);
        await this.set_submitter_data(submitter_key, 'course_group', course_group_key);

        let user_db_handler = await UserDatabaseHandler.get_instance();

        for (let user_key of user_keys) {
            await user_db_handler.add_submitter_to_user(user_key, submitter_key);
        }

        return submitter_key;
    }



    async get_all_submitters (submitter_keys) {
        let submitters = [];

        for (let submitter_key of submitter_keys) {
            let submitter = await this.get_submitter_data(submitter_key);
            submitters.push(submitter);
        }

        return submitters;
    }



    get_submitter_data (submitter_key) {
        return new Promise((resolve, reject) => {
            console.log('Redis request to key: ' + submitter_key);
            this.db_handler.client.hgetall(submitter_key, (error, result) => {
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



    set_submitter_data(submitter_key, field, value) {

        return new Promise((resolve, reject) => {
            console.log('Redis hset request to key: ' + submitter_key);
            this.db_handler.client.hset(submitter_key, field, value, (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('SET result -> ' + result);
                resolve();
            });
        })
    }



    get_largest_submitter_key () {
        return new Promise((resolve, reject) => {
            this.db_handler.client.keys(KeyDictionary.key_dictionary['submitter'] + '*', (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('KEY result -> ' + result);
                result = result.map((key) => {
                    return parseInt(key.replace(KeyDictionary.key_dictionary['submitter'], ''));
                });
                result.push(0);
                result.sort();
                resolve(result[result.length - 1]);
            });
        })
    }



    async delete_submitter (submitter_key) {
        let user_db_handler = await UserDatabaseHandler.get_instance();

        let submitter_data = await this.get_submitter_data(submitter_key);
        let members = submitter_data['members'];

        if (members === undefined)
            console.log('');

        for (let member of members) {
            await user_db_handler.remove_submitter_from_user(member, submitter_key);
        }

        let course_group_db_handler = await CourseGroupDatabaseHandler.get_instance();

        if (submitter_data['course_group'] !== '')
            await course_group_db_handler.remove_submitter_from_group(submitter_key, submitter_data['course_group']);


        await this.db_handler.client.del(submitter_key, (error, result) => {
            if (error) {
                console.log(error);
                throw error;
            }
            console.log('DEL result -> ' + result);
        });
    }



    async is_user_owner_of_submitter (user_key, submitter_key) {
        let submitter_data = await this.get_submitter_data(submitter_key);
        let members = submitter_data['members'];

        for (let member of members) {
            if (member === user_key)
                return true;
        }

        return false;
    }
}

module.exports = SubmitterDatabaseHandler;


/*
 ** Module exports are at the end of the file to fix the circular dependency between:
 **  - UserDatabaseHandler
 **  - CourseDatabaseHandler
 **  - AssignmentDatabaseHandler
 */
const RedisClient = require("./RedisClient");
const SubmissionDatabaseHandler = require('./SubmissionDatabaseHandler');
const UserDatabaseHandler = require('./UserDatabaseHandler');
const CourseGroupDatabaseHandler = require('./CourseGroupDatabaseHandler');
const RedisToJSONParser = require("./RedisToJSONParser");
const KeyDictionary = require("./KeyDictionary");
const NotAuthorizedError = require("../errors/NotAuthorizedError");
