import uuid

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("inventory", "0008_assignment_expected_return_maintenance_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="BackgroundJob",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "job_type",
                    models.CharField(
                        choices=[
                            ("reports", "Reports analytics"),
                            ("asset_sections", "Asset list sections"),
                            ("dashboard", "Dashboard metrics"),
                            ("csv_export", "Asset CSV export"),
                        ],
                        max_length=32,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("running", "Running"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                        ],
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("priority", models.PositiveSmallIntegerField(default=50)),
                ("params", models.JSONField(blank=True, default=dict)),
                ("result", models.JSONField(blank=True, null=True)),
                ("error_message", models.TextField(blank=True)),
                ("result_file", models.FileField(blank=True, null=True, upload_to="exports/")),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="background_jobs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-priority", "created_at"],
                "indexes": [
                    models.Index(
                        fields=["status", "-priority", "created_at"],
                        name="bgjob_status_prio_idx",
                    ),
                    models.Index(
                        fields=["user", "job_type", "-created_at"],
                        name="bgjob_user_type_idx",
                    ),
                ],
            },
        ),
    ]
