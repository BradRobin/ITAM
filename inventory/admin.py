from django.contrib import admin

from .models import Asset, Assignment, Employee, EmployeeNotification, MaintenanceLog, BackgroundJob


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "serial_number", "status", "date_created")
    list_filter = ("type", "status", "date_created")
    search_fields = ("name", "serial_number")


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "department", "email")
    list_filter = ("department",)
    search_fields = ("name", "user__username", "user__email", "department", "email")


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "asset",
        "employee",
        "confirmed_by_employee",
        "date_assigned",
        "expected_return_date",
        "date_returned",
    )
    list_filter = ("confirmed_by_employee", "date_assigned", "date_returned")
    search_fields = (
        "asset__name",
        "asset__serial_number",
        "employee__name",
        "employee__email",
    )


@admin.register(MaintenanceLog)
class MaintenanceLogAdmin(admin.ModelAdmin):
    list_display = (
        "asset",
        "technician",
        "repair_shop",
        "expected_completion_date",
        "date",
        "resolved",
    )
    list_filter = ("resolved", "date")
    search_fields = (
        "asset__name",
        "asset__serial_number",
        "issue_description",
        "technician",
    )


@admin.register(EmployeeNotification)
class EmployeeNotificationAdmin(admin.ModelAdmin):
    list_display = ("employee", "title", "type", "read", "created_at")
    list_filter = ("type", "read", "created_at")
    search_fields = ("employee__name", "employee__email", "title", "message")
    readonly_fields = ("created_at",)


@admin.register(BackgroundJob)
class BackgroundJobAdmin(admin.ModelAdmin):
    list_display = ("id", "job_type", "status", "priority", "user", "created_at", "completed_at")
    list_filter = ("job_type", "status", "priority")
    search_fields = ("id", "user__username", "error_message")
    readonly_fields = ("created_at", "started_at", "completed_at")
