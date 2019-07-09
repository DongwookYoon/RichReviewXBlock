const RedisClient = require("./RedisClient");
const RedisToJSONParser = require("./RedisToJSONParser");
const RichReviewError = require('../errors/RichReviewError');

class CourseDatabaseHandler {

    constructor(){
        console.log(RedisClient);
        RedisClient.get_instance().then((db_handler) => {
            this.db_handler = db_handler;
        });
    }



    static async get_instance() {
        if (this.instance) {
            console.log('Database handler instance found');
            return this.instance;
        }

        this.instance = await new CourseDatabaseHandler();
        return this.instance;
    }



    async get_user_courses (import_handler, user_key) {

        let user_db_handler = await import_handler.user_db_handler;

        if (!(await user_db_handler.is_valid_user_key(user_key)))
            throw new RichReviewError('Invalid user key');

        let assignment_db_handler = await import_handler.assignment_db_handler;

        let course_data = {};

        let course_ids = await this.get_course_ids(user_key);
        course_data['enrolments'] = await this.get_user_course_enrolments(import_handler, user_key, course_ids.enrolments);
        course_data['taing'] = await this.get_user_course_taings(user_key, course_ids.taing);
        course_data['teaching'] = await this.get_user_course_teachings(user_key, course_ids.teaching);
        course_data['assignments'] = await assignment_db_handler.get_all_users_upcoming_assignments(import_handler, user_key);

        return course_data;
    }




    async get_course (import_handler, user_key, course_key) {

        let assignment_db_handler = await import_handler.assignment_db_handler;
        let user_db_handler = await import_handler.user_db_handler;

        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        let course_data = await this.get_course_data(course_key);
        let assignments = [];

        if (permissions === 'student')
            assignments = await assignment_db_handler.get_course_assignments_for_student(
                import_handler,
                user_key,
                course_data['assignments']);
        else
            assignments = await assignment_db_handler.get_course_assignments(
                import_handler,
                user_key,
                course_data['assignments']);

        return { course: course_data, assignments: assignments };
    }



    async get_deleted_course_assignments (import_handler, user_key, course_key) {

        let assignment_db_handler = await import_handler.assignment_db_handler;

        let course_data = await this.get_course_data(course_key);

        let assignments = await assignment_db_handler.get_course_assignments(
            import_handler,
            user_key,
            course_data['deleted_assignments']);

        return { course: course_data, assignments: assignments };
    }



    async add_assignment_to_course (assignment_key, course_key) {

        let course_data = await this.get_course_data(course_key);

        let assignments = course_data['assignments'];

        assignments.push(assignment_key);

        let new_assignments = JSON.stringify(assignments);

        await this.set_course_data(course_key, 'assignments', new_assignments);
    }



    async add_course_group_to_course (course_group_key, course_key) {

        try {
            let course_data = await this.get_course_data(course_key);
            let groups = course_data['active_course_groups'];
            groups.push(course_group_key);
            let new_groups = JSON.stringify(groups);
            await this.set_course_data(course_key, 'active_course_groups', new_groups);

        } catch (e) {
            console.warn(e);
            throw e;
        }
    }



    set_course_data (course_key, field, value) {
        return new Promise((resolve, reject) => {
            console.log('Redis hset request to key: ' + course_key);
            this.db_handler.client.hset(course_key, field, value, (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('SET result -> ' + result);
                resolve();
            });
        })
    }



    get_course_data (course_key) {
        return new Promise((resolve, reject) => {
            console.log('Redis request to key: ' + course_key);
            this.db_handler.client.hgetall(course_key, function (error, result) {
                if (error || result === null) {
                    console.log(error);
                    reject(error);
                }
                console.log('GET result -> ' + { result });

                let parsed_data = RedisToJSONParser.parse_data_to_JSON(result);

                resolve(parsed_data);
            });
        });
    }


    get_course_ids (user) {
        return new Promise((resolve, reject) => {
            console.log('Redis request to key: ' + user);
            this.db_handler.client.hgetall(user, function (error, result) {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('GET result -> ' + { result });
                let course_ids = {
                    enrolments: JSON.parse(result.enrolments),
                    taing: JSON.parse(result.taing),
                    teaching: JSON.parse(result.teaching)
                };
                resolve(course_ids);
            });
        })
    }



    async get_user_course_enrolments (import_handler, user_key, course_keys) {

        let assignment_db_handler = await import_handler.assignment_db_handler;

        let enrolments = [];

        for (let course_key of course_keys) {
            let course_data = await this.get_course_data(course_key);

            let filtered_assignments = [];

            for (let assignment_key of course_data['assignments']) {
                if (await assignment_db_handler.get_assignment_data(user_key, assignment_key))
                    filtered_assignments.push(assignment_key);
            }

            course_data['assignments'] = filtered_assignments;

            if (course_data['is_active'] && course_data['active_students'].includes(user_key))
                enrolments.push(course_data);
        }

        return enrolments;
    }



    async get_course_tas_and_instructors (course_key) {
        let course_data = await this.get_course_data(course_key);
        let tas = course_data['tas'];
        let instructors = course_data['instructors'];

        return {
            tas: tas,
            instructors: instructors
        }
    }


