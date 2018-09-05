/**
 * A module that extends the backend models.
 * 
 * This module is currently being used
 * 
 * NOTE:
 * 
 * by Colin
 */

const env         = require("./env");
const RedisClient = require("./redis_client").RedisClient;
const redis_utils = require("./redis_client").util;
// const R2D = require("./r2d");
const User        = require("./r2d").User;
const Group       = require("./r2d").Group;
const Doc         = require("./r2d").Doc;
const Course      = require("./Course");

const util        = require("../util");

/**
 * Completely delete the user corresponding to the email including all groups and documents that user made.
 * !!! This function should not to be used by client !!!
 * @param usr_str {string} - the redis key rep. user to delete; can be user id or form usr:[id]
 * @returns {Promise}
 * TODO: test thoroughly
 * TODO: should delete user's assignments
 */
User.deleteUser = (usr_str) => {

  /**
   * delete the group in redis
   * @param {String} grp_str - of form grp:[groupID_n]; the group to delete
   * @returns {Promise<Number>} - 1 if Group.DeleteGroup() succeeds, 0 otherwise
   */
  const deleteGroup = (grp_str) => {
    util.logger("deleteUser", `deleteGroup grp_str=${grp_str}`);
    let groupID_n = null;
    try {
      groupID_n = grp_str.substring(4);
    } catch(err) {
      util.error("in deleteGroup "+err);
    }

    return RedisClient.HGET(grp_str, "docid")
      .then((docid) => {
        const docID_n = docid.substring(4);
        util.debug("Group.DeleteGroup("+groupID_n+","+docID_n+")");
        return Group.DeleteGroup(groupID_n, docID_n);
        // return true;
      });
  };

  /**
   * Remove the user from the group
   * @param {String} usr_str   - of form usr:[userID_n]; the user to remove
   * @param {String} groupID_n - the group to remove
   * @returns {Promise<Number>} - 1 if Group.RemoveUserFromGroup() succeeds, 0 otherwise
   */
  const removeUser = (usr_str, groupID_n) => {
    let userID_n = null;
    try {
      userID_n = usr_str.substring(4);
    } catch(err) {
      util.error("in removeUser " + err);
    }
    util.debug("Group.RemoveUserFromGroup("+groupID_n+", "+userID_n+")");
    return Group.RemoveUserFromGroup(groupID_n, userID_n);
    //return true;
  };

  /**
   * Delete the group if user created the group, otherwise remove user from the group
   * 1) remove user from all groups made by other people
   * 2) delete group made by user
   * @param {String} usr_str   - of form usr:[userID_n]; user to detach
   * @param {String} groupID_n - group to consider
   * @returns {Promise<Number>} - 1 if successful, 0 otherwise
   */
  const deleteOrRemoveGroup = (usr_str, groupID_n) => {
    const grp_str = "grp:"+groupID_n;
    util.logger("deleteUser", `deleteOrRemoveGroup grp_str=${grp_str}`);
    return RedisClient.HGET(grp_str, "userid_n")
      .then((userid_n) => {
        const usr_of_grp = "usr:"+userid_n;
        //util.debug("usr_str="+usr_str+"; usr_of_grp="+usr_of_grp);
        if (usr_str === usr_of_grp) {
          util.debug("user owns this group");
          return deleteGroup(grp_str);
        } else {
          util.debug("group is owned by someone else");
          return removeUser(usr_str, groupID_n);
        }
      });
  };

  const deleteOrRemoveGroups = (usr_str, groupID_n_arr_str) => {
    util.logger("deleteUser", "delete or remove groups");
    if(groupID_n_arr_str) {
      const groupID_n_arr = JSON.parse(groupID_n_arr_str);
      const promises = groupID_n_arr.map(deleteOrRemoveGroup.bind(null, usr_str));
      return Promise.all(promises);
    } else {
      return null;
    }
  };

  /**
   * removes the group in the document and then delete the document
   * Base this on DeleteDocument function in dbs.js; first delete doc groups, then delete the doc.
   * @param {String} doc_str - has form doc:[docID_n]
   * @returns {Promise<Number>} - 1 if Doc.DeleteDocFromRedis(docID_n) succeeds, 0 otherwise
   */
  const deleteDoc = (doc_str) => {
    util.logger("deleteUser", `deleteDoc doc_str=${doc_str}`);
    let docID_n = null;
    try {
      docID_n = doc_str.substring(4);
    } catch(err) {
      util.error("in deleteDoc "+err);
    }
    return Doc.GetDocGroups(docID_n)
      .then((groups) => {
        const promises = groups.map(deleteGroup);
        return Promise.all(promises);
      })
      .then((bArr) => {
        util.debug("Doc.DeleteDocFromRedis("+docID_n+")");
        return Doc.DeleteDocFromRedis(docID_n);
        //return true;
      });
  };

  /**
   * If the document has a userid_n that corresponds with usr_str (i.e. document is created by user), then delete it
   * @param {String} usr_str - has form usr:[userID_n]
   * @param {String} doc_str - has form doc:[docID_n]
   * @returns {Promise<Number>} - 1 if successful, 0 otherwise
   */
  const deleteDocIfUsers = (usr_str, doc_str) => {
    // util.debug("deleteDocIfUsers " +usr_str+" "+doc_str);
    if(!doc_str) console.log("!doc_str");
    return RedisClient.HGET(doc_str,"userid_n")
      .then((userid_n) => {
        const usr_of_doc = "usr:"+userid_n;
        if(usr_str === usr_of_doc) {
          util.debug("deleting "+doc_str);
          return deleteDoc(doc_str);
        } else {
          return 0;
        }
      });
  };

  /**
   * Delete all the documents user created
   * @param {String} usr_str - has form usr:[userID_n]
   * @returns {Promise.<number[]>} - array of numbers {0,1} for successful or not
   */
  const deleteDocs = (usr_str) => {
    return RedisClient.KEYS("doc:*")
    // checked that RedisClient.KEYS() returns an array
      .then((doc_str_arr) => {
        const promises = doc_str_arr.map(deleteDocIfUsers.bind(null, usr_str));
        return Promise.all(promises);
      });
  };

  /**
   * Delete pilot user plugin
   * @param {string} usr_str - has form usr:[userID_n]
   * @returns {Promise.<number>} - {0,1} for successful or not
   */
  const deletePilot = (usr_str) => {
    return RedisClient.HGET(usr_str, "email")
      .then((email) => {
        if(/@pilot.study$/.test(email)) {
          return RedisClient.DEL("pilot:"+email);
        }
      })
  };

  /**
   * Performs all steps of deleting user given a usr:[userID_n]
   * 1) remove user from all groups; and delete groups created by user
   * 2) remove docs user created
   * 3) delete the user entry pilot:[email]
   * 4) delete user in userid_email_table
   * 5) delete the user in redis

   * @param {String} usr_str - string of form usr:[userID_n]; user to delete
   * @return {Promise}
   *
   * Task after creating Assignment module
   * TODO: should delete user's assignments
   */
  usr_str = User.makeUserKey(usr_str);
  const id = User.extractID(usr_str);
  //const id = 
  return RedisClient.HGET(usr_str, "groupNs")
  // 1) remove user from any groups; and delete groups created by user
    .then(deleteOrRemoveGroups.bind(null, usr_str))
    // 2) remove docs user created
    .then(deleteDocs.bind(null, usr_str))
    // 3) delete the user in redis
    .then(deletePilot.bind(null, usr_str))
    // 4) remove user from the all courses
    .then(() => {
      if(User.cache.exists(id)) {
        const user = User.cache.get(id);
        const courses = Course.cache.getCourses.withUser(user);
        const promises = courses.map((course) => {
          return course.removeUser(user);
        });
        return Promise.all(promises);
      }
    })
    // 5) delete user in userid_email_table
    .then(redis_utils.GraphDel.bind(null, env.USERID_EMAIL_TABLE, usr_str))
    // 6) delete the user entry pilot:[email]
    .then(() => {
      util.logger("deleteUser", `deleting ${usr_str}`);
      return RedisClient.DEL(usr_str);
    })
    .then(() => {
      if(User.cache.exists(id)) {
        util.logger("deleteUser", `repopulating cache`);
        return User.cache.populate();
      }
    })
    .catch((err) => {
      util.error(err);
    });
};