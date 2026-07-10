"""Shared authorization/identity helpers used across view modules."""

from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse
from django.urls import reverse

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


def get_post_auth_redirect_url(user) -> str:
    if user_has_admin_access(user):
        return reverse("dashboard")
    if get_employee_for_user(user):
        return reverse("employee_dashboard")
    return reverse("dashboard")


class AdminRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    """Require staff/superuser access for management surfaces."""

    def test_func(self) -> bool:
        return user_has_admin_access(self.request.user)

    def handle_no_permission(self):
        if self.request.user.is_authenticated:
            accepts_json = "application/json" in self.request.headers.get("Accept", "")
            if self.request.path.startswith("/api/") or accepts_json:
                return JsonResponse(
                    {"detail": "You do not have permission to perform this action."},
                    status=403,
                )
            raise PermissionDenied
        return super().handle_no_permission()
