#include "mupla.h"
#include <mupdf/fitz.h>

MuPlaRect Get_Rect(fz_rect* r){
    MuPlaRect rect;
    rect.l = r->x0;
    rect.r = r->x1;
    rect.t = r->y0;
    rect.b = r->y1;
    return rect;
}

int Get_TextCharLen(fz_text_line* fz_line){
    fz_text_span* ts;
    int len = 0;
    ts = fz_line->first_span;
    while(ts){
        len += ts->len;
        ts = ts->next;
        //printf("            Span: %i\n", len);
    }
    return len;
}

int* Get_TextChar(fz_text_line* fz_line, int len){
    fz_text_span* ts;
    //printf("            Total Span Len: %i\n", len);
    int* text = (int*)malloc(sizeof(int)*len);
    int p = 0;
    ts = fz_line->first_span;
    //printf("            Text: ");
    while(ts){
        int i;
        for(i = 0; i < ts->len; ++i, ++p){
            text[p] = ts->text[i].c;
            //printf("%c", text[p]);
        }
        ts = ts->next;
    }
    //printf("\n");
    
    return text;
}

MuPlaTextLine Get_TextLine(fz_text_line* fz_line){
    MuPlaTextLine line;
    line.bbox = Get_Rect(&fz_line->bbox);
    fz_rect bbox = fz_line->bbox;
    //printf("        Line: %f, %f, %f, %f\n", bbox.x0, bbox.y0, bbox.x1, bbox.y1);
    line.len = Get_TextCharLen(fz_line);
    line.text = Get_TextChar(fz_line, line.len);
    return line;
}

MuPlaTextBlock Get_TextBlock(fz_text_block* fz_tblock){
    MuPlaTextBlock tblock;
    fz_rect bbox = fz_tblock->bbox;
    //printf("    TextBlock: %.2f %.2f, %.2f, %.2f\n", bbox.x0, bbox.y0, bbox.x1, bbox.y1);
    tblock.bbox = Get_Rect(&bbox);

    int l;
    fz_text_line line;
    tblock.len = fz_tblock->len;
    tblock.lines = (MuPlaTextLine*)malloc(fz_tblock->len*sizeof(MuPlaTextLine));
    for(l = 0; l < fz_tblock->len; ++l){
        tblock.lines[l] = Get_TextLine(&(fz_tblock->lines[l]));
    }
    return tblock;
}

MuPlaPage Get_Page(fz_context* ctx, fz_document* doc,  fz_page* page){
    MuPlaPage mupla_page;
    fz_cookie cookie = { 0 };

    fz_rect bbox;
    fz_bound_page(doc, page, &bbox);

    fz_display_list* dl = fz_new_display_list(ctx);
    fz_device* ld = fz_new_list_device(ctx, dl);

    fz_run_page(doc, page, ld, &fz_identity, &cookie);

    fz_text_page* tp = fz_new_text_page(ctx);
    fz_text_sheet* ts = fz_new_text_sheet(ctx);
    fz_device* td = fz_new_text_device(ctx, ts, tp);

    fz_run_display_list(dl, td, &fz_identity, &bbox, &cookie);
    if(td){fz_free_device(td);}

    printf("            BBox: %f, %f\n", bbox.x0, bbox.x1);
    mupla_page.bbox = Get_Rect(&bbox);

    int b;
    int len_t = 0;
    int len_i = 0;
    fz_page_block* block = tp->blocks;
    for(b = 0; b < tp->len; ++b, ++block){
        if(block->type == FZ_PAGE_BLOCK_TEXT){
            len_t += 1;
        }
        else if(block->type == FZ_PAGE_BLOCK_IMAGE){
            len_i += 1;
        }
    }
    mupla_page.len_t = len_t;
    mupla_page.tblocks = (MuPlaTextBlock*)malloc(len_t*sizeof(MuPlaTextBlock));
    
    block = tp->blocks;
    for(b = 0; b < tp->len; ++b, ++block){
        if(block->type == FZ_PAGE_BLOCK_TEXT){
            mupla_page.tblocks[b] = Get_TextBlock(block->u.text);
        }
        else{
            //printf("    type: %i\n", block->type);
        }
    }

    if(tp){fz_free_text_page(ctx, tp);}
    if(ld){fz_free_device(ld);}
    if(dl){fz_free(ctx, dl);}
    if(ts){fz_free_text_sheet(ctx, ts);}
    return mupla_page;
}

MuPlaDoc MuPlaRun(char* pdf_path){
    MuPlaDoc mupla_doc;
    printf("C MuPlaRun Ctx Bgn\n");
    printf(">>>> %s\n", pdf_path);
    fz_context* ctx = fz_new_context(NULL, NULL, FZ_STORE_UNLIMITED);
    fz_try(ctx){

	    fz_document* doc = NULL;
	    fz_register_document_handlers(ctx);
	    doc = fz_open_document(ctx, pdf_path);

	    int npages = fz_count_pages(doc);
	    int i;
	    mupla_doc.len = npages;
	    mupla_doc.pages = (MuPlaPage*)malloc(npages*sizeof(MuPlaPage));
	    printf("    C MuPlaRun Bgn\n");

	    for(i = 0; i < npages; ++i){
		printf("        Page: %i\n", i);
		fz_page* page = fz_load_page(doc, i);
		mupla_doc.pages[i] = Get_Page(ctx, doc, page);
		if(page){fz_free_page(doc,page);}
		//printf("\n");
	    }

	    printf("    C MuPlaRun End\n");
	    if(doc){fz_close_document(doc);}

    }
    fz_catch(ctx){
	    mupla_doc.len = 0;
    }
    if(ctx){fz_free_context(ctx);}
    printf("C MuPlaRun Ctx Freed\n");
    return mupla_doc;
}
