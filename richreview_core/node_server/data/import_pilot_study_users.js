/**
 * Import usernames and passwords for pilot study
 *
 * Created by Colin
 */

const pilotStudy = require("../lib/pilot_study");
const Promise = require("promise"); // jshint ignore:line

/**
 * Import test users only
 */
(function() {
    const list = [
        {id: "test01", pass: "fire" },
        {id: "test02", pass: "wind" },
        {id: "test03", pass: "earth"},
        {id: "test04", pass: "water"},
        {id: "test05", pass: "sun"  },
        /*{id: "korn102.01@pilot.study", pass: "korn102.01" }*/
    ];

    const promises = list.map(function(entry) {
        console.log("IMPORT_PILOT_STUDY: creating id " + entry.id);
        return pilotStudy.PilotUser.prototype.create(entry.id, entry.pass);
    });

    Promise.all(promises)
        .then(function(list) {
            list.forEach(function(entry) {
                console.log("IMPORT_PILOT_STUDY: " + entry);
            });

        }).catch(function(err) {
        console.log("ERR: "+err);
        // console.log("IMPORT_PILOT_STUDY: has the list already been uploaded?");
        });
})();