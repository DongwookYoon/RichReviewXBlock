class PDFFormatError extends Error {

    constructor (message) {
        super();
        this.message = message;
        this.name = 'PDFFormatError';
    }
}

module.exports = PDFFormatError;