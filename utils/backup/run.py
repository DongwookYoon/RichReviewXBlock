# Requires Azure Blob storage python SDK
# - https://github.com/Azure/azure-storage-python

import sys
import json
import os.path
import traceback
from azure.storage.blob import BlockBlobService

class CONST():
    AZURE_KEY_PATH = '../../standalone/node_server/ssl/azure_keys.json'
    DOWN_FOLDER = 'down'

def loadAzureKeys():
    with open(CONST.AZURE_KEY_PATH) as f:
        azure_keys =  json.load(f)
        return azure_keys
    raise Exception('Azure key file does not exist')

def createDirs(path):
    head, tail = os.path.split(path)
    if not os.path.exists(head):
        os.makedirs(head)

def backupDown():
    azure_key = loadAzureKeys()

    service = BlockBlobService(
        account_name='richreview',
        account_key=azure_key['blob_storage_key']
    )

    clist = service.list_containers()
    n_clist = sum(1 for x in clist)
    n_c = 0
    for c in clist:
        n_c += 1
        print 'Container', str(n_c)+'/'+str(n_clist), ':', c.name
        blist = service.list_blobs(c.name)
        n_blist = sum(1 for x in blist)
        n_b = 0
        for b in blist:
            n_b += 1
            print '    Blob', str(n_b)+'/'+str(n_blist), ':', b.name
            path = CONST.DOWN_FOLDER+ '/'+c.name+'/'+b.name
            createDirs(path)
            service.get_blob_to_path(c.name, b.name, path)

def backupUp():
    raise Exception('backup upload feature is yet to be implemented')

if __name__ == '__main__':
    try:
        if len(sys.argv) == 2 and sys.argv[1] == 'up':
            backupUp()
        else:
            backupDown()

    except Exception as e:
        if len(e.args) != 0:
            print e
            traceback.print_exc()
        else:
            print e
            traceback.print_exc()