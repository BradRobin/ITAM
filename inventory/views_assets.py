from django.contrib import messages
from django.db import transaction
from django.db.models import Max, OuterRef, Subquery
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.views import View
from django.views.generic import DeleteView, DetailView, FormView, ListView, RedirectView, UpdateView


from .access import AdminRequiredMixin, user_has_admin_access
from .constants import filter_assets_by_type_status
from .forms import AssetForm, AssignmentForm
from .models import Asset, Assignment, AssetCatalog, EmployeeNotification
from .services.asset_import import serialize_catalog
from .services.assets import get_asset_list_sections
from .services.background_jobs import serialize_asset_sections
from .services.employee_notifications import create_employee_notification
from .services.metrics import get_service_overdue_cutoff
from .services.notifications import add_session_notification


class AssetAddRedirectView(RedirectView):
    """Legacy /assets/add/ URL opens the assets list with the add-asset modal."""

    permanent = False

    def get_redirect_url(self, *args, **kwargs):
        return reverse("asset_list") + "?add=1"


class AssetListView(AdminRequiredMixin, ListView):
    model = Asset
    template_name = "inventory/asset_list.html"
    context_object_name = "assets"
    paginate_by = 25

    def get_queryset(self):
        active_assignee = Assignment.objects.filter(
            asset=OuterRef("pk"),
            date_returned__isnull=True,
        ).values("employee__name")[:1]
        active_assignee_department = Assignment.objects.filter(
            asset=OuterRef("pk"),
            date_returned__isnull=True,
        ).values("employee__department")[:1]
        queryset = (
            Asset.objects.annotate(
                last_maintenance_date=Max("maintenance_logs__date"),
                last_assigned_date=Max("assignments__date_assigned"),
                last_returned_date=Max("assignments__date_returned"),
                assigned_employee_name=Subquery(active_assignee),
                assigned_employee_department=Subquery(active_assignee_department),
            )
            .all()
            .order_by("name", "serial_number")
        )
        return filter_assets_by_type_status(
            queryset,
            asset_type=self.request.GET.get("type"),
            status=self.request.GET.get("status"),
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        serial_to_pk = dict(Asset.objects.values_list("serial_number", "pk"))
        context.update(
            {
                "selected_type": self.request.GET.get("type", ""),
                "selected_status": self.request.GET.get("status", ""),
                "overdue_cutoff": get_service_overdue_cutoff().date(),
                "user_is_admin": user_has_admin_access(self.request.user),
                "asset_catalogs": [
                    serialize_catalog(catalog, serial_to_pk=serial_to_pk)
                    for catalog in AssetCatalog.objects.prefetch_related("assets")
                    .order_by("-created_at", "name")
                ],
                "async_asset_sections": True,
                "asset_sections_payload": serialize_asset_sections(
                    get_asset_list_sections()
                ),
            }
        )
        return context


class AssetDetailView(AdminRequiredMixin, DetailView):
    model = Asset
    template_name = "inventory/asset_detail.html"
    context_object_name = "asset"

    def get_queryset(self):
        return Asset.objects.annotate(
            last_maintenance_date=Max("maintenance_logs__date")
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        active_assignment = (
            self.object.assignments.select_related("employee")
            .filter(date_returned__isnull=True)
            .first()
        )
        context.update(
            {
                "active_assignment": active_assignment,
                "assignment_history": self.object.assignments.select_related(
                    "employee"
                ),
                "maintenance_logs": self.object.maintenance_logs.all(),
                "overdue_cutoff": get_service_overdue_cutoff().date(),
            }
        )
        return context


class AssetUpdateView(AdminRequiredMixin, UpdateView):
    model = Asset
    form_class = AssetForm
    template_name = "inventory/asset_form.html"
    success_url = reverse_lazy("asset_list")

    def form_valid(self, form):
        response = super().form_valid(form)
        add_session_notification(
            self.request,
            notification_type="info",
            title="Asset Updated",
            message=f'Asset "{self.object.name}" has been updated.',
            link=reverse("asset_detail", kwargs={"pk": self.object.pk}),
            source="asset_update",
        )

        messages.success(self.request, "Asset updated successfully.")
        return response


class AssetDeleteView(AdminRequiredMixin, DeleteView):
    model = Asset
    template_name = "inventory/asset_confirm_delete.html"
    success_url = reverse_lazy("asset_list")


class AssignAssetView(AdminRequiredMixin, FormView):
    template_name = "inventory/assign_asset.html"
    form_class = AssignmentForm
    success_url = reverse_lazy("asset_list")

    def dispatch(self, request, *args, **kwargs):
        self.asset = get_object_or_404(Asset, pk=kwargs["pk"])
        has_active_assignment = Assignment.objects.filter(
            asset=self.asset,
            date_returned__isnull=True,
        ).exists()
        if self.asset.status != Asset.AssetStatus.AVAILABLE or has_active_assignment:
            messages.error(
                request,
                "This asset is not available for assignment.",
            )
            return redirect("asset_detail", pk=self.asset.pk)
        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["asset"] = self.asset
        return context

    def form_valid(self, form):
        with transaction.atomic():
            asset = Asset.objects.select_for_update().get(pk=self.asset.pk)

            has_active_assignment = Assignment.objects.select_for_update().filter(
                asset=asset,
                date_returned__isnull=True,
            ).exists()
            if asset.status != Asset.AssetStatus.AVAILABLE or has_active_assignment:
                form.add_error(None, "This asset is not available for assignment.")
                return self.form_invalid(form)

            assignment = form.save(commit=False)
            assignment.asset = asset
            assignment.created_by = self.request.user
            assignment.save()

            asset.status = Asset.AssetStatus.ASSIGNED
            asset.save(update_fields=["status"])
            add_session_notification(
                self.request,
                notification_type="success",
                title="Asset Assigned",
                message=(
                    f'Asset "{asset.name}" has been assigned to '
                    f"{assignment.employee.name}."
                ),
                link=reverse("asset_detail", kwargs={"pk": asset.pk}),
                source="asset_assignment",
            )
            create_employee_notification(
                assignment.employee,
                notification_type=EmployeeNotification.NotificationType.INFO,
                title="Asset Assigned",
                message=f'You have been assigned "{asset.name}". Please confirm receipt.',
                link=reverse("employee_dashboard"),
            )

        messages.success(self.request, "Asset assigned successfully.")
        return super().form_valid(form)


class ReturnAssetView(AdminRequiredMixin, View):
    def post(self, request, pk):
        with transaction.atomic():
            asset = get_object_or_404(Asset.objects.select_for_update(), pk=pk)
            assignment = (
                Assignment.objects.select_for_update()
                .filter(asset=asset, date_returned__isnull=True)
                .first()
            )

            if assignment is None:
                messages.error(request, "This asset does not have an active assignment.")
                return redirect("asset_detail", pk=asset.pk)

            assignment.date_returned = timezone.now()
            assignment.return_requested = False
            assignment.save(update_fields=["date_returned", "return_requested"])

            asset.status = Asset.AssetStatus.AVAILABLE
            asset.save(update_fields=["status"])
            employee = assignment.employee
            add_session_notification(
                request,
                notification_type="info",
                title="Asset Returned",
                message=f'Asset "{asset.name}" has been returned to inventory.',
                link=reverse("asset_detail", kwargs={"pk": asset.pk}),
                source="asset_return",
            )
            create_employee_notification(
                employee,
                notification_type=EmployeeNotification.NotificationType.INFO,
                title="Asset Returned",
                message=(
                    f'"{asset.name}" has been returned to inventory and '
                    "removed from your assigned assets."
                ),
                link=reverse("employee_dashboard"),
            )

        messages.success(
            request,
            "Asset returned successfully to inventory storage.",
        )
        return redirect("asset_detail", pk=asset.pk)
