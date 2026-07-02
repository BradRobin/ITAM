import secrets

from django.utils import timezone

from inventory.models import Asset

TYPE_CODES = {
    Asset.AssetType.LAPTOP: "LAP",
    Asset.AssetType.PRINTER: "PRT",
    Asset.AssetType.ROUTER: "RTR",
    Asset.AssetType.MONITOR: "MON",
}


def _build_candidate(asset_type: str) -> str:
    date_part = timezone.localdate().strftime("%y%m%d")
    type_part = TYPE_CODES.get(asset_type, "AST")
    random_part = secrets.token_hex(3).upper()
    return f"ITAM-{type_part}-{date_part}-{random_part}"


def generate_unique_serial_numbers(*, count: int = 8, asset_type: str | None = None) -> list[str]:
    """Return up to `count` serial numbers not present in the database."""
    if count <= 0:
        return []

    existing = {
        serial.lower()
        for serial in Asset.objects.values_list("serial_number", flat=True)
        if serial
    }
    results: list[str] = []
    max_attempts = max(count * 20, 40)
    attempts = 0

    while len(results) < count and attempts < max_attempts:
        attempts += 1
        candidate = _build_candidate(asset_type or Asset.AssetType.LAPTOP)
        if candidate.lower() in existing:
            continue
        if candidate in results:
            continue
        results.append(candidate)

    return results


def build_serial_suggestion_payload(*, per_type: int = 8) -> dict:
    suggestions = []
    for asset_type, _label in Asset.AssetType.choices:
        for serial_number in generate_unique_serial_numbers(
            count=per_type,
            asset_type=asset_type,
        ):
            suggestions.append(
                {
                    "asset_type": asset_type,
                    "serial_number": serial_number,
                }
            )
    return {"suggestions": suggestions}
