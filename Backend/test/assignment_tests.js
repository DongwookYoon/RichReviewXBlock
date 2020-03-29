let mocha = require('mocha');
let assert = require('assert');

let ImportHandler = require('../bin/ImportHandler');
const KeyDictionary = require("../bin/KeyDictionary");
const fs = require('fs');
const FileAPI = require('file-api'), File = FileAPI.File;
const AssignmentDatabaseHandler = require("../bin/AssignmentDatabaseHandler");

describe('Assignments', function() {

    describe('No Submissions', function () {

        before(async function() {

            this.instructor_key = await create_test_instructor();
            this.ta_key = await create_test_ta();
            this.student_key = await create_test_student();
            this.course_key = await create_test_course([this.instructor_key], [this.ta_key], [this.student_key]);

            let user_db_handler = await ImportHandler.user_db_handler;

            await user_db_handler.set_user_data(this.instructor_key, 'teaching', JSON.stringify([this.course_key]));
            await user_db_handler.set_user_data(this.ta_key, 'taing', JSON.stringify([this.course_key]));
            await user_db_handler.set_user_data(this.student_key, 'enrolments', JSON.stringify([this.course_key]));
        });



        it('Should succeed in creating an individual document submission assignment', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let submission_db_handler = await ImportHandler.submission_db_handler;
            let submitter_db_hander = await ImportHandler.submitter_db_handler;
            let user_db_handler = await ImportHandler.user_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);
                let submission_data = await submission_db_handler.get_submission_data(assign_data['submissions'][0]);
                let submitter_data = await submitter_db_hander.get_submitter_data(submission_data['submitter']);
                let user_data = await user_db_handler.get_user_data(this.student_key);
                assert(user_data['submitters'].includes(submission_data['submitter']));
                assert (submitter_data['members'].includes(this.student_key));

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in creating an individual comment submission assignment', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let submission_db_handler = await ImportHandler.submission_db_handler;
            let submitter_db_hander = await ImportHandler.submitter_db_handler;
            let user_db_handler = await ImportHandler.user_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let file = new File("./complex_pdf.pdf");

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'comment_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_comment_submission_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_data,
                    {'file-0': file});

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);
                let submission_data = await submission_db_handler.get_submission_data(assign_data['submissions'][0]);
                let submitter_data = await submitter_db_hander.get_submitter_data(submission_data['submitter']);
                let user_data = await user_db_handler.get_user_data(this.student_key);
                assert(user_data['submitters'].includes(submission_data['submitter']));
                assert (submitter_data['members'].includes(this.student_key));
                assert (submission_data['group'] !== '' && submission_data['group'] !== undefined);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should fail in creating a group document submission assignment - no course groups', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: true,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                assert(false)
            } catch (e) {
                console.log(e);
                if (await assignment_db_handler.is_valid_assignment_key(assignment_key))
                    assert(false);

                assert(true);
            }
        });



        it('Should fail in creating a group comment submission assignment - no course groups', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let file = new File("./complex_pdf.pdf");

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: true,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_comment_submission_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_data,
                    {'file-0': file});

                assert(false)
            } catch (e) {
                console.log(e);
                if (await assignment_db_handler.is_valid_assignment_key(assignment_key))
                    assert(false);

                assert(true);
            }
        });



        it('Should fail in creating a document assignment - no import handler', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                await assignment_db_handler.create_document_submission_assignment(
                    this.course_key,
                    assignment_data);

                assert(false);
            } catch (e) {
                console.log(e);
                assert(true);
            }
        });



        it('Should fail in creating a comment assignment - no import handler', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                await assignment_db_handler.create_comment_submission_assignment(
                    this.instructor_key,
                    this.course_key,
                    assignment_data,
                    {});

                assert(false);
            } catch (e) {
                console.log(e);
                assert(true);
            }
        });



        it('Should fail in creating a document assignment - invalid course key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    'no-a-course-key',
                    assignment_data);

                assert(false);
            } catch (e) {
                console.log(e);
                assert(true);
            }
        });



        it('Should fail in creating a comment assignment - invalid user key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                await assignment_db_handler.create_comment_submission_assignment(
                    ImportHandler,
                    'no-a-course-key',
                    this.course_key,
                    assignment_data,
                    {});

                assert(false);
            } catch (e) {
                console.log(e);
                assert(true);
            }
        });



        it('Should fail in creating a comment assignment - invalid course key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                await assignment_db_handler.create_comment_submission_assignment(
                    ImportHandler,
                    this.instructor_key,
                    'invalid-key',
                    assignment_data,
                    {});

                assert(false);
            } catch (e) {
                console.log(e);
                assert(true);
            }
        });



        it('Should fail in creating a document assignment - invalid assignment data', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let assignment_data = {
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: ''
            };

            try {
                await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                assert(false);
            } catch (e) {
                console.log(e);
                assert(true);
            }
        });



        it('Should fail in creating a comment assignment - invalid assignment data', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let file = new File("./complex_pdf.pdf");

            let assignment_data = {
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: ''
            };

            try {
                await assignment_db_handler.create_comment_submission_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_data,
                    {'file-0': file});

                assert(false);
            } catch (e) {
                console.log(e);
                assert(true);
            }
        });



        it('Should fail in creating a document assignment - invalid assignment type', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'invalid_type',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                assert(false);
            } catch (e) {
                console.log(e);
                assert(true);
            }
        });



        it('Should succeed in getting assignments visible to student', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let enrolments = await course_db_handler.get_user_courses(ImportHandler, this.student_key);
                let visible_assignments = await assignment_db_handler.get_all_assignments_visible_to_user(
                    ImportHandler,
                    this.student_key,
                    enrolments);

                assert(visible_assignments.length === 1);
                assert(visible_assignments[0].role === 'Student');

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting assignments visible to ta', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                console.log(`Creating document submission assignment that TA can view. TA key is: ${this.ta_key}...`);
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let enrolments = await course_db_handler.get_user_courses(ImportHandler, this.ta_key);
                let visible_assignments = await assignment_db_handler.get_all_assignments_visible_to_user(
                    ImportHandler,
                    this.ta_key,
                    enrolments);

            
                assert(visible_assignments[0].role === 'Ta', `Assignment role assignment error. Role should be TA but it is ${visible_assignments[0].role}`);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false, e);
            }
        });



        it('Should succeed in getting assignments visible to instructor', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let enrolments = await course_db_handler.get_user_courses(ImportHandler, this.instructor_key);
                let visible_assignments = await assignment_db_handler.get_all_assignments_visible_to_user(
                    ImportHandler,
                    this.instructor_key,
                    enrolments);

                assert(visible_assignments[0].role === 'Instructor', `Role of user in the assignment should be instructor but it is ${visible_assignments[0].role}`);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should fail in getting visible assignments - invalid user key 2', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let enrolments = await course_db_handler.get_user_courses(ImportHandler, this.instructor_key);
                let visible_assignments = await assignment_db_handler.get_all_assignments_visible_to_user(
                    ImportHandler,
                    'invalid-key',
                    enrolments);

                assert(false);

            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should succeed in editing an individual document submission assignment', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let edits = {
                title: 'edited test assignment',
                description: 'edited test assignment description',
                type: 'document_submission',
                count_toward_final_grade: false,
                allow_multiple_submissions: false,
                group_assignment: false,
                hidden: true,
                due_date: new Date().toISOString(),
                available_date: new Date().toISOString(),
                until_date: new Date().toISOString()
            };


            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                await assignment_db_handler.edit_assignment(
                    ImportHandler,
                    this.instructor_key,
                    assignment_key,
                    edits
                );

                let edited_assignment_data = await assignment_db_handler.get_assignment_data(
                    this.instructor_key,
                    assignment_key);

                assert(edit_success(edited_assignment_data, edits));

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });


        it('Should fail in editing an assignment - invalid assignment key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;

            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                await assignment_db_handler.edit_assignment(
                    ImportHandler,
                    this.instructor_key,
                    'invalid-key',
                    {}
                );

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should fail in editing an assignment - wrong permissions', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;

            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                await assignment_db_handler.edit_assignment(
                    ImportHandler,
                    this.student_key,
                    assignment_key,
                    {}
                );

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should fail in getting assignments before available date', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);

            let endDate = new Date();
            endDate.setDate(futureDate.getDate() + 20);
            

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: endDate.toISOString(),
                available_date: futureDate.toISOString(),
                until_date: endDate.toISOString()
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let upcoming_assignments = await assignment_db_handler.get_all_users_upcoming_assignments(
                    ImportHandler,
                    this.student_key
                );

                assert(upcoming_assignments.length == 0, 'Student should not be able to view assignments before available date');

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should fail in getting upcoming assignments - invalid user key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let upcoming_assignments = await assignment_db_handler.get_all_users_upcoming_assignments(
                    ImportHandler,
                    'invalid-key'
                );

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should succeed in getting course assignments for student', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '9999-07-04T22:03:29.299Z',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assignments = await assignment_db_handler.get_course_assignments_for_student(
                    ImportHandler,
                    this.student_key,
                    [assignment_key]
                );

                assert(assignments.length === 1);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should fail in getting course assignments for student - invalid user key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assignments = await assignment_db_handler.get_course_assignments_for_student(
                    ImportHandler,
                    'invalid-key',
                    [assignment_key]
                );

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should fail in getting course assignments for student - invalid assignment key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assignments = await assignment_db_handler.get_course_assignments_for_student(
                    ImportHandler,
                    this.student_key,
                    ['invalid-key']
                );

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should succeed in getting course assignments', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assignments = await assignment_db_handler.get_course_assignments(
                    ImportHandler,
                    this.instructor_key,
                    [assignment_key]
                );

                assert(assignments.length === 1);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should fail in getting course assignments - invalid user key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assignments = await assignment_db_handler.get_course_assignments(
                    ImportHandler,
                    'invalid-key',
                    [assignment_key]
                );

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should fail in getting course assignments - invalid assignment key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assignments = await assignment_db_handler.get_course_assignments(
                    ImportHandler,
                    this.instructor_key,
                    ['invalid-key']
                );

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should succeed in getting assignment submissions', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let submissions = await assignment_db_handler.get_assignment_submissions(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key
                );

                assert(submissions.length === 1);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should fail in getting assignment submissions - invalid user key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let submissions = await assignment_db_handler.get_assignment_submissions(
                    ImportHandler,
                    'invalid-key',
                    this.course_key,
                    assignment_key
                );

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should fail in getting assignment submissions - invalid course key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let submissions = await assignment_db_handler.get_assignment_submissions(
                    ImportHandler,
                    this.instructor_key,
                    'invalid-key',
                    assignment_key
                );

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should fail in getting assignment submissions - invalid assignment key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let submissions = await assignment_db_handler.get_assignment_submissions(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    'invalid-key'
                );

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should succeed in getting assignment submissions links and ids', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let links_and_ids = await assignment_db_handler.get_assignment_submission_links_and_id(
                    ImportHandler,
                    this.instructor_key,
                    assignment_key
                );

                assert(links_and_ids.length === 0);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should fail in getting assignment submissions links and ids - invalid user key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let links_and_ids = await assignment_db_handler.get_assignment_submission_links_and_id(
                    ImportHandler,
                    'invalid-key',
                    assignment_key
                );

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should fail in getting assignment submissions links and ids - invalid assignment key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let links_and_ids = await assignment_db_handler.get_assignment_submission_links_and_id(
                    ImportHandler,
                    this.instructor_key,
                    'invalid-key'
                );

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should succeed in getting assignment data', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let id_title_and_points = await assignment_db_handler.get_assignment_id_title_and_points(assignment_key);

                assert(id_title_and_points.title === 'test assignment');
                assert(id_title_and_points.points === 5);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should fail in getting assignment data - invalid assignment key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let id_title_and_points = await assignment_db_handler.get_assignment_id_title_and_points('invalid-key');

                assert(false)
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should succeed in getting assignment permissions for instructor', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);

                let can_view = await AssignmentDatabaseHandler.user_has_permission_to_view (
                    ImportHandler,
                    this.instructor_key,
                    assign_data);

                assert(can_view === true);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting hidden assignment permissions for instructor', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: true,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);

                let can_view = await AssignmentDatabaseHandler.user_has_permission_to_view (
                    ImportHandler,
                    this.instructor_key,
                    assign_data);

                assert(can_view === true);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting unavailable assignment permissions for instructor', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: '1900-07-04T22:49:02.289Z'
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);

                let can_view = await AssignmentDatabaseHandler.user_has_permission_to_view (
                    ImportHandler,
                    this.instructor_key,
                    assign_data);

                assert(can_view === true);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting assignment permissions for ta', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);

                let can_view = await AssignmentDatabaseHandler.user_has_permission_to_view (
                    ImportHandler,
                    this.ta_key,
                    assign_data);

                assert(can_view === true);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting hidden assignment permissions for ta', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: true,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);

                let can_view = await AssignmentDatabaseHandler.user_has_permission_to_view (
                    ImportHandler,
                    this.ta_key,
                    assign_data);

                assert(can_view === true);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting unavailable assignment permissions for ta', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: '1900-07-04T22:49:02.289Z'
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);

                let can_view = await AssignmentDatabaseHandler.user_has_permission_to_view (
                    ImportHandler,
                    this.ta_key,
                    assign_data);

                assert(can_view === true);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting assignment permissions for student', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);

                let can_view = await AssignmentDatabaseHandler.user_has_permission_to_view (
                    ImportHandler,
                    this.student_key,
                    assign_data);

                assert(can_view === true);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should NOT succeed in getting hidden assignment permissions for student', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: true,
                due_date: '',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);

                let can_view = await AssignmentDatabaseHandler.user_has_permission_to_view (
                    ImportHandler,
                    this.student_key,
                    assign_data);

                console.log(can_view + "can view???");
                assert(can_view === false);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting assignment permissions for student after until date', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '',
                until_date: '1900-07-04T22:49:02.289Z'
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);

                let can_view = await AssignmentDatabaseHandler.user_has_permission_to_view (
                    ImportHandler,
                    this.student_key,
                    assign_data);

                assert(can_view === false);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false, e);
            }
        });



        it('Should succeed in getting assignment permissions for student before available date', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '',
                available_date: '9999-07-04T22:49:02.289Z',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);

                let can_view = await AssignmentDatabaseHandler.user_has_permission_to_view (
                    ImportHandler,
                    this.student_key,
                    assign_data);

                assert(can_view === false);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting submission status', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '1900-07-04T22:49:02.289Z',
                available_date: '',
                until_date: ''
            };

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);


                let submission_status = await assignment_db_handler.get_user_submission_status(
                    ImportHandler,
                    this.student_key,
                    assignment_key);

                assert(submission_status.submission_status === 'Not Submitted');

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should fail in getting submission status - invalid user key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '1900-07-04T22:49:02.289Z',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);


                let submission_status = await assignment_db_handler.get_user_submission_status(
                    ImportHandler,
                    'invalid-key',
                    assignment_key);

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });



        it('Should fail in getting submission status - invalid assignment key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let assignment_data = {
                title: 'test assignment',
                description: 'test assignment description',
                points: 5,
                type: 'document_submission',
                count_toward_final_grade: true,
                allow_multiple_submissions: true,
                group_assignment: false,
                hidden: false,
                due_date: '1900-07-04T22:49:02.289Z',
                available_date: '',
                until_date: ''
            };

            let assignment_key;
            try {
                assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);


                let submission_status = await assignment_db_handler.get_user_submission_status(
                    ImportHandler,
                    this.student_key,
                    'invalid-key');

                assert(false);
            } catch (e) {
                console.log(e);
                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
                assert(true);
            }
        });

       


    });



    describe('Submissions', function () {

        before(async function () {

            this.instructor_key = await create_test_instructor();
            this.ta_key = await create_test_ta();
            this.student_key = await create_test_student();
            this.course_key = await create_test_course([this.instructor_key], [this.ta_key], [this.student_key]);

            this.assignment_key = await create_doc_assignment(this.course_key, false);

            let user_db_handler = await ImportHandler.user_db_handler;

            await user_db_handler.set_user_data(this.instructor_key, 'teaching', JSON.stringify([this.course_key]));
            await user_db_handler.set_user_data(this.ta_key, 'taing', JSON.stringify([this.course_key]));
            await user_db_handler.set_user_data(this.student_key, 'enrolments', JSON.stringify([this.course_key]));
        });


        after(async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;
            await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, this.assignment_key);
            await assignment_db_handler.delete_assignment(
                ImportHandler,
                this.instructor_key,
                this.course_key,
                this.assignment_key);
        });





        it('Should succeed in submitting to document assignment', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let submission_db_handler = await ImportHandler.submission_db_handler;

            let user_id = this.student_key.replace(KeyDictionary.key_dictionary['user'], '');

            let file = new File("./complex_pdf.pdf");

            try {

                let submission_key = await assignment_db_handler.submit_document_assignment(
                    ImportHandler,
                    user_id,
                    this.course_key,
                    this.assignment_key,
                    {'file-0': file});

                let submission_data = await submission_db_handler.get_submission_data(submission_key);

                assert(submission_data.submission_status === 'Submitted');
                assert(submission_data.assignment === this.assignment_key);
                assert(submission_data.group !== '');
                assert(submission_data.current_submission !== '');
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting assignment submissions', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let user_id = this.student_key.replace(KeyDictionary.key_dictionary['user'], '');

            let file = new File("./complex_pdf.pdf");

            try {

                let submission_key = await assignment_db_handler.submit_document_assignment(
                    ImportHandler,
                    user_id,
                    this.course_key,
                    this.assignment_key,
                    {'file-0': file});

                let submissions = await assignment_db_handler.get_assignment_submissions(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    this.assignment_key
                );

                assert(submissions.length === 1);
                assert(submissions[0].group !== '');
                assert(submissions[0].link !== '');
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });


        it ('Should fail in submitting assignment after due date - no extension', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            
            try {
             /*Change the due date after submit, otherwise submit will fail */
             await assignment_db_handler.set_assignment_data(
                this.assignment_key,
                'due_date',
                '1900-07-05T17:34:42.980Z');

             let submission_key = await assignment_db_handler.submit_document_assignment(
                   ImportHandler,
                   user_id,
                   this.course_key,
                   this.assignment_key,
                   {'file-0': file});
                
                assert(false, 'User should not be able to submit assignment after due date');
             } catch(err) {
                await assignment_db_handler.set_assignment_data(
                    this.assignment_key,
                    'due_date',
                    '' 
                );
                assert(true);
             }
        
        });

        it('Should succeed in getting assignment submissions after due date', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let user_id = this.student_key.replace(KeyDictionary.key_dictionary['user'], '');

            let file = new File("./complex_pdf.pdf");

            try {
                let submission_key = await assignment_db_handler.submit_document_assignment(
                    ImportHandler,
                    user_id,
                    this.course_key,
                    this.assignment_key,
                    {'file-0': file});

                /*Change the due date after submit, otherwise submit will fail */
                await assignment_db_handler.set_assignment_data(
                        this.assignment_key,
                        'due_date',
                        '1900-07-05T17:34:42.980Z'
                );

                let submissions = await assignment_db_handler.get_assignment_submissions(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    this.assignment_key
                );

                assert(submissions.length === 1);
                assert(submissions[0].group !== '');
                assert(submissions[0].link !== '');
                assert(submissions[0].late === true);

                await assignment_db_handler.set_assignment_data(
                    this.assignment_key,
                    'due_date',
                    ''
                );
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting assignment submission links and ids', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let user_id = this.student_key.replace(KeyDictionary.key_dictionary['user'], '');

            let file = new File("./complex_pdf.pdf");

            try {

                let submission_key = await assignment_db_handler.submit_document_assignment(
                    ImportHandler,
                    user_id,
                    this.course_key,
                    this.assignment_key,
                    {'file-0': file});

                let links_and_ids = await assignment_db_handler.get_assignment_submission_links_and_id(
                    ImportHandler,
                    this.instructor_key,
                    this.assignment_key
                );


                assert(links_and_ids.length === 1);
                assert(links_and_ids[0].link !== '');
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting first assignment submission link and id', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let user_id = this.student_key.replace(KeyDictionary.key_dictionary['user'], '');

            let file = new File("./complex_pdf.pdf");

            try {

                let submission_key = await assignment_db_handler.submit_document_assignment(
                    ImportHandler,
                    user_id,
                    this.course_key,
                    this.assignment_key,
                    {'file-0': file});

                let links_and_ids = await assignment_db_handler.get_first_assignment_submission_link_and_id(
                    ImportHandler,
                    this.instructor_key,
                    this.assignment_key
                );


                assert(links_and_ids.link !== '');
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting previous assignment submission link and id', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let user_id = this.student_key.replace(KeyDictionary.key_dictionary['user'], '');

            let file = new File("./complex_pdf.pdf");

            try {

                let submission_key = await assignment_db_handler.submit_document_assignment(
                    ImportHandler,
                    user_id,
                    this.course_key,
                    this.assignment_key,
                    {'file-0': file});

                let links_and_ids = await assignment_db_handler.get_previous_assignment_submission_link(
                    ImportHandler,
                    this.instructor_key,
                    this.assignment_key,
                    submission_key.replace(KeyDictionary.key_dictionary['submission'], '')
                );


                assert(links_and_ids.id === '');
                assert(links_and_ids.link === '');
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting next assignment submission link and id', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;

            let user_id = this.student_key.replace(KeyDictionary.key_dictionary['user'], '');

            let file = new File("./complex_pdf.pdf");

            try {

                let submission_key = await assignment_db_handler.submit_document_assignment(
                    ImportHandler,
                    user_id,
                    this.course_key,
                    this.assignment_key,
                    {'file-0': file});

                let links_and_ids = await assignment_db_handler.get_next_assignment_submission_link(
                    ImportHandler,
                    this.instructor_key,
                    this.assignment_key,
                    submission_key.replace(KeyDictionary.key_dictionary['submission'], '')
                );


                assert(links_and_ids.id === '');
                assert(links_and_ids.link === '');
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });
    });




    describe('Submissions and Course Group', function () {

        before(async function () {
            let course_db_handler = await ImportHandler.course_db_handler;
            let user_db_handler = await ImportHandler.user_db_handler;
            let course_group_db_handler = await ImportHandler.course_group_db_handler;

            this.instructor_key = await create_test_instructor();
            this.ta_key = await create_test_ta();
            this.student_key = await create_test_student();
            this.student_key2 = await create_test_student2();
            this.course_key = await create_test_course(
                [this.instructor_key],
                [this.ta_key],
                [this.student_key, this.student_key2]);

           
                        
            await user_db_handler.set_user_data(this.instructor_key, 'teaching', JSON.stringify([this.course_key]));
            await user_db_handler.set_user_data(this.ta_key, 'taing', JSON.stringify([this.course_key]));
            await user_db_handler.set_user_data(this.student_key, 'enrolments', JSON.stringify([this.course_key]));
            await user_db_handler.set_user_data(this.student_key2, 'enrolments', JSON.stringify([this.course_key]));
            

            this.course_group_set_key = await create_course_group_set(this.instructor_key, this.course_key, [this.student_key, this.student_key2]);

            let course_group_set_data = await course_group_db_handler.get_course_group_set_data(this.course_group_set_key);
            this.course_group_key = course_group_set_data['course_groups'][0];
            
            
        });


        after(async function () {
            console.log("Completed");
          
        });




        it('Should succeed in creating an group document submission assignment', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let submission_db_handler = await ImportHandler.submission_db_handler;
            let submitter_db_hander = await ImportHandler.submitter_db_handler;
            let user_db_handler = await ImportHandler.user_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;
            let course_group_db_handler = await ImportHandler.course_group_db_handler;

            assignment_data = generate_group_assignment_data(this.course_group_set_key, 'document_submission');

           
            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);
                let submission_data = await submission_db_handler.get_submission_data(assign_data['submissions'][0]);
                let submitter_data = await submitter_db_hander.get_submitter_data(submission_data['submitter']);
                let user_data = await user_db_handler.get_user_data(this.student_key);
                let user_data2 = await user_db_handler.get_user_data(this.student_key2);
                let course_group_data = await course_group_db_handler.get_course_group_data(this.course_group_key);
                

                assert(user_data['submitters'].includes(submission_data['submitter']));
                assert(user_data2['submitters'].includes(submission_data['submitter']));
                assert (submitter_data['members'].includes(this.student_key));
                assert (submitter_data['members'].includes(this.student_key2));
                assert(course_group_data['submitters'].includes(submission_data['submitter']), `course group has submitters ${course_group_data['submitters']}
                but this does not include ${submission_data['submitter']}`);

                console.log()

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in creating an group comment submission assignment', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let submission_db_handler = await ImportHandler.submission_db_handler;
            let submitter_db_hander = await ImportHandler.submitter_db_handler;
            let user_db_handler = await ImportHandler.user_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;
            let course_group_db_handler = await ImportHandler.course_group_db_handler;

            let file = new File("./complex_pdf.pdf");

            let assignment_data = generate_group_assignment_data(this.course_group_set_key, 'comment_submission');

            try {
                let assignment_key = await assignment_db_handler.create_comment_submission_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_data,
                    {'file-0': file});

                let assign_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);
                let submission_data = await submission_db_handler.get_submission_data(assign_data['submissions'][0]);
                let submitter_data = await submitter_db_hander.get_submitter_data(submission_data['submitter']);
                let user_data = await user_db_handler.get_user_data(this.student_key);
                let user_data2 = await user_db_handler.get_user_data(this.student_key2);
                let course_group_data = await course_group_db_handler.get_course_group_data(this.course_group_key);

                assert(user_data['submitters'].includes(submission_data['submitter']));
                
                assert (submitter_data['members'].includes(this.student_key));
                
                assert (submission_data['group'] !== '' && submission_data['group'] !== undefined);
                
                assert(user_data2['submitters'].includes(submission_data['submitter']));
                
                assert (submitter_data['members'].includes(this.student_key2));
                
                assert(course_group_data['submitters'].includes(submission_data['submitter']));
                

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting group assignment submission name', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_group_db_handler = await ImportHandler.course_group_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let user_id = this.student_key.replace(KeyDictionary.key_dictionary['user'], '');

            console.log(`user id is: ${user_id}`);

            let assign_data = generate_group_assignment_data(this.course_group_set_key, 'document_submission');

            let file = new File("./complex_pdf.pdf");

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let submission_key = await assignment_db_handler.submit_document_assignment(
                    ImportHandler,
                    user_id,
                    this.course_key,
                    assignment_key,
                    {'file-0': file});

                let name = await assignment_db_handler.get_course_group_assignment_submission_name(
                    ImportHandler,
                    this.course_group_key);

                let course_group_data = await course_group_db_handler.get_course_group_data(this.course_group_key);


                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);

                assert(course_group_data.name === name);




            } catch (e) {
                console.log(e);
                assert(false);
            }
        });



        it('Should succeed in getting course group submission key', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let course_db_handler = await ImportHandler.course_db_handler;

            let user_id = this.student_key.replace(KeyDictionary.key_dictionary['user'], '');


            let file = new File("./complex_pdf.pdf");

            

            try {
                let assignment_key = await assignment_db_handler.create_document_submission_assignment(
                    ImportHandler,
                    this.course_key,
                    assignment_data);

                let submission_key = await assignment_db_handler.submit_document_assignment(
                    ImportHandler,
                    user_id,
                    this.course_key,
                    assignment_key,
                    {'file-0': file});

                let sub_key = await assignment_db_handler.get_course_groups_submission_key(
                    ImportHandler,
                    this.instructor_key,
                    this.course_group_key,
                    assignment_key);

                assert(submission_key === sub_key);

                await course_db_handler.move_assignment_to_deleted_assignments(this.course_key, assignment_key);
                await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            } catch (e) {
                console.log(e);
                assert(false);
            }
           
        });

        it ('Should succeed in editing assignment - change from an individual document submission assignment to group assignment', async function() {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            
            let assignment_key = await create_doc_assignment(this.course_key);
            let edits = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);
            
            try {

                edits['group_assignment'] = true;
                edits['course_group_set'] = this.course_group_set_key;
                
                await assignment_db_handler.edit_assignment(ImportHandler, this.instructor_key, assignment_key, edits);

                let post_edit_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);

                assert(edit_success(post_edit_data, edits));

                console.log(post_edit_data);
            } catch(err) {
                assert(false, err);
            } 
            finally {
               await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            }
        });


        it ('Should succeed in editing assignment - change from a group document submission assignment to an individual assignment', async function () {
            let assignment_db_handler = await ImportHandler.assignment_db_handler;
            let assignment_key = await create_doc_assignment(this.course_key, true, this.course_group_set_key);
            let edits = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);

            try {

                edits['group_assignment'] = false;
                
                
                await assignment_db_handler.edit_assignment(ImportHandler, this.instructor_key, assignment_key, edits);

                let post_edit_data = await assignment_db_handler.get_assignment_data(this.instructor_key, assignment_key);

                assert(edit_success(post_edit_data, edits));

            } catch(err) {
                assert(false, err);
            } 
            finally {
               await assignment_db_handler.delete_assignment(
                    ImportHandler,
                    this.instructor_key,
                    this.course_key,
                    assignment_key);
            }


        });



    });
});


