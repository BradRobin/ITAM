import csv
import io
import uuid
from datetime import datetime

from django.db import transaction
from django.utils import timezone

from inventory.models import Asset, AssetCatalog, CatalogAsset, MaintenanceLog

CSV_HEADERS = [
    "Name",
    "Type",
    "Serial Number",
    "Status",
    "Last Maintenance Date",
]

HEADER_ALIASES = {
    "name": "name",
    "type": "type",
    "serial number": "serial_number",
    "serial": "serial_number",
    "status": "status",
    "last maintenance date": "last_maintenance_date",
    "last maintenance": "last_maintenance_date",
}

TYPE_TO_MODEL = {
    "laptop": Asset.AssetType.LAPTOP,
    "printer": Asset.AssetType.PRINTER,
    "router": Asset.AssetType.ROUTER,
    "monitor": Asset.AssetType.MONITOR,
}

STATUS_TO_MODEL = {
    "available": Asset.AssetStatus.AVAILABLE,
    "assigned": Asset.AssetStatus.ASSIGNED,
    "maintenance": Asset.AssetStatus.UNDER_MAINTENANCE,
    "under maintenance": Asset.AssetStatus.UNDER_MAINTENANCE,
}


class CSVImportError(Exception):
    def __init__(self, message: str, *, code: str = "invalid_csv"):
        super().__init__(message)
        self.code = code


def is_csv_upload(uploaded_file) -> bool:
    if not uploaded_file or not uploaded_file.name:
        return False
    return uploaded_file.name.lower().endswith(".csv")


def _normalize_header(value: str) -> str:
    return " ".join(str(value or "").strip().lower().replace("_", " ").split())


def _parse_maintenance_date(value: str):
    if not value or not str(value).strip():
        return None
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _normalize_type(value: str) -> str:
    normalized = TYPE_TO_MODEL.get(str(value or "").strip().lower())
    if not normalized:
        raise ValueError(f"Unknown asset type: {value}")
    return normalized


def _normalize_status(value: str) -> str:
    if not value or not str(value).strip():
        return Asset.AssetStatus.AVAILABLE
    normalized = STATUS_TO_MODEL.get(str(value).strip().lower())
    if not normalized:
        raise ValueError(f"Unknown status: {value}")
    return normalized


def parse_csv_upload(uploaded_file) -> list[dict]:
    if not is_csv_upload(uploaded_file):
        raise CSVImportError(
            "The chosen file was not a CSV, Try again.",
            code="not_csv",
        )

    raw = uploaded_file.read()
    if isinstance(raw, bytes):
        for encoding in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                text = raw.decode(encoding)
                break
            except UnicodeDecodeError:
                text = None
        if text is None:
            raise CSVImportError("Unable to read the CSV file encoding.")
    else:
        text = raw

    if not text.strip():
        raise CSVImportError("The CSV file is empty.")

    try:
        sample = text[:4096]
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel

    reader = csv.reader(io.StringIO(text), dialect)
    try:
        header_row = next(reader)
    except StopIteration:
        raise CSVImportError("The CSV file is empty.")

    column_map = {}
    for index, header in enumerate(header_row):
        key = HEADER_ALIASES.get(_normalize_header(header))
        if key:
            column_map[key] = index

    required = {"name", "type", "serial_number"}
    if not required.issubset(column_map):
        raise CSVImportError(
            "CSV must include columns: Name, Type, and Serial Number "
            "(matching the export format)."
        )

    rows = []
    for line_number, cells in enumerate(reader, start=2):
        if not any(str(cell).strip() for cell in cells):
            continue

        def cell(field: str) -> str:
            idx = column_map.get(field)
            if idx is None or idx >= len(cells):
                return ""
            return str(cells[idx]).strip()

        name = cell("name")
        serial = cell("serial_number")
        if not name or not serial:
            rows.append(
                {
                    "row": line_number,
                    "error": "Name and Serial Number are required.",
                }
            )
            continue

        try:
            asset_type = _normalize_type(cell("type"))
            status = _normalize_status(cell("status"))
        except ValueError as exc:
            rows.append({"row": line_number, "error": str(exc)})
            continue

        rows.append(
            {
                "row": line_number,
                "name": name,
                "type": asset_type,
                "serial_number": serial,
                "status": status,
                "last_maintenance_date": _parse_maintenance_date(
                    cell("last_maintenance_date")
                ),
            }
        )

    valid_rows = [row for row in rows if "error" not in row]
    if not valid_rows:
        raise CSVImportError("No valid asset rows were found in the CSV.")

    return rows


def _coerce_row(row: dict) -> dict:
    coerced = dict(row)
    value = coerced.get("last_maintenance_date")
    if isinstance(value, str):
        coerced["last_maintenance_date"] = _parse_maintenance_date(value)
    return coerced


def serialize_import_rows(rows: list[dict]) -> list[dict]:
    serialized = []
    for row in rows:
        payload = dict(row)
        value = payload.get("last_maintenance_date")
        if hasattr(value, "isoformat"):
            payload["last_maintenance_date"] = value.isoformat()
        serialized.append(payload)
    return serialized


