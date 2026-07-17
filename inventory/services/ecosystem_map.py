"""Build a simplified ecosystem overview graph for the Reports page."""

from __future__ import annotations

import json
from typing import Callable

from django.db.models import Count, Q
from django.urls import reverse

from inventory.access import user_has_admin_access
from inventory.models import Asset, Assignment, Employee, MaintenanceLog

MAX_EXPANSION_ITEMS = 40

ASSET_TYPE_ICONS = {
    Asset.AssetType.LAPTOP: "fa-laptop",
    Asset.AssetType.PRINTER: "fa-print",
    Asset.AssetType.ROUTER: "fa-wifi",
    Asset.AssetType.MONITOR: "fa-desktop",
}

MODULE_SHORTCUTS: dict[str, list[tuple[str, str, str, str]]] = {
    "module-dashboard": [
        ("dash-assets", "Asset overview", "fa-boxes", "asset_list"),
        ("dash-employees", "Team directory", "fa-users", "employee_list"),
        ("dash-reports", "Reports", "fa-chart-bar", "reports"),
    ],
    "module-reports": [
        ("report-overview", "Ecosystem map", "fa-project-diagram", "reports"),
        ("report-export", "CSV export", "fa-file-csv", "export_asset_csv"),
    ],
    "module-portal": [
        ("portal-home", "Portal home", "fa-home", "employee_dashboard"),
        ("portal-assets", "My assets", "fa-laptop", "employee_assets"),
        ("portal-settings", "Settings", "fa-cog", "employee_settings"),
    ],
}

MODULES = [
    ("module-dashboard", "Dashboard", "fa-th-large", "dashboard", "Operational overview"),
    ("module-assets", "Assets", "fa-laptop", "asset_list", "Inventory and assignments"),
    ("module-employees", "Employees", "fa-users", "employee_list", "Staff directory"),
    ("module-reports", "Reports", "fa-chart-bar", "reports", "Analytics and insights"),
    ("module-portal", "Employee Portal", "fa-id-badge", "employee_dashboard", "Self-service for staff"),
]


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


def _shortcut_leaves(module_id: str) -> list[dict]:
    return [
        _leaf(leaf_id, label, icon=icon, url=reverse(url_name))
        for leaf_id, label, icon, url_name in MODULE_SHORTCUTS.get(module_id, [])
    ]


def _truncate(items: list[dict], total: int, parent_key: str) -> list[dict]:
    if total <= len(items):
        return items
    remaining = total - len(items)
    return items + [
        _leaf(
            f"{parent_key}-overflow",
            f"+{remaining} more",
            icon="fa-ellipsis-h",
            subtitle="Open list for full view",
        )
    ]


def _entity_leaves(
    rows: list,
    *,
    parent_key: str,
    total: int,
    id_fn: Callable,
    label_fn: Callable,
    icon_fn: Callable,
    url_fn: Callable,
    subtitle_fn: Callable,
) -> list[dict]:
    items = [
        _leaf(
            id_fn(row),
            label_fn(row),
            icon=icon_fn(row),
            url=url_fn(row),
            subtitle=subtitle_fn(row),
        )
        for row in rows[:MAX_EXPANSION_ITEMS]
    ]
    return _truncate(items, total, parent_key)


def _asset_leaves(assets: list[Asset], *, parent_key: str, total: int) -> list[dict]:
    return _entity_leaves(
        assets,
        parent_key=parent_key,
        total=total,
        id_fn=lambda asset: f"asset-{asset.pk}",
        label_fn=lambda asset: asset.name,
        icon_fn=lambda asset: ASSET_TYPE_ICONS.get(asset.type, "fa-box"),
        url_fn=lambda asset: reverse("asset_detail", kwargs={"pk": asset.pk}),
        subtitle_fn=lambda asset: asset.status,
    )


def _employee_leaves(employees: list[Employee], *, parent_key: str, total: int) -> list[dict]:
    return _entity_leaves(
        employees,
        parent_key=parent_key,
        total=total,
        id_fn=lambda employee: f"employee-{employee.pk}",
        label_fn=lambda employee: employee.name,
        icon_fn=lambda _employee: "fa-user",
        url_fn=lambda employee: reverse("employee_edit", kwargs={"pk": employee.pk}),
        subtitle_fn=lambda employee: employee.department_abbreviation,
    )


def _assignment_leaves(
    assignments: list[Assignment], *, parent_key: str, total: int
) -> list[dict]:
    return _entity_leaves(
        assignments,
        parent_key=parent_key,
        total=total,
        id_fn=lambda assignment: f"assignment-{assignment.pk}",
        label_fn=lambda assignment: assignment.asset.name,
        icon_fn=lambda assignment: ASSET_TYPE_ICONS.get(assignment.asset.type, "fa-link"),
        url_fn=lambda assignment: reverse(
            "asset_detail", kwargs={"pk": assignment.asset_id}
        ),
        subtitle_fn=lambda assignment: assignment.employee.name,
    )


