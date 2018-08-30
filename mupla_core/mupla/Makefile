all: clean
	if [ ! -d "./mupdf-1.6-source" ]; then tar -zxvf mupdf-1.6-source.tar.gz; fi
	$(MAKE) -C ./mupdf-1.6-source mupla
	$(MAKE) -C ./mupla
	# CHANGES: 20180505
	# cp ./mupla/mupla.so ./../richreview/mupla_ctype/mupla.so
	cp ./mupla/mupla.so ./../mupla_ctype/mupla.so

clean:
	if [ -d "./mupdf-1.6-source" ]; then rm -r mupdf-1.6-source; fi
	$(MAKE) -C ./mupla clean

