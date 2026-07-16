from django.core.management.base import BaseCommand

from inventory.services.job_cleanup import prune_old_background_jobs


class Command(BaseCommand):
    help = "Clean up completed/failed background jobs older than 7 days and delete associated files"

    def handle(self, *args, **options):
        count, file_count = prune_old_background_jobs()
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully deleted {count} old background jobs and {file_count} files."
            )
        )
