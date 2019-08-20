import os
import json
import redis 

def add_or_modify_field(r, table, field, value):
	keys = r.keys(table)
	for key in keys:
		key = key.decode('utf-8')
		if r.hget(key, field) == None:
			r.hset(key, field, value)
	
def delete_field(r, table, field):
	keys = r.keys(table)
	for key in keys:
		key = key.decode('utf-8')
		r.hdel(key, field)
		
		
	
def main():
	operation = 0
	while (operation not in ['1','2']):
		operation = input('What operation would you like to perform?\n[1] Add/Modify\n[2] Delete\nPlease enter the corresponding number: ')
			
	table = 0
	while (table not in ['1','2','3','4','5','6','7']):
		table = input('What table would you like to edit?\n[1] Users\n[2] Courses\n[3] Assignments\n[4] Submissions\n[5] Submitters\n[6] Course Group Sets\n[7] Course Groups\nPlease enter the corresponding number: ')
	table = ['usr:google*', 'crs:*', 'asm:*', 'sbm:*', 'smt:*', 'cgs:*', 'cgp:*'][int(table) - 1]
	
	field = input('What field would you like to add? (eg, email): ')
	
	if operation == '1':
		value = input('What should the default value be? (enter no value for an empty string) ')
			
	redis_config = None
	with open(os.path.join(os.getcwd(), 'ssl', 'redis_config.json')) as json_file:
		redis_config = json.load(json_file)

#	r = redis.Redis()		
	r = redis.StrictRedis(
		host=redis_config['redis_cache']['hostname'],
		port=redis_config['redis_cache']['port'],
		password=redis_config['redis_cache']['access_key'],
		ssl=True)
		
	if operation == '1':
		add_or_modify_field (r, table, field, value)
	else:
		delete_field(r, table, field)
		

if __name__ == "__main__":
	main()