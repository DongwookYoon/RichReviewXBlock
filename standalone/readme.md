# RichReview Full Stack
This stand alone folder is a full stack implementation of a node js back-end to server the RichReview annotation system. For a demonstration please visit http://richreview.net.

Note that this stack is NOT running on edX-platform, although it is distributed in the [RichReviewXBlock](https://github.com/DongwookYoon/RichReviewXBlock) package. This server consists of the following components:
* /node_server - This Node.js server is the major back-end that host the RichReview service
* /django_server - This Django server will run in your server locally, and serve a part of PDF processing.
* /richreview/webapps - This is a front-end JavaScript application that the Node.js server will load and serve statically. FYI, this codeset is shared between this standalone fullstack and the XBlock.

## Installing
### MuPla (Page Layout Analysis) engine
The Django server interfaces with our MuPla engine through [ctypes](https://docs.python.org/2/library/ctypes.html) interface. To this end, you will want to compile the library to get a shared library (/mupla/mupla/mupla.so). For this, go to /mupla and run 'make'. It might take a few minutes. If you have the .so file, then you are done for this step!
### SSL
No matter you'd want to run the full stack on a cloud server or a local machine, it will require SSL certificates and keys in the **/node_server/ssl/** directory.
richreview_net.crt, richreview_net.key, root.crt

### Redis
[redis](http://redis.io)
### Azure Storage
### CORS settings
The Azure Storage basically doesn't allow access from external domains other then registered. So you will want to enlist your own domain or https://localhost:8000 to the CORS exceptions.
Cynapta offers a very conveient [helper tool](http://blog.cynapta.com/2013/12/cynapta-azure-cors-helper-free-tool-to-manage-cors-rules-for-windows-azure-blob-storage/).

## How to run

##### Azure Storage
##### Node.js

## License
The code in this repository is licensed under the AGPL license unless otherwise noted.

## Reporting Issues
Please email dy252@cornell.edu.