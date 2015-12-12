# RichReview Framework

This is the Node.js version of the RichReview framework. It contains the three major modules:

* **Node.js backend** for data services (see /)
* **RichReview Web App** frontend (see https://github.com/DongwookYoon/RichReviewWebApp)
* **PDF Multicolumn Analyzer Web App** frontend (see /apps/MultiColumn)

RichReview Web App will be managed as a separate git repo, because there might be multiple frameworks sharing the same web app codebase. For this Node.js framework, please fork the web app into 'apps/RichReviewWebApp'. I intentionally didn't use the git submodule for the sake of simplicity. 


# Installing
To reduce [command line bullshiteries](http://pgbovine.net/command-line-bullshittery.htm) we will run the node server on a virtual machine that will serve as a controlled environment.

## Virtual Machine Setup
Firstly, install Vagrant and VirtualBox (also recommend reading the first few chapters of this [Vagrant docs](http://docs.vagrantup.com/v2/getting-started/index.html)). Then create a box at any directory (say ~/r2ubuntu).

    cd ~/r2ubuntu
    vagrant init hashicorp/precise32
    vagrant plugin install vagrant-vbguest



You need to setup port forwarding, so that the server running in the guest machine can be accessible from the host machine. Set a few lines into ~/r2ubuntu/Vagrantfile (note there are indentations with two spaces). Also the last line will sync your host machine's directory with the guest so that you can edit the code from the host machine.

      config.vm.network :forwarded_port, guest: 8001, host: 8001, auto_correct: true
      config.vm.network :forwarded_port, guest: 8002, host: 8002, auto_correct: true
      config.vm.synced_folder "<your local path, say /usr/dwyoon/RichReviewXBlock>", "/RichReviewXBlock"

Now, run cd to ~/r2ubuntu and start up the guest machine:

    vagrant up

If all is well, you will see messages like this. If not, you will want to resolve the port conflict(s):

    ...
    default: 8001 => 8001 (adapter 1)
    default: 8002 => 8002 (adapter 1)

The virtual machine is now ready. Let's ssh into the guest machine:

    vagrant ssh

## Install Libraries in Guest Machine
git, Node.js, npm, and Django are required to run RichReview server Let's install'em:

    sudo apt-get update
    sudo apt-get install git
    sudo apt-get install python-django
    sudo apt-get install curl
    sudo apt-get install python-pip
    sudo pip install -U Django
    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.25.4/install.sh | bash
    exit
    vagrant ssh
    nvm install stable
    sudo apt-get install nodejs
    sudo pip install PyPDF2

## Fetch and Pull the Server Code
Fetch and pull the remote repository into the /RichReviewXBlock:

    cd /RichReviewXBlock
    git init
    git remote add origin https://github.com/DongwookYoon/RichReviewXBlock.git
    git fetch origin
    git checkout -b master --track origin/master

Compile mupla. This C module analyzes a PDF file's page layout:

    cd /RichReviewXBlock/mupla
    make

## Generate Certificate
Before running the system you will need the following files under **RichReviewXBlock/standalone/node_server/ssl/**:

* **root.crt** - the intermediate certificate for the root CA
* **richreview_net.crt** - private server certificate
* **richreview_net.key** - private server key
* **google_open_id.json** - Google OpenID Connect credential
* **azure_keys.json** - Azure Blob Storage access keys

Why do we need these? Firstly, the **.crt** and **.key** files are for the standard SSL authentication. Secondly, we authenticates RichReview users with Google OpenID Connect authentication, and **google_open_id.json** is for this OAuth credential. You can simply generate your own at [Google Developers Console](https://console.developers.google.com/project). Remember that the login redirection is to *'/login-oauth2-return'*. Finally, **azure_keys.json** has JSON dictionary for Azure datastorage accesskeys. 'blob_storage_key' key has an access key for the Azure Blob Storage (see [how to get the key](http://justazure.com/azure-blob-storage-part-two-getting-started/)), and 'sql_key_tedious' key has a 'tedious' login information for the Azure SQL datastorage (see an [example](https://github.com/pekim/tedious/wiki/Connect-to-sql-in-azure)).

# Run

This is the easiest part. Change your directory to **/RichReviewXBlock/standalone/node_server/www** and run **www**!

    node www

In the host machine, open a browser and check ‘**localhost:8001**’.

The Node.js server will do most jobs except a part of the upload features. If you want to upload your own PDF files, you need to run the Django server together:

    cd /RichReviewXBlock/standalone/django_server
    python manager.py runserver 5000

## License
The code in this repository is licensed under the AGPL license unless otherwise noted.

## Reporting Issues

Please email dy252@cornell.edu.