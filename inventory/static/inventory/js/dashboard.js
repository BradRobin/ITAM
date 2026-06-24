/**
 * ============================================================
 * DASHBOARD MODULE - ITAM SYSTEM
 * ============================================================
 * This file provides a real-time executive summary:
 * - Total assets count & breakdown by status
 * - Visual status distribution bars
 * - Recent activity feed (assignments / returns)
 * 
 * Dependencies: None (Pure Vanilla JS ES6+)
 * Backend endpoints expected:
 *   GET  /api/assets/           -> List of all assets (for stats)
 *   GET  /api/activity-logs/    -> Recent activities (Optional, falls back to recent assets)
 *   GET  /api/employees/        -> Total employee count (Optional)
 * ============================================================
 */

// ============================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================

const API_BASE = '/api';
const ASSETS_API_URL = `${API_BASE}/assets`;
const EMPLOYEES_API_URL = `${API_BASE}/employees`;
const ACTIVITY_LOGS_API_URL = `${API_BASE}/activity-logs`; // Optional - if your backend has this

// Status constants matching the backend
const STATUS = {
    AVAILABLE: 'available',
    ASSIGNED: 'assigned',
    MAINTENANCE: 'maintenance',
    DISPOSED: 'disposed',
};

const STATUS_LABELS = {
    [STATUS.AVAILABLE]: 'Available',
    [STATUS.ASSIGNED]: 'Assigned',
    [STATUS.MAINTENANCE]: 'Under Maintenance',
    [STATUS.DISPOSED]: 'Disposed',
};

// Color mapping for statuses (Bootstrap / CSS classes)
const STATUS_COLORS = {
    [STATUS.AVAILABLE]: 'success',
    [STATUS.ASSIGNED]: 'primary',
    [STATUS.MAINTENANCE]: 'warning',
    [STATUS.DISPOSED]: 'danger',
};

// ============================================================
// 2. API HELPER FUNCTIONS
// ============================================================

async function apiRequest(url, method = 'GET') {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
    };

    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errorMsg = data.message || data.detail || JSON.stringify(data);
        throw new Error(`API Error (${response.status}): ${errorMsg}`);
    }
    return data;
}

/**
 * Fetch all assets from the backend
 */
async function fetchAllAssets() {
    return apiRequest(ASSETS_API_URL);
}

/**
 * Fetch recent activity logs (assignments, returns, etc.)
 * If this endpoint doesn't exist yet, the function will gracefully fallback
 * to using the 5 most recently updated assets.
 */
async function fetchRecentActivities() {
    try {
        const logs = await apiRequest(`${ACTIVITY_LOGS_API_URL}?limit=5`);
        return logs.results || logs || [];
    } catch (error) {
        console.warn('Activity logs endpoint not found. Falling back to recent assets.', error.message);
        return []; // We'll handle the fallback in the renderer
    }
}

/**
 * Fetch total employee count (for displaying alongside assets)
 */
async function fetchEmployeeCount() {
    try {
        const data = await apiRequest(EMPLOYEES_API_URL);
        return data.count || data.length || 0;
    } catch (error) {
        console.warn('Could not fetch employee count:', error.message);
        return 0;
    }
}

// ============================================================
// 3. DATA PROCESSING (Calculate Statistics)
// ============================================================

/**
 * Process raw asset data into dashboard statistics
 */
function calculateStats(assets) {
    const total = assets.length;

    // Count assets by status
    const statusCounts = {
        [STATUS.AVAILABLE]: 0,
        [STATUS.ASSIGNED]: 0,
        [STATUS.MAINTENANCE]: 0,
        [STATUS.DISPOSED]: 0,
        unknown: 0,
    };

    assets.forEach((asset) => {
        const status = asset.status || 'unknown';
        if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status] += 1;
        } else {
            statusCounts.unknown += 1;
        }
    });

    // Calculate percentages for progress bars
    const getPercentage = (count) => {
        if (total === 0) return 0;
        return Math.round((count / total) * 100);
    };

    return {
        total,
        employeeCount: 0, // Will be filled later
        available: statusCounts[STATUS.AVAILABLE],
        assigned: statusCounts[STATUS.ASSIGNED],
        maintenance: statusCounts[STATUS.MAINTENANCE],
        disposed: statusCounts[STATUS.DISPOSED],
        unknown: statusCounts.unknown,
        percentages: {
            available: getPercentage(statusCounts[STATUS.AVAILABLE]),
            assigned: getPercentage(statusCounts[STATUS.ASSIGNED]),
            maintenance: getPercentage(statusCounts[STATUS.MAINTENANCE]),
            disposed: getPercentage(statusCounts[STATUS.DISPOSED]),
        },
    };
}

