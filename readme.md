# RichReviewXBlock
This XBlock is a edX course applet that allows multimodal annotation over a shared document. This package also includes NodeJS server that runs standalone.

## Installing RichReviewXBlock

RichReview serves annotation data via file system abstraction. For this, you will want to set DJFS environment variable of /edx/app/edxapp/{cms,lms}.auth.json files like this.

If you want to use local storage, like this.

    DJFS = {
        'type': 'osfs',
        'directory_root': 'lms/static/djpyfs',
        'url_root': '/static/djpyfs'
    }
    
or if you want to use Amazon S3 storage instead, like this.

    "DJFS": {
            "type": "s3fs",
            "bucket": "richreview.edx",
            "prefix": "rrfs",
            "aws_access_key_id": "<your Amazon access key id>",
            "aws_secret_access_key": "<your Amazon secret access key>"
    }

Then install this XBlock:

    pip install git+git://github.com/DongwookYoon/RichReviewXBlock.git
    
or

    pip install sudo -u edxapp git clone https://github.com/DongwookYoon/RichReviewXBlock.git
    pip install sudo -u RichReviewXBlock/
    

In the studio, go to a course's setting, and add "richreview" to the Advanced Module List.

Now you are all ready to add RichReview module to your course.

## License

The code in this repository is licensed under the AGPL license unless otherwise noted.

## Reporting Issues

Please email dy252@cornell.edu.