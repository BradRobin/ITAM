"""Shared asset type/status normalization for views and import services."""

from inventory.models import Asset

STATUS_TO_API = {
    Asset.AssetStatus.AVAILABLE: "available",
    Asset.AssetStatus.ASSIGNED: "assigned",
    Asset.AssetStatus.UNDER_MAINTENANCE: "maintenance",
}

STATUS_TO_MODEL = {
    "available": Asset.AssetStatus.AVAILABLE,
    "assigned": Asset.AssetStatus.ASSIGNED,
    "maintenance": Asset.AssetStatus.UNDER_MAINTENANCE,
    "under maintenance": Asset.AssetStatus.UNDER_MAINTENANCE,
    Asset.AssetStatus.AVAILABLE.lower(): Asset.AssetStatus.AVAILABLE,
    Asset.AssetStatus.ASSIGNED.lower(): Asset.AssetStatus.ASSIGNED,
    Asset.AssetStatus.UNDER_MAINTENANCE.lower(): Asset.AssetStatus.UNDER_MAINTENANCE,
}

TYPE_TO_MODEL = {
    "laptop": Asset.AssetType.LAPTOP,
    "printer": Asset.AssetType.PRINTER,
    "router": Asset.AssetType.ROUTER,
    "monitor": Asset.AssetType.MONITOR,
}


def normalize_asset_type(value: str):
    if not value:
        return value
    return TYPE_TO_MODEL.get(str(value).lower(), value)


def normalize_asset_status(value: str):
    if not value:
        return Asset.AssetStatus.AVAILABLE
    return STATUS_TO_MODEL.get(str(value).lower(), value)


def filter_assets_by_type_status(queryset, *, asset_type=None, status=None):
    if asset_type:
        queryset = queryset.filter(type=normalize_asset_type(asset_type))
    if status:
        queryset = queryset.filter(status=normalize_asset_status(status))
    return queryset


def normalize_asset_payload(payload: dict) -> dict:
    normalized = payload.copy()
    if "status" in normalized or normalized.get("status") is not None:
        normalized["status"] = normalize_asset_status(normalized.get("status"))
    else:
        normalized["status"] = Asset.AssetStatus.AVAILABLE
    if normalized.get("type"):
        normalized["type"] = normalize_asset_type(normalized["type"])
    return normalized
