from __future__ import annotations

import logging
import urllib.error
import urllib.request
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


class SupabaseStorageError(Exception):
    pass


def is_configured() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)


def extension_for_upload(uploaded_file) -> str:
    content_type = getattr(uploaded_file, "content_type", "") or ""
    if content_type in CONTENT_TYPE_EXTENSIONS:
        return CONTENT_TYPE_EXTENSIONS[content_type]

    name = getattr(uploaded_file, "name", "") or ""
    suffix = Path(name).suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
        return ".jpg" if suffix == ".jpeg" else suffix
    return ".jpg"


def avatar_storage_key(user_id: int, uploaded_file) -> str:
    return f"user_{user_id}{extension_for_upload(uploaded_file)}"


def public_avatar_url(storage_key: str) -> str:
    base = settings.SUPABASE_URL.rstrip("/")
    bucket = settings.SUPABASE_AVATAR_BUCKET
    return f"{base}/storage/v1/object/public/{bucket}/{storage_key}"


def _request(method: str, url: str, *, data: bytes | None = None, headers: dict | None = None) -> None:
    request_headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
    }
    if headers:
        request_headers.update(headers)

    request = urllib.request.Request(url, data=data, method=method, headers=request_headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        logger.error("Supabase storage %s failed (%s): %s", method, exc.code, detail)
        raise SupabaseStorageError("Unable to save avatar to storage.") from exc
    except urllib.error.URLError as exc:
        logger.error("Supabase storage %s failed: %s", method, exc)
        raise SupabaseStorageError("Unable to reach avatar storage.") from exc


def upload_avatar(user_id: int, uploaded_file) -> str:
    if not is_configured():
        raise SupabaseStorageError("Supabase storage is not configured.")

    bucket = settings.SUPABASE_AVATAR_BUCKET
    storage_key = avatar_storage_key(user_id, uploaded_file)
    content_type = getattr(uploaded_file, "content_type", "") or "application/octet-stream"
    upload_url = (
        f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{storage_key}"
    )
    file_bytes = uploaded_file.read()

    _request(
        "POST",
        upload_url,
        data=file_bytes,
        headers={
            "Content-Type": content_type,
            "x-upsert": "true",
        },
    )
    return public_avatar_url(storage_key)


def delete_avatar(storage_key: str) -> None:
    if not is_configured() or not storage_key:
        return

    bucket = settings.SUPABASE_AVATAR_BUCKET
    delete_url = (
        f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{storage_key}"
    )
    try:
        _request("DELETE", delete_url)
    except SupabaseStorageError:
        logger.warning("Failed to delete avatar object %s", storage_key, exc_info=True)


def storage_key_from_avatar_url(avatar_url: str) -> str:
    if not avatar_url:
        return ""

    bucket = settings.SUPABASE_AVATAR_BUCKET
    marker = f"/object/public/{bucket}/"
    if marker in avatar_url:
        return avatar_url.split(marker, 1)[1].split("?", 1)[0]
    return ""
