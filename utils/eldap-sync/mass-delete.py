import os
import redis
import json

def main():

	
	redis_config = None
	
	with open(os.path.join(os.getcwd(), 'ssl', 'redis_config.json')) as json_file:
		redis_config = json.load(json_file)

	r = redis.StrictRedis(
		host=redis_config['redis_cache']['hostname'],
		port=redis_config['redis_cache']['port'],
		password=redis_config['redis_cache']['access_key'],
		ssl=True)
		
	keys = r.keys('asm:*')
	
	for key in keys:
		key = key.decode('utf-8')
		r.delete(key)
		

if __name__ == "__main__":
	main()