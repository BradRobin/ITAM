import calendar
import datetime
import json

from django.db.models import Count, Exists, Max, OuterRef, Q
from django.db.models.functions import TruncMonth
from django.urls import reverse
from django.utils import timezone

from inventory.models import Asset, Assignment, Employee, MaintenanceLog
from inventory.services.ecosystem_map import get_ecosystem_map_json
from inventory.services.notifications import get_recent_activities

# Fixed four buckets per month: days 1-7, 8-14, 15-21, 22-end.
WEEK_DAY_RANGES = (
    (1, 7),
    (8, 14),
    (15, 21),
    (22, 31),
)


def calculate_percentage(value: int, total: int, *, digits: int = 0):
    if not total:
        return 0
    percentage = (value / total) * 100
    return round(percentage, digits) if digits else round(percentage)


def format_ratio(value: int, total: int) -> str:
    return f"{value} of {total}"


def get_asset_counts() -> dict:
    return Asset.objects.aggregate(
        total_assets=Count("id"),
        available_assets=Count(
            "id",
            filter=Q(status=Asset.AssetStatus.AVAILABLE),
        ),
        assigned_assets=Count(
            "id",
            filter=Q(status=Asset.AssetStatus.ASSIGNED),
        ),
        maintenance_assets=Count(
            "id",
            filter=Q(status=Asset.AssetStatus.UNDER_MAINTENANCE),
        ),
    )


def get_service_overdue_cutoff():
    return timezone.now() - datetime.timedelta(days=Asset.SERVICE_INTERVAL_DAYS)


def get_overdue_assets_queryset():
    overdue_cutoff = get_service_overdue_cutoff().date()
    created_cutoff = get_service_overdue_cutoff()
    recent_maintenance = MaintenanceLog.objects.filter(
        asset=OuterRef("pk"),
        date__gte=overdue_cutoff,
    )
    return (
        Asset.objects.annotate(
            has_recent_maintenance=Exists(recent_maintenance),
            last_maintenance_date=Max("maintenance_logs__date"),
        )
        .filter(has_recent_maintenance=False)
        .filter(
            Q(last_maintenance_date__lt=overdue_cutoff)
            | Q(last_maintenance_date__isnull=True, date_created__lt=created_cutoff)
        )
        .order_by("name", "serial_number")
    )


def get_analytics_payload(counts: dict | None = None) -> dict:
    """Chart-ready analytics as Python objects (shared by dashboard and reports)."""
    counts = counts or get_asset_counts()
    assigned_assets = counts["assigned_assets"]
    maintenance_assets = counts["maintenance_assets"]

    type_labels = dict(Asset.AssetType.choices)
    asset_by_type = {
        type_labels.get(row["type"], row["type"]): row["total"]
        for row in Asset.objects.values("type").annotate(total=Count("id")).order_by("type")
        if row["total"] > 0
    }
    asset_by_status = {
        "Available": counts["available_assets"],
        "Assigned": assigned_assets,
        "Under Maintenance": maintenance_assets,
    }

    month_starts = _last_month_starts()
    monthly_assets = _serialize_month_counts(Asset.objects.all(), "date_created", month_starts)
    maintenance_by_month = _serialize_month_counts(
        MaintenanceLog.objects.all(),
        "date",
        month_starts,
    )
    weekly_asset_growth = _serialize_weekly_asset_growth(month_count=12)
    top_assets = [
        {
            "name": asset.name,
            "assignments": asset.assignment_count,
        }
        for asset in Asset.objects.annotate(
            assignment_count=Count("assignments"),
        ).order_by("-assignment_count", "name")[:5]
    ]
    top_employees = [
        {
            "name": employee.name,
            "department": employee.department or "Unassigned",
            "assets": employee.active_asset_count,
        }
        for employee in Employee.objects.annotate(
            active_asset_count=Count(
                "assignments",
                filter=Q(assignments__date_returned__isnull=True),
            ),
        )
        .filter(active_asset_count__gt=0)
        .order_by("-active_asset_count", "name")[:8]
    ]
    department_counts = {
        row["department"] or "Unassigned": row["total"]
        for row in Employee.objects.values("department").annotate(total=Count("id")).order_by("department")
    }

    return {
        "asset_by_type": asset_by_type,
        "asset_by_status": asset_by_status,
        "monthly_assets": monthly_assets,
        "maintenance_by_month": maintenance_by_month,
        "weekly_asset_growth": weekly_asset_growth,
        "top_assets": top_assets,
        "top_employees": top_employees,
        "department_counts": department_counts,
        "total_assignments": Assignment.objects.count(),
    }


