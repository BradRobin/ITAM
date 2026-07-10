import json

from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.views import View

from inventory.access import AdminRequiredMixin
from inventory.models import BackgroundJob
from inventory.services.background_jobs import enqueue_job, serialize_job


class BackgroundJobCreateView(AdminRequiredMixin, View):
    def post(self, request):
        try:
            data = json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)

        job_type = data.get("job_type")
        if not job_type:
            return JsonResponse({"detail": "job_type is required"}, status=400)

        force = bool(data.get("force"))
        params = data.get("params") or {}
        job = enqueue_job(request.user, job_type, params=params, force=force)
        return JsonResponse(serialize_job(job), status=202)


class BackgroundJobDetailView(AdminRequiredMixin, View):
    def get(self, request, job_id):
        job = get_object_or_404(BackgroundJob, pk=job_id, user=request.user)
        return JsonResponse(serialize_job(job))


class BackgroundJobDownloadView(AdminRequiredMixin, View):
    def get(self, request, job_id):
        job = get_object_or_404(BackgroundJob, pk=job_id, user=request.user)
        if job.status != BackgroundJob.Status.COMPLETED:
            raise Http404("Export file is not ready")

        result = job.result or {}
        filename = result.get("filename", "export.csv")
        csv_content = result.get("csv_content")

        if csv_content:
            response = HttpResponse(csv_content, content_type="text/csv; charset=utf-8")
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response

        if job.result_file:
            return FileResponse(
                job.result_file.open("rb"),
                as_attachment=True,
                filename=filename,
                content_type="text/csv",
            )

        raise Http404("Export file is not ready")
