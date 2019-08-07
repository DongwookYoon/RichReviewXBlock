const RedisClient = require("./RedisClient");
const KeyDictionary = require("./KeyDictionary");
const RedisToJSONParser = require("./RedisToJSONParser");
const RichReviewError = require('../errors/RichReviewError');

class UserDatabaseHandler {

    constructor(){
        console.log(RedisClient);
        RedisClient.get_instance().then((db_handler) => {
            this.db_handler = db_handler;
        });

        this.UBC_PERSISTANT_ID = 'urn:oid:1.3.6.1.4.1.60.1.7.1';
        this.UBC_CWL = 'urn:oid:0.9.2342.19200300.100.1.1';
        this.UBC_EMAIL = 'urn:oid:0.9.2342.19200300.100.1.3';
        this.UBC_FULL_NAME = 'urn:oid:2.16.840.1.113730.3.1.241';
        this.UBC_FIRST_NAME = 'urn:oid:2.5.4.42';
        this.UBC_STUDENT_NUMBER = 'urn:mace:dir:attribute-def:ubcEduStudentNumber';
        this.UBC_LAST_NAME = 'urn:oid:2.5.4.4';
        this.UBC_COURSES = 'urn:oid:2.16.840.1.113719.1.1.4.1.25';
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
                if (error || result === null) {
                    console.log(error);
                    reject(error);
                }

                let parsed_data = RedisToJSONParser.parse_data_to_JSON(result);
                resolve(parsed_data);
            });
        })
    }



    async get_course_active_students (import_handler, course_key) {

        let course_database_handler = await import_handler.course_db_handler;
        let course_data = await course_database_handler.get_course_data(course_key);
        return course_data['active_students'];
    }



    async get_course_blocked_students (import_handler, course_key) {

        let course_database_handler = await import_handler.course_db_handler;
        let course_data = await course_database_handler.get_course_data(course_key);
        return course_data['blocked_students'];
    }




    // TODO should blocked students show up in the 'people' list?
    // It makes sense for profs to see blocked students
    // Should other students be able to see blocked students?
    async get_all_course_users (import_handler, course_key) {

        let course_database_handler = await import_handler.course_db_handler;
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



    async add_course_to_student (user_key, course_key) {
        let user_data = await this.get_user_data(user_key);
        let enrolments = user_data['enrolments'];
        enrolments.push(course_key);
        await this.set_user_data(user_key, 'enrolments', JSON.stringify(enrolments));
    }


    async add_course_to_instructor (user_key, course_key) {
        let user_data = await this.get_user_data(user_key);
        let teaching = user_data['teaching'];
        teaching.push(course_key);
        await this.set_user_data(user_key, 'teaching', JSON.stringify(teaching));
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




    async add_user_to_db (import_handler, user_data, auth_type) {
        let user_exists = await this.user_exists(auth_type === 'Google' ?
            (user_data.sub || user_data.id) :
            user_data[this.UBC_CWL]);

        console.log('Adding user to database!');

        if (auth_type === 'Google')
            await this.add_google_user_to_db(user_data, user_exists);
        else if (auth_type === 'UBC_CWL') {
            await this.add_ubc_user_to_db(user_data, user_exists);
            await this.add_ubc_user_to_courses(import_handler, user_data);
        }

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



    async add_google_user_to_db (user_data, user_exists) {

        let user_key = `${KeyDictionary.key_dictionary['user']}${user_data.sub ? user_data.sub : user_data.id}`;

        await this.set_user_data(user_key, 'auth_type', 'Google');
        await this.set_user_data(user_key, 'display_name', user_data.name || 'Google User');
        await this.set_user_data(user_key, 'email', user_data.email);
        await this.set_user_data(user_key, 'first_name', user_data.given_name || 'Google');
        await this.set_user_data(user_key, 'last_name', user_data.family_name || 'User');
        await this.set_user_data(user_key, 'nick_name', user_data.nick || user_data.name);

        //todo current google users from the legacy system need this to run
        // Here we can add google users to a dummy course
        console.log(`User ${user_data.sub || user_data.id} doesn't exist. Creating user`);
        await this.set_user_data(user_key, 'id', user_data.sub || user_data.id);
        await this.set_user_data(user_key, 'groupNs', '[]');
        await this.set_user_data(user_key, 'creation_date', Date(Date.now()).toString());
        await this.set_user_data(user_key, 'enrolments', '[]');
        await this.set_user_data(user_key, 'teaching', '[]');
        await this.set_user_data(user_key, 'taing', '[]');
        await this.set_user_data(user_key, 'course_groups', '[]');
        await this.set_user_data(user_key, 'submitters', '[]');

    }


    async add_ubc_user_to_db (user_data, user_exists) {
        let user_key = KeyDictionary.key_dictionary['user'] + user_data[this.UBC_CWL];

        await this.set_user_data(user_key, 'auth_type', 'UBC_CWL');
        await this.set_user_data(user_key, 'display_name', user_data[this.UBC_FULL_NAME]);
        await this.set_user_data(user_key, 'email', user_data[this.UBC_EMAIL]);
        await this.set_user_data(user_key, 'first_name', user_data[this.UBC_FIRST_NAME]);
        await this.set_user_data(user_key, 'last_name', user_data[this.UBC_LAST_NAME]);
        await this.set_user_data(user_key, 'nick_name', user_data[this.UBC_FULL_NAME]);
        await this.set_user_data(user_key, 'persistent_id', user_data[this.UBC_PERSISTANT_ID]);

        if(user_data[this.UBC_STUDENT_NUMBER]) {
            await this.set_user_data(user_key, 'student_number', user_data[this.UBC_STUDENT_NUMBER]);
        }

        if (!user_exists) {
            console.log(`User ${user_data[this.UBC_CWL]} doesn't exist. Creating user`);
            await this.set_user_data(user_key, 'id', user_data[this.UBC_CWL]);
            await this.set_user_data(user_key, 'groupNs', '[]');
            await this.set_user_data(user_key, 'creation_date', Date(Date.now()).toString());
            await this.set_user_data(user_key, 'enrolments', '[]');
            await this.set_user_data(user_key, 'teaching', '[]');
            await this.set_user_data(user_key, 'taing', '[]');
            await this.set_user_data(user_key, 'course_groups', '[]');
            await this.set_user_data(user_key, 'submitters', '[]');
        }
    }



    async add_ubc_user_to_courses(import_handler, user_data) {
        let user_key = KeyDictionary.key_dictionary['user'] + user_data[this.UBC_CWL];

        if(user_data[this.UBC_COURSES] === undefined)
            return;

        try {
            let courses = JSON.parse(user_data[this.UBC_COURSES]);
            for (const course of courses) {
                await this.add_ubc_user_to_course(import_handler, user_key, course)
            }
        } catch {
            let course = user_data[this.UBC_COURSES];
            await this.add_ubc_user_to_course(import_handler, user_key, course)
        }
    }


    async add_ubc_user_to_course(import_handler, user_key, course) {
        let course_db_handler = await import_handler.course_db_handler;

        try {
            let course_details = await course_db_handler.get_course_details_from_ldap_string(course);
            let course_key = KeyDictionary.key_dictionary['course'] + course_details.id;
            let course_exists = await course_db_handler.is_valid_course_key(course_key);

            if (!course_exists)
                await course_db_handler.create_course(course_key, course_details);

            if (course_details['is_instructor_course']) {
                if (!(await course_db_handler.is_user_instructor_for_course(user_key, course_key)))
                    await course_db_handler.add_instructor_to_course(import_handler, user_key, course_key);

            } else {
                if (!(await course_db_handler.is_user_enrolled_in_course(user_key, course_key)))
                    await course_db_handler.add_student_to_course(import_handler, user_key, course_key);
            }
        } catch (e) {
            console.log(e);
        }
    }



    async create_user (user_key, user_data) {
        if(user_data['id'] === undefined ||
            user_data['creation_date'] === undefined ||
            user_data['auth_type'] === undefined) {
                throw new RichReviewError('Invalid user data')
        }

        await this.set_user_data(user_key, 'first_name', '');
        await this.set_user_data(user_key, 'last_name', '');
        await this.set_user_data(user_key, 'nick_name', '');
        await this.set_user_data(user_key, 'preferred_name', '');
        await this.set_user_data(user_key, 'display_name', '');
        await this.set_user_data(user_key, 'email', '');
        await this.set_user_data(user_key, 'teaching', '[]');
        await this.set_user_data(user_key, 'taing', '[]');
        await this.set_user_data(user_key, 'enrolments', '[]');
        await this.set_user_data(user_key, 'submitters', '[]');
        await this.set_user_data(user_key, 'groupNs', '[]');
        await this.set_user_data(user_key, 'course_groups', '[]');

        for (let field in user_data) {
            await this.set_user_data(user_key, field, user_data[field]);
        }
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


    async remove_submitter_from_user (user_key, submitter_key) {
        let user_data = await this.get_user_data(user_key);
        let submitters = user_data['submitters'];
        submitters = submitters.filter(submitter => {
            return submitter !== submitter_key;
        });

        await this.set_user_data(user_key, 'submitters', JSON.stringify(submitters));
    }


    async remove_course_group_from_user (user_key, course_group_key) {
        let user_data = await this.get_user_data(user_key);
        let course_groups = user_data['course_groups'];
        course_groups = course_groups.filter(course_group => {
            return course_group !== course_group_key;
        });

        await this.set_user_data(user_key, 'course_groups', JSON.stringify(course_groups));
    }


    async is_valid_user_key (user_key) {
        try {
            await this.get_user_data(user_key);
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = UserDatabaseHandler;

