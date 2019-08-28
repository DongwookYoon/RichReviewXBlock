import json
import redis
import os

def remove_user_from_course (r, user_key, course_key):
	byte_course_data = r.hgetall(course_key)
	course_data = {}
	for key, value in byte_course_data.items(): 
		course_data[key.decode('utf-8')] = value.decode('utf-8')
	active_students = json.loads(course_data['active_students'])
	active_students.remove(user_key)
	r.hset(course_key, 'active_students', json.dumps(active_students))
	
	
def delete_user(r, user_key):
	byte_user_data = r.hgetall(user_key)
	user_data = {}
	for key, value in byte_user_data.items():
		user_data[key.decode('utf-8')] = value.decode('utf-8')
	enrolments = json.loads(user_data['enrolments'])
	for enrolment in enrolments:
		remove_user_from_course(r, user_key, enrolment)
	r.delete(user_key)
	

def main():
	redis_config = None
	with open(os.path.join(os.getcwd(), 'ssl', 'redis_config_local.json')) as json_file:
		redis_config = json.load(json_file)
		
	r = redis.Redis()
	
	for i in range(20, 50):
		delete_user(r, 'usr:test_user_' + str(i))

if __name__ == "__main__":
	main()