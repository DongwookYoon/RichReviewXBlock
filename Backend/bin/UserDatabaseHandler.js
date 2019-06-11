class UserDatabaseHandler {

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

        this.instance = await new UserDatabaseHandler();
        return this.instance;
    }



    async get_user_course_permissions (user_key, course_key) {
        let user_data = await this.get_user_data(user_key);

        if (user_data['enrolments'].includes(course_key))
            return 'student';

        if (user_data['taing'].includes(course_key))
            return 'ta';

        if (user_data['teaching'].includes(course_key))
            return 'instructor';
    }



    get_user_data (user_key) {
        return new Promise((resolve, reject) => {
            this.db_handler.client.HGETALL(user_key, function (error, result) {
                if (error) {
                    console.log(error);
                    reject(error);
                }

                let parsed_data = RedisToJSONParser.parse_data_to_JSON(result);
                resolve(parsed_data);
            });
        })
    }



    async get_course_active_students (course_key) {

        let course_database_handler = await CourseDatabaseHandler.get_instance();
        let course_data = await course_database_handler.get_course_data(course_key);
        return course_data['active_students'];
    }



    async get_course_blocked_students (course_key) {

        let course_database_handler = await CourseDatabaseHandler.get_instance();
        let course_data = await course_database_handler.get_course_data(course_key);
        return course_data['blocked_students'];
    }




    // TODO should blocked students show up in the 'people' list?
    // It makes sense for profs to see blocked students
    // Should other students be able to see blocked students?
    async get_all_course_users (course_key) {

        let course_database_handler = await CourseDatabaseHandler.get_instance();
        let course_data = await course_database_handler.get_course_data(course_key);

        let student_keys = await [...new Set([...course_data['active_students'],
            ...course_data['blocked_students']])];

        let ta_keys = course_data['tas'];
        let instructor_keys = course_data['instructors'];

        let student_list = await Promise.all(student_keys.map (async (student_key) => {
            let student_data = await this.get_user_data(student_key);
            return { id: student_data.id, name: student_data.display_name};
        }));

        let ta_list = await Promise.all(ta_keys.map (async (ta_key) => {
            let ta_data = await this.get_user_data(ta_key);
            return { id: ta_data.id, name: ta_data.display_name };
        }));

        let instructor_list = await Promise.all(instructor_keys.map (async (instructor_key) => {
            let instructor_data = await this.get_user_data(instructor_key);
            return { id: instructor_data.id, name: instructor_data.display_name };
        }));

        return {
            students: student_list,
            tas: ta_list,
            instructors: instructor_list
        };
    }



    // TODO fix ubc user id: 'user_data.salt'
    async add_user_to_db (user_data, auth_type) {
        let user_exists = await this.user_exists(auth_type === 'Google' ? user_data.sub : user_data.salt);

        if (user_exists) {
            console.log('User Exists!');
            return;
        }

        console.log('Adding user to database!');

        if (auth_type === 'Google')
            await this.add_google_user_to_db(user_data);
        else
            await this.add_ubc_user_to_db(user_data);
    }




    async add_submitter_to_user (user_key, submitter_key) {
        let user_data = await this.get_user_data(user_key);
        let submitters = user_data['submitters'];
        submitters.push(submitter_key);
        await this.set_user_data(user_key, 'submitters', JSON.stringify(submitters));
    }



    async add_course_group_to_user (user_key, course_group_key) {
        try {
            let user_data = await this.get_user_data(user_key);
            let course_groups = user_data['course_groups'];
            course_groups.push(course_group_key);
            await this.set_user_data(user_key, 'course_groups', JSON.stringify(course_groups));

        } catch (e) {
            console.warn(e);
            throw e;
        }
    }



    async add_group_to_user (user_key, group_key) {
        let user_data = await this.get_user_data(user_key);
        let groups = user_data['groupNs'];
        groups.push(group_key);
        await this.set_user_data(user_key, 'groupNs', JSON.stringify(groups));
    }




    set_user_data(user_key, field, value) {

        return new Promise((resolve, reject) => {
            console.log('Redis hset request to key: ' + user_key);
            this.db_handler.client.hset(user_key, field, value, (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('SET result -> ' + result);
                resolve();
            });
        })
    }




    user_exists (user_id) {
        return new Promise((resolve, reject) => {
            this.db_handler.client.HGETALL(KeyDictionary.key_dictionary['user'] + user_id, function (error, result) {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                resolve(result !== null);
            });
        })
    }



    async add_google_user_to_db (user_data) {
        let data = {
            id: user_data.sub,
            auth_type: 'Google',
            display_name: user_data.name,
            email: user_data.email,
            first_name: user_data.given_name,
            last_name: user_data.family_name,
            nick_name: user_data.name,
            groupNs: '[]',
            creation_date: Date(Date.now()).toString(),
            enrolments: '[]',
            teaching: '[]',
            taing: '[]',
            course_groups: '[]',
            submitters: '[]'
        };

        await Object.keys(data).map((key, index) => {
            this.db_handler.client.hset(KeyDictionary.key_dictionary['user'] + user_data.sub, key, data[key], () => {});
        });
    }



    add_ubc_user_to_db (user_data) {
        console.log('Adding UBC user');
        throw new Error('Not implemented yet');
    }



    async remove_submitter_from_user (user_key, submitter_key) {
        let user_data = await this.get_user_data(user_key);
        let submitters = user_data['submitters'];
        submitters = submitters.filter(submitter => {
            return submitter !== submitter_key;
        });

        await this.set_user_data(user_key, 'submitters', JSON.stringify(submitters));
    }
}

module.exports = UserDatabaseHandler;


/*
 ** Module exports are at the end of the file to fix the circular dependency between:
 **  - UserDatabaseHandler
 **  - CourseDatabaseHandler
 **  - AssignmentDatabaseHandler
 */
const RedisClient = require("./RedisClient");
const CourseDatabaseHandler = require("./CourseDatabaseHandler");
const KeyDictionary = require("./KeyDictionary");
const RedisToJSONParser = require("./RedisToJSONParser");