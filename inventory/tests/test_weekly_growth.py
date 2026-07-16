import datetime

from django.test import TestCase
from django.utils import timezone

from inventory.models import Asset
from inventory.services.metrics import (
    _serialize_weekly_asset_growth,
    get_analytics_payload,
)


class WeeklyAssetGrowthTests(TestCase):
    def test_weekly_growth_has_four_weeks_per_month(self):
        payload = _serialize_weekly_asset_growth(month_count=3)

        self.assertEqual(len(payload["months"]), 3)
        self.assertTrue(payload["default_month"])
        for month in payload["months"]:
            self.assertEqual(len(month["weeks"]), 4)
            self.assertEqual(
                [week["label"] for week in month["weeks"]],
                ["Week 1", "Week 2", "Week 3", "Week 4"],
            )

    def test_weekly_growth_counts_assets_by_week_bucket(self):
        now = timezone.localtime()
        Asset.objects.create(
            name="Week1 Laptop",
            type=Asset.AssetType.LAPTOP,
            serial_number="WK-001",
            status=Asset.AssetStatus.AVAILABLE,
            date_created=now.replace(day=3, hour=10, minute=0, second=0, microsecond=0),
        )
        Asset.objects.create(
            name="Week3 Monitor",
            type=Asset.AssetType.MONITOR,
            serial_number="WK-003",
            status=Asset.AssetStatus.AVAILABLE,
            date_created=now.replace(day=16, hour=10, minute=0, second=0, microsecond=0),
        )

        payload = _serialize_weekly_asset_growth(month_count=1)
        current = payload["months"][-1]
        counts = {week["week"]: week["count"] for week in current["weeks"]}

        self.assertEqual(counts[1], 1)
        self.assertEqual(counts[2], 0)
        self.assertEqual(counts[3], 1)
        self.assertEqual(counts[4], 0)

    def test_analytics_payload_includes_weekly_asset_growth(self):
        analytics = get_analytics_payload()
        self.assertIn("weekly_asset_growth", analytics)
        self.assertIn("months", analytics["weekly_asset_growth"])
        self.assertIn("default_month", analytics["weekly_asset_growth"])
