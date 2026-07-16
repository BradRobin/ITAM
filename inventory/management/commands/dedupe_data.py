from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from inventory.models import (
    AdminNotification,
    EmployeeNotification,
    MaintenanceLog,
)
from inventory.services.job_cleanup import prune_old_background_jobs


class Command(BaseCommand):
    help = "Go through ITAM data to filter, clean up, and deduplicate redundant data"

    def handle(self, *args, **options):
        self.stdout.write("Starting data filter and deduplication process...")

        self.deduplicate_maintenance_logs()
        self.deduplicate_notifications()
        self.prune_notifications()
        self.prune_background_jobs()

        self.stdout.write(self.style.SUCCESS("Deduplication and cleanup completed successfully."))

    def deduplicate_maintenance_logs(self):
        self.stdout.write("Scanning for duplicate maintenance logs...")
        duplicates = (
            MaintenanceLog.objects.values("asset_id", "date", "technician", "issue_description")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
        )

        deleted_count = 0
        for dup in duplicates:
            logs = list(
                MaintenanceLog.objects.filter(
                    asset_id=dup["asset_id"],
                    date=dup["date"],
                    technician=dup["technician"],
                    issue_description=dup["issue_description"],
                ).order_by("id")
            )
            for log in logs[1:]:
                log.delete()
                deleted_count += 1

        if deleted_count > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Deduplicated maintenance logs: deleted {deleted_count} redundant records."
                )
            )
        else:
            self.stdout.write("No duplicate maintenance logs found.")

    def deduplicate_notifications(self):
        self.stdout.write("Scanning for duplicate notifications...")

        emp_deleted = 0
        emp_dups = (
            EmployeeNotification.objects.annotate(day=TruncDate("created_at"))
            .values("employee_id", "title", "message", "day")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
        )
        for dup in emp_dups:
            notifs = list(
                EmployeeNotification.objects.filter(
                    employee_id=dup["employee_id"],
                    title=dup["title"],
                    message=dup["message"],
                    created_at__date=dup["day"],
                ).order_by("-created_at", "-id")
            )
            for notif in notifs[1:]:
                notif.delete()
                emp_deleted += 1

        admin_deleted = 0
        admin_dups = (
            AdminNotification.objects.annotate(day=TruncDate("created_at"))
            .values("user_id", "title", "message", "day")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
        )
        for dup in admin_dups:
            notifs = list(
                AdminNotification.objects.filter(
                    user_id=dup["user_id"],
                    title=dup["title"],
                    message=dup["message"],
                    created_at__date=dup["day"],
                ).order_by("-created_at", "-id")
            )
            for notif in notifs[1:]:
                notif.delete()
                admin_deleted += 1

        if emp_deleted > 0 or admin_deleted > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Deduplicated notifications: deleted {emp_deleted} employee & "
                    f"{admin_deleted} admin records."
                )
            )
        else:
            self.stdout.write("No duplicate notifications found.")

    def prune_notifications(self):
        self.stdout.write("Pruning read notifications older than 14 days...")
        cutoff = timezone.now() - timedelta(days=14)

        emp_pruned, _ = EmployeeNotification.objects.filter(
            read=True, created_at__lt=cutoff
        ).delete()
        admin_pruned, _ = AdminNotification.objects.filter(
            read=True, created_at__lt=cutoff
        ).delete()

        if emp_pruned > 0 or admin_pruned > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Pruned old read notifications: deleted {emp_pruned} employee & "
                    f"{admin_pruned} admin records."
                )
            )
        else:
            self.stdout.write("No old read notifications to prune.")

    def prune_background_jobs(self):
        self.stdout.write("Pruning background jobs older than 7 days...")
        job_count, file_count = prune_old_background_jobs()

        if job_count > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Pruned background jobs: deleted {job_count} jobs and "
                    f"{file_count} associated export files."
                )
            )
        else:
            self.stdout.write("No old background jobs to prune.")
