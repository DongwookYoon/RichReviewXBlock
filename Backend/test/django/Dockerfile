FROM python:2.7

COPY ./mupla_core.tar.gz /richreview/mupla_core.tar.gz

RUN pip install Django==1.8 \
    && pip install PyPDF2==1.24 \
    && cd /richreview \
    && tar -xvzf mupla_core.tar.gz \
    && cd mupla_core/mupla \
    && make 

CMD cd /richreview/mupla_core/django_server \
    && python manage.py runserver 0.0.0.0:5000
LABEL version="1.0"