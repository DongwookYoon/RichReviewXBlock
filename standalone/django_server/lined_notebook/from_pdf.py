import cv2
import numpy as np
import PyPDF2
from wand.image import Image
import wand
import io
import struct
from matplotlib import pyplot as plt
from sklearn import linear_model, datasets
from scipy.spatial import distance
import subprocess

IMAGE_WIDTH = 768
DPI_TO_PX_RATIO = 72
#FOLDER_NAME = './lined_notebook/lined_notebook.pdf'
FOLDER_NAME = './scanned_notebook/scanned_notebook.pdf'
HOUGH_THRESHOLD = 175
HOUGH_THRESHOLD_AFTER_UNDISTORTION = 250
HOUGH_THETA_THRESHOLD = 30
HOUGH_THETA_THRESHOLD_AFTER_UNDISTORTION = 10
RHO_THRESHOLD = 15
RHO_MERGE_THRESHOLD = 9

def getHoughLines(img, hough_threshold):
    gray = cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray,50,150,apertureSize = 3)
    lines = cv2.HoughLines(edges,1,np.pi/180,hough_threshold)
    return lines[0] if lines != None else []

def getUndistortTransform(img, verbose):
    #get line features
    h, w, channel = img.shape

    lines = getHoughLines(img, HOUGH_THRESHOLD)

    if len(lines) < 10:
        return np.identity(3)

    #filter lines by theta
    lines_pts = []
    for rho,theta in lines:
        if(abs(np.pi/2-theta) < np.pi*HOUGH_THETA_THRESHOLD/2.0/180.0 ):
            x1 = 0
            x2 = w
            y1 = -x1/np.tan(theta) + rho/np.sin(theta)
            y2 = -x2/np.tan(theta) + rho/np.sin(theta)
            lines_pts.append(((int(x1),int(y1)),(int(x2),int(y2))))


    X = np.array([[x] for x, y in lines])
    y = np.array([y for x, y in lines])


    model_ransac = linear_model.RANSACRegressor(
        linear_model.LinearRegression(),
        min_samples=2,
        residual_threshold=0.005,
        random_state=0)
    model_ransac.fit(X, y)
    inlier_mask = model_ransac.inlier_mask_
    outlier_mask = np.logical_not(inlier_mask)
    alpha = model_ransac.predict([0])[0][0]
    beta = model_ransac.estimator_.coef_[0][0]

    pts_before = np.float32([
        [0,0],
        [w,0],
        [0,h/np.sin(h*beta+alpha)],
        [w,h]]
    )
    pts_after = np.float32([
        [0,-w/np.tan(alpha)],
        [w,0],
        [0,-w/np.tan(h*beta+alpha)+h/np.sin(h*beta+alpha)],
        [w,h]]
    )
    tr = cv2.getPerspectiveTransform(pts_before, pts_after)

    if verbose:
        '''
        for i in xrange(len(lines_pts)):
            pts = lines_pts[i]
            cv2.line(img, pts[0], pts[1], (0,0,255), 0)
            '''

        plt.plot(X[inlier_mask], y[inlier_mask], '.g', label='Inliers')
        plt.plot(X[outlier_mask], y[outlier_mask], '.r', label='Outliers')
        line_X = np.arange(0, 1500)
        line_y_ransac = model_ransac.predict(line_X[:, np.newaxis])
        plt.plot(line_X, line_y_ransac, '-b', label='RANSAC regressor')

        plt.legend(loc='lower right')
        plt.show()

    return tr

def undistort(img, verbose):
    #split image
    h, w, cv_img_channel = img.shape
    img_L = img[0:h, 0:w/2]
    img_R = np.fliplr(img[0:h, w/2:w])

    tr_L = getUndistortTransform(img_L, verbose = False)
    tr_R = getUndistortTransform(img_R, verbose = False)

    img_L = cv2.warpPerspective(img_L,tr_L,(w/2,h), flags=cv2.INTER_NEAREST)
    img_R = cv2.warpPerspective(img_R,tr_R,(w/2,h), flags=cv2.INTER_NEAREST)

    undistorted_img = np.concatenate((img_L, np.fliplr(img_R)), axis=1)

    return undistorted_img

