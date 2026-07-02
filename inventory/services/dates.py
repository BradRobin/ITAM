import datetime

from django.utils import timezone


def _to_date(value):
    if value is None:
        return None
    if isinstance(value, datetime.datetime):
        if timezone.is_aware(value):
            return timezone.localtime(value).date()
        return value.date()
    return value


def _duration_parts(start, end):
    start = _to_date(start)
    end = _to_date(end)

    if start is None or end is None:
        return []

    if end < start:
        start, end = end, start

    years = end.year - start.year
    months = end.month - start.month
    days = end.day - start.day

    if days < 0:
        months -= 1
        previous_month = end.replace(day=1) - datetime.timedelta(days=1)
        days += previous_month.day

    if months < 0:
        years -= 1
        months += 12

    weeks = days // 7
    days = days % 7

    parts = []
    if years:
        parts.append(f"{years} yr{'s' if years != 1 else ''}")
    if months:
        parts.append(f"{months} month{'s' if months != 1 else ''}")
    if weeks:
        parts.append(f"{weeks} wk{'s' if weeks != 1 else ''}")
    if days and len(parts) < 2:
        parts.append(f"{days} day{'s' if days != 1 else ''}")

    if not parts:
        return ["0 days"]

    return parts[:2]


def format_duration_between(start, end=None):
    if end is None:
        end = timezone.localdate()
    parts = _duration_parts(start, end)
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]} & {parts[1]}"


def format_duration_since(start):
    return format_duration_between(start, timezone.localdate())


def format_duration_until(end):
    end = _to_date(end)
    if end is None:
        return "—"

    today = timezone.localdate()
    if end < today:
        return f"Overdue by {format_duration_between(end, today)}"
    if end == today:
        return "Due today"
    return format_duration_between(today, end)
