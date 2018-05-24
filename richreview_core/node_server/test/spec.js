
const expect = require('chai').expect;
let R2D = null;

describe("spec", function() {

    before(function () {
        // require('../www/www');
        R2D = require('../lib/r2d');
    });

    beforeEach(function () {

    });

    after(function () {

    });

    afterEach(function() {

    });

    it("1 + 1 = 2", function () {
        expect( 1 + 1 ).to.equal(2);
    });

    it("test delete users", () => {
        R2D.User.prototype.deleteUserByEmail("cchen795@gmail.com")
            .then(() => {
                expect(1).to.deep.equal(1);
            })
            .catch(() => {
                expect.fail();
            });
    });

    // TODO: write some tests
});