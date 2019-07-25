const RedisClient = require('./RedisClient');
const RedisToJSONParser = require("./RedisToJSONParser");
const KeyDictionary = require("./KeyDictionary");
const NotAuthorizedError = require("../errors/NotAuthorizedError");
const RichReviewError = require("../errors/RichReviewError");

class CourseGroupDatabaseHandler {

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

        this.instance = await new CourseGroupDatabaseHandler();
        return this.instance;
    }



    async get_all_course_groups (import_handler, course_key) {
        let course_db_handler = await import_handler.course_db_handler;
        let course_data = await course_db_handler.get_course_data(course_key);

        let active_group_ids = course_data['active_course_groups'];
        let inactive_group_ids = course_data['inactive_course_groups'];

        let active_course_groups = await Promise.all(active_group_ids.map(async (group_key) => {
            let group_data = await this.get_course_group_data(group_key);
            let users = await this.get_all_course_group_users(import_handler, group_key);

            return { id: group_data['id'],
                name: group_data['name'],
                member_count: group_data['users'].length,
                members: users }
        }));

        let inactive_course_groups = await Promise.all(inactive_group_ids.map(async (group_key) => {
            let group_data = await this.get_course_group_data(group_key);
            let users = await this.get_all_course_group_users(import_handler, group_key);

            return { id: group_data['id'],
                name: group_data['name'],
                member_count: group_data['users'].length,
                members: users }
        }));

        return { active_course_groups: active_course_groups, inactive_course_groups: inactive_course_groups };
    }



    async get_all_user_course_groups (import_handler, user_key) {
        let user_db_handler = await import_handler.user_db_handler;
        let course_db_handler = await import_handler.course_db_handler;

        let user_data = await user_db_handler.get_user_data(user_key);
        let course_groups = [];

        for (let course_group_key of user_data['course_groups']) {
            let course_group_data = await this.get_course_group_data(course_group_key);
            let course_data = await course_db_handler.get_course_data(course_group_data['course']);

            course_groups.push({
                course_group_id: course_group_data['id'],
                course_id: course_data['id'],
                name: course_group_data['name'],
                course: course_data['title'],
                members: course_group_data['users'].length
            })
        }

        return course_groups;
    }



    async get_all_course_group_users (import_handler, course_group_key) {

        let user_db_handler = await import_handler.user_db_handler;
        let course_group_data = await this.get_course_group_data(course_group_key);

        let users = [];

        for (let user_key of course_group_data['users']) {
            let user_data = await user_db_handler.get_user_data(user_key);
            users.push({ id: user_key['id'], name: user_data['display_name'] });
        }

        return users;
    }



    async get_all_course_users_unassigned_to_a_course_group (import_handler, course_key) {
        let course_db_handler = await import_handler.course_db_handler;
        let user_db_handler = await import_handler.user_db_handler;

        let course_data = await course_db_handler.get_course_data(course_key);

        let unassigned_student_keys = [];
        let course_groups = (await this.get_all_course_groups(import_handler, course_key))['active_course_groups'];

        for (let user_key of course_data['active_students']) {
            let found_group = false;

            for (let course_group of course_groups) {
                for (let member of course_group['members']) {
                    if (KeyDictionary.key_dictionary['user'] + member.id === user_key)
                        found_group = true;
                }
            }

            if (!found_group)
                unassigned_student_keys.push(user_key);
        }

        let unassigned_students = [];

        for (let user_key of unassigned_student_keys) {
            let student_data = await user_db_handler.get_user_data(user_key);
            unassigned_students.push({ id: student_data['id'], name: student_data['display_name'] });
        }

        return unassigned_students;
    }



    async create_course_group (import_handler, user_key, course_key, group_data) {
        try {
            let user_db_handler = await import_handler.user_db_handler;
            let user_permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

            if (user_permissions !== 'ta' && user_permissions !== 'instructor')
                throw new NotAuthorizedError('You are not authorized to create a group');

            let largest_group_key = await this.get_largest_group_key();
            let course_group_key = KeyDictionary.key_dictionary['course_group'] + (largest_group_key + 1);


            for (let user of group_data.users) {
                await user_db_handler.add_course_group_to_user(user, course_group_key);
            }

            let course_db_handler = await import_handler.course_db_handler;
            await course_db_handler.add_course_group_to_course(course_group_key, course_key);

            // Set default group data values
            await this.set_course_group_data(course_group_key, 'id', largest_group_key + 1);
            await this.set_course_group_data(course_group_key, 'name', group_data.name);
            await this.set_course_group_data(course_group_key, 'users', JSON.stringify(group_data.users));
            await this.set_course_group_data(course_group_key, 'creation_time', new Date());
            await this.set_course_group_data(course_group_key, 'submitters', '[]');
            await this.set_course_group_data(course_group_key, 'course', course_key);

        } catch (e) {
            console.warn(e);
            throw e;
        }
    }



    async get_course_group (import_handler, user_key, course_group_key, course_key) {

        let group_data = await this.get_course_group_data(course_group_key);

        if (group_data['course'] !== course_key)
            throw new RichReviewError('Invalid course group');

        if (group_data['users'].includes(course_group_key))
            throw new NotAuthorizedError('Unauthorized to view this group');


        let user_db_handler = await import_handler.user_db_handler;

        group_data['users'] = await Promise.all(group_data['users'].map(async (user_key) => {
            let user_data = await user_db_handler.get_user_data(user_key);
            return { display_name: user_data['display_name' ]};
        }));

        let submitter_db_handler = await import_handler.submitter_db_handler;

        let submitters = await Promise.all(group_data['submitters'].map(async (submitter_key) => {
            return await submitter_db_handler.get_submitter(import_handler, user_key, course_key, submitter_key)
        }));

        return { group: group_data, submitters: submitters };
    }



    async add_submitter_to_course_group (submitter_key, course_group_key) {

        let group_data = await this.get_course_group_data(course_group_key);
        let submitters = group_data['submitters'];
        submitters.push(submitter_key);
        await this.set_course_group_data(course_group_key, 'submitters', JSON.stringify(submitters));
    }



    set_course_group_data (course_group_key, field, value) {

        return new Promise((resolve, reject) => {
            console.log('Redis hset request to key: ' + course_group_key);
            this.db_handler.client.hset(course_group_key, field, value, (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('SET result -> ' + result);
                resolve();
            });
        })
    }



    get_course_group_data (course_group_key) {
        return new Promise((resolve, reject) => {
            console.log('Redis request to key: ' + course_group_key);
            this.db_handler.client.hgetall(course_group_key, (error, result) => {
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


    get_largest_group_key () {
        return new Promise((resolve, reject) => {
            this.db_handler.client.keys(KeyDictionary.key_dictionary['course_group'] + '*', (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('KEY result -> ' + result);
                result = result.map((key) => {
                    return parseInt(key.replace(KeyDictionary.key_dictionary['course_group'], ''));
                });
                result.push(0);
                result.sort((a, b) => {
                    return a - b;
                });
                resolve(result[result.length - 1]);
            });
        })
    }



    async remove_submitter_from_group (submitter_key, course_group_key) {
        let group_data = await this.get_course_group_data(course_group_key);
        let submitters = group_data['submitters'];
        submitters = submitters.filter(submitter => {
            return submitter !== submitter_key;
        });
        await this.set_course_group_data(course_group_key, 'submitters', JSON.stringify(submitters));
    }



    async delete_course_group (import_handler, user_key, course_key, course_group_key) {
        let user_db_handler = await import_handler.user_db_handler;
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'ta' && permissions !== 'instructor')
            throw new NotAuthorizedError('You are not authorized to delete a course group');

        let course_db_handler = await import_handler.course_db_handler;
        await course_db_handler.deactivate_course_group(course_key, course_group_key);
    }



    async delete_course_group_permanently (import_handler, user_key, course_key, course_group_key) {
        let user_db_handler = await import_handler.user_db_handler;
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'ta' && permissions !== 'instructor')
            throw new NotAuthorizedError('You are not authorized to delete a course group');

        let course_group_data = await this.get_course_group_data(course_group_key);

        console.log(course_group_data);

        for (let member_key of course_group_data['users']) {
            await user_db_handler.remove_course_group_from_user(member_key, course_group_key);
        }

        let course_db_handler = await import_handler.course_db_handler;
        await course_db_handler.permanently_delete_course_group(course_key, course_group_key);

        await this.db_handler.client.del(course_group_key, (error, result) => {
            if (error) {
                console.log(error);
                throw error;
            }
            console.log('DEL result -> ' + result);
        });
    }
}

module.exports = CourseGroupDatabaseHandler;

