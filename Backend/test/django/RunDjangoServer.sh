
name="django-server-rr"
port="5000"

# Absolute path to this script
SCRIPT=$(readlink -f "$0")
# Absolute path this script is in
SCRIPTPATH=$(dirname "$SCRIPT")

docker rm -f ${name}
docker build -t ${name}:1.0 ${SCRIPTPATH}
docker run -d --name ${name} -p ${port}:${port} -v /tmp:/tmp ${name}:1.0


