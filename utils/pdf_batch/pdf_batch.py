__author__ = 'yoon'

import sys
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
import traceback

IMAGE_WIDTH = 800
DPI_TO_PX_RATIO = 72

class MergePdfs():
    @staticmethod
    def Run(path):
        print '    Merging PDFs',
        pdfs = []
        n = 0
        while os.path.isfile(path+'/scan'+str(n)+'.pdf'):
            pdfs.append(PyPDF2.PdfFileReader(file(path+'/scan'+str(n)+'.pdf', 'rb')))
            n+=1

        pdf_merger = PyPDF2.PdfFileMerger()
        for pdf in pdfs:
            pdf_merger.append(pdf)
        pdf_merger.write(open(path+'/merged.pdf', "wb"))
        print '... done!'
        return pdfs

class PdfsToImages():
    @staticmethod
    def run(path):
        print '    Extracting images:',
        pdf_reader = PyPDF2.PdfFileReader(file(path+'/merged.pdf', 'rb'))

        print 'total', pdf_reader.getNumPages(), 'pages'

        path_img = path+'/imgs'

        if not os.path.exists(path_img):
            os.makedirs(path_img)

        img_paths = []
        for i in xrange(pdf_reader.getNumPages()):
            img_path = path_img+'/'+str(i+1)+'.jpg'
            img_paths.append(img_path)
            if not os.path.isfile(img_path):
                print '        '+str(i+1)+' :', img_path,
                sys.stdout.flush()
                PdfsToImages.ExtractImg(pdf_reader = pdf_reader, n = i, out_path = img_path)
                print '... done!'

        return img_paths

    @staticmethod
    def ExtractImg(pdf_reader, n, out_path):
        writer = PyPDF2.PdfFileWriter()
        page = pdf_reader.getPage(n)
        writer.addPage(page)

        bytes = io.BytesIO()
        writer.write(bytes)
        bytes.seek(0)

        wand_img = Image(file = bytes, resolution = IMAGE_WIDTH*DPI_TO_PX_RATIO/(page.mediaBox[3]))
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
        cv2.imwrite(out_path, img)


class NetIdValidator():
    net_ids = []

    @staticmethod
    def init(working_dir):
        with open(working_dir+'/roster.csv', 'rb') as csvfile:
            reader = csv.reader(csvfile, delimiter=',')
            for line in reader:
                NetIdValidator.net_ids.append(line[0])
        print '    NetIdValidator: total', len(NetIdValidator.net_ids), 'NetIDs'

    @staticmethod
    def getSimilarNetIds(net_id):
        l = map(lambda x: SequenceMatcher(None, net_id, x).ratio(), NetIdValidator.net_ids)
        l = sorted(range(len(l)), key=lambda k: -l[k])[:3]

        if net_id == NetIdValidator.net_ids[l[0]]:
            return net_id
        else:
            print '   ', net_id, 'does not exist in the course roster. Instead we found similar IDs from our DB.'
            for n, idx in enumerate(l):
                print '       ', n+1, ':', NetIdValidator.net_ids[idx]
            print '        x : Cancel'
            n = raw_input('    >>>> Select one option:')

            new_id = ''
            try:
                new_id = NetIdValidator.net_ids[l[int(n)-1]]
            except Exception:
                pass
            print '    Updated to', new_id
            return new_id


class PageDisplay:
    cv_img = None

    @staticmethod
    def Show( page, n, n_pages_total):
        #cp = self.cv_img.copy()
        cp = cv2.imread(page.img_path)
        PageDisplay.PutText(
            cp,
            str(n+1)+'/'+str(n_pages_total),
            (cp.shape[1]/2, 20)
        )
        if(page.to_delete):
            PageDisplay.PutText(
                cp,
                'Deleted',
                (50, 20)
            )

        PageDisplay.PutText(
            cp,
            page.net_id,
            (cp.shape[1]-100, 20)
        )
        cv2.imshow('img', cp)

    @staticmethod
    def PutText(img, str, pos):
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


class Page:
    def __init__(self, img_path, metadata):
        self.to_delete = metadata['to_delete']
        self.net_id = metadata['net_id']
        self.img_path = img_path

    def ToggleToDelete(self):
        self.to_delete = not self.to_delete

    def SetNetId(self, net_id):
        self.net_id = net_id


