/**
 * ============================================================
 * MAIN ENTRY POINT - ITAM SYSTEM
 * Path: inventory/js/main.js
 * ============================================================
 * Orchestrates page detection, module initialization,
 * global events, and error handling.
 * ============================================================
 */

// ============================================================
// 1. PAGE DETECTION
// ============================================================

function getCurrentPage() {
    const body = document.body;
    if (body.dataset.page) return body.dataset.page;

    const path = window.location.pathname;
    if (path.includes('/dashboard') || path === '/') return 'dashboard';
    if (path.includes('/assets')) return 'assets';
    if (path.includes('/employees')) return 'employees';
    if (path.includes('/assignments')) return 'assignments';
    return 'dashboard';
}

// ============================================================
// 2. MODULE LOADER
// ============================================================

function initializePage(page) {
    console.log(`🚀 Initializing page: ${page}`);

    const loader = document.getElementById('page-loader');
    if (loader) loader.style.display = 'none';

    const content = document.getElementById('main-content');
    if (content) content.style.display = 'block';

    switch (page) {
        case 'dashboard':
            if (window.Dashboard?.init) window.Dashboard.init();
            else if (window.Dashboard?.refresh) window.Dashboard.refresh();
            else console.warn('Dashboard module not loaded.');
            break;

        case 'assets':
            if (window.assetManager?.refreshAssetList) window.assetManager.refreshAssetList();
            else if (typeof refreshAssetList === 'function') refreshAssetList();
            else console.warn('Asset module not loaded.');
            break;

        case 'employees':
            if (window.EmployeeManager?.refresh) window.EmployeeManager.refresh();
            else if (typeof refreshEmployeeList === 'function') refreshEmployeeList();
            else console.warn('Employee module not loaded.');
            break;

        case 'assignments':
            const container = document.getElementById('assignment-container');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-info">
                        <h5>Assignment Center</h5>
                        <p>Use the "Assign" button on any asset card.</p>
                        <a href="/assets/" class="btn btn-primary">Go to Assets</a>
                    </div>
                `;
            }
            break;

        default:
            if (window.Dashboard?.init) window.Dashboard.init();
            break;
    }
}

// ============================================================
// 3. GLOBAL EVENTS
// ============================================================

function setupGlobalEvents() {
    // Highlight active nav
    const currentPage = getCurrentPage();
    document.querySelectorAll('.nav-link, .sidebar-link').forEach((link) => {
        const href = link.getAttribute('href');
        if (href && href.includes(currentPage)) link.classList.add('active');
        else link.classList.remove('active');
    });

    // Global action buttons
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-global-action]');
        if (!target) return;

        const action = target.dataset.globalAction;
        switch (action) {
            case 'add-asset':
                e.preventDefault();
                const assetForm = document.getElementById('asset-form');
                if (assetForm) {
                    if (window.assetFormHandler?.resetForm) window.assetFormHandler.resetForm();
                    assetForm.scrollIntoView({ behavior: 'smooth' });
                }
                break;

            case 'add-employee':
                e.preventDefault();
                const empForm = document.getElementById('employee-form');
                if (empForm) {
                    if (window.employeeFormHandler?.resetForm) window.employeeFormHandler.resetForm();
                    empForm.scrollIntoView({ behavior: 'smooth' });
                }
                break;

            case 'refresh-data':
                e.preventDefault();
                const page = getCurrentPage();
                switch (page) {
                    case 'dashboard': window.Dashboard?.refresh?.(); break;
                    case 'assets': window.assetManager?.refreshAssetList?.(); break;
                    case 'employees': window.EmployeeManager?.refresh?.(); break;
                    default: location.reload();
                }
                break;

            default:
                break;
        }
    });

    // Toast notifications via custom events
    window.addEventListener('show-notification', (event) => {
        const { message, type = 'info', duration = 3000 } = event.detail || {};
        showToast(message, type, duration);
    });

    console.log('✅ Global event listeners set up.');
}

// ============================================================
// 4. TOAST SYSTEM
// ============================================================

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(message);
        return;
    }

    const colors = {
        success: 'bg-success text-white',
        error: 'bg-danger text-white',
        warning: 'bg-warning text-dark',
        info: 'bg-primary text-white',
    };

    const toast = document.createElement('div');
    toast.className = `toast align-items-center ${colors[type] || colors.info} border-0 show`;
    toast.role = 'alert';
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, duration);
}

// ============================================================
// 5. GLOBAL ERROR HANDLING
// ============================================================

function setupGlobalErrorHandling() {
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled Promise Rejection:', event.reason);
        const msg = event.reason?.message || 'An unexpected error occurred.';
        if (window.showToast) window.showToast(`⚠️ ${msg}`, 'error');
        else alert(`Error: ${msg}`);
        event.preventDefault();
    });

    window.addEventListener('error', (event) => {
        console.error('Global Error:', event.message, event.filename, event.lineno);
        if (event.message && !event.message.includes('404')) {
            if (window.showToast) window.showToast(`⚠️ ${event.message}`, 'error');
        }
    });

    console.log('✅ Global error handling set up.');
}

// ============================================================
// 6. MAIN INIT
// ============================================================

function initApp() {
    console.log('🔄 ITAM Application starting...');

    const page = getCurrentPage();

    setupGlobalEvents();
    setupGlobalErrorHandling();

    window.showToast = showToast;

    initializePage(page);

    document.dispatchEvent(new CustomEvent('itam-ready', { detail: { page } }));
    console.log(`✅ ITAM Application ready. Page: ${page}`);
}

// ============================================================
// 7. START
// ============================================================

document.addEventListener('DOMContentLoaded', initApp);

// ============================================================
// 8. EXPOSE
// ============================================================

window.MainApp = {
    getCurrentPage,
    initializePage,
    refresh: () => { initializePage(getCurrentPage()); },
    showToast,
};

console.log('✅ main.js loaded.');