def serialize_catalog_asset(asset: CatalogAsset) -> dict:
    return {
        "name": asset.name,
        "type": asset.type,
        "serial_number": asset.serial_number,
        "status": asset.status,
        "last_maintenance_date": (
            asset.last_maintenance_date.isoformat()
            if asset.last_maintenance_date
            else None
        ),
        "imported_at": asset.imported_at.isoformat() if asset.imported_at else None,
    }


def serialize_catalog(catalog: AssetCatalog) -> dict:
    assets = list(catalog.assets.all().order_by("name", "serial_number"))
    return {
        "id": catalog.pk,
        "name": catalog.name,
        "created_at": catalog.created_at.isoformat() if catalog.created_at else None,
        "asset_count": len(assets),
        "assets": [serialize_catalog_asset(asset) for asset in assets],
    }


def detect_serial_conflicts(rows: list[dict]) -> list[dict]:
    conflicts = []
    seen: dict[str, dict] = {}

    for row in rows:
        if "error" in row:
            continue
        serial_key = row["serial_number"].lower()
        if serial_key in seen:
            conflicts.append(
                {
                    "serial": row["serial_number"],
                    "upload_name": row["name"],
                    "conflict_type": "duplicate_in_file",
                    "other_upload_name": seen[serial_key]["name"],
                    "existing_id": None,
                    "existing_name": None,
                }
            )
            continue
        seen[serial_key] = row

        existing = Asset.objects.filter(serial_number__iexact=row["serial_number"]).first()
        if existing:
            conflicts.append(
                {
                    "serial": row["serial_number"],
                    "upload_name": row["name"],
                    "conflict_type": "existing_asset",
                    "existing_id": existing.pk,
                    "existing_name": existing.name,
                }
            )

    deduped = []
    seen_serials = set()
    for conflict in conflicts:
        key = (conflict["serial"].lower(), conflict.get("conflict_type"))
        if key in seen_serials:
            continue
        seen_serials.add(key)
        deduped.append(conflict)
    return deduped


def _unique_serial(serial: str, *, exclude_pk: int | None = None) -> str:
    candidate = serial
    suffix = 1
    while Asset.objects.filter(serial_number__iexact=candidate).exclude(pk=exclude_pk).exists():
        candidate = f"{serial}-import-{suffix}"
        suffix += 1
    return candidate


def _apply_maintenance_date(asset: Asset, maintenance_date):
    if not maintenance_date:
        return
    MaintenanceLog.objects.create(
        asset=asset,
        issue_description="Imported maintenance record",
        technician="CSV Import",
        date=maintenance_date,
        resolved=True,
    )


@transaction.atomic
def execute_import(
    rows: list[dict],
    *,
    mode: str,
    catalog_name: str = "",
    resolutions: dict | None = None,
    user=None,
) -> dict:
    resolutions = resolutions or {}
    valid_rows = [row for row in rows if "error" not in row]
    created = 0
    updated = 0
    skipped = 0
    errors = []

    if mode == "catalog":
        name = (catalog_name or "").strip()
        if not name:
            raise CSVImportError("A table name is required for a new directory.")
        if AssetCatalog.objects.filter(name__iexact=name).exists():
            raise CSVImportError(f'A directory named "{name}" already exists.')
        catalog = AssetCatalog.objects.create(name=name, created_by=user)
        catalog_serials: set[str] = set()

        for row in valid_rows:
            row = _coerce_row(row)
            serial = row["serial_number"]
            if serial.lower() in catalog_serials:
                serial = f"{serial}-import-{uuid.uuid4().hex[:6]}"
            catalog_serials.add(serial.lower())
            CatalogAsset.objects.create(
                catalog=catalog,
                name=row["name"],
                type=row["type"],
                serial_number=serial,
                status=row["status"],
                last_maintenance_date=row.get("last_maintenance_date"),
            )
            created += 1

        return {
            "mode": "catalog",
            "catalog_id": catalog.pk,
            "catalog_name": catalog.name,
            "catalog": serialize_catalog(catalog),
            "created": created,
            "updated": 0,
            "skipped": skipped,
            "errors": errors,
        }

    if mode != "merge":
        raise CSVImportError("Invalid import mode.")

    for row in valid_rows:
        row = _coerce_row(row)
        serial = row["serial_number"]
        existing = Asset.objects.filter(serial_number__iexact=serial).first()
        resolution = resolutions.get(serial, "add_new")

        if existing and resolution == "replace":
            existing.name = row["name"]
            existing.type = row["type"]
            existing.status = row["status"]
            existing.save(update_fields=["name", "type", "status"])
            if row.get("last_maintenance_date"):
                _apply_maintenance_date(existing, row["last_maintenance_date"])
            updated += 1
            continue

        if existing and resolution != "replace":
            serial = _unique_serial(serial)

        if Asset.objects.filter(serial_number__iexact=serial).exists():
            errors.append(
                {
                    "row": row["row"],
                    "message": f"Could not import {row['name']}: serial already exists.",
                }
            )
            skipped += 1
            continue

        asset = Asset.objects.create(
            name=row["name"],
            type=row["type"],
            serial_number=serial,
            status=row["status"],
        )
        if row.get("last_maintenance_date"):
            _apply_maintenance_date(asset, row["last_maintenance_date"])
        created += 1

    return {
        "mode": "merge",
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
    }
