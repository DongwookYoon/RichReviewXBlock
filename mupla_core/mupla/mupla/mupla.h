#include <stdio.h>

typedef struct{
    float l;
    float t;
    float r;
    float b;
} MuPlaRect;

typedef struct{
    MuPlaRect bbox;
    int len;
    int* text;
} MuPlaTextLine;

typedef struct{
    MuPlaRect bbox;
    int len;
    MuPlaTextLine* lines;
} MuPlaTextBlock;

typedef struct{
    MuPlaRect bbox;
    int len_t;
    MuPlaTextBlock* tblocks;
} MuPlaPage;

typedef struct{
    int len;
    MuPlaPage* pages;
} MuPlaDoc;


MuPlaDoc MuPlaRun(char* pdf_path);
