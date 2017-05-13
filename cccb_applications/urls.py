"""cccb_applications URL Configuration
"""
from django.conf.urls import url, include
from django.contrib import admin
from django.contrib.auth import views as auth_views

import views

urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'^cccb-admin/', include('client_setup.urls')),
    url(r'^$', views.index),
    url(r'^analysis/', include('analysis_portal.urls')),
    url(r'^upload/', include('uploader.urls')),
    url(r'^unauthorized/', views.unauthorized, name='unauthorized'),
    url(r'^callback/', views.oauth2_callback),
    url(r'^login/', views.login),
    url(r'^google-login/', views.google_login),
]
