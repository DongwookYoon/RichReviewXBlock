import sys
import cv2
import numpy as np
import PyPDF2
from wand.image import Image
import io
import os
import struct
import traceback
import json



IMAGE_WIDTH = 1024
DPI_TO_PX_RATIO = 72
HOUGH_THRESHOLD = 350./1024.
HOUGH_THETA_THRESHOLD = 15
RHO_THRESHOLD = 25
RHO_MERGE_THRESHOLD = 25

def getHoughLines(img, hough_threshold):
    gray = cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray,50,150,apertureSize = 3)
    lines = cv2.HoughLines(edges,1,np.pi/180,hough_threshold)
    return lines[0] if lines != None else []


LUMP_DIST_CRITERIA = 5
def lumpClosePts(l):
    if len(l) < 2:
        return l
    else:
        dup_indices = [[0]]
        for i in range(1, len(l)):
            if abs(l[i-1] - l[i]) > LUMP_DIST_CRITERIA:
                dup_indices.append([i])
            else:
                dup_indices[-1].append(i)
    return [round(max([l[i] for i in dups]),2) for dups in dup_indices]


#path = sys.argv[1]
#filename = sys.argv[2]

class PdfImageExport:
    @staticmethod
    def run(path, pdf_filename):
        sys.stdout.flush()
        # create folder
        foldername = pdf_filename[:-4]
        if not os.path.isdir(path+'/'+foldername):
            print 'PdfFile', pdf_filename,
            os.makedirs(path+'/'+foldername)
        else:
            return # if a folder exists, assume that the images are ready

        # read pdf
        pdf = PyPDF2.PdfFileReader(file(path+'/'+pdf_filename, "rb"))
        print pdf.getNumPages(), 'pages',
        for n in xrange(0, pdf.getNumPages()):
            pdf_writer = PyPDF2.PdfFileWriter()
            pdf_page = pdf.getPage(n)
            pdf_writer.addPage(pdf_page)
            bytes = io.BytesIO()
            pdf_writer.write(bytes)
            bytes.seek(0)

            # rasterize
            wand_img = Image(file = bytes, resolution = int(IMAGE_WIDTH*DPI_TO_PX_RATIO/(pdf_page.mediaBox[3])))
            width, height = wand_img.width, wand_img.height
            wand_img.depth = 8
            blob = wand_img.make_blob(format='RGB')

            # convert wand_image to cv_image
            cv_img = np.zeros((height, width, 3), dtype = np.uint8)
            for y in xrange(height):
                for x in xrange(width):
                    cv_img[y, x, 0] = struct.unpack('B', blob[3*(y*width+x)+2])[0]
                    cv_img[y, x, 1] = struct.unpack('B', blob[3*(y*width+x)+1])[0]
                    cv_img[y, x, 2] = struct.unpack('B', blob[3*(y*width+x)+0])[0]
            cv2.imwrite(path+'/'+foldername+'/'+str(n)+'.jpg', cv_img)
            print '.',
        print ''

