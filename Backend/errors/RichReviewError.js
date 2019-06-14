class RichReviewError extends Error {

    constructor (message) {
        super();
        this.message = message;
        this.name = 'RichReviewError';
    }
}

module.exports = RichReviewError;