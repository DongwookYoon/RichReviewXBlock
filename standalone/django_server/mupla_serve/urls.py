from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.get_pdf_post, name='get_pdf_post'),
]