BUSY_DAY_ACTIVITY_THRESHOLD = 3


def get_today_activity_count(user) -> int:
    """Count fleet actions the signed-in user performed today."""
    if user is None or not getattr(user, "is_authenticated", False):
        return 0

    today = timezone.localdate()
    start = timezone.make_aware(datetime.datetime.combine(today, datetime.time.min))
    end = start + datetime.timedelta(days=1)

    assets_today = Asset.objects.filter(
        created_by=user,
        date_created__gte=start,
        date_created__lt=end,
    ).count()
    assignments_today = Assignment.objects.filter(
        created_by=user,
        date_assigned__gte=start,
        date_assigned__lt=end,
    ).count()
    returns_today = Assignment.objects.filter(
        created_by=user,
        date_returned__gte=start,
        date_returned__lt=end,
    ).count()
    maintenance_today = MaintenanceLog.objects.filter(
        created_by=user,
        date=today,
    ).count()

    return assets_today + assignments_today + returns_today + maintenance_today


def get_dashboard_context(user=None) -> dict:
    counts = get_asset_counts()
    total_assets = counts["total_assets"]
    available_assets = counts["available_assets"]
    assigned_assets = counts["assigned_assets"]
    maintenance_assets = counts["maintenance_assets"]
    employee_count = Employee.objects.count()
    overdue_assets = get_overdue_assets_queryset()
    asset_list_url = reverse("asset_list")
    analytics = get_analytics_payload(counts)
    today_activity_count = get_today_activity_count(user)
    recent_activities = get_recent_activities(user)

    return {
        **counts,
        "employee_count": employee_count,
        "total_employees": employee_count,
        "today_activity_count": today_activity_count,
        "busy_day_threshold": BUSY_DAY_ACTIVITY_THRESHOLD,
        "recent_activities": recent_activities,
        "status_counts": Asset.objects.values("status").annotate(total=Count("id")),
        "asset_summary": counts,
        "overdue_assets": overdue_assets,
        "overdue_assets_count": overdue_assets.count(),
        "overdue_cutoff": get_service_overdue_cutoff().date(),
        "utilization_rate": calculate_percentage(assigned_assets, total_assets),
        "asset_health_rate": calculate_percentage(total_assets - maintenance_assets, total_assets),
        "total_assignments": analytics["total_assignments"],
        "analytics": analytics,
        "dashboard_stats": [
            {
                "label": "Total assets",
                "value": total_assets,
                "trend": "Every asset in the inventory",
                "css_class": "stat-total",
                "icon": "fa-boxes",
                "data_count": total_assets,
                "animate_count": True,
                "link": asset_list_url,
            },
            {
                "label": "Available",
                "value": format_ratio(available_assets, total_assets),
                "trend": "Ready to assign right now",
                "css_class": "stat-available",
                "icon": "fa-check-circle",
                "link": f"{asset_list_url}#available-assets",
            },
            {
                "label": "Assigned",
                "value": format_ratio(assigned_assets, total_assets),
                "trend": "Checked out to employees",
                "css_class": "stat-assigned",
                "icon": "fa-user-check",
                "link": f"{asset_list_url}#assigned-assets",
            },
            {
                "label": "Under maintenance",
                "value": format_ratio(maintenance_assets, total_assets),
                "trend": "In service or repair",
                "css_class": "stat-maintenance",
                "icon": "fa-tools",
                "link": f"{asset_list_url}#maintenance-assets",
            },
        ],
    }


def _month_start(value):
    return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _add_months(value, months: int):
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return value.replace(year=year, month=month, day=1)


def _last_month_starts(count: int = 6):
    current_month = _month_start(timezone.now())
    return [_add_months(current_month, offset) for offset in range(-(count - 1), 1)]


