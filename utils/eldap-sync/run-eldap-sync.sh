read -p "Username: " user
read -p "Password: " password
nohup python ~/RichReviewXBlock/utils/eldap-sync/eldap-sync.py user password &
