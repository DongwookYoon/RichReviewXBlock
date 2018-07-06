# RichReview

This is a Node/Express app for [RichReview](https://github.com/DongwookYoon/RichReviewWebApp). It contains these modules:

- [**Node backend**](https://nodejs.org/en/)
- **MuPla** Django server that runs a MuPDF pdf editing [utilites]((https://mupdf.com/docs/index.html))
- [**RichReview Web App**](https://www.youtube.com/watch?v=twSTqxghHNQ)
- **PDF Multicolumn Analyzer Web App** which runs [PDF.js](https://mozilla.github.io/pdf.js/)

Additionally it makes use of Redis to store user metadata, and Azure Storage to store document, multimedia and CDN files, etc. You can either use your own Redis server or use a Redis Cache provided by Azure.

## VM Manual Installation

### Configure the VM

We are using Ubuntu 18.04 LTS

```bash
sudo apt update
sudo apt upgrade
sudo apt autoremove

# these are some utilities you need later on
sudo apt install build-essential unzip python-pip
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

### Install and Configure RichReview

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

You should be given a zip file containing all the ssl files. This contains all the . You may want to change the variables in the ssl files such as `node_config.json`, `redis_config.json` and `azure_config.json` every time you are setting up a new server environment.

```bash
scp <user>@<location of ssl files>:ssl.zip ~/RichReviewXBlock/richreview_core/node_server
unzip ssl.zip
rm ssl.zip
```

### Configure MuPla for PDFs

You need `build-essential` to compile mupla source code. Just call make to do so.

```bash
cd ~/RichReviewXBlock/mupla_core/mupla
make
```

### Configure Django Server

Install the packages for python using python package manager pip. You installed pip from `pip-python`.

```bash
python --version
#
pip freeze
# should show the python packages installed on the VM already 
pip install Django==1.8
pip install PyPDF2==1.24
cd ~/RichReviewXBlock/mupla_core/django_server
sudo python manage.py runserver 5000
```

### Test RichReview

You're finally done! You can test RichReview straight from the VM (https://40.85.241.164:443). In the future there will be a weblink.

## License

The code in this repository is licensed under the AGPL license unless otherwise noted.

## Author

RichReview was made by [Dongwook Yoon](https://www.cs.ubc.ca/people/dongwook-yoon), [website](http://dwyoon.com/), [email](yoon@cs.ubc.ca).