async function create_test_instructor() {
    let user_db_handler = await ImportHandler.user_db_handler;
    let user_key = KeyDictionary.key_dictionary['user'] + 'test_instructor';
    await user_db_handler.set_user_data(user_key, 'display_name', 'test instructor');
    await user_db_handler.set_user_data(user_key, 'nick_name', 'test instructor');
    await user_db_handler.set_user_data(user_key, 'first_name', 'test');
    await user_db_handler.set_user_data(user_key, 'last_name', 'instructor');
    await user_db_handler.set_user_data(user_key, 'id', 'test_instructor');
    await user_db_handler.set_user_data(user_key, 'email', 'testinstructor@test.com');
    await user_db_handler.set_user_data(user_key, 'creation_date', new Date().toISOString());
    await user_db_handler.set_user_data(user_key, 'auth_type', 'test');
    await user_db_handler.set_user_data(user_key, 'teaching', '[]');
    await user_db_handler.set_user_data(user_key, 'taing', '[]');
    await user_db_handler.set_user_data(user_key, 'enrolments', '[]');
    await user_db_handler.set_user_data(user_key, 'groupNs', '[]');
    await user_db_handler.set_user_data(user_key, 'submitters', '[]');
    await user_db_handler.set_user_data(user_key, 'course_groups', '[]');
    return user_key;
}

