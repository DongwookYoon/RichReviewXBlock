# RichReview

This is a Node/Express app for [RichReview](https://github.com/DongwookYoon/RichReviewWebApp). It contains these modules:

- [**Node backend**](https://nodejs.org/en/)
- **MuPla** Django server that runs a MuPDA (or MuPDF) pdf editing [utilites]((https://mupdf.com/docs/index.html))
- [**RichReview Web App**](https://www.youtube.com/watch?v=twSTqxghHNQ)
- **PDF Multicolumn Analyzer Web App** which runs [PDF.js](https://mozilla.github.io/pdf.js/)

Additionally it makes use of Redis to store user metadata, and Azure Storage to store document, multimedia and CDN files, etc. You can either use your own Redis server or use a Redis Cache provided by Azure.

## VM Manual Installation

### Configure the VM

These instructions refer to the Ubuntu 18.04 LTS Server, although they can also refer to any linux distribution with minor changes. The first thing you want to do is establish a secure connection from your computer to a VM. This way, you don't need to enter your password at every connection. These same instructions are needed if you want to set up a [backup server](#backup-server) because your backup server needs to connect to the VM.

```bash
# Generate a pair of authentication keys. Do not enter a passphrase:
ssh-keygen -t rsa
Generating public/private rsa key pair.
Enter file in which to save the key (/home/<User>/.ssh/id_rsa):
Created directory '/home/<User>/.ssh'.
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /home/<User>/.ssh/id_rsa.
Your public key has been saved in /home/<User>/.ssh/id_rsa.pub.
The key fingerprint is:
3e:4f:05:79:3a:9f:96:7c:3b:ad:e9:58:37:bc:37:e4 <User>@<Your Computer>

# Create a .ssh folder in your Remote VM
ssh <Remote User>@<Remote VM> mkdir -p .ssh

# Add the authentication keys to your Remote VM's authorized keys
cat .ssh/id_rsa.pub | ssh <Remote User>@<Remote VM> 'cat >> .ssh/authorized_keys'
```

Sourced from (http://www.linuxproblem.org/art_9.html)

You also need to run some installation commands to update your VM.

```bash
sudo apt update
sudo apt upgrade
sudo apt autoremove

# these are some utilities you need later on
sudo apt install git build-essential unzip python-pip
```

### Install Node

Install the node version manager `n` and then install the latest stable version of node. This will also give you the node package manager `npm`.

```bash
git clone https://github.com/tj/n
cd n
sudo make install
sudo n stable
```

For more details see this [stack overflow guide](https://stackoverflow.com/questions/19451851/install-node-js-to-install-n-to-install-node-js).

### Install and Configure Redis in the VM (for testing purposes)

Ubuntu 18.04 LTS provides the latest Redis server as part of the official Ubuntu [package respository](https://packages.ubuntu.com/bionic/database/redis). This will give you a redis server with version >=4.0.9.

```bash
apt show redis
sudo apt install redis
# the redis server should start by default, to check do
service --status-all | grep +
# to stop the server
sudo service redis-server stop
# to start the server
sudo service redis-server start
# to go into the Redis CLI just type
redis-cli
```

The default config file for Redis is in `/etc/redis`. You can set the password by uncommenting `requirepass <pswd>` and setting your own password. If you want to import RichReview data from your previous redis server, you can scp the `dump.rdb` from the previous server dump location to the current one. Usually the `dump.rdb` file is from 
For more details see this [stack overflow guide](https://stackoverflow.com/questions/6004915/how-do-i-move-a-redis-database-from-one-server-to-another#22024286)

If you are an admin and need a copy of the user database, then should have access to another VM/Server instance with RichReview set up. In your previous VM/Server go into the Redis CLI and call `SAVE` to save the data into `dump.rdb` and call `CONFIG GET DIR` to find the save location. Usually `dump.rdb` is in `/var/lib/redis`. Then in your new VM/Server move `dump.rdb` to the Redis server 'dir' and start the Redis server

```bash
# in your old VM/Server instance
redis-cli
> SAVE
> CONFIG GET DIR
```

```bash
# in your new VM/Server instance
sudo sudo service redis-server stop
cd /var/lib

# if you can't access the redis folder do
sudo chmod 777 redis

# secure copy the dump.rdb file to this VM
scp <user>@<ip of old VM>:<path to>/dump.rdb /var/lib/redis

sudo chown redis: /var/lib/redis/dump.rdb
sudo chmod 755 redis

sudo service redis-server start
```

To use Redis with NodeJS we are using the `redis` [package](https://github.com/NodeRedis/node_redis). This allows us to call the redis [commands](https://redis.io/commands) inside Node scripts. We can even promisify redis commands by passing `util.promisify` on them. See `data/redis_import.js` for more details.

### Set up the Azure Redis Cache

You can import data to the Azure Redis Cache using the Azure Portal as a paid premium member. If not, then you can use the function `exec_import()` in the script file `data/migrate_redis_server.js` to call the redis client and copy all the redis keys from your Redis database to the Azure Redis Cache. You cab call `clear_redis_cache()` to reset the cache (**WARNING:** remember to backup and export (no script yet) the cache before resetting!).

Here a list of functions I have available, documentation is in the script file.

```javascript
testCache()
test_migration_hash()
test_migration_list()
exec_count()
exec_cache_count()
exec_import()
clear_redis_cache()
```

When using the `migrate_redis_server.js` file, see that you are using the correct redis setup by checking, LOCAL_REDIS_PORT, REDIS_CACHE_KEY, REDIS_CACHE_HOSTNAME, REDIS_CACHE_PORT. By default the local port is set to 6379 and the cache configs are retrieved from your ssl directory.

Currently, `exec_import()` only supports the migrating of hashes and lists. To migrate other Redis datatypes you must implement for those types in `exec_import`

For more details on Redis Client, please read the node redis client [documentation](https://github.com/NodeRedis/node_redis).

### Migrate to Azure Storage (Part 1)

Azure Storage contains the RichReview CDN,

If you are an admin and want to set up a new Azure Storage, then you should have access to another Azure resource instance set up for RichReview. You can use `data/migrate_blob_storage.js` to migrate all blob containers from your current Azure Storage to your new one. The migration uses `<blobService>.startCopyBlob()` to transfer between the Azure Storage directly. To transfer directly, you need to generate an SASToken from the Azure Storage you are transferring containers from; in Azure Portal, navigate to Storage account => Shared access signature => Generate SAS and connection string. Then call `migrate_exec()`. `migrate_exec` will most likely fail to migrate some blobs (for unknown reasons) so you may need to move those manually.

Here a list of functions I have available, documentation is in the script file.

```javascript
listContainers(service)
listBlobs(service, container, prefix)
test_migration(container)
migrate_container_special(container, publicAccessLevel, prefix)
download_files_misc (service, container, dl_arr, dl_to_path)
check_consistency_misc ()
migrate_exec()
```

For more details on Azure Storage please read the node azure storage [documentation](https://azure.github.io/azure-storage-node/BlobService.html).

### Configure Azure Storage (Part 2)

Afterwards you need to set up Cross-origin resource sharing (CORS) and a URL endpoint to Azure Storage to serve your CDN files. Browsers by default forbids launching scripts from API domains but CORS allows RichReview clients to run scripts retrieved from CDN. Without CORS clients will fail to launch the RichReview webapp.

[General documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS), [for storage](https://docs.microsoft.com/en-us/rest/api/storageservices/cross-origin-resource-sharing--cors--support-for-the-azure-storage-services) and [for Azure CDN](https://docs.microsoft.com/en-us/azure/cdn/cdn-cors)

#### Configure CORS

In Azure Portal, navigate to Storage account => CORS. Then enter these settings:

Allowed origins|Allowed verbs|Allowed headers|Expossed headers|Maximum age
---------------|-------------|---------------|----------------|-----------
https://\<VM public IP\>|GET,HEAD,POST,  OPTIONS,PUT|Range,content-type,accept,  origin,x-ms-\*,accept-\*|x-ms-\*|60
https://localhost:8001  |GET,HEAD,POST,  OPTIONS,PUT|Range,content-type,accept,  origin,x-ms-\*,accept-\*|x-ms-\*|3600
http://localhost:8000   |GET,HEAD,POST,PUT|Range,origin|Accept-Ranges,Content-Encoding,  Content-Length,Content-Range|60
https://\<DNS address\> |GET,HEAD,POST,  OPTIONS,PUT|Range,content-type,accept,  origin,x-ms-\*,accept-\*|x-ms-\*|60

#### Configure an endpoint

In Azure Portal, navigate to Storage account => Azure CDN. Then create a new CDN profile. Then navigate to Endpoint => Origin. The enter these settings:

Setting       |*      |*
--------------|-------|---
Origin type   |Storage|
Origin path   |/cdn   |
HTTP  Protocol|enabled|80
HTTPS Protocol|enabled|443

Whenever, your CORS settings change, recreate the CDN endpoint and *clear your browser cache*.

### Set up RichReview's Node Server

#### Install and Build the Node Server

```bash
cd <path to home>
git clone https://github.com/DongwookYoon/RichReviewXBlock.git

# install all node modules for RichReview
cd RichReviewXBlock/richreview_core/node_server
npm install

# install node modules for Azure Active Directory Authentication package
cd ~/RichReviewXBlock/richreview_core/node_server/passport-azure-ad
npm install

# run webpack to compile React files
webpack
```

#### Install forever

It's unsafe to install global npm modules in root, which is npm's default global install location. Instead you want to set global modules within the home directory.

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
```

Add the line `PATH="$HOME/.npm-global/bin:$PATH"` to then end of your `.profile` file.

```bash
source ~/.profile
npm install -g forever
ln -s ~/.npm-global/bin/forever ~

# list the running forever processes; use sudo for processes run by root
forever list

# kill all running forever processes
forever stopall
```

#### Import SSL

You should be given a zip file containing all the ssl files. This contains all the . You may want to change the variables in the ssl files such as `node_config.json`, `redis_config.json` and `azure_config.json` every time you are setting up a new server environment.

```bash
scp <user>@<location of ssl files>:ssl.zip ~/RichReviewXBlock/richreview_core/node_server
unzip ssl.zip
rm ssl.zip
```

### Set up RichReview's MuPla module

#### Build MuPla

You installed `build-essential` during the initial VM setup. The `build-essential` package contains the binaries you need compile the C/C++ mupla source code. It comes with the build tool `make`. Now call `make` build mupla.

```bash
cd ~/RichReviewXBlock/mupla_core/mupla
make
```

#### Configure Django Server

Install the packages for Python using python package manager `pip`. You installed `pip` from `pip-python` during the initial VM setup. [Django](https://www.djangoproject.com/) is a webframework that let's us run a server on Python. [PyPDF2](https://mstamy2.github.io/PyPDF2/) is a module that contains functions to merge and read pdfs.

```bash
python --version

pip freeze
# should show the python packages installed on the VM already 

pip install Django==1.8
pip install PyPDF2==1.24
cd ~/RichReviewXBlock/mupla_core/django_server
sudo python manage.py runserver 5000
```

### Maintenance and scripts

To run the application server from the VM. You can use `screen` to start an instance of the Django server, and `forever` to start an instance of the Node server. However, there are scripts that do this for you. Simply call `deploy_scripts.sh` to set up maintenance scripts, and then call them (i.e. `rrrun.sh`) in your home directory.

```bash
cd ~/RichReviewXBlock/utils/scripts
./deploy_scripts.sh
cd ~
./rrrun.sh # starts RichReview application
```

#### About the scripts

Script to start Node server `stop_node.sh`

```bash
#!/bin/bash

~/restart_django.sh
~/restart_node.sh
```

Script to stop Node server `stop_node.sh`

```bash
#!/bin/bash

echo "//// STOP NODE SERVER"

~/.npm-global/bin/forever stopall
sudo fuser -k -HUP -n tcp 80
sudo fuser -k -HUP -n tcp 443
sudo killall -TERM nodejs
sudo killall -TERM node
```

Script to stop Django server `stop_django.sh`

```bash
#!/bin/bash

echo "//// STOP DJANGO SERVER"

sudo fuser -k -HUP -n tcp 5000
sudo killall -TERM screen
```

Script to stop all `stop_all.sh`

```bash
#!/bin/bash

~/stop_node.sh
~/stop_django.sh
```

Script to update `update_richreview.sh`

```bash
#!/bin/bash

~/stop_all.sh

echo "//// UPDATING RICHREVIEW"

cd ~/RichReviewXBlock
git pull
cd ~
```

Script to start Node server `restart_node.sh`. Here we are using [forever]((https://www.npmjs.com/package/forever)) to load the node scripts.

```bash
#!/bin/bash

~/stop_node.sh

echo "//// STARING NODE SERVER"

sudo ~/.npm-global/bin/forever start --append -l ~/log_node.txt -e ~/log_node_err.txt --minUptime 1000 --spinSleepTime 30000 ~/RichReviewXBlock/richreview_core/node_server/www/www.js
```

Script to start Django server `restart_django.sh`

```bash
#!/bin/bash

~/stop_django.sh

echo "//// STARING DJANGO SERVER"

screen -dmS mupla -L -Logfile ~/log_django.txt bash -c "cd ~/RichReviewXBlock/mupla_core/django_server; sudo python manage.py runserver 5000; cd ~"

sleep 1
screen -S mupla -X colon "logfile flush 0^M"

```

Script to start RichReview `rrrun.sh`

```bash
#!/bin/bash

~/restart_django.sh
~/restart_node.sh
```

#### Brief tutorial

`screen` is nice to use for testing if you have multiple commandline processes you want to run at one.

```bash
touch log_test.txt
chmod 755 log_test.txt

screen -dmS ./test.sh

# run screen with session name testInstance, to call test.sh, and log output to log_test.txt
screen -dmS testInstance -L -Logfile ~/log_test.txt bash -c ./test.sh

# run infinite loop
while true; do echo "HELLO"; sleep 1; done

# run screen with session name testInstance, to call infinite loop, and log output to log_test.txt
screen -dmS testInstance -L -Logfile ~/log_test.txt bash -c "while true; do echo "HELLO"; sleep 1; done"

# list all screen sessions
screen -ls

# flush output of session testInstance to log file
screen -S testInstance -X colon "logfile flush 0^M"

## kill screen session testInstance
screen -X -S testInstance quit
```

`killall` is a good way to stop processes.

```bash
`sudo killall <OPTIONS> screen
```

Options:

**`-1`** or **`-HUP`** makes kill send the "Hang Up" signal to processes. Most daemons are programmed to re-read their configuration when they receive such a signal. It is the safest kill signal there is.

**`-2`** or **`-SIGINT`** is the same as starting some program and pressing CTRL+C during execution.

**`-9`** or **`-KILL`** makes kernel let go of the process without informing the process of it. This is the "hardest" and most unsafe kill signal available, and should only be used to stop something that seems unstoppable.

**`-15`** or **`-TERM`** tell sthe process to stop whatever it's doing, and end itself. When you don't specify any signal, this signal is used. It should be fairly safe to perform, but better start with a "-1" or "-HUP".

From (http://meinit.nl/the-3-most-important-kill-signals-on-the-linux-unix-command-line)

### Backup Server

RichReview comes with a backup server. It's a server that uses Cron Jobs to:

- Maintain a local copy of the Azure Storage
- Create daily snapshots of the Azure Redis Cache
- Save log files of running processes in the VM

You can run these jobs independently or use the Cron Job app to trigger them periodically.

Go to `utils/backup_server` and run `setup.sh`.

### Test RichReview

You're finally done! You can test RichReview straight from the VM. I

## License

The code in this repository is licensed under the AGPL license unless otherwise noted.

## Author

RichReview was made by [Dongwook Yoon](https://www.cs.ubc.ca/people/dongwook-yoon), [website](http://dwyoon.com/), [email](yoon@cs.ubc.ca).
