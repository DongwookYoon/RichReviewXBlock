import os
import json
import redis

def create_user (r, index):
	key = 'usr:test_user_' + str(index)
	r.hset(key, 'auth_type', 'test')
	r.hset(key, 'course_groups', '[]')
	r.hset(key, 'creation_date', '1565133384909')
	r.hset(key, 'display_name', 'test_user ' + str(index))
	r.hset(key, 'email', 'test_user' + str(index) + '@test.com')
	r.hset(key, 'enrolments', '["crs:2"]')
	r.hset(key, 'first_name', 'test user')
	r.hset(key, 'groupNs', '[]')
	r.hset(key, 'id', 'test_user_' + str(index))
	r.hset(key, 'inactive_submitters', '[]')
	r.hset(key, 'last_name', str(index))
	r.hset(key, 'nick_name', 'test_user ' + str(index))
	r.hset(key, 'preferred_name', '')
	r.hset(key, 'submitters', '[]')
	r.hset(key, 'taing', '[]')
	r.hset(key, 'teaching', '[]')
	return key
	
def add_user_to_course (r, user_key):
	byte_course_data = r.hgetall('crs:2')
	course_data = {}
	for key, value in byte_course_data.items(): 
		course_data[key.decode('utf-8')] = value.decode('utf-8')

	students = json.loads(course_data['active_students'])
	if user_key not in students:
		students.append(user_key)
		r.hset('crs:2', 'active_students', json.dumps(students))
	
def main():
	redis_config = None
	with open(os.path.join(os.getcwd(), 'ssl', 'redis_config_local.json')) as json_file:
		redis_config = json.load(json_file)
		
	r = redis.Redis()
	
	for i in range(1, 100):
		key = create_user(r, i)
		add_user_to_course(r, key)

if __name__ == "__main__":
	main()