def _serialize_month_counts(queryset, date_field: str, month_starts: list):
    first_month = month_starts[0]
    next_month = _add_months(month_starts[-1], 1)
    model_field = queryset.model._meta.get_field(date_field)
    if model_field.get_internal_type() == "DateField":
        lower_bound = first_month.date()
        upper_bound = next_month.date()
    else:
        lower_bound = first_month
        upper_bound = next_month
    rows = (
        queryset.filter(**{f"{date_field}__gte": lower_bound, f"{date_field}__lt": upper_bound})
        .annotate(month=TruncMonth(date_field))
        .values("month")
        .annotate(count=Count("id"))
    )
    counts_by_month = {
        row["month"].date() if hasattr(row["month"], "date") else row["month"]: row["count"]
        for row in rows
    }
    return [
        {
            "month": month_start.strftime("%b %Y"),
            "count": counts_by_month.get(month_start.date(), 0),
        }
        for month_start in month_starts
    ]


def _week_bounds_for_month(year: int, month: int) -> list[tuple[datetime.date, datetime.date]]:
    last_day = calendar.monthrange(year, month)[1]
    bounds = []
    for start_day, end_day in WEEK_DAY_RANGES:
        week_end = min(end_day, last_day)
        if start_day > last_day:
            continue
        bounds.append(
            (
                datetime.date(year, month, start_day),
                datetime.date(year, month, week_end),
            )
        )
    # Always expose 4 weeks; pad if a short month somehow truncates.
    while len(bounds) < 4:
        last_start, last_end = bounds[-1]
        bounds.append((last_end, last_end))
    return bounds[:4]


def _serialize_weekly_asset_growth(*, month_count: int = 12) -> dict:
    """Asset creations by week (1-4) for a continuous month switcher."""
    month_starts = _last_month_starts(month_count)
    first_month = month_starts[0]
    next_month = _add_months(month_starts[-1], 1)
    created_dates = list(
        Asset.objects.filter(
            date_created__gte=first_month,
            date_created__lt=next_month,
        ).values_list("date_created", flat=True)
    )
    local_dates = []
    for value in created_dates:
        if timezone.is_aware(value):
            value = timezone.localtime(value)
        local_dates.append(value.date())

    months = []
    for month_start in month_starts:
        year = month_start.year
        month = month_start.month
        week_bounds = _week_bounds_for_month(year, month)
        weeks = []
        for index, (week_start, week_end) in enumerate(week_bounds, start=1):
            count = sum(1 for day in local_dates if week_start <= day <= week_end)
            weeks.append(
                {
                    "week": index,
                    "label": f"Week {index}",
                    "count": count,
                }
            )
        months.append(
            {
                "key": month_start.strftime("%Y-%m"),
                "label": month_start.strftime("%b %Y"),
                "weeks": weeks,
            }
        )

    default_month = months[-1]["key"] if months else None
    return {
        "months": months,
        "default_month": default_month,
    }


def get_reports_context(user=None) -> dict:
    counts = get_asset_counts()
    total_assets = counts["total_assets"]
    assigned_assets = counts["assigned_assets"]
    maintenance_assets = counts["maintenance_assets"]
    total_employees = Employee.objects.count()
    analytics = get_analytics_payload(counts)
    utilization_rate = calculate_percentage(assigned_assets, total_assets, digits=1)
    asset_health_rate = calculate_percentage(total_assets - maintenance_assets, total_assets)

    return {
        **counts,
        "total_employees": total_employees,
        "asset_by_type": json.dumps(analytics["asset_by_type"]),
        "asset_by_status": json.dumps(analytics["asset_by_status"]),
        "monthly_assets": json.dumps(analytics["monthly_assets"]),
        "maintenance_by_month": json.dumps(analytics["maintenance_by_month"]),
        "top_assets_data": json.dumps(analytics["top_assets"]),
        "department_counts": json.dumps(analytics["department_counts"]),
        "ecosystem_map": (
            get_ecosystem_map_json(user)
            if user
            else json.dumps({"nodes": [], "edges": [], "expansions": {}, "meta": {}})
        ),
        "utilization_rate": utilization_rate,
        "asset_health_rate": asset_health_rate,
        "overdue_count": get_overdue_assets_queryset().count(),
        "total_assignments": analytics["total_assignments"],
    }