class PdfLineDetection:
    def __init__(self, path, folder_name):
        print 'Folder', folder_name
        sys.stdout.flush()
        self.path = path
        self.folder_name = folder_name

        self.n_page = 0
        n_page = 0
        while os.path.isfile(self.path+'/'+self.folder_name+'/'+str(n_page)+'.jpg'):
            n_page += 1
            self.n_page = n_page
        self.manualLines = self.loadManualLines()
        self.metadata = [ [] for x in xrange(self.n_page) ]
        self.tempLineY = -1

    def getNumPage(self):
        return self.n_page

    def run(self, n_page, to_export = True):
        cv_img = cv2.imread(self.path+'/'+self.folder_name+'/'+str(n_page)+'.jpg')
        data = {}
        data['w'], data['h'], data['lineYs'] = self.detectLines(cv_img, n_page, verbose = False)
        self.metadata[n_page] = data
        cv2.imshow('img', cv_img)
        if to_export:
            self.exportMetadata()

    def detectLines(self, cv_img, n_page, verbose = False):
        h, w, cv_img_channel = cv_img.shape
        lines = getHoughLines(cv_img, int(HOUGH_THRESHOLD*w))
        lineYs = []
        for rho, theta in lines:
            if(abs(np.pi/2-theta) < np.pi*HOUGH_THETA_THRESHOLD/2.0/180.0 ):
                a = np.cos(theta)
                b = np.sin(theta)
                x0 = a*rho
                y0 = b*rho
                x1 = int(x0 + IMAGE_WIDTH*(-b))
                y1 = int(y0 + IMAGE_WIDTH*(a))
                x2 = int(x0 - IMAGE_WIDTH*(-b))
                y2 = int(y0 - IMAGE_WIDTH*(a))
                cv2.line(cv_img,(x1,y1),(x2,y2),(0,255,0),1)
                lineYs.append(-w*0.5/np.tan(theta)+rho/np.sin(theta))

        lineYs.sort()
        lineYs = lumpClosePts(lineYs)
        lineYs = [int(y) for y in lineYs]

        for y in lineYs:
            cv2.line(cv_img,(0,y),(IMAGE_WIDTH,y),(0,0,255),1)

        if self.tempLineY > -1:
            cv2.line(cv_img,(0,self.tempLineY),(IMAGE_WIDTH,self.tempLineY),(255,150,150),1)

        for y in self.manualLines[n_page]:
            cv2.line(cv_img,(0,y),(IMAGE_WIDTH,y),(255,0,0),1)
            lineYs.append(y)

        lineYs.sort()
        lineYs = lumpClosePts(lineYs)
        lineYs = [int(y) for y in lineYs]

        sys.stdout.flush()
        return w, h, lineYs

    def exportMetadata(self):
        if not [] in self.metadata:
            with open(self.path+'/'+self.folder_name+'/'+self.folder_name+'.txt', 'w') as outfile:
                json.dump(self.metadata, outfile)
                print 'Metadata dumped'

    def exportManualLines(self):
        with open(self.path+'/'+self.folder_name+'/manualLines.txt', 'w') as f:
            json.dump(self.manualLines, f)
            print 'Manual line dumped'

    def loadManualLines(self):
        if os.path.isfile(self.path+'/'+self.folder_name+'/manualLines.txt'):
            with open(self.path+'/'+self.folder_name+'/manualLines.txt', 'r') as f:
                print f
                return json.load(f)
        else:
            return [ [] for x in xrange(self.n_page) ]

    def mouseMove(self, n_page, y):
        self.tempLineY = y
        self.run(n_page, to_export=False)

    def mouseUp(self, n_page, y):
        self.manualLines[n_page].append(y)
        self.tempLineY = -1
        self.exportManualLines()
        self.run(n_page)

class Ctrl:
    def __init__(self, files):
        self.files = files
        self.n_file = 0
        self.n_page = -1
        self.app = self.app = PdfLineDetection('data/'+sys.argv[1], files[self.n_file][:-4])
        self.mouse_dn = False

        cv2.namedWindow('img')
        cv2.moveWindow('img', 0, 0)

    def run(self):
        q = False
        self.set(self.n_file, self.n_page+1)
        while(not q):
            key = cv2.waitKey(0)
            if(key == 113): # q <key>
                 q = True
            if(key == 2555904): # <Rght-arrow-key>
                self.set(self.n_file, self.n_page+1)
            if(key == 2424832): # <Left-arrow-key>
                self.set(self.n_file, self.n_page-1)
            if(key == 2490368): # <Up-arrow-key>
                self.set(self.n_file-1, 0)
            if(key == 2621440): # <Down-arrow-key>
                self.set(self.n_file+1, 0)

    def set(self, n_file, n_page):
        new_file = False
        new_page = False
        if n_file < 0:
            print 'This is the first file.'
        elif n_file == len(self.files):
            print 'You hit the last file.'
        else:
            if n_file != self.n_file:
                self.n_file = n_file
                new_file = True

        if n_page < 0:
            print 'This is the first page.'
        elif n_page == self.app.getNumPage():
            print 'You hit the last page.'
        else:
            if n_page != self.n_page:
                self.n_page = n_page
                new_page = True

        if new_file:
            self.app = PdfLineDetection('data/'+sys.argv[1], files[self.n_file][:-4])
        if new_file or new_page:
            self.app.run(self.n_page)
            cv2.setMouseCallback("img", self.mouse)

    def mouse(self, event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            self.mouse_dn = True
            self.app.mouseMove(self.n_page, y)
        if event == cv2.EVENT_MOUSEMOVE:
            if self.mouse_dn:
                self.app.mouseMove(self.n_page, y)
        if event == cv2.EVENT_LBUTTONUP:
            self.mouse_dn = False
            self.app.mouseUp(self.n_page, y)


if __name__ == '__main__':
    try:
        if len(sys.argv) != 2 or not os.path.isdir('data/'+sys.argv[1]):
            raise Exception('InvalidArgs')

        files = os.listdir('data/'+sys.argv[1])
        files = [filename for filename in files if filename[-4:] == '.pdf']
        for filename in files:
            PdfImageExport.run('data/'+sys.argv[1], filename)

        cv2.namedWindow('img')
        cv2.moveWindow('img', 0, 0)

        if len(files) == 0:
            raise Exception('No pdf files in the folder')
        ctrl = Ctrl(files)
        ctrl.run()


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
