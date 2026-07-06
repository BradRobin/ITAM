from __future__ import annotations

from urllib.parse import quote

from django.core.exceptions import ValidationError

from ..models import UserProfile

MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_AVATAR_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}


class AvatarValidationError(ValidationError):
    pass


def ui_avatar_url(user, size: int = 128) -> str:
    label = (getattr(user, "first_name", None) or getattr(user, "username", None) or "User").strip()
    if not label:
        label = "User"
    name = quote(label)
    return (
        f"https://ui-avatars.com/api/?name={name}"
        f"&background=random&color=fff&size={size}"
        f"&rounded=true&bold=true&font-size=0.33"
    )


def _avatar_cache_bust(url: str, profile: UserProfile) -> str:
    if not profile.updated_at:
        return url
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}v={int(profile.updated_at.timestamp())}"


def get_user_avatar_url(user, size: int = 128) -> str:
    if not user or not getattr(user, "is_authenticated", False):
        return ui_avatar_url(user, size=size)

    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        return ui_avatar_url(user, size=size)

    if profile.avatar:
        return _avatar_cache_bust(profile.avatar.url, profile)
    return ui_avatar_url(user, size=size)


def get_user_avatar_urls(user) -> dict[str, str]:
    return {
        "small": get_user_avatar_url(user, size=32),
        "medium": get_user_avatar_url(user, size=64),
        "large": get_user_avatar_url(user, size=128),
    }


def validate_avatar_upload(uploaded_file) -> None:
    if not uploaded_file:
        raise AvatarValidationError("No image file was provided.")

    if uploaded_file.size > MAX_AVATAR_SIZE_BYTES:
        raise AvatarValidationError("Image must be 5 MB or smaller.")

    content_type = getattr(uploaded_file, "content_type", "") or ""
    if content_type and content_type not in ALLOWED_AVATAR_CONTENT_TYPES:
        raise AvatarValidationError("Please upload a JPEG, PNG, GIF, or WebP image.")
