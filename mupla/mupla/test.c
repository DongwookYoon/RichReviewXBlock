#include "mupla.h"

int main(){
    MuPlaRun("test_sample.pdf");
    MuPlaRun("nonexistingfile.pdf");
    MuPlaRun("/tmp/richreview/pdfs/bb794fc0-2ff9-11e5-aaf0-1d446ec4995d/merged.pdf");
    return 0;
}
