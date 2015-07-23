# RichReviewXBlock
This XBlock is a edX course applet that served a collaborative multimodal annotation feature.
This package also includes NodeJS server that runs standalone.

## Installing

RichReviewXBlock is an [XBlock](http://xblock.readthedocs.org/en/latest/) implementation of RichReview annotation system that can run on the [edx-platform](https://github.com/edx/edx-platform) of open-edX. To setup a testing environment, please taks a look at the [devstack description](https://github.com/edx/configuration/wiki/edX-Developer-Stack).

### File Storage
RichReview serves annotation data via [django-pyfs](https://github.com/pmitros/django-pyfs) file system abstraction. There are two options for the file storage database: your server's local storage or [Amazon S3 storage](http://aws.amazon.com/s3/). For this, you will want to set DJFS environment variable. It's in /edx/app/edxapp/{cms,lms}.auth.json files.

##### Using Local file storage
Set DJFS like this:

    "DJFS": {
        "directory_root": "common/static/djpyfs",
        "type": "osfs",
        "url_root": "/static/{platform_revision}/djpyfs"
    },

Note that this setting places the local directory under the common, so that LMS can have access to the PDF files that CMS registered.

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

    pip install sudo -u edxapp git clone https://github.com/DongwookYoon/RichReviewXBlock.git
    pip install sudo -u edxapp RichReviewXBlock/

### Studio Course Setting

In the studio, go to a course's setting, and add **richreview** to the Advanced Module List.

Now you are all ready to add RichReview module to your course!


## License

The code in this repository is licensed under the AGPL license unless otherwise noted.

## Reporting Issues

Please email dy252@cornell.edu.