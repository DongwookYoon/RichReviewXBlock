
const fs = require('fs');
const path = require('path');

const nodemailer = require('nodemailer');

const env = require('./env');

const transporter = nodemailer.createTransport(env.nodemailer_config.transportOptions);

exports.sendMail = function(subject, text) {

  const mailOptions = {
    from: env.nodemailer_config.alertSentFromEmail,
    to:   env.nodemailer_config.alertSendToEmails,
    subject: subject,
    text: text,
    html: ""
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, result) => {
      if(err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

exports.log = function(stmt) {
  console.log("<APP>: "+stmt);
};

exports.log_error = function(err) {
  if(err instanceof Error) { err = `${err.code}: ${err.message}`; }
  console.error("<APP ERR>: "+err);
};

exports.makeLogs = function(SCOPE) {
  const log = (stmt) => { console.log(`<${SCOPE}>: ${stmt}`); }
  const log_error = (err) => {
    if(err instanceof Error) { err = `${err.code}: ${err.message}`; }
    console.error(`<${SCOPE} ERR>: ${err}`);
  }
  return { log, log_error };
};