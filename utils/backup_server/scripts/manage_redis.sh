#!/bin/bash

if [ -z "$1" ]; then
    echo "no argument supplied to manage.sh"
    exit 1
fi

BACKUP_FILE="redis_backup/redis_backup.${1}.rdb"
cp dump.rdb $BACKUP_FILE
rm -f dump.rdb
echo "backup created"
exit 0
