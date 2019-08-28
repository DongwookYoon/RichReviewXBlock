#!/bin/bash

read -p "Username: " user
read -s -p "Password: " password_input
password=$(xxd -pu <<< "$password_input")
nohup python ~/RichReviewXBlock/utils/eldap-sync/eldap-sync.py $user $password &
