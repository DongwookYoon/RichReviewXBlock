const env = require('../env');
const RedisClient = require("./RedisClient");
const KeyDictionary = require("./KeyDictionary");
const RedisToJSONParser = require("./RedisToJSONParser");

class GroupDatabaseHandler {

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

        this.instance = await new GroupDatabaseHandler();
        return this.instance;
    }



    async get_data_for_viewer (import_handler, user_key, course_key, group_key) {
        let doc_db_handler = await import_handler.doc_db_handler;
        let user_db_handler = await import_handler.user_db_handler;
        let course_db_handler = await import_handler.course_db_handler;

        let group_data = await this.get_group_data(group_key);

        // if (!this.user_has_permission_to_view_group(user_key, course_key, group_data))
        //     throw new NotAuthorizedError('You are not authorized to view this document');

        let doc_data = await doc_db_handler.get_doc_data(group_data['docid']);

        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);
        let is_instructor = permissions === 'instructor' || permissions === 'ta';
        let user_data = await user_db_handler.get_user_data(user_key);
        let course_data = await course_db_handler.get_course_data(course_key);

        let all_instructors = await Promise.all((course_data['instructors'].concat(course_data['tas'])).map(async user => {
           let user_data = await user_db_handler.get_user_data(user);
           return { id: user_data['id'], name: user_data['nick_name' ]};
        }));

        return {
            r2_ctx: {
                pdfid: doc_data['pdfid'],
                docid: group_data['docid'].replace(KeyDictionary.key_dictionary['document'], ''),
                groupid: group_key.replace(KeyDictionary.key_dictionary['group'], ''),
                pdf_url: `${env.azure_config.storage.host}${doc_data['pdfid']}/doc.pdf`,
                pdfjs_url: `${env.azure_config.storage.host}${doc_data['pdfid']}/doc.vs_doc`,
                serve_dbs_url: process.env.HOST_URL,
                instructor_data: {
                    is_instructor,
                    cur_instructor_name: is_instructor ? user_data['nick_name'] : '',
                    cur_instructor_id: is_instructor ? user_data['id'] : '',
                    all_instructors
                }
            },
            env: env.node_config.ENV,
            cdn_endpoint: env.azure_config.cdn.endpoint
        }
    }


    async get_group_link (import_handler, group_key) {
        let doc_db_handler = await import_handler.doc_db_handler;

        let group_id = group_key.replace(KeyDictionary.key_dictionary['group'], '');
        let group_data = await this.get_group_data(group_key);

        let doc_id = group_data['docid'].replace(KeyDictionary.key_dictionary['document'], '');
        let doc_data = await doc_db_handler.get_doc_data(group_data['docid']);

        let access_code = doc_data['pdfid'];

        return`access_code=${access_code}&docid=${doc_id}&groupid=${group_id}`;
    }


    async get_number_of_users (group_key) {
        let group_data = await this.get_group_data(group_key);
        let users = group_data['users'];
        return users['participating'].length;
    }



    async get_group_data (group_key) {
        return new Promise((resolve, reject) => {
            console.log('Redis request to key: ' + group_key);
            this.db_handler.client.hgetall(group_key, async (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('GET result -> ' + { result });

                let group_data = RedisToJSONParser.parse_data_to_JSON(result);

                resolve(group_data);
            });
        })
    }


    async add_user_to_group (user_id, group_key) {
        let group_data = await this.get_group_data(group_key);
        let users = group_data['users'];

        if(!users) {
            await this.set_group_data(group_key, 'users', JSON.stringify([user_id]));
            return;
        }

        if (!users['participating'].includes(user_id)) {
            users['participating'].push(user_id);
            await this.set_group_data(group_key, 'users', JSON.stringify(users));
        }
    }



    async create_group (user_id, doc_key, master_group) {
        let creation_time = Date.now();
        let group_key = `${KeyDictionary.key_dictionary['group']}${user_id}_${creation_time}`;

        await this.set_group_data(group_key, 'userid_n', user_id);
        await this.set_group_data(group_key, 'docid', doc_key);
        await this.set_group_data(group_key, 'creationTime', creation_time);
        await this.set_group_data(group_key, 'name', `Group created at ${new Date()}`);
        await this.set_group_data(group_key, 'submission', '');
        await this.set_group_data(group_key, 'users', JSON.stringify({
            invited: [],
            participating: [user_id]
        }));

        await this.set_group_data(group_key, 'write_blocked', '[]');
        await this.set_group_data(group_key, 'master_group', master_group || '');
        return group_key;
    }




    async add_submission_to_group (group_key, submission_key) {
        await this.set_group_data(group_key, 'submission', submission_key);
    }



    async give_user_write_permissions (user_id, group_key) {
        let group_data = await this.get_group_data(group_key);
        let write_blocked = group_data['write_blocked'];

        write_blocked = write_blocked.filter((user) => {
            return user !== user_id;
        });

        await this.set_group_data(group_key, 'write_blocked', JSON.stringify(write_blocked));
    }


    async give_users_write_permissions (user_ids, group_key) {
        for (let user_id of user_ids) {
            await this.give_user_write_permissions(user_id, group_key);
        }
    }


    async remove_user_write_permissions (user_id, group_key) {
        let group_data = await this.get_group_data(group_key);
        let write_blocked = group_data['write_blocked'];

        write_blocked.push(user_id);

        await this.set_group_data(group_key, 'write_blocked', JSON.stringify(write_blocked));
    }



    set_group_data(group_key, field, value) {

        return new Promise((resolve, reject) => {
            console.log('Redis hset request to key: ' + group_key);
            this.db_handler.client.hset(group_key, field, value, (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('SET result -> ' + result);
                resolve();
            });
        })
    }



    async verify_instructor_group_memberships (import_handler, user_key, course_key) {
        let user_db_handler = await import_handler.user_db_handler;
        let course_db_handler = await import_handler.course_db_handler;
        let assignment_db_handler = await import_handler.assignment_db_handler;
        let submission_db_handler = await import_handler.submission_db_handler;

        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'ta' && permissions !== 'instructor')
            return;

        let user_id = user_key.replace(KeyDictionary.key_dictionary['user'], '');

        let course_data = await course_db_handler.get_course_data(course_key);
        for (const assignment of course_data['assignments']) {
            try {
                let assignment_data = await assignment_db_handler.get_assignment_data('', assignment);
                for (const submission of assignment_data['submissions']) {
                    try {
                        let submission_data = await submission_db_handler.get_submission_data(submission);
                        if (submission_data['group'] && submission_data['group'] !== '') {
                            await this.add_user_to_group(user_id, submission_data['group']);
                            await user_db_handler.add_group_to_user(user_key, submission_data['group']);
                        }
                        if (submission_data['current_submission'] && submission_data['current_submission'] !== '') {
                            await this.add_user_to_group(user_id, submission_data['current_submission']);
                            await user_db_handler.add_group_to_user(user_key, submission_data['current_submission']);
                        }
                        for (const group of submission_data['past_submissions']) {
                            await this.add_user_to_group(user_id, group);
                            await user_db_handler.add_group_to_user(user_key, group);
                        }
                    } catch (e) { console.warn(e); }
                }
            } catch (e) { console.warn(e) ;}
        }
    }


    async user_has_permission_to_view_group (user_key, course_key, group_data) {
        return true;
    }
}

module.exports = GroupDatabaseHandler;