async function create_test_ta() {
    let user_db_handler = await ImportHandler.user_db_handler;
    let user_key = KeyDictionary.key_dictionary['user'] + 'test_ta';
    await user_db_handler.set_user_data(user_key, 'display_name', 'test ta');
    await user_db_handler.set_user_data(user_key, 'nick_name', 'test ta');
    await user_db_handler.set_user_data(user_key, 'first_name', 'test');
    await user_db_handler.set_user_data(user_key, 'last_name', 'ta');
    await user_db_handler.set_user_data(user_key, 'id', 'test_ta');
    await user_db_handler.set_user_data(user_key, 'email', 'testta@test.com');
    await user_db_handler.set_user_data(user_key, 'creation_date', new Date().toISOString());
    await user_db_handler.set_user_data(user_key, 'auth_type', 'test');
    await user_db_handler.set_user_data(user_key, 'teaching', '[]');
    await user_db_handler.set_user_data(user_key, 'taing', '[]');
    await user_db_handler.set_user_data(user_key, 'enrolments', '[]');
    await user_db_handler.set_user_data(user_key, 'groupNs', '[]');
    await user_db_handler.set_user_data(user_key, 'submitters', '[]');
    await user_db_handler.set_user_data(user_key, 'course_groups', '[]');
    return user_key;
}

