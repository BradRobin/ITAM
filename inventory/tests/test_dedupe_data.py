from datetime import timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from inventory.models import AdminNotification, Employee, EmployeeNotification


class DedupeDataNotificationTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="testpass123",
        )
        self.employee = Employee.objects.create(
            name="Jane Doe",
            department="Engineering",
            email="jane@example.com",
        )
        self.today = timezone.now().replace(hour=12, minute=0, second=0, microsecond=0)
        self.yesterday = self.today - timedelta(days=1)

    def _create_employee_notifications(self, *, created_at, count=2):
        for _ in range(count):
            EmployeeNotification.objects.create(
                employee=self.employee,
                title="Asset Assigned",
                message='You have been assigned "Laptop".',
                created_at=created_at,
            )

    def _create_admin_notifications(self, *, created_at, count=2):
        for _ in range(count):
            AdminNotification.objects.create(
                user=self.user,
                title="Asset Assigned",
                message='Asset "Laptop" has been assigned.',
                created_at=created_at,
            )

    def test_dedupe_removes_same_day_employee_notification_duplicates(self):
        self._create_employee_notifications(created_at=self.today, count=3)

        call_command("dedupe_data", stdout=StringIO())

        self.assertEqual(
            EmployeeNotification.objects.filter(
                employee=self.employee,
                title="Asset Assigned",
                message='You have been assigned "Laptop".',
            ).count(),
            1,
        )

    def test_dedupe_keeps_employee_notifications_on_different_days(self):
        self._create_employee_notifications(created_at=self.today, count=1)
        self._create_employee_notifications(created_at=self.yesterday, count=1)

        call_command("dedupe_data", stdout=StringIO())

        self.assertEqual(EmployeeNotification.objects.count(), 2)

    def test_dedupe_removes_same_day_admin_notification_duplicates(self):
        self._create_admin_notifications(created_at=self.today, count=2)

        call_command("dedupe_data", stdout=StringIO())

        self.assertEqual(
            AdminNotification.objects.filter(
                user=self.user,
                title="Asset Assigned",
                message='Asset "Laptop" has been assigned.',
            ).count(),
            1,
        )

    def test_dedupe_keeps_admin_notifications_on_different_days(self):
        self._create_admin_notifications(created_at=self.today, count=1)
        self._create_admin_notifications(created_at=self.yesterday, count=1)

        call_command("dedupe_data", stdout=StringIO())

        self.assertEqual(AdminNotification.objects.count(), 2)
