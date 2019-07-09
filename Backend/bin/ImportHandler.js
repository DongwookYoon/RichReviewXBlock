const AssignmentDatabaseHandler = require('./AssignmentDatabaseHandler');
const CmdDatabaseHandler = require('./CmdDatabaseHandler');
const CourseDatabaseHandler = require('./CourseDatabaseHandler');
const CourseGroupDatabaseHandler = require('./CourseGroupDatabaseHandler');
const DocumentDatabaseHandler = require('./DocumentDatabaseHandler');
const DocumentUploadHandler = require('./DocumentUploadHandler');
const GradesDatabaseHandler = require('./GradesDatabaseHandler');
const GroupDatabaseHandler = require('./GroupDatabaseHandler');
const LogDatabaseHandler = require('./LogDatabaseHandler');
const SubmissionDatabaseHandler = require('./SubmissionDatabaseHandler');
const SubmitterDatabaseHandler = require('./SubmitterDatabaseHandler');
const UserDatabaseHandler = require('./UserDatabaseHandler');

class ImportHandler {

}

ImportHandler.assignment_db_handler = AssignmentDatabaseHandler.get_instance();
ImportHandler.cmd_db_handler = CmdDatabaseHandler.get_instance();
ImportHandler.course_db_handler = CourseDatabaseHandler.get_instance();
ImportHandler.course_group_db_handler = CourseGroupDatabaseHandler.get_instance();
ImportHandler.doc_db_handler = DocumentDatabaseHandler.get_instance();
ImportHandler.doc_upload_handler = DocumentUploadHandler.get_instance();
ImportHandler.grades_db_handler = GradesDatabaseHandler.get_instance();
ImportHandler.group_db_handler = GroupDatabaseHandler.get_instance();
ImportHandler.log_db_handler = LogDatabaseHandler.get_instance();
ImportHandler.submission_db_handler = SubmissionDatabaseHandler.get_instance();
ImportHandler.submitter_db_handler = SubmitterDatabaseHandler.get_instance();
ImportHandler.user_db_handler = UserDatabaseHandler.get_instance();

module.exports = ImportHandler;