from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('inventory.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler400 = "inventory.views.error_bad_request"
handler403 = "inventory.views.error_permission_denied"
handler404 = "inventory.views.error_not_found"
handler500 = "inventory.views.error_server_error"