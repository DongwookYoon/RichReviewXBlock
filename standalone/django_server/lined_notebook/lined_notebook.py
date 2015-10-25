import cv2
import numpy as np
import PyPDF2
import io
import os.path
import struct
import math

FOLDER_NAME = 'scanned_notebook'

def run(filename):
    cv_image_raw = cv2.imread(filename)
    height_raw, width_raw, channel = cv_image_raw.shape
    if(math.log(width_raw, 2) > 10):
        scale = int(math.pow(2, math.ceil(math.log(width_raw, 2)-10)))
        scale = width_raw/512
        cv_image = cv2.resize(cv_image_raw, (width_raw/scale, height_raw/scale))
    else:
        cv_image = cv_image_raw

    gray = cv2.cvtColor(cv_image,cv2.COLOR_BGR2GRAY)
    edges = cv2.adaptiveThreshold(
        gray,
        255,
        adaptiveMethod=cv2.ADAPTIVE_THRESH_MEAN_C,
        thresholdType=cv2.THRESH_BINARY_INV,
        blockSize = 9,
        C=3)

    kernel = np.ones((3,3),np.uint8)
    edges = cv2.dilate(edges, kernel, iterations = 1)
    #edges = cv2.Canny(gray,50,150,apertureSize = 3)

    #""" #simple Hough transform
    lines = cv2.HoughLines(edges,1,np.pi/180,200)
    for rho,theta in lines[0]:
        if(abs(np.pi/2-theta)/np.pi/2 < 0.08 ):
            pass
            a = np.cos(theta)
            b = np.sin(theta)
            x0 = a*rho
            y0 = b*rho
            x1 = int(x0 + 1000*(-b))
            y1 = int(y0 + 1000*(a))
            x2 = int(x0 - 1000*(-b))
            y2 = int(y0 - 1000*(a))
            cv2.line(cv_image,(x1,y1),(x2,y2),(0,0,255),0)

    #"""

    """ #fancy probabilistic Hough transform
    minLineLength = 100
    maxLineGap = 10
    lines = cv2.HoughLinesP(edges,1,np.pi/180,100,minLineLength,maxLineGap)
    for x1,y1,x2,y2 in lines[0]:
        cv2.line(cv_image,(x1,y1),(x2,y2),(0,255,0),2)
    """

    print len(lines[0])
    cv2.imshow('img_gray', edges)
    cv2.imshow('img', cv_image)
    key = cv2.waitKey(0)
    if(key == 113):
         quit()

for n in range(1, 100):
    path = './'+FOLDER_NAME+'/'+FOLDER_NAME+'_Page_'+str(n)+'.jpg'
    print path
    if(os.path.isfile(path)):
        run(path)
cv2.destroyAllWindows()

