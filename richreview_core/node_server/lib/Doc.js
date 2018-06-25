/**
 * Doc
 *
 */

// import npm modules
const Promise = require("promise"); // jshint ignore:line

// import libraries
const js_utils = require('./js_utils.js');
const redisClient = require('./redis_client').redisClient;
const RedisClient = require('./redis_client').RedisClient;
const util = require('../util');

const Group = require('./Group').Group;

/*
 * Doc
 */
var Doc = (function(){
  var pub_doc = {};

  // redis doc hash structure
  // userid, creationDate, pdfid, name, groups(list)

  /**
   *
   *
   * getting error ode_redis: Deprecated: The HMSET command contains a "undefined" argument.
   This is converted to a "undefined" string now and will return an error from v.3.0 on.
   Please handle this in your code to make sure everything works as you intended it to.
   * TODO: change crs_submission variable
   */
  pub_doc.CreateNew = function(userid_n, creationTime, pdfid, crs_submission){
    var docid = "doc:"+userid_n+"_"+creationTime;
    return RedisClient.EXISTS(docid).then(
      function(isexist){
        if(isexist){
          var err = new Error("Doc Already Exist: " + docid);
          err.push_msg = true;
          throw err;
        }
        else{
          return null;
        }
      }
    ).then(
      function(){
        crs_submission = crs_submission === 'undefined' ? null : crs_submission;
        return RedisClient.HMSET(
          docid,
          'userid_n', userid_n,
          'creationTime', creationTime,
          'pdfid', pdfid,
          'name', 'Document uploaded at ' + js_utils.FormatDateTimeMilisec(creationTime),
          'groups', '[]',
          'crs_submission', JSON.stringify(crs_submission)
        );
      }
    ).then(
      function(){
        return docid;
      }
    );
  };

  pub_doc.GetDocById_Promise = function(docid){
    return RedisClient.HGETALL(docid).then(
      function(doc_obj){
        doc_obj.id = docid;
        doc_obj.creationTimeStr = js_utils.FormatDateTime(doc_obj.creationTime);
        doc_obj.groups = JSON.parse(doc_obj.groups);
        return doc_obj;
      }
    );
  };

  pub_doc.GetDocIdsByUser = function(userid_n){
    return RedisClient.KEYS('doc:'+userid_n+'_*');
  };

  pub_doc.GetDocByUser_Promise = function(userid_n){
    return RedisClient.KEYS('doc:'+userid_n+'_*').then(
      function(docids){
        return js_utils.PromiseLoop(pub_doc.GetDocById_Promise, docids.map(function(docid){return [docid];})).then(
          function(doc_objs){
            return doc_objs;
          }
        );
      }
    );
  };

  pub_doc.AddNewGroup = function(userid_n, docid){
    var groupsObj;
    var groupid;

    return RedisClient.HGET(docid, "groups").then(
      function(groupsStr){
        groupsObj = JSON.parse(groupsStr);
        return Group.CreateNewGroup(
          userid_n,
          docid,
          new Date().getTime()
        );
      }
    ).then(
      function(_groupid){
        groupid = _groupid;
        groupsObj.push(groupid);
        return RedisClient.HSET(docid, "groups", JSON.stringify(groupsObj));
      }
    ).then(function() {
      return Group.connectUserAndGroup(groupid.substring(4), userid_n);
    }).then(
      function(){
        return groupid;
      }
    );
  };

  pub_doc.GetDocGroups = function(docid_n){
    return RedisClient.HGET("doc:"+docid_n, "groups").then(
      function(groupsStr){
        // return groupsObj = JSON.parse(groupsStr);
        return JSON.parse(groupsStr);
      }
    );
  };

  pub_doc.Rename = function(doc_id, new_name){
    return RedisClient.HSET(doc_id, 'name', new_name);
  };

  pub_doc.DeleteDocFromRedis = function(docid_n){
    return RedisClient.DEL("doc:"+docid_n);
  };

  return pub_doc;
}());

exports.Doc = Doc;