// ============================================================
// 4. UI RENDERERS
// ============================================================

/**
 * Render the main stat cards (Total, Available, Assigned, etc.)
 */
function renderStatCards(stats) {
    const container = document.getElementById('dashboard-stats');
    if (!container) return;

    // If we have employee data, add it to the total display
    const employeeHtml = stats.employeeCount > 0
        ? `<small class="text-muted d-block">👥 ${stats.employeeCount} Employees</small>`
        : '';

    container.innerHTML = `
        <div class="row g-3">
            <div class="col-md-2 col-6">
                <div class="card stat-card border-0 shadow-sm h-100">
                    <div class="card-body text-center">
                        <h5 class="card-title text-muted">Total Assets</h5>
                        <h2 class="display-6 fw-bold">${stats.total}</h2>
                        ${employeeHtml}
                    </div>
                </div>
            </div>
            <div class="col-md-2 col-6">
                <div class="card stat-card border-0 shadow-sm h-100 border-start border-success border-4">
                    <div class="card-body text-center">
                        <h5 class="card-title text-success">Available</h5>
                        <h2 class="display-6 fw-bold text-success">${stats.available}</h2>
                        <small class="text-muted">${stats.percentages.available}% of total</small>
                    </div>
                </div>
            </div>
            <div class="col-md-2 col-6">
                <div class="card stat-card border-0 shadow-sm h-100 border-start border-primary border-4">
                    <div class="card-body text-center">
                        <h5 class="card-title text-primary">Assigned</h5>
                        <h2 class="display-6 fw-bold text-primary">${stats.assigned}</h2>
                        <small class="text-muted">${stats.percentages.assigned}% of total</small>
                    </div>
                </div>
            </div>
            <div class="col-md-2 col-6">
                <div class="card stat-card border-0 shadow-sm h-100 border-start border-warning border-4">
                    <div class="card-body text-center">
                        <h5 class="card-title text-warning">Maintenance</h5>
                        <h2 class="display-6 fw-bold text-warning">${stats.maintenance}</h2>
                        <small class="text-muted">${stats.percentages.maintenance}% of total</small>
                    </div>
                </div>
            </div>
            <div class="col-md-2 col-6">
                <div class="card stat-card border-0 shadow-sm h-100 border-start border-danger border-4">
                    <div class="card-body text-center">
                        <h5 class="card-title text-danger">Disposed</h5>
                        <h2 class="display-6 fw-bold text-danger">${stats.disposed}</h2>
                        <small class="text-muted">${stats.percentages.disposed}% of total</small>
                    </div>
                </div>
            </div>
            <div class="col-md-2 col-6">
                <div class="card stat-card border-0 shadow-sm h-100 bg-light">
                    <div class="card-body text-center d-flex flex-column justify-content-center">
                        <span class="display-6">📊</span>
                        <small class="text-muted">Last updated: ${new Date().toLocaleTimeString()}</small>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render the status distribution as progress bars
 */
function renderStatusDistribution(stats) {
    const container = document.getElementById('dashboard-distribution');
    if (!container) return;

    const statuses = [
        { key: STATUS.AVAILABLE, label: 'Available', count: stats.available, percent: stats.percentages.available, color: 'success' },
        { key: STATUS.ASSIGNED, label: 'Assigned', count: stats.assigned, percent: stats.percentages.assigned, color: 'primary' },
        { key: STATUS.MAINTENANCE, label: 'Maintenance', count: stats.maintenance, percent: stats.percentages.maintenance, color: 'warning' },
        { key: STATUS.DISPOSED, label: 'Disposed', count: stats.disposed, percent: stats.percentages.disposed, color: 'danger' },
    ];

    let html = `
        <div class="distribution-list">
            <h6 class="fw-bold mb-3">Status Distribution</h6>
    `;

    statuses.forEach((item) => {
        const percent = item.percent || 0;
        html += `
            <div class="mb-2">
                <div class="d-flex justify-content-between">
                    <span>${item.label}</span>
                    <span><strong>${item.count}</strong> (${percent}%)</span>
                </div>
                <div class="progress" style="height: 10px;">
                    <div class="progress-bar bg-${item.color}" 
                         role="progressbar" 
                         style="width: ${percent}%;" 
                         aria-valuenow="${percent}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                    </div>
                </div>
            </div>
        `;
    });

    html += `
            <div class="mt-3 text-muted small">
                * Based on ${stats.total} total assets
            </div>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Render the recent activity feed
 */
function renderRecentActivity(activities, assets) {
    const container = document.getElementById('dashboard-activity');
    if (!container) return;

    // Fallback: If no activity logs are available, show the 5 most recently updated assets
    let activityItems = activities;

    if (!activityItems || activityItems.length === 0) {
        // Use the 5 most recently updated assets as a fallback
        const sortedAssets = [...assets].sort((a, b) => {
            return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
        });
        activityItems = sortedAssets.slice(0, 5).map((asset) => ({
            action: 'Updated',
            asset_name: asset.name || 'Unnamed Asset',
            asset_id: asset.id,
            status: asset.status,
            timestamp: asset.updated_at || asset.created_at || new Date().toISOString(),
            // Fake an employee name if available
            employee: asset.assigned_employee?.name || 'System',
            message: `Asset "${asset.name}" was last modified.`,
        }));
    }

    if (!activityItems || activityItems.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-inbox fa-2x d-block mb-2"></i>
                No recent activity found.
            </div>
        `;
        return;
    }

    let html = `<ul class="list-group list-group-flush">`;

    activityItems.forEach((item) => {
        const actionIcon = item.action?.toLowerCase() === 'assign' ? '🔗' :
                          item.action?.toLowerCase() === 'return' ? '↩️' : '📝';
        const timeAgo = item.timestamp ? timeSince(new Date(item.timestamp)) : 'Just now';

        html += `
            <li class="list-group-item d-flex justify-content-between align-items-start border-0 py-2">
                <div>
                    <span class="me-2">${actionIcon}</span>
                    <strong>${item.asset_name || 'Asset #' + item.asset_id}</strong>
                    <span class="text-muted ms-2">${item.message || item.action || 'Activity'}</span>
                    ${item.employee ? `<span class="badge bg-secondary">👤 ${item.employee}</span>` : ''}
                </div>
                <small class="text-muted">${timeAgo}</small>
            </li>
        `;
    });

    html += `</ul>`;

    // Add a "View All" link if there are more than 5 items
    if (activities.length > 5) {
        html += `
            <div class="text-center mt-3">
                <a href="/activities/" class="btn btn-outline-primary btn-sm">View All Activity</a>
            </div>
        `;
    }

    container.innerHTML = html;
}

// ============================================================
// 5. UTILITY: Time ago formatter
// ============================================================

function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + ' years ago';
    if (interval === 1) return '1 year ago';
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' months ago';
    if (interval === 1) return '1 month ago';
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' days ago';
    if (interval === 1) return '1 day ago';
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' hours ago';
    if (interval === 1) return '1 hour ago';
    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' minutes ago';
    if (interval === 1) return '1 minute ago';
    return 'Just now';
}

// ============================================================
// 6. MAIN INITIALIZATION
// ============================================================

let dashboardData = {
    stats: null,
    assets: [],
    activities: [],
};

async function initDashboard() {
    const container = document.getElementById('dashboard-content');
    const loadingIndicator = document.getElementById('dashboard-loading');

    if (!container) {
        console.error('Dashboard container (#dashboard-content) not found!');
        return;
    }

    try {
        // Show loading state
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        container.innerHTML = '';

        // 1. Fetch all data in parallel
        const [assets, activities, employeeCount] = await Promise.all([
            fetchAllAssets(),
            fetchRecentActivities(),
            fetchEmployeeCount(),
        ]);

        // 2. Calculate statistics
        const stats = calculateStats(assets);
        stats.employeeCount = employeeCount;

        dashboardData = { stats, assets, activities };

        // 3. Render everything
        renderStatCards(stats);
        renderStatusDistribution(stats);
        renderRecentActivity(activities, assets);

        // 4. Hide loading, show content
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        container.style.display = 'block';

        console.log('✅ Dashboard loaded successfully.', stats);

    } catch (error) {
        console.error('Failed to load dashboard:', error);
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        container.innerHTML = `
            <div class="alert alert-danger text-center p-5" role="alert">
                <h4 class="alert-heading">⚠️ Failed to load dashboard</h4>
                <p>${error.message}</p>
                <hr>
                <button class="btn btn-outline-danger" onclick="window.Dashboard.refresh()">
                    Try Again
                </button>
            </div>
        `;
        container.style.display = 'block';
    }
}

/**
 * Refresh the dashboard manually (e.g., after an asset change)
 */
async function refreshDashboard() {
    const container = document.getElementById('dashboard-content');
    if (container) {
        container.innerHTML =
            `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><p>Refreshing...</p></div>`;
    }
    await initDashboard();
}

// ============================================================
// 7. AUTO-INIT ON DOM READY
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();

    // Optional: Auto-refresh every 60 seconds
    // setInterval(refreshDashboard, 60000);
});

// ============================================================
// 8. EXPOSE GLOBALLY (for console debugging and manual refresh)
// ============================================================

window.Dashboard = {
    init: initDashboard,
    refresh: refreshDashboard,
    getData: () => dashboardData,
};

console.log('✅ Dashboard Module loaded successfully.');