def split(img, verbose):
    h, w, cv_img_channel = img.shape
    lines = getHoughLines(img, HOUGH_THRESHOLD_AFTER_UNDISTORTION)

    # do ransac
    X = np.array([[x] for x, y in lines])
    y = np.array([y for x, y in lines])
    model_ransac = linear_model.RANSACRegressor(
        linear_model.LinearRegression(),
        min_samples=2,
        residual_threshold=0.005,
        random_state=0)
    model_ransac.fit(X, y)
    inlier_mask = model_ransac.inlier_mask_
    outlier_mask = np.logical_not(inlier_mask)
    alpha = model_ransac.predict([0])[0][0]
    beta = model_ransac.estimator_.coef_[0][0]
    lines = lines[inlier_mask]

    #merge
    merged_lines = []
    for val in lines:
        min_dist = RHO_MERGE_THRESHOLD
        min_dist_i = -1
        min_dist_val = None
        for idx, val_m in enumerate(merged_lines):
            d = abs(val[0]-val_m[0])
            if(d < RHO_MERGE_THRESHOLD and d < min_dist):
                min_dist = d
                min_dist_val = val_m
                min_dist_i = idx
        if min_dist_i == -1:
            merged_lines.append(val)
        else:
            if val[0] < min_dist_val[0]:
                merged_lines[min_dist_i] = min_dist_val

    if verbose:
        for rho, theta in lines:
            if(abs(np.pi/2-theta) < np.pi*HOUGH_THETA_THRESHOLD_AFTER_UNDISTORTION/2.0/180.0 ):
                a = np.cos(theta)
                b = np.sin(theta)
                x0 = a*rho
                y0 = b*rho
                x1 = int(x0 + 1000*(-b))
                y1 = int(y0 + 1000*(a))
                x2 = int(x0 - 1000*(-b))
                y2 = int(y0 - 1000*(a))
                cv2.line(img,(x1,y1),(x2,y2),(0,0,255),1)


        lines = np.array(merged_lines)
        for rho, theta in lines:
            if(abs(np.pi/2-theta) < np.pi*HOUGH_THETA_THRESHOLD_AFTER_UNDISTORTION/2.0/180.0 ):
                a = np.cos(theta)
                b = np.sin(theta)
                x0 = a*rho
                y0 = b*rho
                x1 = int(x0 + 1000*(-b))
                y1 = int(y0 + 1000*(a))
                x2 = int(x0 - 1000*(-b))
                y2 = int(y0 - 1000*(a))
                cv2.line(img,(x1,y1),(x2,y2),(0,255,0),1)

        cv2.imshow('undistorted_line', img)
    return [-w*0.5/np.tan(theta)+rho/np.sin(theta) for (rho,theta) in lines]

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
    blob = wand_img.make_blob(format='RGB')

    # convert wand_image to cv_image
    cv_img = np.zeros((height, width, 3), dtype = np.uint8)
    for y in xrange(height):
        for x in xrange(width):
            cv_img[y, x, 0] = struct.unpack('B', blob[3*(y*width+x)+2])[0]
            cv_img[y, x, 1] = struct.unpack('B', blob[3*(y*width+x)+1])[0]
            cv_img[y, x, 2] = struct.unpack('B', blob[3*(y*width+x)+0])[0]

    cv2.imshow('img', cv_img)

    #undistort
    cv_img = undistort(cv_img.copy(), verbose = False)

    cv2.imshow('undistorted', cv_img)

    split_pts = split(cv_img, verbose = False)
    split_pts.sort()

    return cv_img, split_pts

    key = cv2.waitKey(0)
    if(key == 113):
         quit()

def run2():

    pdf = PyPDF2.PdfFileReader(file(FOLDER_NAME, "rb"))

    cv2.namedWindow('img')
    cv2.moveWindow('img', 0, 0)

    cv2.namedWindow('undistorted')
    cv2.moveWindow('undistorted', IMAGE_WIDTH, 0)

    for n in xrange(0, pdf.getNumPages()):
        print 'PDF page:', n
        img, pts = run(pdf, n)
        cv2.imwrite('./scanned_notebook/'+str(n)+'.jpg', img)
    cv2.destroyAllWindows()

def save():
    param = ['convert']
    for n in xrange(0, 3):
        param.append('./scanned_notebook/'+str(n)+'.jpg')
    param.append('./scanned_notebook/merged.pdf')
    ret = subprocess.call(param,stdout=subprocess.PIPE)

run2()
save()

#cv2.findHomography
#dst = cv2.warpPerspective(img,M,(300,300))
#http://opencv-python-tutroals.readthedocs.org/en/latest/py_tutorials/py_imgproc/py_geometric_transformations/py_geometric_transformations.html