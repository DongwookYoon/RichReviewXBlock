/**
 * Controller for /class route (MyClass app)
 *
 * created by Colin
 */

/**
 * User ( usr:<userid> )
 * userid is a sha1 hash with salt from netid
 *
 * type    hash / class
 *
 * nick     {string} - nickname
 * email    {string} required - email of user
 * groupNs  {string|Array<string>} required - array of groupid user is in
 *
 * userid is also added to email_user_lookup as a hash field
 */

/**
 * UBCUser ( ubc_user:<userid> )
 * userid is a sha1 hash with salt from netid
 *
 * password   {string} - made from irreversible sha1 hash with salt from netid
 * auth_level {string} - is one of "student", "instructor", or "admin"; refers to security level in terms of access to functionality (delete, doc creation, etc); also affects routing.
 *
 * is_active   {string|boolean} - can access ; instructor and admin should ALWAYS be active
 * courses    {string|Array<string>} - an array of strings for courses of form `ubc_course:<course-dept>:<course-number>`
 * portfolios {string|Array<string>} - an array of strings for portfolios of form `ubc_portfolio:<userid>:<course-dept>:<course-number>`
 *
 * first_name {string} optional - the first name of user
 * last_name  {string} optional - the last name of user
 * sid        {string} optional - the student id of user
 *
 */

/**
 * Course ( ubc_course:<course-dept>:<course-number> )
 *
 * name  {string} - name of the course; defaults to `<course-dept> <course-number>`
 * users {string|Array<string>} - array of usr:[userid] for User (students, instructors and admin)
 */

/**
 * Portfolio ( ubc_portfolio:<userid>:<course-dept>:<course-number> )
 * Search for portfolios belonging to [userid] by `keys ubc_portfolio:[userid]:*`
 * Search for portfolios belonging to [course-dept] and [course-number] by `keys ubc_portfolio:*:[course-dept]:[course-number]`
 *
 * assignments {string|Array<string>} - array of string `ubc_asgmt:<userid>:<course-dept>:<course-number>:<title>`
 *
 * TODO: this may not be necessary
 */

/**
 * Assignment ( ubc_asgmt:<userid>:<course-dept>:<course-number>:<title-slug> )
 * userid      is a sha1 hash with salt from netid
 * title-slug  is the slug of the name of the title
 * Search for assignments belonging to [userid] by `keys ubc_asgmt:[userid]:*`
 * Search for assignments belonging to [course-dept] and [course-number] by `keys ubc_asgmt:*:[course-dept]:[course-number]:*`
 *
 * type    hash / class
 *
 * member title     {string}required - defaults to `<email-hash>_<timestamp>`
 * member docs      {string|Array<string>} - an array of docid for Doc relating to this assignment
 * member out_of    {number} optional - the amount of marks the assignment is worth
 * member grade     {number} optional - the grade given to student after marking
 * member stat_date {string|Array<string>} required - the date status is updated; statuses and the dates they are instantiated
 * member due_date  {string} optional - is of form ISO 8601 Extended Format and instantiated as new Date().toISOString(); if due_date undefined then no due date.
 * member status   {string} required - is one of "hidden", "active", "blocked", "marked", "submitted"
 *      "hidden"    the student cannot see the assignment
 *      "active"    the student cannot see
 *      "submitted" indicates the student submitted
 *      "marked"    indicates the student
 *      default     the student cannot see the assignment
 */

/**
 * If User.level=student then just fetch that student's details
 * If User.level=instructor then get instructor's courses and return all students in those courses
 * If User.level=admin then fetch all students
 * If User.level=undefined then return empty array
 *
 * @param req
 * @param res
 */
exports.fetchStudents = (req, res) => {
  const dummyStudents = [
    { id: "1", email: "test01@study.com", first_name: "Jonathan", last_name: "Flask", sid: "01234567" },
    { id: "2", email: "test02@study.com", first_name: "Jordan", last_name: "Bayer", sid: "01234567" },
    { id: "3", email: "test03@study.com", first_name: "Finn", last_name: "Wake", sid: "01234567" },
    { id: "4", email: "test04@study.com", first_name: "Alex", last_name: "Moore", sid: "01234567" }
  ];
  res.send(dummyStudents);
};

/**
 *
 *
 * @param req
 * @param res
 */
exports.fetchAssignments = (req, res) => {
  const dummyAssignments = [
    { id: "", title: "hw01", docs: [], out_of: 10, grade: 5, due_date: "2018-06-16T20:02:48.302Z", status: "active" },
    {},
    {},
    {}
  ];
  res.send(dummyAssignments);
};

exports.fetchCourses = (req, res) => {
  const dummyCourses = [];
  res.send(dummyCourses);
};