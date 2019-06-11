class DateHelper {

}

DateHelper.is_date = (date) => {

    let date_fields = [
        'due_date',
        'available_date',
        'until_date',
        'creation_time',
        'submission_time',
        'creation_date'
    ];

    return date_fields.includes(date);
};


DateHelper.format_date = (date_string) => {
    try {
        new Date(date_string).toISOString();
        return new Date(date_string)
    } catch (e) {
        return ''
    }
};

module.exports = DateHelper;