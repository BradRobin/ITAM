"""Shared authorization/identity helpers used across view modules."""

from .models import Employee


def user_has_admin_access(user) -> bool:
    return user.is_authenticated and (user.is_staff or user.is_superuser)


def get_employee_for_user(user):
    if not user.is_authenticated:
        return None
    try:
        return user.employee
    except Employee.DoesNotExist:
        return None
