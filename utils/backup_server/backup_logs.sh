#!/bin/bash

if [ -z "$1" ]; then
    echo "no argument supplied to backup_logs.sh"
    echo "backup_logs.sh [user@ip] [timestamp optional]"
    exit 1
fi

CONN=$1

scp "${CONN}:log_node.txt" .
scp "${CONN}:log_node_err.txt" .
scp "${CONN}:log_django.txt" .

if [ -z "$2" ]; then
    exit 0
fi

mv log_node.txt     "log_node.${2}.txt"
mv log_node_err.txt "log_node_err.${2}.txt"
mv log_django.txt   "log_django.${2}.txt"

