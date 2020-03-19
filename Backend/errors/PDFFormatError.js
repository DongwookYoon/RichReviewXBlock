class PDFFormatError extends Error {

    constructor (message = 'Could not process PDF. The file is corrupt or has an invalid format. ' +
    'Please contact the RichReview deployment facilitator for help with this error.') {
        super();
        this.message = message;
        this.name = 'PDFFormatError';
    }
}

module.exports = PDFFormatError;