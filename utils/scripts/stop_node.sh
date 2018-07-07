#!/bin/bash

echo "//// STOP NODE SERVER"

~/.npm-global/bin/forever stopall
sudo fuser -k -HUP -n tcp 80
sudo fuser -k -HUP -n tcp 443
sudo killall -TERM nodejs
sudo killall -TERM node