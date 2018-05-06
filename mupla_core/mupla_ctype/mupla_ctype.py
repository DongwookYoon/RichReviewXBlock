import os
from ctypes import *

class MuPlaRect(Structure):
    _fields_ = [
        ("l", c_float),
        ("t", c_float),
        ("r", c_float),
        ("b", c_float),
    ]

class MuPlaTextLine(Structure):
    _fields_ = [
        ("bbox", MuPlaRect),
        ("len", c_int),
        ("text", POINTER(c_int))
    ]

class MuPlaTextBlock(Structure):
    _fields_ = [
        ("bbox", MuPlaRect),
        ("len", c_int),
        ("lines", POINTER(MuPlaTextLine))
    ]

class MuPlaPage(Structure):
    _fields_ = [
        ("bbox", MuPlaRect),
        ("len_t", c_int),
        ("tblocks", POINTER(MuPlaTextBlock))
    ]

class MuPlaDoc(Structure):
    _fields_ = [
        ("len", c_int),
        ("pages", POINTER(MuPlaPage))
    ]

def JsonifyRect(r):
    return [r.l, r.t, r.r, r.b]

def JsonifyLine(line):
    text = u""
    for i in range(0, line.len):
        text += unichr(line.text[i])
    return {"bbox": JsonifyRect(line.bbox), "text": text}

def JsonifyTextBlock(tblock):
    js_lines = []
    for i in range(0, tblock.len):
        js_lines.append(JsonifyLine(tblock.lines[i]))
    return {"bbox": JsonifyRect(tblock.bbox), "lines": js_lines}

def JsonifyPage(page):
    js_tblocks = []
    for i in range(0, page.len_t):
        js_tblocks.append(JsonifyTextBlock(page.tblocks[i]))

    return {"bbox": JsonifyRect(page.bbox), "tblocks":js_tblocks}

def JsonifyDoc(doc):
    js_doc  = []
    for i in range(0, doc.len):
        js_doc.append(JsonifyPage(doc.pages[i]))
    return js_doc

path = os.path.dirname(os.path.realpath(__file__)) + '/mupla.so'
libmupla = cdll.LoadLibrary(path)
ft = CFUNCTYPE(MuPlaDoc, POINTER(c_char))
libmupla.MuPlaRun.restype = MuPlaDoc

def PyMuPlaRun(py_pdf_path):
    try:
        doc = libmupla.MuPlaRun(c_char_p(py_pdf_path))
        return JsonifyDoc(doc)
    except:
        return []
