from django.test import TestCase
from django.utils import timezone

from inventory.models import Asset, Assignment, Employee
from inventory.services.metrics import get_analytics_payload


class TopEmployeesAnalyticsTests(TestCase):
    def test_top_employees_ranked_by_active_assignments(self):
        high = Employee.objects.create(
            name="Alex High",
            email="alex.high@example.com",
            department=Employee.Department.TECHNICAL_CORE_PROGRAMME,
        )
        mid = Employee.objects.create(
            name="Blake Mid",
            email="blake.mid@example.com",
            department=Employee.Department.CAPACITY_BUILDING_INNOVATION,
        )
        low = Employee.objects.create(
            name="Casey Low",
            email="casey.low@example.com",
            department=Employee.Department.INSTITUTIONAL_SUPPORT_ADVISORY,
        )
        none = Employee.objects.create(
            name="Dana None",
            email="dana.none@example.com",
            department=Employee.Department.TECHNICAL_CORE_PROGRAMME,
        )

        assets = [
            Asset.objects.create(
                name=f"Asset {index}",
                type=Asset.AssetType.LAPTOP,
                serial_number=f"TE-{index:03d}",
                status=Asset.AssetStatus.ASSIGNED,
            )
            for index in range(7)
        ]

        for asset in assets[:3]:
            Assignment.objects.create(asset=asset, employee=high)
        for asset in assets[3:5]:
            Assignment.objects.create(asset=asset, employee=mid)
        Assignment.objects.create(asset=assets[5], employee=low)

        returned = Assignment.objects.create(asset=assets[6], employee=none)
        Assignment.objects.filter(pk=returned.pk).update(date_returned=timezone.now())
        Asset.objects.filter(pk=assets[6].pk).update(status=Asset.AssetStatus.AVAILABLE)

        analytics = get_analytics_payload()
        top = analytics["top_employees"]

        self.assertEqual(
            [row["name"] for row in top],
            ["Alex High", "Blake Mid", "Casey Low"],
        )
        self.assertEqual([row["assets"] for row in top], [3, 2, 1])
        self.assertNotIn(none.name, [row["name"] for row in top])
