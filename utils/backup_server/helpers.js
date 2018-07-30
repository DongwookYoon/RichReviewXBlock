
const fs = require('fs');
const path = require('path');

const nodemailer = require('nodemailer');

const nodemailer_config = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../..', 'richreview_core/node_server/ssl/nodemailer_config.json')
    , 'utf-8'
  )
);

const transporter = nodemailer.createTransport(nodemailer_config.transportOptions);

exports.sendMail = function(subject, text) {

  const mailOptions = {
    from: nodemailer_config.alertSentFromEmail,
    to:   nodemailer_config.alertSendToEmails,
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