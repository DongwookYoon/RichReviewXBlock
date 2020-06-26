var express = require('express');
var fs = require('fs');
var path = require('path');
var router = express.Router({mergeParams: true});
var jwtUtil = require('../util/jwt-util');
var axios = require('axios');
var https = require('https');
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
});




/*
 ** Create a signed jwt
 */
router.post('/lti_jwt/:nonce', function(req, res, next) {
  res.sendStatus(401);
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
 * Get an OAuth client credentials token which gives access to assignment
 * grading services and score services to the client (tool).
 */
router.get('/grading_services_token', async function(req, res, next) {
  try{
    const oauthPath = lti_config.auth_token_url;
    const assertionJWT = jwtUtil.createClientAssertion();

    if (assertionJWT === null) {
      throw new Error('Error. Could not create client assertion during client credential grant.');
    }
    const requestData = {
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertionJWT,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score'
    };

    console.log('The client assertion: ' + assertionJWT);

    /* Get JSON response with token */
    const tokenResp = await axios.post(oauthPath, requestData, {
      headers: {
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    res.json({
      access_token: tokenResp.data.access_token
    });

  } catch (ex) {
    res.sendStatus(500);
    console.warn('Getting OAuth client credentials token for lti grading services failed. Reason: ' + ex);
  }
});



/**
 * Submits an assignment to the platform (Canvas).
 */
router.post('/assignment', async function(req, res, next) {

  try {
    const launchMessage = req.body.launchMessage;
    const courseId = req.body.courseId;
    const clientCredentialsToken = req.body.clientCredentialsToken;
    const userId = req.body.userId;
    const richReviewUrl = req.body.richReviewUrl;
    
    const assignmentResourceId = launchMessage[
      'https://purl.imsglobal.org/spec/lti/claim/resource_link'].id;

    let lineItemId = '';

    const lineItemsResp = await axios.get(
        `${lti_config.platform_path}/api/lti/courses/${courseId}/line_items`,
        {
          headers: {
            Accept: 'application/json+canvas-string-ids',
            Authorization: `Bearer ${clientCredentialsToken}`
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        });
    } catch (ex) {
      console.warn(`Getting line items from Canvas for the course ${courseId} failed. Reason: ${
        ex}. The response from Canvas is ${JSON.stringify(lineItemResp.data)}` );
        res.sendStatus(500);
        return;
    }
    const lineItems = lineItemsResp.data; // The parsed JSON which contains array of line items

    /* Find the ID of the line item for which we want to create a submission in gradebook */
    for (const curItem of lineItems) {
      if (curItem.resourceLinkId === assignmentResourceId) {
        lineItemId = curItem.id;
        break;
      }
    }
    if (lineItemId === '') {
      console.warn(
        'Error. Could not find a line item to create assignment submission for resourceId ' + assignmentResourceId);
      res.sendStatus(500);
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

      //  Call backend to sign JWT.
      const scoreJWT = jwtUtil.signAndEncode(scoreData);
      if (scoreJWT === null) {
        throw new Error('Creating the JWT failed.');
      }

      const urlEncodedJWT = `JWT=${encodeURIComponent(scoreJWT)}`;

      /* Send the score resource to Canvas to indicate submission in gradebook */
      const submitResp = axios.post(
            `${lti_config.platform_path}/api/lti/courses/${courseId}/line_items/${lineItemId}/scores`,
            urlEncodedJWT,
            {
              headers: {
                Authorization: `Bearer ${clientCredentialsToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              httpsAgent: new https.Agent({
                rejectUnauthorized: false
              })
            });
      
      console.log('Success! LTI Assignment submission (pending manual grading) created in Canvas.');
      res.sendStatus(201);

    } catch (ex){
      console.warn(`Getting line items from Canvas for the course ${courseId} failed. Reason: ${
        ex}. The response from Canvas is ${JSON.stringify(submitResp.data)}` );
        res.sendStatus(500);
        return;
      }
});




module.exports = router;



