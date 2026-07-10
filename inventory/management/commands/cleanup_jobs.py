import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from inventory.models import BackgroundJob


class Command(BaseCommand):
    help = "Clean up completed/failed background jobs older than 7 days and delete associated files"

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=7)
        old_jobs = BackgroundJob.objects.filter(
            status__in=[BackgroundJob.Status.COMPLETED, BackgroundJob.Status.FAILED],
            created_at__lt=cutoff,
        )
        count = 0
        file_count = 0

        for job in old_jobs:
            if job.result_file:
                try:
                    if os.path.exists(job.result_file.path):
                        os.remove(job.result_file.path)
                        file_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Could not delete result file for job {job.id}: {e}"
                        )
                    )
            job.delete()
            count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully deleted {count} old background jobs and {file_count} files."
            )
        )
