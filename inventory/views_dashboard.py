from django.urls import reverse
from django.views.generic import TemplateView

from .access import AdminRequiredMixin


class DashboardView(AdminRequiredMixin, TemplateView):
    template_name = "inventory/dashboard.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        asset_list_url = reverse("asset_list")
        context["async_dashboard"] = True
        context["dashboard_stats"] = [
            {
                "label": "Total Assets",
                "value": "—",
                "trend": "Loading...",
                "css_class": "stat-total",
                "icon": "fa-boxes",
                "link": asset_list_url,
            },
            {
                "label": "Available",
                "value": "—",
                "trend": "Loading...",
                "css_class": "stat-available",
                "icon": "fa-check-circle",
                "link": f"{asset_list_url}#available-assets",
            },
            {
                "label": "Assigned",
                "value": "—",
                "trend": "Loading...",
                "css_class": "stat-assigned",
                "icon": "fa-user-check",
                "link": f"{asset_list_url}#assigned-assets",
            },
            {
                "label": "Under Maintenance",
                "value": "—",
                "trend": "Loading...",
                "css_class": "stat-maintenance",
                "icon": "fa-tools",
                "link": f"{asset_list_url}#maintenance-assets",
            },
        ]
        context["utilization_rate"] = "—"
        context["employee_count"] = "—"
        context["asset_health_rate"] = "—"
        context["total_assignments"] = "—"
        context["overdue_assets_count"] = "—"
        context["overdue_assets"] = None
        return context
