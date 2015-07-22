# RichReview Framework

This is the Node.js version of the RichReview framework. It contains the three major modules:

* **Node.js backend** for data services (see /)
* **RichReview Web App** frontend (see https://github.com/DongwookYoon/RichReviewWebApp)
* **PDF Multicolumn Analyzer Web App** frontend (see /apps/MultiColumn)

RichReview Web App will be managed as a separate git repo, because there might be multiple frameworks sharing the same web app codebase. For this Node.js framework, please fork the web app into 'apps/RichReviewWebApp'. I intentionally didn't use the git submodule for the sake of simplicity. 

## Running

Before running the system you will need the following files under the **/ssl**:

* **root.crt** - the intermediate certificate for the root CA
* **richreview_net.crt** - private server certificate
* **richreview_net.key** - private server key
* **google_open_id.json** - Google OpenID Connect credential
* **azure_keys.json** - Azure Blob Storage access keys


Why do you need these? Firstly, the **.crt** and **.key** files are for the standard SSL authentication. Secondly, we authenticates RichReview users with Google OpenID Connect authentication, and **google_open_id.json** is for this OAuth credential. You can simply generate your own at [Google Developers Console](https://console.developers.google.com/project). Remember that the login redirection is to *'/login-oauth2-return'*. Finally, **azure_keys.json** has JSON dictionary for Azure datastorage accesskeys. 'blob_storage_key' key has an access key for the Azure Blob Storage (see [how to get the key](http://justazure.com/azure-blob-storage-part-two-getting-started/)), and 'sql_key_tedious' key has a 'tedious' login information for the Azure SQL datastorage (see an [example](https://github.com/pekim/tedious/wiki/Connect-to-sql-in-azure)).

To run, first change your directory to **RichReviewWeb/bin** and run **www**!
> user$ **node www**

## License
The code in this repository is licensed under the AGPL license unless otherwise noted.

## Reporting Issues

Please email dy252@cornell.edu.