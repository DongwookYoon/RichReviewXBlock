#!/bin/bash

# Sets up portable redis binaries

fileDNExists () {
    [[ ! -f $1 ]]
}

if fileDNExists redis-*.tar.gz; then
    echo "no redis-*.tar.gz files exist so downloading latest one"
    wget http://download.redis.io/releases/redis-stable.tar.gz
    tar xzf redis-stable.tar.gz
    cd redis-stable
    make
    # TODO: if tar file exist then use most recent one
fi
