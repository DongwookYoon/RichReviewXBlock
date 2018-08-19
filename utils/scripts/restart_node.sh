#!/bin/bash

~/stop_node.sh

echo "//// STARING NODE SERVER"

sudo ~/.npm-global/bin/forever start --append -l ~/log_node.txt -e ~/log_node_err.txt --minUptime 1000 --spinSleepTime 30000 ~/RichReviewXBlock/richreview_core/node_server/www/www.js