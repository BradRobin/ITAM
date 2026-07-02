from django.core.management.base import BaseCommand

from inventory.services.background_jobs import process_pending_jobs


class Command(BaseCommand):
    help = "Process pending background jobs (run as a worker on deploy)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=10,
            help="Maximum number of jobs to process in one run",
        )

    def handle(self, *args, **options):
        processed = process_pending_jobs(limit=options["limit"])
        self.stdout.write(
            self.style.SUCCESS(f"Processed {processed} background job(s)")
        )
