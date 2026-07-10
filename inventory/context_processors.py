from .services.notifications import get_display_notifications, get_unread_count
from .services.avatars import get_user_avatar_urls
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


def avatar_context(request):
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        return {
            "user_avatar_url_small": "",
            "user_avatar_url_medium": "",
            "user_avatar_url_large": "",
        }

    session_key = f"avatar_urls_{request.user.id}"
    avatar_urls = request.session.get(session_key)
    if not avatar_urls:
        avatar_urls = get_user_avatar_urls(request.user)
        request.session[session_key] = avatar_urls
        request.session.modified = True

    return {
        "user_avatar_url_small": avatar_urls["small"],
        "user_avatar_url_medium": avatar_urls["medium"],
        "user_avatar_url_large": avatar_urls["large"],
    }
