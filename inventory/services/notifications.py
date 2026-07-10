import datetime
from django.utils import timezone
from inventory.models import AdminNotification


def add_session_notification(
    request,
    *,
    notification_type: str,
    title: str,
    message: str,
    link: str | None = None,
    source: str = "system",
) -> dict:
    if request.user.is_authenticated:
        notif = AdminNotification.objects.create(
            user=request.user,
            type=notification_type,
            title=title,
            message=message,
            link=link or "",
        )
        return {
            "id": notif.id,
            "type": notif.type,
            "title": notif.title,
            "message": notif.message,
            "time": notif.created_at.isoformat(),
            "read": notif.read,
            "link": notif.link,
            "source": source,
        }
    return {}


def parse_notification_time(value):
    if isinstance(value, datetime.datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return timezone.now()
    return timezone.now()


def get_display_notifications(request) -> list:
    if not request.user.is_authenticated:
        return []
    return [
        {
            "id": notif.id,
            "type": notif.type,
            "title": notif.title,
            "message": notif.message,
            "time": notif.created_at,
            "read": notif.read,
            "link": notif.link,
            "source": "system",
        }
        for notif in AdminNotification.objects.filter(user=request.user)[:100]
    ]


def get_unread_count(request) -> int:
    if not request.user.is_authenticated:
        return 0
    return AdminNotification.objects.filter(user=request.user, read=False).count()


def mark_all_notifications_read(request) -> list:
    if not request.user.is_authenticated:
        return []
    AdminNotification.objects.filter(user=request.user, read=False).update(read=True)
    return get_display_notifications(request)


def mark_notification_read(request, notification_id: int) -> list:
    if not request.user.is_authenticated:
        return []
    try:
        notif_id = int(notification_id)
    except (ValueError, TypeError):
        return get_display_notifications(request)

    AdminNotification.objects.filter(user=request.user, id=notif_id).update(read=True)
    return get_display_notifications(request)
