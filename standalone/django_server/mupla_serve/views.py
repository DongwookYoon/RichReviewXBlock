import os
import sys
import shutil
import json

from django.http import HttpResponse
#if __name__ != "__main__":
#    from django.views.decorators.csrf import csrf_exempt

lib_path = os.path.abspath(os.path.join('..', '..', 'richreview', 'mupla_ctype'))
sys.path.append(lib_path)

import mupla_ctype
from PyPDF2 import PdfFileMerger, PdfFileReader

TEMP_PDF = '/tmp/richreview/pdfs/'
def run_mupla(dir_path):
    pdfs = []
    filen = 0

    while(True):
        pdf_path = dir_path+"/"+str(filen)+".pdf"
        if os.path.isfile(pdf_path):
            pdfs.append(pdf_path)
            filen += 1
        else:
            break

    merged_pdf_path = dir_path+"/merged.pdf"
    if len(pdfs) == 0:
        raise Exception("No PDF file available")
    elif len(pdfs) == 1:
        shutil.copyfile(pdfs[0], merged_pdf_path)
    else:
        merger = PdfFileMerger()
        for pdf in pdfs:
            with open(pdf, "rb") as f:
                merger.append(PdfFileReader(f))
                f.close()
        with open(merged_pdf_path, "wb") as output:
            merger.write(output)
            output.close()

    print 'merged_pdf_path', merged_pdf_path
    js = mupla_ctype.PyMuPlaRun(merged_pdf_path)
    if len(js) == 0:
        raise Exception("Invalid PDF file")
    with open(dir_path+"/merged.js", 'w') as f:
        f.write(json.dumps(js))
        f.close()

#@csrf_exempt
def get_pdf_post(request):
    try:
        if request.POST["mode"] ==  "MergePdfs":
            run_mupla(TEMP_PDF + request.POST["uuid"])
            return HttpResponse("succeed", content_type="application/json")
        else:
            raise Exception("Invalid request to the MuPla server")

    except Exception as e:
        print "Exception"
        print e
        return HttpResponse(str(e), content_type="application/json")

if __name__ == "__main__":
    print dir(mupla_ctype)
    #run_mupla("/tmp/richreview/pdfs/eda28e10-5bc0-11e5-8bc7-b73058174fd3")


