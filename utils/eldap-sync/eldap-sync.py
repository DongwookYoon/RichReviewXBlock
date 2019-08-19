import redis
import ldap
import json
import os
import time
import datetime
from apscheduler.schedulers.background import BackgroundScheduler

def create_course(r, course):
	course_key = course['key']
	print('\t-> Creating course {}'.format(course_key))
	
	course_details = get_course_details(course)
	
	r.hset(course_key, 'dept', '');
	r.hset(course_key, 'section', '');
	r.hset(course_key, 'number', '');
	r.hset(course_key, 'year', '');
	r.hset(course_key, 'institution', '');
	r.hset(course_key, 'description', '');
	r.hset(course_key, 'instructors', '[]');
	r.hset(course_key, 'tas', '[]');
	r.hset(course_key, 'active_students', '[]');
	r.hset(course_key, 'blocked_students', '[]');
	r.hset(course_key, 'assignments', '[]');
	r.hset(course_key, 'deleted_assignments', '[]');
	r.hset(course_key, 'active_course_groups', '[]');
	r.hset(course_key, 'inactive_course_groups', '[]');
	r.hset(course_key, 'is_active', 'true');

	for field, value in course_details.items():
	    r.hset(course_key, field, value);
	
	
	
def course_exists(r, course_key):
	return not r.hgetall(course_key) == {}


def get_course_details(course):
	course_string = course['course_string'].replace('_instructor', '');
	details = course_string.split('_');

	return {
		'id': course_string,
		'title': '{} {} {}'.format(details[0], details[1], details[2]),
		'dept': details[0],
		'number': details[1],
		'section': details[2],
		'year': details[3],
		'institution': 'UBC'
	}	
	
	

def create_user(r, user_key, key_dict):
	print('\t-> Creating user {}'.format(user_key))
	
	user_data = {
		'id': user_key.replace(key_dict['user'], ''),
		'creation_date': int(round(time.time() * 1000)),
		'auth_type': 'UBC_CWL'
	}
	
	r.hset(user_key, 'first_name', '');
	r.hset(user_key, 'last_name', '');
	r.hset(user_key, 'nick_name', '');
	r.hset(user_key, 'preferred_name', '');
	r.hset(user_key, 'display_name', '');
	r.hset(user_key, 'email', '');
	r.hset(user_key, 'teaching', '[]');
	r.hset(user_key, 'taing', '[]');
	r.hset(user_key, 'enrolments', '[]');
	r.hset(user_key, 'submitters', '[]');
	r.hset(user_key, 'groupNs', '[]');
	r.hset(user_key, 'course_groups', '[]');

	for field, value in user_data.items():
	    r.hset(user_key, field, value);
	
	
def update_user_information (r, user_key, key_dict):
	print('\t-> Updating user {}'.format(user_key))
	r.hset(user_key, 'auth_type', 'UBC_CWL');

	
			
def user_exists(r, user_key):
	return not r.hgetall(user_key) == {}


def add_student_to_course(r, user_key, course_key):
	print('\t-> Adding user {} to course {}'.format(user_key, course_key))
	course_data = r.hgetall(course_key)
	course_data = { y.decode('ascii'): course_data.get(y).decode('ascii') for y in course_data.keys() }
	active_students = json.loads(course_data['active_students'])
	
	blocked_students = json.loads(course_data['blocked_students'])
	if user_key in blocked_students:
		blocked_students.remove(user_key)
		r.hset(course_key, 'blocked_students', json.dumps(blocked_students))

	if not user_key in active_students:
		active_students.append(user_key)
		r.hset(course_key, 'active_students', json.dumps(active_students))
	

def add_instructor_to_course(r, user_key, course_key):
	print('\t-> Adding instructor {} to course {}'.format(user_key, course_key))
	course_data = r.hgetall(course_key)
	course_data = { y.decode('ascii'): course_data.get(y).decode('ascii') for y in course_data.keys() }
	instructors = json.loads(course_data['instructors'])
	
	if not user_key in instructors:
		instructors.append(user_key)
		r.hset(course_key, 'instructors', json.dumps(instructors))


