/**
 * Controller for /class route (MyClass app)
 *
 * created by Colin
 */

/**
 * We are updating the User. We now want a User to contain attributes for UBC study
 *
 * Structure of User ( usr:[userid] )
 * userid is a sha1 hash with salt from netid
 *
 * nick       {string} - nickname
 * email      {string} required - email of user
 * groupNs    {string|Array<string>} required - array of groups user is in
 * password   {string} - made from irreversible sha1 hash with salt from netid
 * level      {string} - is one of "student", "instructor", or "admin"
 * isActive   {string|boolean} - true if active; false otherwise
 *
 * first_name {string} optional - the first name of user
 * last_name  {string} optional - the last name of user
 * sid        {string} optional - the student id of user
 *
 * userid is also added to email_user_lookup as a hash field
 */

/**
 *
 * Structure of Assignment ( asgmt:[email-hash]_[timestamp] )
 * docs - an array of docid
 * out_of {number} -
 * grade {number} -
 * due_date {number} -
 * status - is one of "hidden", "active", "blocked", "marked", "submitted"
 *
 * TODO: I'm not clear about how the assignment is supposed to look like
 */

/**
 *
 * Structure of Course ( course:[] )
 * users {string|Array<string>} - array of usr:[userid] for User (students, instructors and admin)
 * asgmts {string|Array<string>} - array of asgmt:[email-hash]_[timestamp] for Assignment
 *
 *
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
    { id: "", title: "hw01", doc: [] },
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