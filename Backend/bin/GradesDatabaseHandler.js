const RedisClient = require("./RedisClient");
const RedisToJSONParser = require("./RedisToJSONParser");
const KeyDictionary = require("./KeyDictionary");
const DateHelper = require("./DateHelper");
const NotAuthorizedError = require("../errors/NotAuthorizedError");
const late = require('../lib/late');

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



    async get_all_user_grades (import_handler, user_key) {
        let user_db_handler = await import_handler.user_db_handler;
        let submitter_db_handler = await import_handler.submitter_db_handler;
        let submission_db_handler = await import_handler.submission_db_handler;
        let assignment_db_handler = await import_handler.assignment_db_handler;
        let course_db_handler = await import_handler.course_db_handler;

        let user_data = await user_db_handler.get_user_data(user_key);

        let grades = [];

        for (let submitter_key of user_data['submitters']) {
            let submitter_data = await submitter_db_handler.get_submitter_data(submitter_key);
            let submission_key = submitter_data['submission'];
            let submission_data = await submission_db_handler.get_submission_data(submission_key);
            let assignment_key = submission_data['assignment'];
            let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);
            let course_id = assignment_data['course'].replace(KeyDictionary.key_dictionary['course'], '');

            let course_key = KeyDictionary.key_dictionary['course'] + course_id;
            let course_data = await course_db_handler.get_course_data(course_key);

            if (!assignment_data['hidden']) {
                grades.push({
                    course_id: course_id,
                    assignment_id: assignment_data['id'],
                    assignment: assignment_data['title'],
                    course: course_data['title'],
                    submission_status: submission_data['submission_status'],
                    mark: submission_data['mark'],
                    points: assignment_data['points'],
                    late: late.is_late(assignment_data, submission_data)
                })
            }
        }

        return grades;
    }




    async get_assignment_grade (import_handler, user_key, assignment_key) {
        let assignment_db_handler = await import_handler.assignment_db_handler;
        let submission_db_handler = await import_handler.submission_db_handler;
        let user_db_Handler = await import_handler.user_db_handler;

        let submission_key = await assignment_db_handler.get_users_submission_key(import_handler, user_key, assignment_key);

        if (!submission_key) {
            await user_db_Handler.verify_submitters_for_enrolments(import_handler, user_key);
            submission_key = await assignment_db_handler.get_users_submission_key(import_handler, user_key, assignment_key);
        }


        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);

        let submission_data = await submission_db_handler.get_submission_data(submission_key);

        let grade = {};

        grade['mark'] = submission_data['mark'];
        grade['submission_status'] = submission_data['submission_status'];

        grade['late'] = late.is_late(assignment_data, submission_data);

        return grade;
    }



    async get_student_grades (import_handler, user_key, course_key) {
        let user_db_handler = await import_handler.user_db_handler;
        let course_db_handler = await import_handler.course_db_handler;

        let assignments = await course_db_handler.get_all_course_assigmments(import_handler, user_key, course_key);

        assignments = assignments.filter((assignments) => {
            return !assignments['hidden'];
        });

        let total_assignment_points = assignments.reduce((total, assignment) => {
            if (assignment.count_toward_final_grade)
                return total + assignment['points'];
            else return total;
        }, 0);

        let user_data = await user_db_handler.get_user_data(user_key);

        let grades = [];
        let student_grades = {};
        student_grades['name'] = user_data['display_name'];
        student_grades['grades'] = [];

        for (let assignment of assignments) {
            let assignment_key = KeyDictionary.key_dictionary['assignment'] + assignment.id;
            let assignment_grade = await this.get_assignment_grade(import_handler, user_key, assignment_key);

            assignment_grade['assignment_id'] = assignment['id'];
            assignment_grade['title'] = assignment['title'];
            assignment_grade['count_toward_final_grade'] = assignment['count_toward_final_grade'];
            assignment_grade['weight'] = assignment['weight'];
            student_grades['grades'].push(assignment_grade);
        }

        assignments = assignments.map(assignment => {
            return { id: assignment.id, title: assignment.title, points: assignment.points,
                count_toward_final_grade: assignment.count_toward_final_grade }});

        grades.push(student_grades);
        return { grades, assignments, total_assignment_points };
    }



    async get_all_course_grades (import_handler, user_key, course_key) {
        let user_db_handler = await import_handler.user_db_handler;
        let course_db_handler = await import_handler.course_db_handler;

        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'instructor' && permissions !== 'ta') {
            throw new NotAuthorizedError('You are not authorized to view course grades');
        }

        let all_course_students = (await user_db_handler.get_all_course_users(import_handler, course_key))['students'];
        let assignments = await course_db_handler.get_all_course_assigmments(import_handler, user_key, course_key);

        let grades = [];
        let total_assignment_points = assignments.reduce((total, assignment) => {
            if (assignment.count_toward_final_grade)
                return total + assignment['points'] * (assignment['weight'] / 100);
            else return total;
        }, 0);

        for (let student of all_course_students) {
            let student_grades = {};
            student_grades['name'] = student.name;
            student_grades['grades'] = [];
            student_grades['student_key'] = KeyDictionary.key_dictionary['user'] + student.id;

            let student_key = KeyDictionary.key_dictionary['user'] + student.id;

            for (let assignment of assignments) {
                let assignment_key = KeyDictionary.key_dictionary['assignment'] + assignment.id;
                let assignment_grade = await this.get_assignment_grade(import_handler, student_key, assignment_key);

                assignment_grade['assignment_id'] = assignment['id'];
                assignment_grade['title'] = assignment['title'];
                assignment_grade['points'] = assignment['points'];
                assignment_grade['count_toward_final_grade'] = assignment['count_toward_final_grade'];
                assignment_grade['weight'] = assignment['weight'];
                student_grades['grades'].push(assignment_grade);
            }
            grades.push(student_grades);
        }

        return { grades, assignments, total_assignment_points };
    }


    async update_student_grade_for_assignment (import_handler, user_key, student_key, assignment_key, course_key, mark) {

        let user_db_handler = await import_handler.user_db_handler;
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'instructor' && permissions !== 'ta')
            throw new NotAuthorizedError('You are not authorized to edit grades');

        let assignment_db_handler = await import_handler.assignment_db_handler;
        let submission_key = await assignment_db_handler.get_users_submission_key(import_handler, student_key, assignment_key);

        let submission_db_handler = await import_handler.submission_db_handler;
        await submission_db_handler.update_submission_grade(submission_key, mark)
    }



    async update_course_group_grade_for_assignment (import_handler, user_key, course_group_key, assignment_key, course_key, mark) {

        let user_db_handler = await import_handler.user_db_handler;
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'instructor' && permissions !== 'ta')
            throw new NotAuthorizedError('You are not authorized to edit grades');

        let assignment_db_handler = await import_handler.assignment_db_handler;
        let submission_key = await assignment_db_handler.get_course_groups_submission_key(import_handler, user_key, course_group_key, assignment_key);

        let submission_db_handler = await import_handler.submission_db_handler;
        await submission_db_handler.update_submission_grade(submission_key, mark)
    }




    async get_grades_csv (import_handler, user_key, course_key) {
        let user_db_handler = await import_handler.user_db_handler;

        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'instructor' && permissions !== 'ta')
            return await this.get_all_course_grades(import_handler, user_key);

        let grade_data = await this.get_all_course_grades(import_handler, user_key, course_key);
        let grades = grade_data['grades'];

        let data = [];

        for (let grade of grades) {
            let student_grades = {};

            student_grades['Student Name'] = grade['name'];

            for (let assignment of grade['grades']) {
                let mark = '';

                if (assignment['mark'] !== '')
                    mark = assignment['mark'];
                else
                    mark = assignment['submission_status'];

                if (assignment['late'])
                    mark = `${mark} - late`;

                let assignment_title = `${assignment['title']} - Out of ${assignment['points']}`;

                student_grades[assignment_title] = mark;
            }

            data.push(student_grades);
        }

        return data;
    }
}

module.exports = GradesDatabaseHandler;


