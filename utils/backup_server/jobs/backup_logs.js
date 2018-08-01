
const child_process = require('child_process');
const path = require('path');

const moment  = require('moment');

const helpers = require('../helpers');
const env = require('../env');

const DATE_LINE = moment().format('YYYYMMDDHHMMSS');
const nd = child_process.spawn(
  path.join(__dirname,'..', 'scripts/backup_logs.sh'),
  [env.node_config.REMOTE_HOST, DATE_LINE],
  {
    cwd: path.join(__dirname, '..')
  }
);

nd.stdout.on('data', (data) => {
  helpers.log(data.toString());
});

nd.stderr.on('data', (data) => {
  helpers.log_error(data.toString());
});

nd.on('close', (code) => {
  helpers.log(`child process closed with code ${code}`);
  const ok_msg = "log files are backed up";
  const er_msg = `log files backup process ended on code ${code}`;
  const resp_msg = code === 0? ok_msg : er_msg;
  helpers.sendMail("Backup Log Files", resp_msg);
});

nd.on('exit', (code) => {
  helpers.log(`child process exited with code ${code}`);
});

nd.on('error', (err) => {
  helpers.log_error(`child process has error ${err}`);
});
