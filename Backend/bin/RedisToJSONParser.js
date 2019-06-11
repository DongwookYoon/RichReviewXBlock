class RedisToJSONParser {

    static parse_data_to_JSON (data) {

        let big_number_fields = [
            'id',
            'userid_n'
        ];

        if (data === undefined || data === null)
            return {};

        let parsed_data = Object.assign(data);

        for (let field in data) {
            try {
                if (!big_number_fields.includes(field))
                    parsed_data[field] = JSON.parse(parsed_data[field]);
            } catch (e) {
                // console.warn(`Field ${field} cannot be parsed to JSON`);
            }
        }

        return parsed_data;
    }
}

module.exports = RedisToJSONParser;

