/**
 * Import usernames and passwords for pilot study
 *
 * Created by Colin
 *
 * TODO: deprecate this file and use backdoor instead
 */

const Promise    = require('promise'); // jshint ignore:line

const pilotStudy = require('../lib/pilot_handler');
const util       = require('../util');
const R2D        = require('../lib/r2d');


/*
// delete these on richreview.net
"test01@pilot.study"
"test02@pilot.study"
"test03@pilot.study"
"test04@pilot.study"
"test05@pilot.study"
"korn102.01@pilot.study"
"korn102.reviewer@pilot.study"
"korn102.02@pilot.study"
"korn102.03@pilot.study"
"korn102.04@pilot.study"
"chin131.reviewer@pilot.study"
"chin131.01@pilot.study"
"chin131.02@pilot.study"
"chin131.03@pilot.study"
"chin131.04@pilot.study"
*/

const delete_exec = () => {
    R2D.User.prototype.deleteUserByEmail("test01@pilot.study")
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("test02@pilot.study");
        })
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("test03@pilot.study");
        })
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("test04@pilot.study");
        })
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("test05@pilot.study");
        })
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("korn102.01@pilot.study");
        })
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("korn102.reviewer@pilot.study");
        })
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("korn102.02@pilot.study");
        })
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("korn102.03@pilot.study");
        })
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("korn102.04@pilot.study");
        })
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("chin131.reviewer@pilot.study");
        })
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("chin131.01@pilot.study");
        })
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("chin131.02@pilot.study");
        })
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("chin131.03@pilot.study");
        })
        .then((b) => {
            return R2D.User.prototype.deleteUserByEmail("chin131.04@pilot.study");
        })
        .catch((err) => {
            util.error(err);
        });
};

//delete_exec();

/**
 * Import test users only
 */
const import_exec = () => {
    const students = [
        {id: "test01", pass: "fire" },
        {id: "test02", pass: "wind" },
        {id: "test03", pass: "earth"},
        {id: "test04", pass: "water"},
        {id: "test05", pass: "sun"  },
        /*{id: "korn102.01@pilot.study", pass: "korn102.01" }*/
    ];

    const admin = [
        {id: "admin1", pass: "ubc1" },
        {id: "admin2", pass: "ubc2" },
        {id: "admin3", pass: "ubc3" },
        {id: "admin4", pass: "ubc4" },
    ];

    const promises = [];

    students.forEach((entry) => {
        util.logger("IM_PILOT", "creating student "+entry.id);
        promises.push( /****/ pilotStudy.createStudentPilotUser(entry.id, entry.pass, "TEST") /****/ );
    });

    admin.forEach((entry) => {
        util.logger("IM_PILOT", "creating admin "+entry.id);
        promises.push( /****/ pilotStudy.createAdminPilotUser(entry.id, entry.pass) /****/ );
    });

    Promise.all(promises)
        .then(function(list) {
            list.forEach(function(msg) {
                util.logger("IM_PILOT", "creating id "+msg);
            });

        }).catch(function(err) {
            util.error(err);
        });
};

// import_exec();