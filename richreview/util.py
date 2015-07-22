__author__ = 'dongwookyoon'

import os

import pkg_resources
from django.template import Context, Template

def load_resource(resource_path):
    """
    Gets the content of a resource
    """
    resource_content = pkg_resources.resource_string(__name__, resource_path)
    return unicode(resource_content)

def render_template(template_path, context={}):
    """
    Evaluate a template by resource path, applying the provided context
    """
    template_str = load_resource(template_path)
    template = Template(template_str)
    return template.render(Context(context))

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