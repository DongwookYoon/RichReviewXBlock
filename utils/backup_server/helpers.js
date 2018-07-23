const nodemailer = require('nodemailer');

exports.sendMail = function(subject, text) {
  const toEmail = "John Doe <jdoe@email.com>";

  const MAIL_USER = "eeac3290faceca";
  const MAIL_PASS = "f2077e357e071a";
  const MAIL_HOST = "smtp.mailtrap.io";
  const MAIL_PORT = 2525;

  let transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: MAIL_PORT,
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASS
    }
  });
  const mailOptions = {
    from: toEmail,
    to:   toEmail,
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