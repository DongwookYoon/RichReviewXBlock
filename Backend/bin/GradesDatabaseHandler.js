class GradesDatabaseHandler {

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

        this.instance = await new GradesDatabaseHandler();
        return this.instance;
    }



    async get_assignment_grade (user_key, assignment_key) {
        let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();
        let submission_db_handler = await SubmissionDatabaseHandler.get_instance();

        let submission_key = await assignment_db_handler.get_users_submission_key(user_key, assignment_key);
        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);

        if (!submission_key)
            return undefined;

        let submission_data = await submission_db_handler.get_submission_data(submission_key);

        let grade = {};

        grade['mark'] = submission_data['mark'];
        grade['submission_status'] = submission_data['submission_status'];

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

        grade['late'] = late;

        return grade;
    }



    async get_student_grades (user_key, course_key) {
        let user_db_handler = await UserDatabaseHandler.get_instance();
        let course_db_handler = await CourseDatabaseHandler.get_instance();

        let assignments = await course_db_handler.get_all_course_assigmments(user_key, course_key);

        assignments = assignments.filter((assignments) => {
            return !assignments['hidden'];
        });

        let user_data = await user_db_handler.get_user_data(user_key);

        let grades = [];
        let student_grades = {};
        student_grades['name'] = user_data['display_name'];
        student_grades['grades'] = [];

        for (let assignment of assignments) {
            let assignment_key = KeyDictionary.key_dictionary['assignment'] + assignment.id;
            let assignment_grade = await this.get_assignment_grade(user_key, assignment_key);

            assignment_grade['assignment_id'] = assignment['id'];
            assignment_grade['title'] = assignment['title'];
            student_grades['grades'].push(assignment_grade);
        }

        grades.push(student_grades);
        return { grades, assignments };
    }



    async get_all_course_grades (user_key, course_key) {
        let user_db_handler = await UserDatabaseHandler.get_instance();
        let course_db_handler = await CourseDatabaseHandler.get_instance();

        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'instructor' && permissions !== 'ta') {
            throw new NotAuthorizedError('You are not authorized to view course grades');
        }

        let all_course_students = (await user_db_handler.get_all_course_users(course_key))['students'];
        let assignments = await course_db_handler.get_all_course_assigmments(user_key, course_key);

        let grades = [];

        for (let student of all_course_students) {
            let student_grades = {};
            student_grades['name'] = student.name;
            student_grades['grades'] = [];

            let student_key = KeyDictionary.key_dictionary['user'] + student.id;

            for (let assignment of assignments) {
                let assignment_key = KeyDictionary.key_dictionary['assignment'] + assignment.id;
                let assignment_grade = await this.get_assignment_grade(student_key, assignment_key);

                assignment_grade['assignment_id'] = assignment['id'];
                assignment_grade['title'] = assignment['title'];
                student_grades['grades'].push(assignment_grade);
            }

            grades.push(student_grades);
        }

        return { grades, assignments };
    }


    async update_student_grade_for_assignment (user_key, student_key, assignment_key, course_key, mark) {

        let user_db_handler = await UserDatabaseHandler.get_instance();
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'instructor' && permissions !== 'ta')
            throw new NotAuthorizedError('You are not authorized to edit grades');

        let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();
        let submission_key = await assignment_db_handler.get_users_submission_key(student_key, assignment_key);

        let submission_db_handler = await SubmissionDatabaseHandler.get_instance();
        await submission_db_handler.update_submission_grade(submission_key, mark)
    }



    async get_grades_csv (user_key, course_key) {
        let user_db_handler = await UserDatabaseHandler.get_instance();

        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'instructor' && permissions !== 'ta')
            return await this.get_user_course_grades(user_key);

        let grade_data = await this.get_course_grades(user_key, course_key);
        let grades = grade_data['grades'];

        let data = [];

        for (let grade of grades) {
            let student_grades = {};

            student_grades['name'] = grade['name'];

            for (let assignment of grade['grades']) {
                let mark = '';

                if (assignment['mark'] !== '')
                    mark = assignment['mark'];
                else
                    mark = assignment['submission_status'];

                if (assignment['late'])
                    mark = `${mark} - late`;

                let assignment_title = `${assignment['assignment_title']} - Out of ${assignment['points']}`;

                student_grades[assignment_title] = mark;
            }

            data.push(student_grades);
        }

        return data;
    }
}

module.exports = GradesDatabaseHandler;


/*
 ** Module exports are at the end of the file to fix the circular dependency between:
 **  - UserDatabaseHandler
 **  - CourseDatabaseHandler
 **  - AssignmentDatabaseHandler
 */
const RedisClient = require("./RedisClient");
const UserDatabaseHandler = require("./UserDatabaseHandler");
const SubmitterDatabaseHandler = require("./SubmitterDatabaseHandler");
const SubmissionDatabaseHandler = require("./SubmissionDatabaseHandler");
const CourseDatabaseHandler = require("./CourseDatabaseHandler");
const AssignmentDatabaseHandler = require("./AssignmentDatabaseHandler");
const RedisToJSONParser = require("./RedisToJSONParser");
const KeyDictionary = require("./KeyDictionary");
const DateHelper = require("./DateHelper");
const NotAuthorizedError = require("../errors/NotAuthorizedError");
