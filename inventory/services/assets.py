from django.db.models import Prefetch

from ..models import Asset, Assignment, MaintenanceLog
from .dates import format_duration_since, format_duration_until


def _active_maintenance_log(asset):
    logs = list(asset.maintenance_logs.all())
    if not logs:
        return None

    for log in logs:
        if not log.resolved:
            return log
    return logs[0]


def get_asset_list_sections():
    assigned_rows = [
        {
            "name": assignment.asset.name,
            "type": assignment.asset.type,
            "assignee": assignment.employee.name,
            "date_assigned": assignment.date_assigned,
            "expected_return_date": assignment.expected_return_date,
            "asset_pk": assignment.asset.pk,
        }
        for assignment in Assignment.objects.filter(date_returned__isnull=True)
        .select_related("asset", "employee")
        .order_by("asset__name", "asset__serial_number")
    ]

    available_rows = [
        {
            "name": asset.name,
            "type": asset.type,
            "available_since": format_duration_since(asset.date_created),
            "asset_pk": asset.pk,
        }
        for asset in Asset.objects.filter(status=Asset.AssetStatus.AVAILABLE).order_by(
            "name", "serial_number"
        )
    ]

    maintenance_assets = (
        Asset.objects.filter(status=Asset.AssetStatus.UNDER_MAINTENANCE)
        .prefetch_related(
            Prefetch(
                "maintenance_logs",
                queryset=MaintenanceLog.objects.order_by("-date", "-id"),
            )
        )
        .order_by("name", "serial_number")
    )
    maintenance_rows = []
    for asset in maintenance_assets:
        log = _active_maintenance_log(asset)
        maintenance_rows.append(
            {
                "name": asset.name,
                "type": asset.type,
                "repair_shop": log.repair_shop if log and log.repair_shop else "—",
                "worker_contact": (
                    log.worker_contact if log and log.worker_contact else "—"
                ),
                "repair_period": (
                    format_duration_until(log.expected_completion_date)
                    if log and log.expected_completion_date
                    else "—"
                ),
                "asset_pk": asset.pk,
            }
        )

    def type_rows(asset_type):
        return [
            {
                "name": asset.name,
                "type": asset.type,
                "serial_number": asset.serial_number,
                "status": asset.status,
                "asset_pk": asset.pk,
            }
            for asset in Asset.objects.filter(type=asset_type).order_by(
                "name", "serial_number"
            )
        ]

    return {
        "assigned_asset_rows": assigned_rows,
        "available_asset_rows": available_rows,
        "maintenance_asset_rows": maintenance_rows,
        "laptop_rows": type_rows(Asset.AssetType.LAPTOP),
        "monitor_rows": type_rows(Asset.AssetType.MONITOR),
        "printer_rows": type_rows(Asset.AssetType.PRINTER),
        "router_rows": type_rows(Asset.AssetType.ROUTER),
    }
