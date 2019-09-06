import os
import json
import redis 

def remove_course(r, user_key, course):
	print(user_key)
	user_data = r.hgetall(user_key)
	user_data = { y.decode('ascii'): user_data.get(y).decode('ascii') for y in user_data.keys() }
	
	enrolments = json.loads(user_data['enrolments'])
	taing = json.loads(user_data['taing'])
	teaching = json.loads(user_data['teaching'])

	if course in enrolments:
		enrolments.remove(course)
		r.hset(user_key, 'enrolments', json.dumps(enrolments))
	if course in taing:
		taing.remove(course)
		r.hset(user_key, 'taing', json.dumps(taing))
	if course in teaching:
		teaching.remove(course)
		r.hset(user_key, 'teaching', json.dumps(teaching))

def main():

	redis_config = None
	
	with open(os.path.join(os.getcwd(), 'ssl', 'redis_config.json')) as json_file:
		redis_config = json.load(json_file)

	#change to strict redis to edit azure redis
	r = redis.StrictRedis(
		host=redis_config['redis_cache']['hostname'],
		port=redis_config['redis_cache']['port'],
		password=redis_config['redis_cache']['access_key'],
		ssl=True)
		
	keys = r.keys('usr:google_*')
	for i in range(len(keys)):
		keys[i] = keys[i].decode('utf-8')
		remove_course(r, keys[i], 'crs:cpsc_554y_201_2019w')
		remove_course(r, keys[i], 'crs:cpsc_554k_201_2019w')
		

if __name__ == "__main__":
	main()