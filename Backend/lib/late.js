

exports.is_late = function (assignment_data, submission_data, student_or_group) {
    if (assignment_data['due_date'] !== '') {
        let due_date = new Date(assignment_data['due_date']);
        let now = new Date();

        if (submission_data['submission_status'] === 'Not Submitted' &&
            now - due_date > 0)
            return true;

        if (submission_data['submission_status'] === 'Submitted' &&
            new Date(submission_data['submission_time']) - due_date > 0)
            return true;
    }

    return false;
};