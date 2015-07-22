CC=gcc
LDFLAGS=
INC= -I../mupdf-1.6-source/include
OBJ_PATH = ../mupdf-1.6-source/build/debug/
OBJ= $(OBJ_PATH)**/*.o $(OBJ_PATH)libmupdf.a 

all: clean mupla.o mupla.so

testall: test runtest

mupla.o: mupla.c
	$(CC) -c mupla.c -fPIC $(INC) -lm $(LDFLAG)

mupla.so: mupla.o $(OBJ)
	$(CC) -shared -o mupla.so mupla.o $(OBJ) 

test: test.c
	$(CC) -o test test.c -L. $(INC) mupla.so -lm $(LDFLAGS)

clean:
	rm -f mupla.o mupla.so test

runtest:
	./test
