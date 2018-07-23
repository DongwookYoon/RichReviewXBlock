//const cluster = require('cluster');
const child_process = require('child_process');
//const numCPUs = require('os').cpus().length;

const CronJob = require('cron').CronJob;

const log = function(stmt) {
  console.log("<APP>: "+stmt);
};

const log_error = function(stmt) {
  console.error("<ERR>: "+stmt);
};

let backup_azure_str_lock = 0;
function backup_azure_str_launch() {
  log(`pinging job backup_azure_str, received ${backup_azure_str_lock}`);
  if(backup_azure_str_lock) {
    return;
  } else {
    backup_azure_str_lock = 1;
    log("starting job backup_azure_str");
  }

  const nd = child_process.spawn(
    'node',
    [__dirname + '/' + 'backup_azure_storage.js']
  );

  nd.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  nd.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  nd.on('close', (code) => {
    console.log(`child process closed with code ${code}`);
    backup_azure_str_lock = 0;
  });

  nd.on('exit', (code) => {
    console.log(`child process exited with code ${code}`);
  });

  nd.on('error', (err) => {
    console.error(`child process has error ${err}`);
  });
}

let backup_redis_cache_lock = 0;
function backup_redis_cache_launch() {
  log(`pinging job backup_azure_str, received ${backup_redis_cache_lock}`);
  if(backup_redis_cache_lock) {
    return;
  } else {
    backup_redis_cache_lock = 1;
    log("starting job backup_azure_str");
  }

  backup_redis_cache_lock = 0;
}

/**
 * seconds minutes hours day/mth months day/wk
 * ' *       *       *      *      *      *'
 *
 */

log("starting jobs...");

let test_lock = 0;
const test_job = new CronJob(
  "*/1 * * * * *",
  function() {
    if(test_lock) {
      log("test is already running");
      return;
    }
    test_lock = 1;
    log("running test");
    setTimeout(() => {
      test_lock = 0;
      log("test complete");
    }, 4000)

  },
  null,
  false
);

const backup_azure_str_job = new CronJob(
  "*/3 * * * * *",
  backup_azure_str_launch,
  null,
  false
);

const backup_redis_cache_job = new CronJob(
  "*/3 * * * * *",
  backup_redis_cache_launch,
  null,
  false
);

backup_azure_str_job.start();