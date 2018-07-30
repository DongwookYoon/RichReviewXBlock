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
else
  for ff in redis-*.tar.gz; do
    tar xzf $ff
    cd $ff
    make
    break
  done
fi

mkdir -p azure_str_backup
mkdir -p redis_backup
mkdir -p log_backup