def add_course_to_student(r, user_key, course_key):
	print('\t-> Adding course {} to user {}'.format(course_key, user_key))
	user_data = r.hgetall(user_key)
	user_data = { y.decode('ascii'): user_data.get(y).decode('ascii') for y in user_data.keys() }
	enrolments = json.loads(user_data['enrolments'])
	
	if not course_key in enrolments:
		enrolments.append(course_key)
		r.hset(user_key, 'enrolments', json.dumps(enrolments))
	
	
def add_course_to_instructor(r, user_key, course_key):
	print('\t-> Adding course {} to instructor {}'.format(course_key, user_key))
	user_data = r.hgetall(user_key)
	user_data = { y.decode('ascii'): user_data.get(y).decode('ascii') for y in user_data.keys() }
	teaching = json.loads(user_data['teaching'])
	
	if not course_key in teaching:
		teaching.append(course_key)
		r.hset(user_key, 'teaching', json.dumps(teaching))
	
	
	
def get_all_course_students(r, course_key):
	course_data = r.hgetall(course_key)
	course_data = { y.decode('ascii'): course_data.get(y).decode('ascii') for y in course_data.keys() }
	return json.loads(course_data['active_students'])

def get_all_course_instructors(r, course_key):
	course_data = r.hgetall(course_key)
	course_data = { y.decode('ascii'): course_data.get(y).decode('ascii') for y in course_data.keys() }
	return json.loads(course_data['instructors'])



def remove_unenrolled_student(r, user_key, course_key):
	print('\t-> Removing {} as a student from {}'.format(user_key, course_key))
	course_data = r.hgetall(course_key)
	course_data = { y.decode('ascii'): course_data.get(y).decode('ascii') for y in course_data.keys() }
	active_students = json.loads(course_data['active_students'])
	blocked_students = json.loads(course_data['blocked_students'])
	
	if user_key in active_students:
		active_students.remove(user_key)
		r.hset(course_key, 'active_students', json.dumps(active_students))

	if not user_key in blocked_students:
		blocked_students.append(user_key)
		r.hset(course_key, 'blocked_students', json.dumps(blocked_students))

	user_data = r.hgetall(user_key)
	user_data = { y.decode('ascii'): user_data.get(y).decode('ascii') for y in user_data.keys() }
	enrolments = json.loads(user_data['enrolments'])
	
	if course_key in enrolments:
		enrolments.remove(course_key)
		r.hset(user_key, 'enrolments', json.dumps(enrolments))
	
	
def remove_unenrolled_instructor(r, user_key, course_key):
	print('\t-> Removing {} as an instructor from {}'.format(user_key, course_key))
	course_data = r.hgetall(course_key)
	course_data = { y.decode('ascii'): course_data.get(y).decode('ascii') for y in course_data.keys() }
	instructors = json.loads(course_data['instructors'])
	
	if user_key in instructors:
		instructors.remove(user_key)
		r.hset(course_key, 'instructors', json.dumps(instructors))

	user_data = r.hgetall(user_key)
	user_data = { y.decode('ascii'): user_data.get(y).decode('ascii') for y in user_data.keys() }
	teaching = json.loads(user_data['teaching'])
	
	if course_key in teaching:
		teaching.remove(course_key)
		r.hset(user_key, 'teaching', json.dumps(teaching))
	
	
	
def syncronize_students(r, course, key_dict):
	currently_enrolled_students = get_all_course_students(r, course['key'])

	for user in course['members']:
		if not user_exists(r, user):
			create_user(r, user, key_dict)
		else:
			update_user_information(r, user, key_dict)
			
		if not user in currently_enrolled_students:
			add_student_to_course(r, user, course['key'])
			add_course_to_student(r, user, course['key'])
		
	for currently_enrolled_student in currently_enrolled_students:
		if not currently_enrolled_student in course['members']:
			remove_unenrolled_student(r, currently_enrolled_student, course['key'])
			
