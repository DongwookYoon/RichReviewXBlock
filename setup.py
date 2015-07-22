"""Setup for richreview XBlock."""

import os
from setuptools import setup
import subprocess
from setuptools.command.install import install

def make_mupla():
    subprocess.Popen('make -C ./mupla clean', shell=True).wait()
    subprocess.Popen('make -C ./mupla', shell=True).wait()
    subprocess.Popen('cp ./mupla/mupla/mupla.so ./richreview/mupla_ctype', shell=True).wait()

def package_data(pkg, roots):
    """Generic function to find package_data.

    All of the files under each of the `roots` will be declared as package
    data for package `pkg`.

    """
    data = []
    for root in roots:
        for dirname, _, files in os.walk(os.path.join(pkg, root)):
            for fname in files:
                data.append(os.path.relpath(os.path.join(dirname, fname), pkg))

    return {pkg: data}

make_mupla()

setup(
    name='richreview-xblock',
    version='0.1.0.1',
    description='richreview XBlock',   # TODO: write a better description.
    packages=[
        'richreview',
    ],
    install_requires=[
        'PYPDF2', 'pys3website', 'XBlock'
    ],
    entry_points={
        'xblock.v1': [
            'richreview = richreview:RichReviewXBlock',
        ]
    },
    package_data=package_data("richreview", ["static", "public", "webapps", "templates", "mupla_ctype"]),
)