async function create_test_student() {
    let user_db_handler = await ImportHandler.user_db_handler;
    let user_key = KeyDictionary.key_dictionary['user'] + 'test_student';
    await user_db_handler.set_user_data(user_key, 'display_name', 'test student');
    await user_db_handler.set_user_data(user_key, 'nick_name', 'test student');
    await user_db_handler.set_user_data(user_key, 'first_name', 'test');
    await user_db_handler.set_user_data(user_key, 'last_name', 'student');
    await user_db_handler.set_user_data(user_key, 'id', 'test_student');
    await user_db_handler.set_user_data(user_key, 'email', 'teststudent@test.com');
    await user_db_handler.set_user_data(user_key, 'creation_date', new Date().toISOString());
    await user_db_handler.set_user_data(user_key, 'auth_type', 'test');
    await user_db_handler.set_user_data(user_key, 'teaching', '[]');
    await user_db_handler.set_user_data(user_key, 'taing', '[]');
    await user_db_handler.set_user_data(user_key, 'enrolments', '[]');
    await user_db_handler.set_user_data(user_key, 'groupNs', '[]');
    await user_db_handler.set_user_data(user_key, 'submitters', '[]');
    await user_db_handler.set_user_data(user_key, 'course_groups', '[]');
    return user_key;
}

