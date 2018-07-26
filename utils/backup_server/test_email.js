const nodemailer = require('nodemailer');

const transportOptions = {
  host: "smtp.gmail.com",
  port: 465,
  auth: {
    user: "alerts.richreview@gmail.com",
    pass: "" // IMPORT instead
  }
};

const transporter = nodemailer.createTransport(transportOptions);

const mailOptions = {
  from: "RichReview alerts <alerts.richreview@gmail.com>",
  to: "cchen795@gmail.com",
  subject: "test email",
  text: "test test test",
  html: ""
};

transporter.sendMail(mailOptions, function(err, results) {
  if (err) {
    console.log(err);
  }
  else {
    console.log(results);
  }
});
