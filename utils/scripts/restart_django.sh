#!/bin/bash

~/stop_django.sh

echo "//// STARING DJANGO SERVER"

screen -dmS mupla -L -Logfile ~/log_django.txt bash -c "cd ~/RichReviewXBlock/mupla_core/django_server; sudo python manage.py runserver 5000; cd ~"

sleep 1
screen -S mupla -X colon "logfile flush 0^M"