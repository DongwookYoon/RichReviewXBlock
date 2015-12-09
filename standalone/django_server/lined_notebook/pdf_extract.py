__author__ = 'yoon'

import csv
import cv2
import numpy as np
import PyPDF2
import io
import os.path
from wand.image import Image
import struct
import shutil
import cPickle
from difflib import SequenceMatcher
import subprocess

# read the pdf page into bytes array

IMAGE_WIDTH = 1024
DPI_TO_PX_RATIO = 72

pages = []
valid_net_ids = []

class NetIdValidator():
    net_ids = []

    @staticmethod
    def init(filename):
        with open(filename+'.csv', 'rb') as csvfile:
            reader = csv.reader(csvfile, delimiter=',')
            for line in reader:
                NetIdValidator.net_ids.append(line[0])
        print 'NetIds:', NetIdValidator.net_ids

    @staticmethod
    def getSimilarNetIds(net_id):
        l = map(lambda x: SequenceMatcher(None, net_id, x).ratio(), NetIdValidator.net_ids)
        l = sorted(range(len(l)), key=lambda k: -l[k])[:3]

        if net_id == NetIdValidator.net_ids[l[0]]:
            return net_id
        else:
            print net_id, 'does not exist in the course roster.'
            for n, idx in enumerate(l):
                print n+1, ':', NetIdValidator.net_ids[idx]
            n = raw_input('Pick one option:')
            try:
                return NetIdValidator.net_ids[l[int(n)-1]]
            except Exception:
                return ''



def saveMetadata(pages, filename):
    l = []
    for page in pages:
        d = {};
        d['to_delete'] = page.to_delete
        d['net_id'] = page.net_id
        l.append(d)
    cPickle.dump(l, open(filename+'.pickle', 'wb'))

def loadMetadata(pages, filename):
    try:
        l = cPickle.load(open(filename+'.pickle', 'rb'))
        for i, d in enumerate(l):
            pages[i].to_delete = d['to_delete']
            pages[i].net_id = d['net_id']
    except Exception:
        pass

class Page:
    pdf = None
    filename = ''

    @staticmethod
    def setPdf(_pdf, _filename):
        Page.pdf = _pdf
        Page.filename = _filename
        if not os.path.exists(Page.getImageDirPath()):
            os.makedirs(Page.getImageDirPath())

    @staticmethod
    def getImageDirPath():
        return './'+Page.filename.replace('.', '_')

    def __init__(self, n):
        self.n = n
        self.to_delete = False
        self.net_id = ''

        self.cv_img = None
        pdf_writer = PyPDF2.PdfFileWriter()
        self.pdf_page = Page.pdf.getPage(n)
        pdf_writer.addPage(self.pdf_page)
        self.bytes = io.BytesIO()
        pdf_writer.write(self.bytes)
        self.bytes.seek(0)
        self.rasterizeImage()

    def getImgFilepath(self):
        return Page.getImageDirPath()+'/'+str(self.n)+'.jpg'

    def rasterizeImage(self):
        if not os.path.isfile(self.getImgFilepath()):
            print 'rasterize page:', self.n
            # rasterize
            wand_img = Image(file = self.bytes, resolution = int(IMAGE_WIDTH*DPI_TO_PX_RATIO/(self.pdf_page.mediaBox[3])))
            width, height = wand_img.width, wand_img.height
            wand_img.depth = 8
            blob = wand_img.make_blob(format='RGB')

            # convert wand_image to cv_image
            img = np.zeros((height, width, 3), dtype = np.uint8)
            for y in xrange(height):
                for x in xrange(width):
                    img[y, x, 0] = struct.unpack('B', blob[3*(y*width+x)+2])[0]
                    img[y, x, 1] = struct.unpack('B', blob[3*(y*width+x)+1])[0]
                    img[y, x, 2] = struct.unpack('B', blob[3*(y*width+x)+0])[0]
            cv2.imwrite(self.getImgFilepath(), img)



    def show(self):
        if self.cv_img == None:
            self.cv_img = cv2.imread(self.getImgFilepath())
        cp = self.cv_img.copy()
        self.putText(
            cp,
            str(self.n+1)+'/'+str(Page.pdf.getNumPages()),
            (self.cv_img.shape[1]/2, 20)
        )
        if(self.to_delete):
            self.putText(
                cp,
                'Deleted',
                (50, 20)
            )

        self.putText(
            cp,
            self.net_id,
            (self.cv_img.shape[1]-100, 20)
        )
        cv2.imshow('img', cp)

    def putText(self, img, str, pos):
        boxsize, _ = cv2.getTextSize(str, cv2.FONT_HERSHEY_COMPLEX_SMALL, 1, 1)
        cv2.putText(
            img,
            str,
            (pos[0]-boxsize[0]/2, pos[1]),
            cv2.FONT_HERSHEY_COMPLEX_SMALL,
            1, # scale
            (255,0,0),
            1,
            cv2.CV_AA
        )

    def toggleToDelete(self):
        self.to_delete = not self.to_delete

    def setNetId(self, net_id):
        self.net_id = net_id

