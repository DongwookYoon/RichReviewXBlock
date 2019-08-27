import os
import json
import redis

def get_data (r, key):
	byte_data = r.hgetall(key)
	data = {}
	for field, value in byte_data.items(): 
		try:
			data[field.decode('utf-8')] = json.loads(value.decode('utf-8'))
		except:
			data[field.decode('utf-8')] = value.decode('utf-8')
	return data
	
	
def synchronize_users_and_submissions (r):
	course_keys = r.keys('crs:*')
	for course_key in course_keys:
		course_key = course_key.decode('utf-8')
		course_data = get_data(r, course_key)
		for user_key in course_data['active_students']:
			print(user_key)
		
	
	
def main():
	redis_config = None
	with open(os.path.join(os.getcwd(), 'ssl', 'redis_config.json')) as json_file:
		redis_config = json.load(json_file)
		
	r = redis.Redis()
#	r = redis.StrictRedis(
#		host=redis_config['redis_cache']['hostname'],
#		port=redis_config['redis_cache']['port'],
#		password=redis_config['redis_cache']['access_key'],
#		ssl=True)
		
	synchronize_users_and_submissions(r)
		

if __name__ == "__main__":
	main()