async function create_test_student2() {
    let user_db_handler = await ImportHandler.user_db_handler;
    let user_key = KeyDictionary.key_dictionary['user'] + 'test_student2';
    await user_db_handler.set_user_data(user_key, 'display_name', 'test student2');
    await user_db_handler.set_user_data(user_key, 'nick_name', 'test student2');
    await user_db_handler.set_user_data(user_key, 'first_name', 'test');
    await user_db_handler.set_user_data(user_key, 'last_name', 'student2');
    await user_db_handler.set_user_data(user_key, 'id', 'test_student2');
    await user_db_handler.set_user_data(user_key, 'email', 'teststuden2t@test.com');
    await user_db_handler.set_user_data(user_key, 'creation_date', new Date().toISOString());
    await user_db_handler.set_user_data(user_key, 'auth_type', 'test');
    await user_db_handler.set_user_data(user_key, 'teaching', '[]');
    await user_db_handler.set_user_data(user_key, 'taing', '[]');
    await user_db_handler.set_user_data(user_key, 'enrolments', '[]');
    await user_db_handler.set_user_data(user_key, 'groupNs', '[]');
    await user_db_handler.set_user_data(user_key, 'submitters', '[]');
    await user_db_handler.set_user_data(user_key, 'course_groups', '[]');
    return user_key;
}