class PdfBatch():
    def __init__(self, working_dir):
        self.cv_img = None
        self.working_dir = working_dir
        NetIdValidator.init(working_dir)
        MergePdfs.Run(working_dir)
        self.pdf_imgs = PdfsToImages.run(working_dir)
        self.metadata = self.loadMetadata()
        self.pages = self.CreatePages(self.pdf_imgs, self.metadata)
        self.n_total_page = len(self.pages)

    def run(self):
        print '    Launch!'
        cur_page_n = 0
        q = False
        while(not q):
            PageDisplay.Show(self.pages[cur_page_n], cur_page_n, self.n_total_page)

            key = cv2.waitKey(0)
            if(key == 27 or key == 113):
                q = True
            if(key == 63235): # <Rght-arrow-key>
                cur_page_n = (1 + cur_page_n)%self.n_total_page
            if(key == 63234): # <Left-arrow-key>
                cur_page_n = (self.n_total_page + cur_page_n - 1)%self.n_total_page
            if key == 63272: # <Delete-key>
                self.pages[cur_page_n].ToggleToDelete()
                self.saveMetadata(self.pages)
            if key == 13: # <Enter-key>
                net_id = raw_input('    >>>> Enter NetID:')
                net_id = NetIdValidator.getSimilarNetIds(net_id)
                self.pages[cur_page_n].SetNetId(net_id)
                self.saveMetadata(self.pages)
            if key == 106: # <'J'-key>
                jump_to_page = raw_input('    >>>>Jump To Page:')
                cur_page_n = int(jump_to_page)-1
            if key == 101: # <'E'-key>
                self.Export(self.pages)

    def saveMetadata(self, pages):
        filename = self.working_dir+'/metadata.pickle'
        l = []
        for page in pages:
            d = {}
            d['to_delete'] = page.to_delete
            d['net_id'] = page.net_id
            l.append(d)
        cPickle.dump(l, open(filename, 'wb'))

    def loadMetadata(self):
        filename = self.working_dir+'/metadata.pickle'
        if os.path.isfile(filename):
            data = cPickle.load(open(filename, 'rb'))
        else:
            data = []
            for i in xrange(len(self.pdf_imgs)):
                data.append({'net_id':'', 'to_delete': False})
        print '    Load metadata: total '+str(len(data))+' items'
        return data

    def CreatePages(self, imgs, metadata):
        if len(imgs) != len(metadata):
            raise Exception('InvalidMetadata')
        pages = []
        for i in xrange(len(imgs)):
            pages.append(Page(imgs[i], metadata[i]))
        return pages


    def Export(self, pages):
        print '    Export begin',
        sys.stdout.flush()

        pdf_reader = PyPDF2.PdfFileReader(file(self.working_dir+'/merged.pdf', 'rb'))




        page_sets = []

        for i, page in enumerate(pages):
            if page.net_id != '': # new NetID
                page_sets.append({'NetID': page.net_id, 'pages':[]})
            if len(page_sets) >= 1:
                if not page.to_delete:
                    page_sets[-1]['pages'].append(i)

        for page_set in page_sets:
            cur_net_id_path = self.working_dir+'/pdfs/'+page_set['NetID']
            if not os.path.exists(cur_net_id_path):
                os.makedirs(cur_net_id_path)
            pdf_merger = PyPDF2.PdfFileMerger()
            for npage in page_set['pages']:
                pdf_merger.append(pdf_reader, '', (npage, npage+1))
            pdf_merger.write(open(cur_net_id_path+'/doc.pdf', 'wb'))

            print '.',
            sys.stdout.flush()

        print 'done!'


if __name__ == '__main__':
    try:
        if len(sys.argv) != 2 or not os.path.isdir('data/'+sys.argv[1]):
            raise Exception('InvalidArgs')

        app = PdfBatch('data/'+sys.argv[1])
        app.run()

    except Exception as e:
        if len(e.args) != 0:
            if e.args[0] == 'InvalidArgs':
                print '    Urg... This script takes only 1 argument designating the working directory.'
                print '    Put the scanned pdf(s) into \'data/<folder_name>\', and then run \'python pdf_batch.py <folder_name>.\''
            elif e.args[0] == 'InvalidMetadata':
                print '    The number of pages in the metadata mismatches with that of the PDF pages'
                print '    You may want to delete \'metadata.pickle\' to reset the database and proceed.'
            else:
                print e
                traceback.print_exc()
        else:
            print e
            traceback.print_exc()
