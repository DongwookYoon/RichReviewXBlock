#Builds the redis-rr image using Dockerfile, based on redis image. Note that redis.conf is copied to the image.
#Current dir is specified as bind mount location
#Then runs the created redis-rr image. Note port mapping and bind mount for the current dir.
imageName="redis-rr"

# Absolute path to this script
SCRIPT=$(readlink -f "$0")
# Absolute path this script is in
SCRIPTPATH=$(dirname "$SCRIPT")

docker rm -f ${imageName}
docker build -t ${imageName}:1.0 ${SCRIPTPATH}
docker run -d --name ${imageName} -p 6379:6379 -v ${SCRIPTPATH}:/data ${imageName}:1.0