def synconize_instructors(r, course, key_dict):
	current_instructors = get_all_course_instructors(r, course['key'])

	for user in course['members']:
		if not user_exists(r, user):
			create_user(r, user, key_dict)
		else:
			update_user_information(r, user, key_dict)
			
		if not user in current_instructors:
			add_instructor_to_course(r, user, course['key'])
			add_course_to_instructor(r, user, course['key'])
		
	for current_instructor in current_instructors:
		if not current_instructor in course['members']:
			remove_unenrolled_instructor(r, current_instructor, course['key'])


def get_course_string(course_string): 
	comma_index = course_string.find(',')
	instructor_index = course_string.find('_instructor')
	if instructor_index > 0:
		return course_string[3:instructor_index]
		
	return course_string[3:comma_index]
	
	
def get_course_key(course_string, key_dict):		
	return key_dict['course'] + get_course_string(course_string)
	

def get_user_key(user_bytes, key_dict):
	user_string = user_bytes.decode('utf-8')
	comma_index = user_string.find(',')
	return key_dict['user'] + 'ubc_' + user_string[4:comma_index]


def is_instructor_course(course_string):
	return course_string.find('instructor') > 0


def get_all_courses(eldap_config, key_dict):
	ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
	l = ldap.initialize(eldap_config['url'])
	username = eldap_config['user']
	password = eldap_config['password']

	searchFilter = "(cn=*)"
	searchAttribute = []
	searchScope = ldap.SCOPE_SUBTREE
	
	try:
		l.protocol_version = ldap.VERSION3
		l.simple_bind_s(username, password)
		results = l.search_s(eldap_config['dn'], searchScope, searchFilter, searchAttribute) 
		courses = []

		for result in results:
			course = {}
			course['key'] = get_course_key(result[0], key_dict)
			if not course['key'] ==  key_dict['course'] + 'admins':
				course['course_string'] = get_course_string(result[0])
				course['members'] = []
				for member in result[1]['uniqueMember']:
					course['members'].append(get_user_key(member, key_dict))
				course['is_instructor_course'] = is_instructor_course(result[0])
				courses.append(course)
		l.unbind_s()
		return courses
	except Exception as error:
		print (error)
	

def sync_redis_with_ldap():
	print('==================================================================================================')
	print('Running syncronization with UBC LDAP at {}'.format(datetime.datetime.now()))
	key_dict = { 'course': 'crs:', 'user': 'usr:' }
	
	redis_config = None
	with open(os.path.join(os.getcwd(), 'ssl', 'redis_config.json')) as json_file:
		redis_config = json.load(json_file)
		
	eldap_config = None
	with open(os.path.join(os.getcwd(), 'ssl', 'eldap_config.json')) as json_file:
		eldap_config = json.load(json_file)
		
	r = redis.StrictRedis(
		host=redis_config['redis_cache']['hostname'],
		port=redis_config['redis_cache']['port'],
		password=redis_config['redis_cache']['access_key'],
		ssl=True)

	courses = get_all_courses(eldap_config, key_dict)

	for course in courses:
		if not course_exists(r, course['key']):
			create_course(r, course)
			
		if not course['is_instructor_course']:
			syncronize_students(r, course, key_dict)
		else:
			synconize_instructors(r, course, key_dict)
	
	print('Syncronization complete at {}'.format(datetime.datetime.now()))
	
	
def main():
	SYNC_INTERVAL = 600 #seconds
	 
	scheduler = BackgroundScheduler()
	scheduler.start()	
	
	sync_redis_with_ldap()

	scheduler.add_job(sync_redis_with_ldap, 'interval', seconds = SYNC_INTERVAL)

	while True:
		time.sleep(1)
		
if __name__ == "__main__":
	main()
	
	
	
	
	
	
	
	
