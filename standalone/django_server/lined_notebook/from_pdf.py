import cv2
import numpy as np
import PyPDF2
from wand.image import Image
import wand
import io
import struct

IMAGE_WIDTH = 768
DPI_TO_PX_RATIO = 72
FOLDER_NAME = './scanned_notebook/scanned_notebook.pdf'
HOUGH_THETA_THRESHOLD = 30

def getHoughLines(cv_img):
    gray = cv2.cvtColor(cv_img,cv2.COLOR_BGR2GRAY)
    edges = cv2.adaptiveThreshold(
        gray,
        255,
        adaptiveMethod=cv2.ADAPTIVE_THRESH_MEAN_C,
        thresholdType=cv2.THRESH_BINARY_INV,
        blockSize = 9,
        C=3)
    kernel = np.ones((3,3),np.uint8)
    edges = cv2.dilate(edges, kernel, iterations = 1)
    lines = cv2.HoughLines(edges,1,np.pi/180,250)
    return lines

def run(pdf, n):
    # read the pdf page into bytes array
    pdf_writer = PyPDF2.PdfFileWriter()
    pdf_page = pdf.getPage(n)
    pdf_writer.addPage(pdf_page)
    bytes = io.BytesIO()
    pdf_writer.write(bytes)
    bytes.seek(0)

    # rasterize
    wand_img = Image(file = bytes, resolution = int(IMAGE_WIDTH*DPI_TO_PX_RATIO/(pdf_page.mediaBox[2])))
    width, height = wand_img.width, wand_img.height
    wand_img.depth = 8
    blob = wand_img.channel_images['gray'].make_blob(format='RGB')

    # convert wand_image to cv_image
    cv_img = np.zeros((height, width, 3), dtype = np.uint8)
    for y in xrange(height):
        for x in xrange(width):
            v = struct.unpack('B', blob[3*(y*width+x)+0])[0]
            cv_img[y, x, 0] = v
            cv_img[y, x, 1] = v
            cv_img[y, x, 2] = v

    cv_img_height, cv_img_width, cv_img_channel = cv_img.shape
    cv_img_L = cv_img[0:cv_img_height, 0:cv_img_width/2]
    cv_img_R = cv_img[0:cv_img_height, cv_img_width/2:cv_img_width]

    lines_L = getHoughLines(cv_img_L)
    lines_R = getHoughLines(cv_img_R)

    for rho,theta in lines_L[0]:
        if(abs(np.pi/2-theta) < np.pi*HOUGH_THETA_THRESHOLD/2.0/180.0 ):
            x1 = 0
            x2 = width/2.0
            y1 = -x1/np.tan(theta) + rho/np.sin(theta)
            y2 = -x2/np.tan(theta) + rho/np.sin(theta)
            cv2.line(cv_img,(int(x1),int(y1)),(int(x2),int(y2)),(0,0,255),0)

    for rho,theta in lines_R[0]:
        if(abs(np.pi/2-theta) < np.pi*HOUGH_THETA_THRESHOLD/2.0/180.0 ):
            x1 = 0
            x2 = width/2.0
            y1 = -x1/np.tan(theta) + rho/np.sin(theta)
            y2 = -x2/np.tan(theta) + rho/np.sin(theta)
            cv2.line(cv_img,(int(x1+width/2),int(y1)),(int(x2+width/2),int(y2)),(0,0,255),0)

    #"""

    """ #fancy probabilistic Hough transform
    minLineLength = 100
    maxLineGap = 10
    lines = cv2.HoughLinesP(edges,1,np.pi/180,100,minLineLength,maxLineGap)
    for x1,y1,x2,y2 in lines[0]:
        cv2.line(cv_image,(x1,y1),(x2,y2),(0,255,0),2)
    """

    #cv2.imshow('img_gray', edges)
    cv2.imshow('img_L', cv_img_L)
    cv2.imshow('img_R', cv_img_R)
    cv2.imshow('img', cv_img)
    key = cv2.waitKey(0)
    if(key == 113):
         quit()

pdf = PyPDF2.PdfFileReader(file(FOLDER_NAME, "rb"))

cv2.namedWindow('img_L')
cv2.moveWindow('img_L', 0, 0)

cv2.namedWindow('img_R')
cv2.moveWindow('img_R', IMAGE_WIDTH/2, 0);

for n in xrange(pdf.getNumPages()):
    run(pdf, n)
cv2.destroyAllWindows()

