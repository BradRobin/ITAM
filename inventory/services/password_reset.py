from django.contrib.auth import get_user_model

from ..models import Employee

PASSWORD_RESET_EMAIL_SESSION_KEY = "password_reset_email"
PASSWORD_RESET_VERIFIED_SESSION_KEY = "password_reset_verified"
EVENTHUB_SECURITY_ANSWER = "eventhub"


def is_eventhub_security_answer(value: str) -> bool:
    return (value or "").strip().lower() == EVENTHUB_SECURITY_ANSWER


def get_user_for_password_reset_email(email: str):
    normalized_email = (email or "").strip().lower()
    if not normalized_email:
        return None

    user_model = get_user_model()
    user = user_model.objects.filter(email__iexact=normalized_email).first()
    if user is not None:
        return user

    employee = (
        Employee.objects.filter(email__iexact=normalized_email)
        .select_related("user")
        .first()
    )
    if employee is not None and employee.user_id:
        return employee.user

    return None