def _collect_counts() -> dict[str, int]:
    asset_stats = Asset.objects.aggregate(
        total_assets=Count("pk"),
        assigned=Count("pk", filter=Q(status=Asset.AssetStatus.ASSIGNED)),
        available=Count("pk", filter=Q(status=Asset.AssetStatus.AVAILABLE)),
        maintenance=Count("pk", filter=Q(status=Asset.AssetStatus.UNDER_MAINTENANCE)),
    )
    return {
        **asset_stats,
        "employees": Employee.objects.count(),
        "assignments": Assignment.objects.filter(date_returned__isnull=True).count(),
        "open_maintenance": MaintenanceLog.objects.filter(resolved=False).count(),
    }


def _limited_assets(*, status: str | None = None) -> list[Asset]:
    qs = Asset.objects.order_by("name", "serial_number")
    if status is not None:
        qs = qs.filter(status=status)
    return list(qs[:MAX_EXPANSION_ITEMS])


def _build_expansions(counts: dict[str, int]) -> dict[str, list[dict]]:
    # Limited slices per status keep leaf lists correct even when totals exceed the cap.
    all_assets = _limited_assets()
    assigned_assets = _limited_assets(status=Asset.AssetStatus.ASSIGNED)
    available_assets = _limited_assets(status=Asset.AssetStatus.AVAILABLE)
    maintenance_assets = _limited_assets(status=Asset.AssetStatus.UNDER_MAINTENANCE)
    employees = list(Employee.objects.order_by("name")[:MAX_EXPANSION_ITEMS])
    assignments = list(
        Assignment.objects.filter(date_returned__isnull=True)
        .select_related("asset", "employee")
        .order_by("-date_assigned")[:MAX_EXPANSION_ITEMS]
    )

    asset_leaves = _asset_leaves(
        all_assets, parent_key="metric-total-assets", total=counts["total_assets"]
    )
    employee_leaves = _employee_leaves(
        employees, parent_key="metric-employees", total=counts["employees"]
    )
    assignment_leaves = _assignment_leaves(
        assignments, parent_key="metric-assignments", total=counts["assignments"]
    )

    return {
        "module-dashboard": _shortcut_leaves("module-dashboard"),
        "module-assets": asset_leaves,
        "module-employees": employee_leaves,
        "module-reports": _shortcut_leaves("module-reports"),
        "module-portal": _shortcut_leaves("module-portal"),
        "metric-total-assets": asset_leaves,
        "metric-assigned": _asset_leaves(
            assigned_assets, parent_key="metric-assigned", total=counts["assigned"]
        ),
        "metric-available": _asset_leaves(
            available_assets, parent_key="metric-available", total=counts["available"]
        ),
        "metric-maintenance": _asset_leaves(
            maintenance_assets,
            parent_key="metric-maintenance",
            total=counts["maintenance"],
        ),
        "metric-employees": employee_leaves,
        "metric-assignments": assignment_leaves,
    }


def build_ecosystem_map(user) -> dict:
    is_admin = user_has_admin_access(user)
    nodes: list[dict] = []
    edges: list[dict] = []

    # Counts and expansions share one pass so badges and leaf lists stay aligned.
    counts = _collect_counts()
    expansions = _build_expansions(counts) if is_admin else {}

    nodes.append(
        _node(
            "hub-itam",
            "ITAM V4",
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

    for index, (node_id, label, icon, url_name, description) in enumerate(MODULES):
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
            counts["total_assets"],
            "module-assets",
            "fa-boxes",
            "All tracked equipment",
        ),
        (
            "metric-assigned",
            "Assigned",
            counts["assigned"],
            "module-assets",
            "fa-user-check",
            "Currently with employees",
        ),
        (
            "metric-available",
            "Available",
            counts["available"],
            "module-assets",
            "fa-check-circle",
            "Ready to assign",
        ),
        (
            "metric-maintenance",
            "In Maintenance",
            counts["maintenance"],
            "module-assets",
            "fa-tools",
            f"{counts['open_maintenance']} open log(s)",
        ),
        (
            "metric-employees",
            "Employees",
            counts["employees"],
            "module-employees",
            "fa-user-friends",
            "People in the directory",
        ),
        (
            "metric-assignments",
            "Active Assignments",
            counts["assignments"],
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

    return {
        "nodes": nodes,
        "edges": edges,
        "expansions": expansions,
        "meta": {
            "base_label": "ITAM V4 Overview",
            "is_admin": is_admin,
            "summary": [
                {"label": "Assets", "value": counts["total_assets"]},
                {"label": "Assigned", "value": counts["assigned"]},
                {"label": "Employees", "value": counts["employees"]},
                {"label": "Active assignments", "value": counts["assignments"]},
            ],
        },
    }


def get_ecosystem_map_json(user) -> str:
    return json.dumps(build_ecosystem_map(user))
