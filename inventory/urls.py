from django.urls import path
from django.contrib.auth import views as auth_views
from . import views


urlpatterns = [
    # Authentication URLs
    path("login/", views.AuthLoginView.as_view(), name="login"),
    path("logout/", views.AuthLogoutView.as_view(), name="logout"),
    
    # ==========================================
    # PASSWORD RESET URLs - All using auth.html
    # ==========================================
    path('password-reset/', 
         auth_views.PasswordResetView.as_view(
             template_name='inventory/auth.html',
             email_template_name='inventory/password_reset_email.html',
             subject_template_name='inventory/password_reset_subject.txt'
         ), 
         name='password_reset'),
    path('password-reset/done/', 
         auth_views.PasswordResetDoneView.as_view(
             template_name='inventory/auth.html'
         ), 
         name='password_reset_done'),
    path('password-reset-confirm/<uidb64>/<token>/', 
         auth_views.PasswordResetConfirmView.as_view(
             template_name='inventory/auth.html'
         ), 
         name='password_reset_confirm'),
    path('password-reset-complete/', 
         auth_views.PasswordResetCompleteView.as_view(
             template_name='inventory/auth.html'
         ), 
         name='password_reset_complete'),
    
    # Dashboard
    path("", views.DashboardView.as_view(), name="dashboard"),
    path("dashboard/", views.DashboardView.as_view(), name="dashboard_redirect"),
    
    # Profile
    path("profile/", views.ProfileView.as_view(), name="profile"),
    
    # Settings
    path("settings/", views.SettingsView.as_view(), name="settings"),
    
    # Notifications
    path("notifications/", views.NotificationListView.as_view(), name="notifications"),
    path("api/notifications/", views.NotificationAPIView.as_view(), name="api_notifications"),
    path("api/notifications/<int:pk>/read/", views.NotificationMarkReadView.as_view(), name="api_notification_read"),
    path("api/notifications/mark-all-read/", views.NotificationMarkAllReadView.as_view(), name="api_notification_mark_all_read"),
    
    # Reports
    path("reports/", views.ReportsView.as_view(), name="reports"),
    
    # API URLs
    path("api/assets", views.AssetAPIListView.as_view(), name="api_asset_list"),
    path("api/assets/", views.AssetAPIListView.as_view(), name="api_asset_list_slash"),
    path(
        "api/assets/<int:pk>/",
        views.AssetAPIDetailView.as_view(),
        name="api_asset_detail",
    ),
    path(
        "api/assets/<int:pk>/assign/",
        views.AssetAssignAPIView.as_view(),
        name="api_asset_assign",
    ),
    path(
        "api/assets/<int:pk>/return/",
        views.AssetReturnAPIView.as_view(),
        name="api_asset_return",
    ),
    path(
        "api/employees",
        views.EmployeeAPIListView.as_view(),
        name="api_employee_list",
    ),
    path(
        "api/employees/",
        views.EmployeeAPIListView.as_view(),
        name="api_employee_list_slash",
    ),
    path(
        "api/employees/<int:pk>/",
        views.EmployeeAPIDetailView.as_view(),
        name="api_employee_detail",
    ),
    
    # Asset URLs
    path("assets/", views.AssetListView.as_view(), name="asset_list"),
    path(
        "assets/export/csv/",
        views.ExportAssetCSVView.as_view(),
        name="export_asset_csv",
    ),
    path("assets/export.csv", views.ExportAssetCSVView.as_view(), name="asset_export"),
    path("assets/add/", views.AssetCreateView.as_view(), name="asset_add"),
    path("assets/<int:pk>/", views.AssetDetailView.as_view(), name="asset_detail"),
    path("assets/<int:pk>/edit/", views.AssetUpdateView.as_view(), name="asset_edit"),
    path("assets/<int:pk>/delete/", views.AssetDeleteView.as_view(), name="asset_delete"),
    path("assets/<int:pk>/assign/", views.AssignAssetView.as_view(), name="assign_asset"),
    path("assets/<int:pk>/return/", views.ReturnAssetView.as_view(), name="return_asset"),
    path(
        "assets/<int:pk>/maintenance/done/",
        views.CompleteMaintenanceView.as_view(),
        name="maintenance_done",
    ),
    path(
        "assets/<int:asset_pk>/maintenance/add/",
        views.MaintenanceLogCreateView.as_view(),
        name="maintenance_log_add",
    ),
    path(
        "maintenance/<int:pk>/edit/",
        views.MaintenanceLogUpdateView.as_view(),
        name="maintenance_log_edit",
    ),
    path(
        "maintenance/<int:pk>/delete/",
        views.MaintenanceLogDeleteView.as_view(),
        name="maintenance_log_delete",
    ),
    
    # Employee URLs
    path("employees/", views.EmployeeListView.as_view(), name="employee_list"),
    path("employees/add/", views.EmployeeCreateView.as_view(), name="employee_add"),
    path(
        "employees/<int:pk>/edit/",
        views.EmployeeUpdateView.as_view(),
        name="employee_edit",
    ),
    path(
        "employees/<int:pk>/delete/",
        views.EmployeeDeleteView.as_view(),
        name="employee_delete",
    ),
    
    # ==========================================
    # EMPLOYEE PORTAL URLs
    # ==========================================
    # Dashboard
    path('employee/', views.EmployeeDashboardView.as_view(), name='employee_portal'),
    path('employee/dashboard/', views.EmployeeDashboardView.as_view(), name='employee_dashboard'),
    path('employee/assets/', views.EmployeeAssetsView.as_view(), name='employee_assets'),
    path('employee/assets/<int:pk>/', views.EmployeeAssetDetailView.as_view(), name='employee_asset_detail'),
    path('employee/asset/<int:pk>/confirm/', views.EmployeeConfirmAssetView.as_view(), name='employee_confirm_asset'),
    path('employee/asset/<int:pk>/report-issue/', views.EmployeeReportIssueView.as_view(), name='employee_report_issue'),
    path('employee/asset/<int:pk>/maintenance/', views.EmployeeMaintenanceRequestView.as_view(), name='employee_maintenance_request'),
    path('employee/asset/<int:pk>/return/', views.EmployeeReturnRequestView.as_view(), name='employee_return_request'),
    path('employee/notifications/', views.EmployeeNotificationsView.as_view(), name='employee_notifications'),
    path('employee/notifications/mark-read/<int:pk>/', views.EmployeeMarkNotificationReadView.as_view(), name='employee_mark_notification_read'),
    path('employee/notifications/mark-all-read/', views.EmployeeMarkAllNotificationsReadView.as_view(), name='employee_mark_all_notifications_read'),
    path('employee/profile/', views.EmployeeProfileView.as_view(), name='employee_profile'),
    path('employee/settings/', views.EmployeeSettingsView.as_view(), name='employee_settings'),
    path('employee/history/', views.EmployeeHistoryView.as_view(), name='employee_history'),
    path('employee/returns/', views.EmployeeReturnsView.as_view(), name='employee_returns'),
]