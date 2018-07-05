# RichReview

## VM Manual Installation

### Configure the VM

We are using Ubuntu 19.04 LTS

```bash
sudo apt update
sudo apt upgrade
sudo apt autoremove
# here are some utilities you may need later on
sudo apt install build-essential unzip
```

### Install Node

Install the node version manager `n` and then install the latest stable version of node. This will also give you the node package manager `npm`.

```
git clone https://github.com/tj/n
cd n
sudo make install
sudo n stable
```

For more details see this [stack overflow guide](https://stackoverflow.com/questions/19451851/install-node-js-to-install-n-to-install-node-js).

### Install and Configure Redis in the VM

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

In your previous VM/Server go into the Redis CLI and call `SAVE` to save the data into `dump.rdb` and call `CONFIG GET DIR` to find out the save location. Usually `dump.rdb` should be in `/var/lib/redis`. Then in your new VM/Server do

```bash
sudo sudo service redis-server stop
cd /var/lib
# if you can't access the redis folder do
sudo chmod 777 redis
scp <user>@<ip of old VM>:<path to>/dump.rdb /var/lib/redis
sudo chown redis: /var/lib/redis/dump.rdb
sudo chmod 755 redis
sudo service redis-server start
```

To use Redis with NodeJS we are using the `redis` [package](https://github.com/NodeRedis/node_redis). This allows us to call the redis [commands](https://redis.io/commands) inside Node scripts. We can even promisify redis commands by passing `util.promisify` on them. See `data/redis_import.js` for more details.

### Configure the Azure Redis Cache

### Install and Configure RichReview

```bash
cd <path to home>
git clone https://github.com/DongwookYoon/RichReviewXBlock.git
cd RichReviewXBlock/richreview_core/node_server
npm install
# not sure if needed
cd ~/RichReviewXBlock/richreview_core/node_server/passport-azure-ad
npm install
webpack
```

You should be given a zip file containing all the ssl files

```bash
scp <user>@<location of ssl files>:ssl.zip ~/RichReviewXBlock/richreview_core/node_server
unzip ssl.zip
rm ssl.zip
```

Configure MuPla for PDFs

```bash
cd ~/RichReviewXBlock/mupla_core/mupla
make
```

### Test RichReview

You can test RichReview straight from the VM https://40.85.241.164:443

Primary blob service endpoint is https://richreview2ca.blob.core.windows.net

Endpoint is https://richreview2ca.azureedge.net

## License

The code in this repository is licensed under the AGPL license unless otherwise noted.

## Reporting Issues

Please email dy252@cornell.edu.
