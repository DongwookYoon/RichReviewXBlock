
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
  console.log("<BACKUP LOGS>: "+stmt);
};

exports.log_error = function(err) {
  if(err instanceof Error) { err = `${err.code}: ${err.message}`; }
  console.error("<BACKUP LOGS ERR>: "+err);
};