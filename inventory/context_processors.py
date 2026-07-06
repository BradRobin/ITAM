from .services.notifications import get_display_notifications, get_unread_count
from .version import ITAM_PRODUCT_NAME, ITAM_VERSION


def itam_version_context(request):
    return {
        "itam_version": ITAM_VERSION,
        "itam_product_name": ITAM_PRODUCT_NAME,
    }


def notification_context(request):
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        return {
            "recent_notifications": [],
            "unread_notifications": 0,
        }

    notifications = get_display_notifications(request)
    return {
        "recent_notifications": notifications[:10],
        "unread_notifications": get_unread_count(request),
    }