def Export(pages, submission_id):
    cur_net_id_path = ''

    print 'Export'
    for i, page in enumerate(pages):
        if page.net_id != '':
            cur_net_id_path = Page.getImageDirPath()+'/'+page.net_id
            if not os.path.exists(cur_net_id_path):
                os.makedirs(cur_net_id_path)
        if not page.to_delete:
            shutil.copy(page.getImgFilepath(), cur_net_id_path+'/'+str(page.n)+'.jpg')


    for i, page in enumerate(pages):
        if page.net_id != '':

            convert = 'convert'
            if os.name == 'nt':
                convert = 'convert2' # avoid collision with windows' convert.exe
            param = [
                convert,
                Page.getImageDirPath()+'/'+page.net_id+'/*.jpg',
                Page.getImageDirPath()+'/'+page.net_id+'/'+submission_id+'.pdf'
            ]
            subprocess.call(param,stdout=subprocess.PIPE)

    for i, page in enumerate(pages):
        if page.net_id != '':
            cur_net_id_path = Page.getImageDirPath()+'/'+page.net_id
            if not os.path.exists(cur_net_id_path):
                os.makedirs(cur_net_id_path)
        if not page.to_delete:
            os.remove(cur_net_id_path+'/'+str(page.n)+'.jpg')


    print '...done!'


def init(filename, submission_id):
    NetIdValidator.init(filename)
    pdf = PyPDF2.PdfFileReader(file(filename, "rb"))
    Page.setPdf(pdf, filename)
    for n in range(pdf.getNumPages()):
        pages.append(Page(n))

    loadMetadata(pages, filename)

    cur_page_n = 0

    q = False
    while(not q):
        pages[cur_page_n].show()
        key = cv2.waitKey(0)
        if(key == 27 or key == 113):
            q = True
        if(key == 63235): # <Rght-arrow-key>
            cur_page_n = (1 + cur_page_n)%pdf.getNumPages()
        if(key == 63234): # <Left-arrow-key>
            cur_page_n = (pdf.getNumPages() + cur_page_n - 1)%pdf.getNumPages()
        if key == 63272: # <Delete-key>
            pages[cur_page_n].toggleToDelete()
            saveMetadata(pages, filename)
        if key == 13: # <Enter-key>
            net_id = raw_input('Enter NetID:')
            net_id = NetIdValidator.getSimilarNetIds(net_id)
            pages[cur_page_n].setNetId(net_id)
            saveMetadata(pages, filename)
        if key == 106: # <'J'-key>
            jump_to_page = raw_input('Jump To Page:')
            cur_page_n = int(jump_to_page)-1
        if key == 113: # <'E'-key>
            Export(pages, submission_id)


init('data/math2220_wk13.pdf', 'assignment1')