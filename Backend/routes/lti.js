var express = require('express');
var fs = require('fs');
var path = require('path');
var router = express.Router({mergeParams: true});
var jwtUtil = require('../util/jwt-util');
var authUtil = require('../util/auth-util');
var axios = require('axios');
var https = require('https');
var ImportHandler = require('../bin/ImportHandler');
var KeyDictionary = require('../bin/KeyDictionary');
var lti_config;

try {
  lti_config = JSON.parse(
   fs.readFileSync(path.join(__dirname, '..', 'ssl/lti.json'), 'utf-8'));
  console.log(`Successfully read lti.json config file`);
} catch(ex) {
 console.warn('Failed to read lti.json config file. Reason: ' + ex);
}



/* Get an oauth access token from the lti endpoint using a 
   code provided by the client. Note that the approach
   used here is to sign the*/
router.post('/oauth_code_token', async function(req, res, next) {
  res.sendStatus(501);
  /*
  const code = req.body.code;
  const client_id = req.body.clientId;
  const redirect_uri = req.body.redirectUri;
  
  const assertionJWT = jwtUtil.createClientAssertion();
  
  const reqMsg = {
    grant_type: 'authorization_code',
    code,
    client_id,
    redirect_uri,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: assertionJWT
  };

  const resp = await axios.post(
    `${lti_config.platform_path}/login/oauth2/token`,
    reqMsg, {
      headers: {
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

  if (!resp.data)
    res.sendStatus(501);
  
  res.json({auth_info: resp.data});
  */
});



/**
 * Sign an lti deep link response on behalf of the client.
 * Response has the signed JWT as a JSON object with the property 'jwt'.
 */
router.post('/deeplink', async function(req, res, next) {
 try {
    if (!req.body.message){
      throw new Error('Required property "message" missing. Request must contain an lti response message');
    }
    
    if (!req.body.courseId){
      throw new Error('Required property "courseId" missing. Request must contain a course id.');
    }
    
    if (!req.headers.authorization) {
      console.warn(JSON.stringify(req.headers));
      throw new Error('Required header "Authorization" missing from request.');
    }
 } catch (ex) {
   console.warn('Bad request. Reason: ' +ex);
   res.status(400).json(ex.message);
   return;
 }

 const course_db_handler = await ImportHandler.course_db_handler;
 const user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
 const course_key = KeyDictionary.key_dictionary['course'] + req.body.courseId;

 try {
    if ( (await course_db_handler.is_user_instructor_for_course(user_key, course_key)) === false) {
      console.warn(`User ${user_key} is not a an instructor in ${course_key}.`);
      res.sendStatus(401);
      return;
    }

    options = {
      algorithm: lti_config.jwk_alg,
      expiresIn: 900,                       // Number of seconds for 15 minutes expiration time
      issuer: lti_config.canvas_client_id
    };

    const jwt = jwtUtil.signAndEncode(req.body.message, options);

    if (jwt === null) {
      throw new Error('Creating the JWT failed.');
    }

    res.json({jwt});
        

  } catch(ex) {
    console.warn('Posting lti deep link response to Canvas failed. Reason: ' + ex);
    console.warn('Error message: ' + ex.message );
  
    res.sendStatus(500);
  }

});



/**
 * Clients do not need access to token.
 */
router.get('/grading_services_token', async function(req, res, next) {
  res.sendStatus(401);
   
});



/**
 * Submits an assignment to the platform (Canvas).
 */
router.post('/assignment', async function(req, res, next) {
  try {
    if (!req.body.launchMessage){
      throw new Error('Required property "launchMessage" missing. Request must contain an lti response message');
    }
    
    if (!req.body.courseId){
      throw new Error('Required property "courseId" missing. Request must contain a course id.');
    }

    if (!req.body.richReviewUrl){
      throw new Error('Required property "richReviewUrl" missing. Request must contain a RichReview resource url.');
    }
    
    if (!req.headers.authorization) {
       throw new Error('Required header "Authorization" missing from request!');
    }
  } catch (ex) {
    console.warn('Bad request. Reason: ' +ex);
    res.status(400).json(ex.message);
    return;
  }

  const launchMessage = req.body.launchMessage;
  const courseId = req.body.courseId;
  const userId = req.headers.authorization;
  const richReviewUrl = req.body.richReviewUrl;
  
  //const lineItemUrl = launchMessage[
  //  "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"].lineitem;
  
  const lineItemUrl = `https://canvas.ubc.ca/api/lti/courses/51965/line_items/15` // DEBUG!!

  let clientCredentialsToken;

 const course_db_handler = await ImportHandler.course_db_handler;
 const rr_user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
 const rr_course_key = KeyDictionary.key_dictionary['course'] + req.body.courseId;

 if ( (await course_db_handler.is_user_enrolled_in_course(rr_user_key, rr_course_key)) === false) {
  console.warn(`User ${user_key} is not a student in ${course_key}.`);
  res.sendStatus(401);
  return;
 }

 try {
    clientCredentialsToken = await authUtil.getClientCredentialToken(lti_config.auth_token_url);
  } catch (ex) {
    console.warn('Could not get client credentials token. Reason: ' +ex);
    res.sendStatus('500');
    return;
  }
  
  try {
      const scoreData = {
        timestamp: `${new Date().toISOString()}`,
        activityProgress: 'Submitted',
        gradingProgress: 'PendingManual',
        userId: `${userId}`,
      };
      scoreData['https://canvas.instructure.com/lti/submission'] = {
        new_submission: true,
        submission_type: 'basic_lti_launch',
        submission_data: `${richReviewUrl}`
      };

      if (launchMessage.nonce){
        scoreData.nonce = launchMessage.nonce;
      }

            
      console.log('Submitting score data: ' + JSON.stringify(scoreData));
      console.log('Client credentials token is: ' + clientCredentialsToken);
      console.log('POST URL is: ' + `${lineItemUrl}/scores`);

      /* Send the score resource to Canvas to create new
         unmarked submission in gradebook. */
      const submitResp = await axios.post(`${lineItemUrl}/scores`,
        scoreData,
          {
            headers: {
              Authorization: `Bearer ${clientCredentialsToken}`,
              'Content-Type': 'application/vnd.ims.lis.v1.score+json'
           },
           httpsAgent: new https.Agent({
              rejectUnauthorized: false
           })
        });
      
      if (!submitResp) {
        throw new Error(`Submitting assignment to Canvas failed.`);
      }
      else if(submitResp.status > 203) {
        throw new Error(`The response from Canvas is ${submitResp.status} ${
          JSON.stringify(submitResp.data)}`);
      }
          
    } catch (ex){
      console.warn(`Submitting assignment in course ${courseId} failed. Reason: ${
        ex}.`);
        res.sendStatus(500);
        return;
      }

      console.log('Success! LTI Assignment submission created in Canvas. Status: pending instructor manual grading.');
      res.sendStatus(201);
});




module.exports = router;