    get_user_course_taings (user, taings) {

        let enrolment_promises = taings.map((taing) => {

            return new Promise((resolve, reject) => {
                console.log('Redis request to key: ' + user);
                this.db_handler.client.hgetall(taing, (error, result) => {
                    if (error) {
                        console.log(error);
                        reject(error);
                    }
                    console.log('GET result -> ' + {result});

                    if (JSON.parse(result['tas']).includes(user)) {

                        result = RedisToJSONParser.parse_data_to_JSON(result);
                        resolve(result);
                    }

                    resolve(undefined);
                });
            })
        });

        return Promise.all(enrolment_promises).then((enrolments) => {
            return enrolments.filter((course) => course !== undefined);
        });
    }



    get_user_course_teachings (user, teachings) {

        let enrolment_promises = teachings.map((teaching) => {

            return new Promise((resolve, reject) => {
                console.log('Redis request to key: ' + user);
                this.db_handler.client.hgetall(teaching, (error, result) => {
                    if (error) {
                        console.log(error);
                        reject(error);
                    }
                    console.log('GET result -> ' + {result});

                    if (JSON.parse(result['instructors']).includes(user)) {
                        for (let field in result) {
                            try {
                                result[field] = JSON.parse(result[field]);
                            } catch (e) {}
                        }

                        resolve(result);
                    }

                    resolve(undefined);
                });
            })
        });

        return Promise.all(enrolment_promises).then((enrolments) => {
            return enrolments.filter((course) => course !== undefined);
        });
    }



    async get_all_course_assigmments (import_handler, user_key, course_key) {
        let course_data = await this.get_course_data(course_key);

        let assignment_keys = course_data['assignments'];

        let assignment_db_handler = await import_handler.assignment_db_handler;

        let assignments = [];

        for (let assignment_key of assignment_keys) {
            let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);
            assignments.push(assignment_data);
        }

        return assignments;
    }



    async delete_assignment_from_course (assignment_key, course_key) {
        let course_data = await this.get_course_data(course_key);
        let assignments = course_data['deleted_assignments'];

        assignments = assignments.filter(assignment => {
            return assignment !== assignment_key;
        });

        await this.set_course_data(course_key, 'deleted_assignments', JSON.stringify(assignments));
    }



    async deactivate_course_group (course_key, course_group_key) {
        let course_data = await this.get_course_data(course_key);
        let active_course_groups = course_data['active_course_groups'];
        let inactive_course_groups = course_data['inactive_course_groups'];

        active_course_groups = active_course_groups.filter(course_group => {
            return course_group !== course_group_key;
        });

        inactive_course_groups.push(course_group_key);

        await this.set_course_data(course_key, 'active_course_groups', JSON.stringify(active_course_groups));
        await this.set_course_data(course_key, 'inactive_course_groups', JSON.stringify(inactive_course_groups));
    }


    async permanently_delete_course_group (course_key, course_group_key) {
        let course_data = await this.get_course_data(course_key);
        let active_course_groups = course_data['active_course_groups'];
        let inactive_course_groups = course_data['inactive_course_groups'];

        active_course_groups = active_course_groups.filter((active_key) => {
            return active_key !== course_group_key;
        });

        inactive_course_groups = inactive_course_groups.filter((inactive_key) => {
            return inactive_key !== course_group_key;
        });

        await this.set_course_data(course_key, 'active_course_groups', JSON.stringify(active_course_groups));
        await this.set_course_data(course_key, 'inactive_course_groups', JSON.stringify(inactive_course_groups));
    }



    async move_assignment_to_deleted_assignments (course_key, assignment_key) {
        let course_data = await this.get_course_data(course_key);

        let assignments = course_data['assignments'];

        if (!assignments.includes(assignment_key))
            throw new RichReviewError('The assignment does not exist in this course');

        assignments = assignments.filter((assignment) => {
            return assignment !== assignment_key;
        });

        await this.set_course_data(course_key, 'assignments', JSON.stringify(assignments));

        let deleted_assignments = course_data['deleted_assignments'];
        deleted_assignments.push(assignment_key);
        await this.set_course_data(course_key, 'deleted_assignments', JSON.stringify(deleted_assignments));
    }


    async restore_deleted_course_assignment (course_key, assignment_key) {
        let course_data = await this.get_course_data(course_key);

        let deleted_assignments = course_data['deleted_assignments'];

        if (!deleted_assignments.includes(assignment_key))
            throw new RichReviewError('The assignment does not exist in this course');

        deleted_assignments = deleted_assignments.filter((assignment) => {
            return assignment !== assignment_key;
        });

        await this.set_course_data(course_key, 'deleted_assignments', JSON.stringify(deleted_assignments));

        let assignments = course_data['assignments'];
        assignments.push(assignment_key);
        await this.set_course_data(course_key, 'assignments', JSON.stringify(assignments));
    }


    async is_valid_course_key (course_key) {
        try {
            await this.get_course_data(course_key);
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = CourseDatabaseHandler;

