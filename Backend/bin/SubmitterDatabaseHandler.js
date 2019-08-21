const RedisClient = require("./RedisClient");
const RedisToJSONParser = require("./RedisToJSONParser");
const KeyDictionary = require("./KeyDictionary");
const NotAuthorizedError = require("../errors/NotAuthorizedError");

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



    async get_submitter (import_handler, user_key, course_key, submitter_key) {

        let user_db_handler = await import_handler.user_db_handler;
        let user_permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        let submitter_data = await this.get_submitter_data(submitter_key);

        if (!submitter_data['members'].includes(user_key) &&
                user_permissions !== 'instructor' &&
                user_permissions !== 'ta')
            throw new NotAuthorizedError('User is not authorized to view this submission');

        let submission_db_handler = await import_handler.submission_db_handler;
        let submission = await submission_db_handler.get_submission(import_handler, submitter_data['submission']);

        submission['submitter'] = submitter_data;

        return submission;
    }


    async create_submitter_and_return_key (import_handler, course_key, user_keys, submission_key, course_group_key) {
        let id = `${course_key.replace(KeyDictionary.key_dictionary['course'], '')}_${Date.now()}_${Math.floor((Math.random() * 100000) + 1)}`;
        let submitter_key = KeyDictionary.key_dictionary['submitter'] + id;

        await this.set_submitter_data(submitter_key, 'members', JSON.stringify(user_keys));
        await this.set_submitter_data(submitter_key, 'submission', submission_key);
        await this.set_submitter_data(submitter_key, 'course_group', course_group_key);

        let user_db_handler = await import_handler.user_db_handler;

        for (let user_key of user_keys) {
            await user_db_handler.add_submitter_to_user(user_key, submitter_key);
        }

        return submitter_key;
    }



    async add_user_to_submitter (user_key, submitter_key) {
        let submitter_data = await this.get_submitter_data(submitter_key);
        let members = submitter_data['members'];

        if(!members) {
            await this.set_submitter_data(submitter_key, 'members', JSON.stringify([user_key]));
            return;
        }

        if (!members.includes(user_key)) {
            members.push(user_key);
            await this.set_submitter_data(submitter_key, 'members', JSON.stringify(members));
        }
    }



    async remove_user_from_submitter (user_key, submitter_key) {
        let submitter_data = await this.get_submitter_data(submitter_key);
        let members = submitter_data['members'];
        members = members.filter(member => {
            return member !== user_key;
        });

        await this.set_submitter_data(submitter_key, 'members', JSON.stringify(members));
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



    async delete_submitter (import_handler, submitter_key) {
        let user_db_handler = await import_handler.user_db_handler;

        let submitter_data = await this.get_submitter_data(submitter_key);
        let members = submitter_data['members'];

        if (members === undefined)
            console.log('');

        for (let member of members) {
            try {
                await user_db_handler.remove_submitter_from_user(member, submitter_key);
            } catch (e) {
                console.warn(e);
            }
        }

        let course_group_db_handler = await import_handler.course_group_db_handler;

        if (submitter_data['course_group'] !== '') {
            try {
                await course_group_db_handler.remove_submitter_from_group(submitter_key, submitter_data['course_group']);
            } catch (e) {
                console.warn(e);
            }
        }


        await this.db_handler.client.del(submitter_key, (error, result) => {
            if (error) {
                console.log(error);
                throw error;
            }
            console.log('DEL result -> ' + result);
        });
    }



    // async update_user_submitters (import_handler, user_key, course_key) {
    //     let course_db_handler = await import_handler.course_db_handler;
    //     let assignment_db_handler = await import_handler.assignment_db_handler;
    //
    //     let course_data = await course_db_handler.get_course_data(course_key);
    //
    //     for (const assignment of course_data['assignments']) {
    //         let assignment_data = await assignment_db_handler.get_assignment_data('', assignment);
    //         if (!(await this.does_user_have_submitter(import_handler, user_key, assignment)) && !assignment_data['group_assignment']) {
    //
    //         }
    //     }
    // }



    async does_user_have_submitter(import_handler, user_key, assignment_key) {
        let assignment_db_handler = await import_handler.assignment_db_handler;
        let submission_db_handler = await import_handler.submission_db_handler;
        let user_db_handler = await import_handler.user_db_handler;

        let assignment_data = await assignment_db_handler.get_assignment_data('', assignment_key);
        let submitters = await Promise.all(assignment_data['submissions'].map(async submission => {
            let submission_data = await submission_db_handler.get_submission_data(submission);
            return submission_data['submitter'];
        }));

        let user_data = await user_db_handler.get_user_data(user_key);

        return submitters.some(submitter => user_data['submitters'].includes(submitter));
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



    async is_course_group_owner_of_submitter (course_group_key, submitter_key) {
        let submitter_data = await this.get_submitter_data(submitter_key);
        return course_group_key === submitter_data['course_group'];
    }
}

module.exports = SubmitterDatabaseHandler;

