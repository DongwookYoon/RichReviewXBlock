 // Don't commit this file to your public repos. This config is for first-run
 exports.creds = {
     mongoose_auth_local: 'mongodb://localhost/tasklist', // Your mongo auth uri goes here
     clientID: '8fcf9b97-0489-4ead-b1eb-23254690dddc',
     clientSecret: 'LlFBJFY3Y2J9YnhBLW1UKDZNRSg=',
     audience: 'http://kidventus.net/tasks',
     identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration', // For using Microsoft you should never need to change this.
     tenantName:'hypercubeb2c.onmicrosoft.com',
     policyName:'B2C_1_b2c_node_signin',
     validateIssuer: false,
     passReqToCallback: false,
     loggingLevel: 'info' // valid are 'info', 'warn', 'error'. Error always goes to stderr in Unix.
 };


