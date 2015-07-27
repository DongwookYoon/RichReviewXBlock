""" this module loads webapp on the static file system, and serves to the XBlock """


import re
import os

def osfs_mkdir(fs, dst_path):
    sup = os.path.dirname(dst_path)
    if not fs.exists(sup):
        osfs_mkdir(fs, sup)
        fs.makedir(sup)

def osfs_create_and_open(fs, path, option):
    osfs_mkdir(fs, path)
    return fs.open(path, option)

def osfs_copy_file( fs, src, dst):
    with osfs_create_and_open(fs, dst, "wb") as f_dst:
        with fs.open(src, "rb") as f_src:
            f_dst.write(f_src.read())
            f_src.close()
        f_dst.close()

def osfs_save_formfile( fs, path, formfile):
    with osfs_create_and_open(fs, path, "wb") as f:
        for chunk in formfile.chunks():
            f.write(chunk)
        f.close()

def upload_file(fs, src_path_abs, dst_path_root, filepath):
    with open(os.path.join(src_path_abs, filepath), "rb") as src:
        print 'upload', filepath
        dst_path = os.path.join(dst_path_root, filepath)
        osfs_mkdir(fs, dst_path)
        with fs.open(dst_path, "wb") as dst:
            dst.write(src.read())
            dst.close()
        src.close()


def upload_webapp(fs, src_path, dst_path_root, exclude):
    exclude_pattern = re.compile(exclude)
    src_path_abs = os.path.dirname(os.path.realpath(__file__))+src_path

    for dir, dirs, files in os.walk(src_path_abs):
        for file in files:
            if(not exclude_pattern.match(file)):
                upload_file(fs, src_path_abs, dst_path_root, os.path.join(dir, file)[len(src_path_abs)+1:])

    return fs.get_url(dst_path_root, 3600)


def clear_webapp(fs, target_path):
    fs.removedir(target_path, recursive = True, force = True)