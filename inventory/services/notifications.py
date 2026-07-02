import datetime

from django.utils import timezone


MAX_SESSION_NOTIFICATIONS = 100


def _get_session_notifications(request) -> list:
    return list(request.session.get("notifications", []))


def _next_notification_id(notifications: list) -> int:
    existing_ids = [
        notification.get("id", 0)
        for notification in notifications
        if isinstance(notification.get("id", 0), int)
    ]
    return (max(existing_ids) if existing_ids else 0) + 1


def add_session_notification(
    request,
    *,
    notification_type: str,
    title: str,
    message: str,
    link: str | None = None,
    source: str = "system",
) -> dict:
    notifications = _get_session_notifications(request)
    notification = {
        "id": _next_notification_id(notifications),
        "type": notification_type,
        "title": title,
        "message": message,
        "time": timezone.now().isoformat(),
        "read": False,
        "link": link,
        "source": source,
    }
    notifications.insert(0, notification)
    request.session["notifications"] = notifications[:MAX_SESSION_NOTIFICATIONS]
    request.session.modified = True
    return notification


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
    display_notifications = []
    for notification in _get_session_notifications(request):
        notification_copy = notification.copy()
        notification_copy["time"] = parse_notification_time(notification_copy.get("time"))
        display_notifications.append(notification_copy)
    return display_notifications


def get_unread_count(request) -> int:
    return sum(
        1
        for notification in _get_session_notifications(request)
        if not notification.get("read", False)
    )


def mark_all_notifications_read(request) -> list:
    notifications = _get_session_notifications(request)
    for notification in notifications:
        notification["read"] = True
    request.session["notifications"] = notifications
    request.session.modified = True
    return notifications


def mark_notification_read(request, notification_id: int) -> list:
    notifications = _get_session_notifications(request)
    for notification in notifications:
        if notification.get("id") == notification_id:
            notification["read"] = True
            break
    request.session["notifications"] = notifications
    request.session.modified = True
    return notifications
