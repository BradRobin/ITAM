"""Build a simplified ecosystem overview graph for the Reports page."""

from __future__ import annotations

import json

from django.urls import reverse

from inventory.models import Asset, Assignment, Employee, MaintenanceLog

MAX_EXPANSION_ITEMS = 40

ASSET_TYPE_ICONS = {
    Asset.AssetType.LAPTOP: "fa-laptop",
    Asset.AssetType.PRINTER: "fa-print",
    Asset.AssetType.ROUTER: "fa-wifi",
    Asset.AssetType.MONITOR: "fa-desktop",
}


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


def _leaf(
    leaf_id: str,
    label: str,
    *,
    icon: str = "fa-circle",
    url: str = "",
    subtitle: str = "",
) -> dict:
    return {
        "id": leaf_id,
        "label": label,
        "icon": icon,
        "url": url,
        "meta": {"subtitle": subtitle},
    }


def _truncate(items: list[dict], total: int) -> list[dict]:
    if total <= len(items):
        return items
    remaining = total - len(items)
    return items + [
        _leaf(
            "expansion-overflow",
            f"+{remaining} more",
            icon="fa-ellipsis-h",
            subtitle="Open list for full view",
        )
    ]


def _asset_leaves(assets) -> list[dict]:
    items = [
        _leaf(
            f"asset-{asset.pk}",
            asset.name,
            icon=ASSET_TYPE_ICONS.get(asset.type, "fa-box"),
            url=reverse("asset_detail", kwargs={"pk": asset.pk}),
            subtitle=asset.status,
        )
        for asset in assets[:MAX_EXPANSION_ITEMS]
    ]
    return _truncate(items, assets.count() if hasattr(assets, "count") else len(items))


def _employee_leaves(employees) -> list[dict]:
    items = [
        _leaf(
            f"employee-{employee.pk}",
            employee.name,
            icon="fa-user",
            url=reverse("employee_edit", kwargs={"pk": employee.pk}),
            subtitle=employee.department_abbreviation,
        )
        for employee in employees[:MAX_EXPANSION_ITEMS]
    ]
    return _truncate(items, employees.count() if hasattr(employees, "count") else len(items))


def _assignment_leaves(assignments) -> list[dict]:
    items = [
        _leaf(
            f"assignment-{assignment.pk}",
            assignment.asset.name,
            icon=ASSET_TYPE_ICONS.get(assignment.asset.type, "fa-link"),
            url=reverse("asset_detail", kwargs={"pk": assignment.asset_id}),
            subtitle=assignment.employee.name,
        )
        for assignment in assignments[:MAX_EXPANSION_ITEMS]
    ]
    return _truncate(items, assignments.count() if hasattr(assignments, "count") else len(items))


def _build_expansions() -> dict[str, list[dict]]:
    all_assets = Asset.objects.order_by("name", "serial_number")
    assigned_assets = all_assets.filter(status=Asset.AssetStatus.ASSIGNED)
    available_assets = all_assets.filter(status=Asset.AssetStatus.AVAILABLE)
    maintenance_assets = all_assets.filter(status=Asset.AssetStatus.UNDER_MAINTENANCE)
    all_employees = Employee.objects.order_by("name")
    active_assignments = (
        Assignment.objects.filter(date_returned__isnull=True)
        .select_related("asset", "employee")
        .order_by("-date_assigned")
    )

    asset_leaves = _asset_leaves(all_assets)
    employee_leaves = _employee_leaves(all_employees)
    assignment_leaves = _assignment_leaves(active_assignments)

    return {
        "module-dashboard": [
            _leaf("dash-assets", "Asset overview", icon="fa-boxes", url=reverse("asset_list")),
            _leaf("dash-employees", "Team directory", icon="fa-users", url=reverse("employee_list")),
            _leaf("dash-reports", "Reports", icon="fa-chart-bar", url=reverse("reports")),
        ],
        "module-assets": asset_leaves,
        "module-employees": employee_leaves,
        "module-reports": [
            _leaf("report-overview", "Ecosystem map", icon="fa-project-diagram", url=reverse("reports")),
            _leaf("report-export", "CSV export", icon="fa-file-csv", url=reverse("export_asset_csv")),
        ],
        "module-portal": [
            _leaf("portal-home", "Portal home", icon="fa-home", url=reverse("employee_dashboard")),
            _leaf("portal-assets", "My assets", icon="fa-laptop", url=reverse("employee_assets")),
            _leaf("portal-settings", "Settings", icon="fa-cog", url=reverse("employee_settings")),
        ],
        "metric-total-assets": asset_leaves,
        "metric-assigned": _asset_leaves(assigned_assets),
        "metric-available": _asset_leaves(available_assets),
        "metric-maintenance": _asset_leaves(maintenance_assets),
        "metric-employees": employee_leaves,
        "metric-assignments": assignment_leaves,
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
                meta={"description": description, "expandable": True},
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
                meta={
                    "description": description,
                    "count": count,
                    "expandable": count > 0,
                },
            )
        )
        edges.append(_edge(parent_id, node_id))

    expansions = _build_expansions() if is_admin else {}

    return {
        "nodes": nodes,
        "edges": edges,
        "expansions": expansions,
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
