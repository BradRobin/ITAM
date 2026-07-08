"""Build a simplified ecosystem overview graph for the Reports page."""

from __future__ import annotations

import json

from django.db.models import Count
from django.urls import reverse

from inventory.models import Asset, Assignment, Employee, MaintenanceLog


def _user_is_admin(user) -> bool:
    return user.is_authenticated and (user.is_staff or user.is_superuser)


def _node(
    node_id: str,
    label: str,
    node_type: str,
    *,
    icon: str = "fa-circle",
    url: str = "",
    badge: int | None = None,
    layer: int = 0,
    order: int = 0,
    meta: dict | None = None,
) -> dict:
    return {
        "id": node_id,
        "label": label,
        "type": node_type,
        "icon": icon,
        "url": url,
        "badge": badge,
        "layer": layer,
        "order": order,
        "meta": meta or {},
    }


def _edge(source: str, target: str, edge_id: str | None = None) -> dict:
    return {
        "id": edge_id or f"{source}->{target}",
        "source": source,
        "target": target,
    }


def build_ecosystem_map(user) -> dict:
    is_admin = _user_is_admin(user)
    nodes: list[dict] = []
    edges: list[dict] = []

    total_assets = Asset.objects.count()
    assigned_assets = Asset.objects.filter(status=Asset.AssetStatus.ASSIGNED).count()
    available_assets = Asset.objects.filter(status=Asset.AssetStatus.AVAILABLE).count()
    maintenance_assets = Asset.objects.filter(
        status=Asset.AssetStatus.UNDER_MAINTENANCE
    ).count()
    employee_count = Employee.objects.count()
    active_assignments = Assignment.objects.filter(date_returned__isnull=True).count()
    open_maintenance = MaintenanceLog.objects.filter(resolved=False).count()

    nodes.append(
        _node(
            "hub-itam",
            "ITAM 3.0",
            "hub",
            icon="fa-cubes",
            layer=0,
            order=0,
            meta={"description": "Central platform for asset and employee management"},
        )
    )

    if is_admin:
        nodes.append(
            _node(
                "admin-user",
                user.get_full_name() or user.username,
                "admin",
                icon="fa-user-shield",
                url=reverse("profile"),
                layer=0,
                order=1,
                meta={"description": "Administrator account"},
            )
        )
        edges.append(_edge("admin-user", "hub-itam"))

    modules = [
        ("module-dashboard", "Dashboard", "fa-th-large", "dashboard", "Operational overview"),
        ("module-assets", "Assets", "fa-laptop", "asset_list", "Inventory and assignments"),
        ("module-employees", "Employees", "fa-users", "employee_list", "Staff directory"),
        ("module-reports", "Reports", "fa-chart-bar", "reports", "Analytics and insights"),
        ("module-portal", "Employee Portal", "fa-id-badge", "employee_dashboard", "Self-service for staff"),
    ]
    for index, (node_id, label, icon, url_name, description) in enumerate(modules):
        nodes.append(
            _node(
                node_id,
                label,
                "module",
                icon=icon,
                url=reverse(url_name),
                layer=1,
                order=index,
                meta={"description": description},
            )
        )
        edges.append(_edge("hub-itam", node_id))

    metrics = [
        (
            "metric-total-assets",
            "Total Assets",
            total_assets,
            "module-assets",
            "fa-boxes",
            "All tracked equipment",
        ),
        (
            "metric-assigned",
            "Assigned",
            assigned_assets,
            "module-assets",
            "fa-user-check",
            "Currently with employees",
        ),
        (
            "metric-available",
            "Available",
            available_assets,
            "module-assets",
            "fa-check-circle",
            "Ready to assign",
        ),
        (
            "metric-maintenance",
            "In Maintenance",
            maintenance_assets,
            "module-assets",
            "fa-tools",
            f"{open_maintenance} open log(s)",
        ),
        (
            "metric-employees",
            "Employees",
            employee_count,
            "module-employees",
            "fa-user-friends",
            "People in the directory",
        ),
        (
            "metric-assignments",
            "Active Assignments",
            active_assignments,
            "module-assets",
            "fa-link",
            "Assets not yet returned",
        ),
    ]
    for index, (node_id, label, count, parent_id, icon, description) in enumerate(metrics):
        nodes.append(
            _node(
                node_id,
                label,
                "metric",
                icon=icon,
                badge=count,
                layer=2,
                order=index,
                meta={"description": description, "count": count},
            )
        )
        edges.append(_edge(parent_id, node_id))

    return {
        "nodes": nodes,
        "edges": edges,
        "meta": {
            "base_label": "ITAM 3.0 Overview",
            "is_admin": is_admin,
            "summary": [
                {"label": "Assets", "value": total_assets},
                {"label": "Assigned", "value": assigned_assets},
                {"label": "Employees", "value": employee_count},
                {"label": "Active assignments", "value": active_assignments},
            ],
        },
    }


def get_ecosystem_map_json(user) -> str:
    return json.dumps(build_ecosystem_map(user))
