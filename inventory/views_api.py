import datetime

from django.db import transaction
from django.db.models import Max, Q
from django.db.models.deletion import ProtectedError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.views import View

from .access import AdminRequiredMixin
from .api_serializers import (
    json_invalid_body,
    normalize_asset_payload,
    serialize_asset,
    serialize_employee,
)
from .constants import filter_assets_by_type_status
from .forms import AssetForm, EmployeeCreateForm, EmployeeForm
from .http import parse_request_data
from .models import Asset, Assignment, Employee, EmployeeNotification
from .services.employee_notifications import create_employee_notification
from .services.notifications import add_session_notification


class AssetAPIListView(AdminRequiredMixin, View):
    def get(self, request):
        queryset = Asset.objects.annotate(
            last_assigned_date=Max("assignments__date_assigned"),
            last_returned_date=Max("assignments__date_returned"),
        ).order_by("name", "serial_number")
        queryset = filter_assets_by_type_status(
            queryset,
            asset_type=request.GET.get("type"),
            status=request.GET.get("status"),
        )

        return JsonResponse([serialize_asset(asset) for asset in queryset], safe=False)

    def post(self, request):
        payload = parse_request_data(request)
        if payload is None:
            return json_invalid_body()

        form = AssetForm(data=normalize_asset_payload(payload))
        if not form.is_valid():
            return JsonResponse({"errors": form.errors.get_json_data()}, status=400)

        asset = form.save()
        if asset.created_by_id is None:
            asset.created_by = request.user
            asset.save(update_fields=["created_by"])
        add_session_notification(
            request,
            notification_type="success",
            title="New Asset Added",
            message=f'Asset "{asset.name}" has been added to inventory.',
            link=reverse("asset_detail", kwargs={"pk": asset.pk}),
            source="asset_creation",
        )
        return JsonResponse(serialize_asset(asset), status=201)


class AssetAPIDetailView(AdminRequiredMixin, View):
    def get(self, request, pk):
        asset = get_object_or_404(Asset, pk=pk)
        return JsonResponse(serialize_asset(asset))

    def put(self, request, pk):
        asset = get_object_or_404(Asset, pk=pk)
        payload = parse_request_data(request)
        if payload is None:
            return json_invalid_body()

        form = AssetForm(
            data=normalize_asset_payload(payload),
            instance=asset,
        )
        if not form.is_valid():
            return JsonResponse({"errors": form.errors.get_json_data()}, status=400)

        asset = form.save()
        return JsonResponse(serialize_asset(asset))

    def delete(self, request, pk):
        asset = get_object_or_404(Asset, pk=pk)
        try:
            asset.delete()
        except ProtectedError:
            return JsonResponse(
                {
                    "detail": (
                        "This asset cannot be deleted because it has assignment "
                        "history."
                    )
                },
                status=400,
            )
        return JsonResponse({"deleted": True})


class AssetAssignAPIView(AdminRequiredMixin, View):
    def post(self, request, pk):
        payload = parse_request_data(request)
        if payload is None:
            return json_invalid_body()

        employee_id = payload.get("employee_id") or payload.get("employee")
        if not employee_id:
            return JsonResponse({"employee_id": ["This field is required."]}, status=400)

        with transaction.atomic():
            asset = get_object_or_404(Asset.objects.select_for_update(), pk=pk)
            employee = get_object_or_404(Employee, pk=employee_id)
            has_active_assignment = Assignment.objects.select_for_update().filter(
                asset=asset,
                date_returned__isnull=True,
            ).exists()

            if asset.status != Asset.AssetStatus.AVAILABLE or has_active_assignment:
                return JsonResponse(
                    {"detail": "This asset is not available for assignment."},
                    status=400,
                )

            expected_return_date = payload.get("expected_return_date")
            if expected_return_date:
                try:
                    expected_return_date = datetime.date.fromisoformat(
                        str(expected_return_date)
                    )
                except ValueError:
                    return JsonResponse(
                        {
                            "expected_return_date": [
                                "Enter a valid date in YYYY-MM-DD format."
                            ]
                        },
                        status=400,
                    )
                if expected_return_date < timezone.localdate():
                    return JsonResponse(
                        {
                            "expected_return_date": [
                                "Expected return date cannot be in the past."
                            ]
                        },
                        status=400,
                    )
            else:
                expected_return_date = None

            Assignment.objects.create(
                asset=asset,
                employee=employee,
                expected_return_date=expected_return_date,
                created_by=request.user,
            )
            asset.status = Asset.AssetStatus.ASSIGNED
            asset.save(update_fields=["status"])
            add_session_notification(
                request,
                notification_type="success",
                title="Asset Assigned",
                message=(
                    f'Asset "{asset.name}" has been assigned to '
                    f"{employee.name}."
                ),
                link=reverse("asset_list"),
                source="asset_assignment",
            )
            create_employee_notification(
                employee,
                notification_type=EmployeeNotification.NotificationType.INFO,
                title="Asset Assigned",
                message=f'You have been assigned "{asset.name}". Please confirm receipt.',
                link=reverse("employee_dashboard"),
            )

        return JsonResponse(serialize_asset(asset))


