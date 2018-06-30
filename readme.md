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

### Install and Configure Redis in the VM (for testing purposes)

Ubuntu 19.04 LTS provides the latest Redis server as part of the official Ubuntu [package respository](https://packages.ubuntu.com/bionic/database/redis). This will give you a redis server with version >=4.0.9. 

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

```bash
cd ~/RichReviewXBlock/mupla_core/mupla
make
```

# RichReviewXBlock
This XBlock is a edX course applet that served a collaborative multimodal annotation feature.
This package also includes NodeJS server that runs standalone.

## Installing

RichReviewXBlock is an [XBlock](http://xblock.readthedocs.org/en/latest/) implementation of RichReview annotation system that can run on the [edx-platform](https://github.com/edx/edx-platform) of open-edX. To setup a testing environment, please taks a look at the [devstack description](https://github.com/edx/configuration/wiki/edX-Developer-Stack).

### File Storage
RichReview serves annotation data via [django-pyfs](https://github.com/pmitros/django-pyfs) file system abstraction. There are two options for the file storage database: your server's local storage or [Amazon S3 storage](http://aws.amazon.com/s3/). For this, you will want to set DJFS environment variable. It's in /edx/app/edxapp/{cms,lms}.auth.json files.

##### Using Local file storage
Set DJFS of cms.auth.json like this (as it is including {platform_revision}):

    "DJFS": {
        "directory_root": "common/static/djpyfs",
        "type": "osfs",
        "url_root": "/static/{platform_revision}/djpyfs"
    },
    
Set DJFS of lms.auth.json like this (not that there's no {platform_revision}):

    "DJFS": {
        "directory_root": "common/static/djpyfs",
        "type": "osfs",
        "url_root": "/static/djpyfs"
    },

This setting places the local directory under the common, so that LMS can have access to the PDF files uploaded from CMS.

##### Using Amazon S3 storage
Set DJFS like this:

    "DJFS": {
            "type": "s3fs",
            "bucket": "richreview.edx",
            "prefix": "rrfs",
            "aws_access_key_id": "<your Amazon access key id>",
            "aws_secret_access_key": "<your Amazon secret access key>"
    }

and go to your Amazon S3 console, create a bucket named **richreview.edx**. RichReviewXBlock will store all of its data in this bucket. To make this folder accessable to your edX server across the different domains, you have to set CORS setting. Right click on the **richreview.edx** bucket, select *Properties*, select *Permission* on the right panel,  select *CORS Configuration tab*, and set it as below:

    <?xml version="1.0" encoding="UTF-8"?>
    <CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
        <CORSRule>
            <AllowedOrigin>http://localhost:8001</AllowedOrigin>
            <AllowedOrigin>http://*.edx.org</AllowedOrigin>
            <AllowedMethod>GET</AllowedMethod>
            <MaxAgeSeconds>3000</MaxAgeSeconds>
            <AllowedHeader>Authorization</AllowedHeader>
        </CORSRule>
    </CORSConfiguration>
    
Great then you are all set with the Amazon S3 storage.


### XBlock
Then install this XBlock (note that this operation can take up several minutes). You can either do:

    pip install git+git://github.com/DongwookYoon/RichReviewXBlock.git
or

    pip install git clone https://github.com/DongwookYoon/RichReviewXBlock.git
    pip install RichReviewXBlock/

### Studio Course Setting

In the studio, go to a course's setting, and add **richreview** to the Advanced Module List.

Now you are all ready to add RichReview module to your course!


## License

The code in this repository is licensed under the AGPL license unless otherwise noted.

## Reporting Issues

Please email dy252@cornell.edu.
