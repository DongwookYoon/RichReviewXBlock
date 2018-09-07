

## About the scripts

Script to start Node server `stop_node.sh`

```bash
#!/bin/bash

~/restart_django.sh
~/restart_node.sh
```

Script to stop Node server `stop_node.sh`

```bash
#!/bin/bash

echo "//// STOP NODE SERVER"

~/.npm-global/bin/forever stopall
sudo fuser -k -HUP -n tcp 80
sudo fuser -k -HUP -n tcp 443
sudo killall -TERM nodejs
sudo killall -TERM node
```

Script to stop Django server `stop_django.sh`

```bash
#!/bin/bash

echo "//// STOP DJANGO SERVER"

sudo fuser -k -HUP -n tcp 5000
sudo killall -TERM screen
```

Script to stop all `stop_all.sh`

```bash
#!/bin/bash

~/stop_node.sh
~/stop_django.sh
```

Script to update `update_richreview.sh`

```bash
#!/bin/bash

~/stop_all.sh

echo "//// UPDATING RICHREVIEW"

cd ~/RichReviewXBlock
git pull
cd ~
```

Script to start Node server `restart_node.sh`. Here we are using [forever]((https://www.npmjs.com/package/forever)) to load the node scripts.

```bash
#!/bin/bash

~/stop_node.sh

echo "//// STARING NODE SERVER"

sudo ~/.npm-global/bin/forever start --append -l ~/log_node.txt -e ~/log_node_err.txt --minUptime 1000 --spinSleepTime 30000 ~/RichReviewXBlock/richreview_core/node_server/www/www.js
```

Script to start Django server `restart_django.sh`

```bash
#!/bin/bash

~/stop_django.sh

echo "//// STARING DJANGO SERVER"

screen -dmS mupla -L -Logfile ~/log_django.txt bash -c "cd ~/RichReviewXBlock/mupla_core/django_server; sudo python manage.py runserver 5000; cd ~"

sleep 1
screen -S mupla -X colon "logfile flush 0^M"

```

Script to start RichReview `rrrun.sh`

```bash
#!/bin/bash

~/restart_django.sh
~/restart_node.sh
```

## Brief tutorial

`screen` is nice to use for testing if you have multiple commandline processes you want to run at one.

```bash
touch log_test.txt
chmod 755 log_test.txt

screen -dmS ./test.sh

# run screen with session name testInstance, to call test.sh, and log output to log_test.txt
screen -dmS testInstance -L -Logfile ~/log_test.txt bash -c ./test.sh

# run infinite loop
while true; do echo "HELLO"; sleep 1; done

# run screen with session name testInstance, to call infinite loop, and log output to log_test.txt
screen -dmS testInstance -L -Logfile ~/log_test.txt bash -c "while true; do echo "HELLO"; sleep 1; done"

# list all screen sessions
screen -ls

# flush output of session testInstance to log file
screen -S testInstance -X colon "logfile flush 0^M"

## kill screen session testInstance
screen -X -S testInstance quit
```

`killall` is a good way to stop processes.

```bash
`sudo killall <OPTIONS> screen
```

Options:

**`-1`** or **`-HUP`** makes kill send the "Hang Up" signal to processes. Most daemons are programmed to re-read their configuration when they receive such a signal. It is the safest kill signal there is.

**`-2`** or **`-SIGINT`** is the same as starting some program and pressing CTRL+C during execution.

**`-9`** or **`-KILL`** makes kernel let go of the process without informing the process of it. This is the "hardest" and most unsafe kill signal available, and should only be used to stop something that seems unstoppable.

**`-15`** or **`-TERM`** tell sthe process to stop whatever it's doing, and end itself. When you don't specify any signal, this signal is used. It should be fairly safe to perform, but better start with a "-1" or "-HUP".

From (http://meinit.nl/the-3-most-important-kill-signals-on-the-linux-unix-command-line)
