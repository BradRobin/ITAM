"""Shared background job retention cleanup."""

from __future__ import annotations

import os
from datetime import timedelta

from django.utils import timezone

from inventory.models import BackgroundJob

DEFAULT_RETENTION_DAYS = 7


def prune_old_background_jobs(*, retention_days: int = DEFAULT_RETENTION_DAYS) -> tuple[int, int]:
    """Delete completed/failed jobs older than retention_days. Returns (jobs, files)."""
    cutoff = timezone.now() - timedelta(days=retention_days)
    old_jobs = BackgroundJob.objects.filter(
        status__in=[BackgroundJob.Status.COMPLETED, BackgroundJob.Status.FAILED],
        created_at__lt=cutoff,
    )
    job_count = 0
    file_count = 0

    for job in old_jobs:
        if job.result_file:
            try:
                if os.path.exists(job.result_file.path):
                    os.remove(job.result_file.path)
                    file_count += 1
            except OSError:
                pass
        job.delete()
        job_count += 1

    return job_count, file_count
