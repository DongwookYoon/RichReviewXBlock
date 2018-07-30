
const child_process = require('child_process');

const helpers = require('./helpers');
const moment  = require('moment');

const REMOTE_HOST = "rr_admin@richreview.net";

const log = function(stmt) {
  console.log("<BACKUP LOGS>: "+stmt);
};

const log_error = function(err) {
  if(err instanceof Error) { err = `${err.code}: ${err.message}`; }
  console.error("<BACKUP LOGS ERR>: "+err);
};


const DATE_LINE = moment().format('YYYYMMDDHHMMSS');
const nd = child_process.spawn(
  __dirname + 'scripts/backup_logs.sh',
  [REMOTE_HOST, DATE_LINE],
  {
    cwd: path.join(__dirname, '..')
  }
);

nd.stdout.on('data', (data) => {
  log(data.toString());
});

nd.stderr.on('data', (data) => {
  log_error(data.toString());
});

nd.on('close', (code) => {
  log(`child process closed with code ${code}`);
  const ok_msg = "log files are backed up";
  const er_msg = `log files backup process ended on code ${code}`;
  const resp_msg = code === 0? ok_msg : er_msg;
  helpers.sendMail("Backup Log Files", resp_msg);
});

nd.on('exit', (code) => {
  log(`child process exited with code ${code}`);
});

nd.on('error', (err) => {
  log_error(`child process has error ${err}`);
});