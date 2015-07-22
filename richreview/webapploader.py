""" this module loads webapp on the static file system, and serves to the XBlock """

import os
from util import osfs_mkdir



def upload(fs, app_path_abs, uploadpath, filepath):
    with open(os.path.join(app_path_abs, filepath), "rb") as src:
        print 'upload', filepath
        dst_path = os.path.join(uploadpath, filepath)
        osfs_mkdir(fs, dst_path)
        with fs.open(dst_path, "wb") as dst:
            dst.write(src.read())
            dst.close()
        src.close()

def load_webapp(fs, app_path, uploadpath, ignore):
    app_path_abs = os.path.dirname(os.path.realpath(__file__))+app_path
    for l in os.listdir(app_path_abs):
        p = os.path.join(app_path_abs, l)
        if not l in ignore and l[0] != ".":
            if os.path.isfile(p):
                upload(fs, app_path_abs, uploadpath, l)
            elif os.path.isdir(p):
                for dirname, dirnames, filenames in os.walk(p):
                    for filename in filenames:
                        if filename[0] != ".":
                            upload(fs, app_path_abs, uploadpath, os.path.join(dirname, filename)[len(app_path_abs)+1:])
    return fs.get_url(uploadpath, 3600)