async function create_test_course(instructor_keys, ta_keys, student_keys) {
    let course_db_handler = await ImportHandler.course_db_handler;
    let course_key = KeyDictionary.key_dictionary['course'] + 'test';
    await course_db_handler.set_course_data(course_key, 'title', 'test course');
    await course_db_handler.set_course_data(course_key, 'number', '0');
    await course_db_handler.set_course_data(course_key, 'section', '0');
    await course_db_handler.set_course_data(course_key, 'dept', 'test dept');
    await course_db_handler.set_course_data(course_key, 'institution', 'test institution');
    await course_db_handler.set_course_data(course_key, 'year', '1900');
    await course_db_handler.set_course_data(course_key, 'is_active', 'true');
    await course_db_handler.set_course_data(course_key, 'instructors', JSON.stringify(instructor_keys));
    await course_db_handler.set_course_data(course_key, 'tas', JSON.stringify(ta_keys));
    await course_db_handler.set_course_data(course_key, 'active_students', JSON.stringify(student_keys));
    await course_db_handler.set_course_data(course_key, 'blocked_students', '[]');
    await course_db_handler.set_course_data(course_key, 'course_groups', '[]');
    await course_db_handler.set_course_data(course_key, 'id', '0');
    await course_db_handler.set_course_data(course_key, 'assignments', '[]');
    await course_db_handler.set_course_data(course_key, 'deleted_assignments', '[]');
    await course_db_handler.set_course_data(course_key, 'active_course_groups', '[]');
    await course_db_handler.set_course_data(course_key, 'inactive_course_groups', '[]');
    return course_key;
}