class AssetReturnAPIView(AdminRequiredMixin, View):
    def post(self, request, pk):
        with transaction.atomic():
            asset = get_object_or_404(Asset.objects.select_for_update(), pk=pk)
            assignment = (
                Assignment.objects.select_for_update()
                .filter(asset=asset, date_returned__isnull=True)
                .first()
            )
            if assignment is None:
                return JsonResponse(
                    {"detail": "This asset does not have an active assignment."},
                    status=400,
                )

            employee = assignment.employee
            assignment.date_returned = timezone.now()
            assignment.save(update_fields=["date_returned"])
            asset.status = Asset.AssetStatus.AVAILABLE
            asset.save(update_fields=["status"])
            add_session_notification(
                request,
                notification_type="info",
                title="Asset Returned",
                message=(
                    f'Asset "{asset.name}" has been returned from '
                    f"{employee.name}."
                ),
                link=reverse("asset_list"),
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

        return JsonResponse(serialize_asset(asset))


class AssetBulkDeleteAPIView(AdminRequiredMixin, View):
    def post(self, request):
        payload = parse_request_data(request)
        if payload is None:
            return json_invalid_body()

        raw_ids = payload.get("ids") or []
        if not isinstance(raw_ids, list) or not raw_ids:
            return JsonResponse(
                {"detail": "Provide at least one asset id in ids."},
                status=400,
            )

        deleted = []
        failed = []
        seen = set()

        for raw_id in raw_ids:
            try:
                asset_id = int(raw_id)
            except (TypeError, ValueError):
                failed.append({"id": raw_id, "detail": "Invalid asset id."})
                continue

            if asset_id in seen:
                continue
            seen.add(asset_id)

            asset = Asset.objects.filter(pk=asset_id).first()
            if asset is None:
                failed.append({"id": asset_id, "detail": "Asset not found."})
                continue

            try:
                asset.delete()
            except ProtectedError:
                failed.append(
                    {
                        "id": asset_id,
                        "detail": (
                            "This asset cannot be deleted because it has "
                            "assignment history."
                        ),
                    }
                )
                continue

            deleted.append(asset_id)

        if deleted:
            add_session_notification(
                request,
                notification_type="info",
                title="Assets Deleted",
                message=(
                    f"{len(deleted)} asset{'s' if len(deleted) != 1 else ''} "
                    "removed from inventory."
                ),
                link=reverse("asset_list"),
                source="asset_bulk_delete",
            )

        return JsonResponse(
            {
                "success": True,
                "deleted": deleted,
                "failed": failed,
            }
        )


class EmployeeAPIListView(AdminRequiredMixin, View):
    def get(self, request):
        queryset = Employee.objects.all().order_by("name")
        search = request.GET.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(department__icontains=search)
                | Q(email__icontains=search)
            )
        return JsonResponse(
            [serialize_employee(employee) for employee in queryset],
            safe=False,
        )

    def post(self, request):
        payload = parse_request_data(request)
        if payload is None:
            return json_invalid_body()

        form = EmployeeCreateForm(data=payload)
        if not form.is_valid():
            return JsonResponse({"errors": form.errors.get_json_data()}, status=400)

        employee = form.save()
        add_session_notification(
            request,
            notification_type="success",
            title="New Employee Added",
            message=f'Employee "{employee.name}" has been added to the system.',
            link=reverse("employee_list"),
            source="employee_creation",
        )
        return JsonResponse(serialize_employee(employee), status=201)


class EmployeeAPIDetailView(AdminRequiredMixin, View):
    def get(self, request, pk):
        employee = get_object_or_404(Employee, pk=pk)
        return JsonResponse(serialize_employee(employee))

    def put(self, request, pk):
        payload = parse_request_data(request)
        if payload is None:
            return json_invalid_body()

        employee = get_object_or_404(Employee, pk=pk)
        user_value = payload.get("user", employee.user_id or "")
        form = EmployeeForm(
            data={
                "name": payload.get("name", employee.name),
                "user": user_value,
                "department": payload.get("department", employee.department),
                "email": payload.get("email", employee.email),
            },
            instance=employee,
        )
        if not form.is_valid():
            return JsonResponse({"errors": form.errors.get_json_data()}, status=400)

        employee = form.save()
        return JsonResponse(serialize_employee(employee))

    def delete(self, request, pk):
        employee = get_object_or_404(Employee, pk=pk)
        try:
            employee.delete()
        except ProtectedError:
            return JsonResponse(
                {
                    "detail": (
                        "This employee cannot be deleted because they have "
                        "assignment history."
                    )
                },
                status=400,
            )
        return JsonResponse({"deleted": True})
