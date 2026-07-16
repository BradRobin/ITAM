from django.contrib import messages
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.utils import timezone
from django.views import View
from django.views.generic import CreateView, DeleteView, UpdateView

from .access import AdminRequiredMixin
from .forms import MaintenanceLogForm
from .models import Asset, MaintenanceLog
from .services.notifications import add_session_notification


class CompleteMaintenanceView(AdminRequiredMixin, View):
    def post(self, request, pk):
        with transaction.atomic():
            asset = get_object_or_404(Asset.objects.select_for_update(), pk=pk)

            if asset.status != Asset.AssetStatus.UNDER_MAINTENANCE:
                messages.error(
                    request,
                    "Only assets under maintenance can be marked as maintenance done.",
                )
                return redirect("asset_detail", pk=asset.pk)

            technician = request.user.get_full_name() or request.user.username
            MaintenanceLog.objects.create(
                asset=asset,
                issue_description=(
                    "Maintenance completed and asset returned to available status."
                ),
                technician=technician,
                date=timezone.localdate(),
                resolved=True,
                created_by=request.user,
            )

            asset.status = Asset.AssetStatus.AVAILABLE
            asset.save(update_fields=["status"])
            add_session_notification(
                request,
                notification_type="success",
                title="Maintenance Completed",
                message=f'Maintenance for asset "{asset.name}" has been completed.',
                link=reverse("asset_detail", kwargs={"pk": asset.pk}),
                source="maintenance_complete",
            )

        messages.success(
            request,
            "Maintenance marked as done. Asset is now available.",
        )
        return redirect("asset_detail", pk=asset.pk)


class MaintenanceLogCreateView(AdminRequiredMixin, CreateView):
    model = MaintenanceLog
    form_class = MaintenanceLogForm
    template_name = "inventory/maintenance_log_form.html"

    def dispatch(self, request, *args, **kwargs):
        self.asset = get_object_or_404(Asset, pk=kwargs["asset_pk"])
        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["asset"] = self.asset
        context["page_title"] = "Add Maintenance Log"
        return context

    def form_valid(self, form):
        form.instance.asset = self.asset
        form.instance.created_by = self.request.user
        response = super().form_valid(form)
        if not form.instance.resolved:
            self.asset.status = Asset.AssetStatus.UNDER_MAINTENANCE
            self.asset.save(update_fields=["status"])
        messages.success(self.request, "Maintenance log added successfully.")
        return response

    def get_success_url(self):
        return reverse("asset_detail", kwargs={"pk": self.asset.pk})


class MaintenanceLogUpdateView(AdminRequiredMixin, UpdateView):
    model = MaintenanceLog
    form_class = MaintenanceLogForm
    template_name = "inventory/maintenance_log_form.html"

    def get_queryset(self):
        return MaintenanceLog.objects.select_related("asset")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["asset"] = self.object.asset
        context["page_title"] = "Edit Maintenance Log"
        return context

    def form_valid(self, form):
        messages.success(self.request, "Maintenance log updated successfully.")
        return super().form_valid(form)

    def get_success_url(self):
        return reverse("asset_detail", kwargs={"pk": self.object.asset.pk})


class MaintenanceLogDeleteView(AdminRequiredMixin, DeleteView):
    model = MaintenanceLog
    template_name = "inventory/maintenance_log_confirm_delete.html"

    def get_queryset(self):
        return MaintenanceLog.objects.select_related("asset")

    def form_valid(self, form):
        self.asset_pk = self.object.asset.pk
        messages.success(self.request, "Maintenance log deleted successfully.")
        return super().form_valid(form)

    def get_success_url(self):
        return reverse("asset_detail", kwargs={"pk": self.asset_pk})
