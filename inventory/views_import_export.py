import csv
import json

from django.conf import settings
from django.http import JsonResponse, StreamingHttpResponse
from django.views import View

from .access import AdminRequiredMixin
from .models import Asset, BackgroundJob
from .services.asset_import import (
    CSVImportError,
    execute_import,
    is_csv_upload,
    serialize_import_rows,
    validate_csv_upload,
)
from .services.background_jobs import enqueue_job, serialize_job


class CSVBuffer:
    def write(self, value):
        return value


class ExportAssetCSVView(AdminRequiredMixin, View):
    def get(self, request):
        threshold = getattr(settings, "BACKGROUND_JOB_CSV_ASYNC_MIN_ASSETS", 100)
        wants_async = request.GET.get("async") == "1"
        asset_count = Asset.objects.count()

        if wants_async or asset_count >= threshold:
            job = enqueue_job(
                request.user,
                BackgroundJob.JobType.CSV_EXPORT,
                force=request.GET.get("force") == "1",
            )
            if "application/json" in request.headers.get("Accept", ""):
                return JsonResponse(serialize_job(job), status=202)
            return JsonResponse(
                {
                    "detail": "Export started in background",
                    "job": serialize_job(job),
                },
                status=202,
            )

        response = StreamingHttpResponse(
            self.stream_asset_rows(),
            content_type="text/csv",
        )
        response["Content-Disposition"] = (
            'attachment; filename="itam_asset_report.csv"'
        )
        return response

    def stream_asset_rows(self):
        from django.db.models import Max

        writer = csv.writer(CSVBuffer())
        yield writer.writerow(
            ["Name", "Type", "Serial Number", "Status", "Last Maintenance Date"]
        )

        queryset = Asset.objects.annotate(
            last_maintenance_date=Max("maintenance_logs__date")
        ).order_by("name", "serial_number")
        for asset in queryset.iterator(chunk_size=2000):
            yield writer.writerow(
                [
                    asset.name,
                    asset.type,
                    asset.serial_number,
                    asset.status,
                    asset.last_maintenance_date or "",
                ]
            )


class ImportAssetCSVValidateView(AdminRequiredMixin, View):
    def post(self, request):
        uploaded = request.FILES.get("file")
        if not uploaded:
            return JsonResponse({"detail": "No file uploaded."}, status=400)
        if not is_csv_upload(uploaded):
            return JsonResponse(
                {"detail": "The chosen file was not a CSV, Try again.", "code": "not_csv"},
                status=400,
            )
        try:
            column_mapping = None
            mapping_raw = request.POST.get("column_mapping")
            if mapping_raw:
                column_mapping = json.loads(mapping_raw)

            result = validate_csv_upload(uploaded, column_mapping)
            if result.get("needs_column_mapping"):
                return JsonResponse(result)

            return JsonResponse(
                {
                    "rows": serialize_import_rows(result["rows"]),
                    "conflicts": result["conflicts"],
                    "valid_count": result["valid_count"],
                    "error_count": result["error_count"],
                    "column_mapping": result.get("column_mapping", {}),
                    "has_employee_column": result.get("has_employee_column", False),
                    "assignment_reviews": result.get("assignment_reviews", []),
                    "employees": result.get("employees", []),
                }
            )
        except json.JSONDecodeError:
            return JsonResponse({"detail": "Invalid column mapping."}, status=400)
        except CSVImportError as exc:
            return JsonResponse({"detail": str(exc), "code": exc.code}, status=400)


class ImportAssetCSVExecuteView(AdminRequiredMixin, View):
    def post(self, request):
        try:
            data = json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)

        rows = data.get("rows") or []
        mode = data.get("mode")
        catalog_name = data.get("catalog_name", "")
        resolutions = data.get("resolutions") or {}
        assignment_confirmations = data.get("assignment_confirmations") or {}

        if mode not in {"merge", "catalog"}:
            return JsonResponse({"detail": "Import mode is required."}, status=400)
        if not rows:
            return JsonResponse({"detail": "No rows to import."}, status=400)

        try:
            result = execute_import(
                rows,
                mode=mode,
                catalog_name=catalog_name,
                resolutions=resolutions,
                assignment_confirmations=assignment_confirmations,
                user=request.user,
            )
            return JsonResponse(result)
        except CSVImportError as exc:
            return JsonResponse({"detail": str(exc), "code": exc.code}, status=400)
