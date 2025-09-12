from django.urls import path
from .views import SendCodeView, RiderPhotoUploadView

urlpatterns = [
    path('delivery/send-code', SendCodeView.as_view(), name='delivery-send-code'),
    path('send-delivery-code', SendCodeView.as_view(), name='legacy-send-delivery-code'),
    path('delivery/rider-photo', RiderPhotoUploadView.as_view(), name='delivery-rider-photo'),
    path('upload-rider-photo', RiderPhotoUploadView.as_view(), name='legacy-upload-rider-photo'),
]
