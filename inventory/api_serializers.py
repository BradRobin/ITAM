import datetime
import json

from django.utils import timezone

from inventory.constants import STATUS_TO_API, normalize_asset_payload
from inventory.models import Asset, Employee

__all__ = [
    "CustomJSONEncoder",
    "json_invalid_body",
    "json_permission_denied",
    "normalize_asset_payload",
    "serialize_asset",
    "serialize_employee",
    "serialize_temporal",
]


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        return super().default(obj)


def serialize_temporal(value):
    if not value:
        return None
    if hasattr(value, "hour"):
        return timezone.localtime(value).isoformat()
    return value.isoformat()


def serialize_employee(employee: Employee) -> dict:
    active_assets = Asset.objects.filter(
        assignments__employee=employee,
        assignments__date_returned__isnull=True,
    ).distinct()
    return {
        "id": employee.id,
        "name": employee.name,
        "department": employee.department,
        "department_abbreviation": employee.department_abbreviation,
        "email": employee.email,
        "assigned_assets_count": active_assets.count(),
        "assigned_assets": [
            {
                "id": asset.id,
                "name": asset.name,
                "type": asset.type,
                "serial_number": asset.serial_number,
                "status": STATUS_TO_API.get(asset.status, asset.status),
                "status_label": asset.status,
            }
            for asset in active_assets
        ],
    }


def serialize_asset(asset: Asset) -> dict:
    active_assignment = (
        asset.assignments.select_related("employee")
        .filter(date_returned__isnull=True)
        .first()
    )
    latest_assignment = asset.assignments.select_related("employee").first()
    date_assigned = (
        active_assignment.date_assigned
        if active_assignment
        else getattr(asset, "last_assigned_date", None)
    )
    date_returned = getattr(asset, "last_returned_date", None)

    if latest_assignment:
        date_assigned = latest_assignment.date_assigned
        date_returned = latest_assignment.date_returned

    return {
        "id": asset.id,
        "name": asset.name,
        "type": asset.type,
        "serial_number": asset.serial_number,
        "status": STATUS_TO_API.get(asset.status, asset.status),
        "status_label": asset.status,
        "assigned_employee": (
            serialize_employee(active_assignment.employee) if active_assignment else None
        ),
        "assignment_calendar": {
            "date_assigned": serialize_temporal(date_assigned),
            "date_returned": serialize_temporal(date_returned),
            "currently_assigned": active_assignment is not None,
        },
        "date_created": serialize_temporal(asset.date_created),
        "date_assigned": serialize_temporal(date_assigned),
        "date_returned": serialize_temporal(date_returned),
    }


def json_permission_denied():
    from django.http import JsonResponse

    return JsonResponse(
        {"detail": "You do not have permission to perform this action."},
        status=403,
    )


def json_invalid_body():
    from django.http import JsonResponse

    return JsonResponse({"detail": "Invalid JSON."}, status=400)