async function create_doc_assignment(course_key, isGroup = false, group_set_key = null) {
    let assignment_db_handler = await ImportHandler.assignment_db_handler;

    let now = new Date();

    let tenDaysAgo = new Date();
    tenDaysAgo.setDate(now.getDate() - 10);

    let tenDaysAhead = new Date();
    tenDaysAhead.setDate(now.getDate() + 10);

    let assignment_data = {};
    if (isGroup === false) {
        assignment_data = {
            title: 'test assignment',
            description: 'test assignment description',
            points: 5,
            type: 'document_submission',
            count_toward_final_grade: true,
            allow_multiple_submissions: true,
            group_assignment: false,
            hidden: false,
            due_date: tenDaysAhead.toISOString(),
            available_date: tenDaysAgo.toISOString(),
            until_date: tenDaysAhead.toISOString()
        };
    }
    else {
        if (group_set_key === null)
            throw new Error('Group set key should not be null when generating a group assignment');

        assignment_data = generate_group_assignment_data(group_set_key, 'document_submission');
    }


    return await assignment_db_handler.create_document_submission_assignment(
        ImportHandler,
        course_key,
        assignment_data);
}

async function create_course_group (course_key, members) {
    let course_group_db_handler = await ImportHandler.course_group_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;

    let course_group_key = KeyDictionary.key_dictionary['course_group'] + 'test';
    await course_group_db_handler.set_course_group_data(course_group_key, 'id', 'test');
    await course_group_db_handler.set_course_group_data(course_group_key, 'name', 'Test Course Group');
    await course_group_db_handler.set_course_group_data(course_group_key, 'users', JSON.stringify(members));
    await course_group_db_handler.set_course_group_data(course_group_key, 'creation_time', new Date().toISOString());
    await course_group_db_handler.set_course_group_data(course_group_key, 'submitters', '[]');
    await course_group_db_handler.set_course_group_data(course_group_key, 'course', course_key);

    for (let user of members) {
        await user_db_handler.add_course_group_to_user(user, course_group_key);
    }

    return course_group_key;
}


