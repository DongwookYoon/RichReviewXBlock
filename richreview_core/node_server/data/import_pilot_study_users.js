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
        {id: "test05", pass: "sun"  }
    ];

    const promises = list.forEach(function(entry) {
        console.log("DEBUG: creating id " + entry.id);
        return pilotStudy.PilotUser.prototype.create(entry.id, entry.pass);
    });

    Promise.all(promises)
        .then(function(list) {
            console.log("DEBUG: list has been uploaded");
        }).catch(function(err) {
        console.log("ERR: "+err);
        });
})();