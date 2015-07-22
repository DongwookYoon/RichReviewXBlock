all:
	if [ ! -d "./mupdf-1.6-source" ]; then tar -zxvf mupdf-1.6-source.tar.gz; fi
	$(MAKE) -C ./mupdf-1.6-source mupla
	$(MAKE) -C ./mupla

clean:
	if [ -d "./mupdf-1.6-source" ]; then $(MAKE) -C ./mupdf-1.6-source clean; fi
	$(MAKE) -C ./mupla clean