async function create_course_group_set(user_key, course_key, users) {
    let course_group_db_handler = await ImportHandler.course_group_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;
    
    let dateTime = Date.now();

    let userObjects = [];
    for (let userKey of users) {
        let curUser = await user_db_handler.get_user_data(userKey);
        userObjects.push({
            key: userKey,
            name: `${curUser.first_name} ${curUser.last_name}`
        });
    }

    let group = {
        id: `placeholder_test_group_${dateTime}`, 
        name: `test group ${dateTime}`, 
        users: userObjects
    };

    let group_set_data = { 
        id: `placeholder_test_group_set_${dateTime}`,
        name: `test group set ${dateTime}`,
        course_groups: [group]

    };
    
    let course_group_set_key = await course_group_db_handler.update_new_course_group_set(ImportHandler, user_key, course_key, group_set_data)
    
    await course_db_handler.add_course_group_set_to_course(course_group_set_key, course_key);

    return course_group_set_key;
   

}



function generate_group_assignment_data(group_set_key, type) {

    let now = new Date();

    let tenDaysAgo = new Date();
    tenDaysAgo.setDate(now.getDate() - 10);

    let tenDaysAhead = new Date();
    tenDaysAhead.setDate(now.getDate() + 10);

    
    let assignment_data = {
        title: 'test assignment',
        description: 'test assignment description',
        points: 5,
        type: type,
        count_toward_final_grade: true,
        allow_multiple_submissions: true,
        group_assignment: true,
        course_group_set: group_set_key,
        hidden: false,
        due_date: tenDaysAhead.toISOString(),
        available_date: tenDaysAgo.toISOString(),
        until_date: tenDaysAhead.toISOString()
    };

    return assignment_data;
}

function edit_success(edited_assignment_data, edits) {
    return ( (edited_assignment_data.title === edits.title) &&
    (edited_assignment_data.description === edits.description) &&
    (edited_assignment_data.type === edits.type) &&
    (edited_assignment_data.count_toward_final_grade === edits.count_toward_final_grade) &&
    (edited_assignment_data.allow_multiple_submissions === edits.allow_multiple_submissions) &&
    (edited_assignment_data.group_assignment === edits.group_assignment) &&
    (edited_assignment_data.hidden === edits.hidden) &&
    (edited_assignment_data.due_date.toString() === new Date(edits.due_date).toString()) &&
    (edited_assignment_data.available_date.toString() === new Date(edits.available_date).toString()) &&
    (edited_assignment_data.until_date.toString() === new Date(edits.until_date).toString()) );
    
}