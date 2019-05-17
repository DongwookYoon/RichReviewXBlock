class NotAuthorizedError extends Error {

    constructor (message) {
        super();
        this.message = message;
        this.name = 'NotAuthorizedError';
    }
}

module.exports = NotAuthorizedError;