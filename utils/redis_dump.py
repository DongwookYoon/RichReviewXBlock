import redis
import json
import os
import pickle

	
def main():
	r = redis.StrictRedis(
		host='',
		port=,
		password='',
		ssl=True)
#	r = redis.StrictRedis(
#			host='127.0.0.1',
#			port=6379)
			
	print("Connected to redis!")
	
	out = {}
	key_count = 0
#	for key in r.scan_iter(None):
	keys = r.keys('*')
	for key in keys:
		key_type = r.type(key).decode('ascii')
		
		data = 0
		
		if key_type == 'hash':
			data = r.hgetall(key)
			data = { y.decode('utf-8'): data.get(y).decode('utf-8') for y in data.keys() }	
		elif key_type == 'list':
			data = r.lrange(key, 0, -1)
			data = [ y.decode('utf-8') for y in data ]
		elif key_type == 'set':
			data = r.smembers(key)
			data = { y.decode('utf-8') for y in data }
		else:
			data = r.get(key)
			try:
				data_decoded = data.decode('utf-8')
				data = data_decoded
			except Exception:
				pass
			
		out.update({key.decode('ascii'): data})
		
		key_count += 1
		if key_count % 10 == 0:
			print("Scanned {} keys".format(key_count))

	print("Scanned {} keys".format(key_count))
	if len(out) > 0:
		try:
			with open('dump.rdb', 'wb') as outfile:
				pickle.dump(out, outfile)
				print('Dump Successful')
		except Exception as e:
			print(e)
	else:
		print("Keys not found")


if __name__ == '__main__':    
	main()