#!/bin/bash

echo "//// STOP DJANGO SERVER"

sudo fuser -k -HUP -n tcp 5000
sudo killall -TERM screen