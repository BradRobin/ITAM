"""Build interactive ecosystem map graph for the Reports page."""

from __future__ import annotations

import json

from django.db.models import Count, Q
from django.urls import reverse

from inventory.models import (
    Asset,
    AssetCatalog,
    Assignment,
    Employee,
    MaintenanceLog,
)


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
    group: str = "",
    meta: dict | None = None,
) -> dict:
    return {
        "id": node_id,
        "label": label,
        "type": node_type,
        "icon": icon,
        "url": url,
        "badge": badge,
        "group": group or node_type,
        "meta": meta or {},
    }


def _edge(source: str, target: str, label: str, edge_id: str | None = None) -> dict:
    return {
        "id": edge_id or f"{source}->{target}:{label}",
        "source": source,
        "target": target,
        "label": label,
    }


def build_ecosystem_map(user) -> dict:
    is_admin = _user_is_admin(user)
    nodes: list[dict] = []
    edges: list[dict] = []

    hub = _node(
        "hub-itam",
        "ITAM 3.0",
        "hub",
        icon="fa-project-diagram",
        group="application",
    )
    nodes.append(hub)

    if is_admin:
        admin_name = user.get_full_name() or user.username
        nodes.append(
            _node(
                "admin-user",
                admin_name,
                "admin",
                icon="fa-user-shield",
                url=reverse("profile"),
                group="application",
                meta={"role": "Administrator"},
            )
        )
        edges.append(_edge("admin-user", "hub-itam", "manages"))

    view_defs = [
        ("view-dashboard", "Dashboard", "fa-th-large", "dashboard", "application"),
        ("view-assets", "Assets", "fa-laptop", "asset_list", "application"),
        ("view-employees", "Employees", "fa-users", "employee_list", "application"),
        ("view-reports", "Reports", "fa-chart-bar", "reports", "application"),
        ("view-profile", "Profile", "fa-user-circle", "profile", "application"),
        ("view-settings", "Settings", "fa-cog", "settings", "application"),
        ("view-notifications", "Notifications", "fa-bell", "notifications", "application"),
        ("view-employee-portal", "Employee Portal", "fa-id-badge", "employee_portal", "portal"),
    ]

    for node_id, label, icon, url_name, group in view_defs:
        nodes.append(
            _node(
                node_id,
                label,
                "view",
                icon=icon,
                url=reverse(url_name),
                group=group,
            )
        )
        edges.append(_edge("hub-itam", node_id, "hosts"))

    asset_sections = [
        ("section-all-assets", "All Assets", "fa-boxes"),
        ("section-assigned", "Assigned Assets", "fa-user-check"),
        ("section-available", "Available Assets", "fa-check-circle"),
        ("section-maintenance", "Under Maintenance", "fa-tools"),
    ]
    for node_id, label, icon in asset_sections:
        nodes.append(
            _node(
                node_id,
                label,
                "section",
                icon=icon,
                url=reverse("asset_list"),
                group="application",
            )
        )
        edges.append(_edge("view-assets", node_id, "displays"))

    table_defs = [
        ("table-asset", "Asset", "fa-database", "data"),
        ("table-employee", "Employee", "fa-database", "data"),
        ("table-assignment", "Assignment", "fa-link", "data"),
        ("table-maintenance", "MaintenanceLog", "fa-wrench", "data"),
        ("table-catalog", "AssetCatalog", "fa-folder-open", "data"),
        ("table-catalog-asset", "CatalogAsset", "fa-table", "data"),
        ("table-background-job", "BackgroundJob", "fa-bolt", "data"),
    ]
    for node_id, label, icon, group in table_defs:
        nodes.append(_node(node_id, label, "table", icon=icon, group=group))
        edges.append(_edge("hub-itam", node_id, "stores"))

    edges.extend(
        [
            _edge("view-assets", "table-asset", "reads"),
            _edge("view-employees", "table-employee", "reads"),
            _edge("view-reports", "table-background-job", "queries"),
            _edge("table-assignment", "table-asset", "links"),
            _edge("table-assignment", "table-employee", "links"),
            _edge("table-maintenance", "table-asset", "tracks"),
            _edge("table-catalog-asset", "table-catalog", "belongs to"),
            _edge("table-catalog-asset", "table-asset", "imports to"),
            _edge("section-assigned", "table-assignment", "powered by"),
            _edge("section-maintenance", "table-maintenance", "powered by"),
        ]
    )

    asset_counts = Asset.objects.values("type").annotate(count=Count("id"))
    for row in asset_counts:
        asset_type = row["type"]
        count = row["count"]
        if not count:
            continue
        node_id = f"asset-type-{asset_type.lower()}"
        nodes.append(
            _node(
                node_id,
                f"{asset_type}s",
                "cluster",
                icon="fa-layer-group",
                url=reverse("asset_list"),
                badge=count,
                group="live",
                meta={"asset_type": asset_type},
            )
        )
        edges.append(_edge("table-asset", node_id, "contains"))

    status_counts = Asset.objects.values("status").annotate(count=Count("id"))
    for row in status_counts:
        status = row["status"]
        count = row["count"]
        if not count:
            continue
        slug = status.lower().replace(" ", "-")
        node_id = f"asset-status-{slug}"
        nodes.append(
            _node(
                node_id,
                status,
                "cluster",
                icon="fa-tags",
                url=reverse("asset_list"),
                badge=count,
                group="live",
                meta={"status": status},
            )
        )
        edges.append(_edge("table-asset", node_id, "classified as"))

    catalogs = AssetCatalog.objects.annotate(
        asset_count=Count("assets")
    ).order_by("name")[:8]
    for catalog in catalogs:
        node_id = f"catalog-{catalog.pk}"
        nodes.append(
            _node(
                node_id,
                catalog.name,
                "catalog",
                icon="fa-folder",
                url=reverse("asset_list"),
                badge=catalog.asset_count,
                group="live",
            )
        )
        edges.append(_edge("table-catalog", node_id, "organizes"))
        edges.append(_edge(node_id, "view-assets", "shown in"))

    dept_counts = Employee.objects.values("department").annotate(count=Count("id"))
    for row in dept_counts:
        department = row["department"]
        count = row["count"]
        if not count:
            continue
        slug = department.split()[0].lower()[:12]
        node_id = f"dept-{slug}"
        abbrev = {
            "Technical & Core Programme Directorates": "TCPD",
            "Capacity Building & Innovation Directorates": "CBID",
            "Institutional Support & Advisory Operations": "ISAO",
        }.get(department, department[:8])
        nodes.append(
            _node(
                node_id,
                abbrev,
                "cluster",
                icon="fa-building",
                url=reverse("employee_list"),
                badge=count,
                group="live",
                meta={"department": department},
            )
        )
        edges.append(_edge("table-employee", node_id, "grouped in"))

    active_assignments = (
        Assignment.objects.filter(date_returned__isnull=True)
        .select_related("asset", "employee")
        .order_by("-date_assigned")[:10]
    )
    seen_employees: set[int] = set()
    seen_assets: set[int] = set()

    for assignment in active_assignments:
        employee = assignment.employee
        asset = assignment.asset
        emp_node_id = f"employee-{employee.pk}"
        asset_node_id = f"asset-{asset.pk}"

        if employee.pk not in seen_employees:
            seen_employees.add(employee.pk)
            nodes.append(
                _node(
                    emp_node_id,
                    employee.name,
                    "employee",
                    icon="fa-user",
                    url=reverse("employee_edit", kwargs={"pk": employee.pk})
                    if is_admin
                    else reverse("employee_list"),
                    group="live",
                    meta={"department": employee.department},
                )
            )
            dept_slug = employee.department.split()[0].lower()[:12]
            dept_node = f"dept-{dept_slug}"
            if any(n["id"] == dept_node for n in nodes):
                edges.append(_edge(dept_node, emp_node_id, "includes"))

        if asset.pk not in seen_assets:
            seen_assets.add(asset.pk)
            nodes.append(
                _node(
                    asset_node_id,
                    asset.name,
                    "asset",
                    icon={
                        Asset.AssetType.LAPTOP: "fa-laptop",
                        Asset.AssetType.PRINTER: "fa-print",
                        Asset.AssetType.ROUTER: "fa-wifi",
                        Asset.AssetType.MONITOR: "fa-desktop",
                    }.get(asset.type, "fa-hdd"),
                    url=reverse("asset_detail", kwargs={"pk": asset.pk}),
                    group="live",
                    meta={"status": asset.status, "serial": asset.serial_number},
                )
            )
            type_node = f"asset-type-{asset.type.lower()}"
            if any(n["id"] == type_node for n in nodes):
                edges.append(_edge(type_node, asset_node_id, "includes"))

        edges.append(_edge(emp_node_id, asset_node_id, "assigned to"))
        edges.append(_edge("table-assignment", emp_node_id, "records"))
        edges.append(_edge("table-assignment", asset_node_id, "records"))

    maintenance_assets = Asset.objects.filter(
        status=Asset.AssetStatus.UNDER_MAINTENANCE
    ).order_by("name")[:6]
    for asset in maintenance_assets:
        asset_node_id = f"asset-{asset.pk}"
        if asset.pk not in seen_assets:
            seen_assets.add(asset.pk)
            nodes.append(
                _node(
                    asset_node_id,
                    asset.name,
                    "asset",
                    icon="fa-tools",
                    url=reverse("asset_detail", kwargs={"pk": asset.pk}),
                    badge=MaintenanceLog.objects.filter(asset=asset, resolved=False).count()
                    or None,
                    group="live",
                    meta={"status": asset.status},
                )
            )
        edges.append(_edge(asset_node_id, "table-maintenance", "logged in"))
        edges.append(_edge("section-maintenance", asset_node_id, "lists"))

    if is_admin:
        edges.append(_edge("admin-user", "view-assets", "operates"))
        edges.append(_edge("admin-user", "view-employees", "operates"))
        edges.append(_edge("admin-user", "view-reports", "analyzes"))

    return {
        "nodes": nodes,
        "edges": edges,
        "meta": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "is_admin": is_admin,
            "base_label": "ITAM 3.0 Ecosystem",
        },
    }


def get_ecosystem_map_json(user) -> str:
    return json.dumps(build_ecosystem_map(user))
