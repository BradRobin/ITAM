/**
 * ============================================================
 * GENERAL ASSET MANAGEMENT MODULE - ITAM SYSTEM
 * ============================================================
 * This single file handles:
 * - Listing assets with filters
 * - Creating, Editing, Deleting assets
 * - Assigning assets to employees
 * - Returning assets to inventory
 * 
 * Dependencies: None (pure Vanilla JS ES6+)
 * Backend: Designed for Django REST Framework (/api/assets)
 * ============================================================
 */

// ============================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================

const API_BASE = '/api'; // Change this if your API is hosted elsewhere
const ASSET_API_URL = `${API_BASE}/assets`;

// Status constants used throughout the system
const STATUS = {
    AVAILABLE: 'available',
    ASSIGNED: 'assigned',
    MAINTENANCE: 'maintenance',
    DISPOSED: 'disposed',
};

// Human-readable labels for statuses
const STATUS_LABELS = {
    [STATUS.AVAILABLE]: 'Available',
    [STATUS.ASSIGNED]: 'Assigned',
    [STATUS.MAINTENANCE]: 'Under Maintenance',
    [STATUS.DISPOSED]: 'Disposed',
};

// Allowed status options for dropdowns (excluding disposed if creating new)
const STATUS_OPTIONS = [
    { value: STATUS.AVAILABLE, label: 'Available' },
    { value: STATUS.ASSIGNED, label: 'Assigned' },
    { value: STATUS.MAINTENANCE, label: 'Under Maintenance' },
    { value: STATUS.DISPOSED, label: 'Disposed' },
];

// CSS class mapping for status badges
const STATUS_BADGE_CLASSES = {
    [STATUS.AVAILABLE]: 'badge-success',
    [STATUS.ASSIGNED]: 'badge-primary',
    [STATUS.MAINTENANCE]: 'badge-warning',
    [STATUS.DISPOSED]: 'badge-danger',
};

// ============================================================
// 2. API HELPER FUNCTIONS
// ============================================================

/**
 * Generic request handler with error processing
 */
async function request(url, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin', // Includes cookies for session auth
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Extract error message from Django REST framework format
            const errorMsg = responseData.message || responseData.detail || JSON.stringify(responseData);
            throw new Error(`Request failed (${response.status}): ${errorMsg}`);
        }

        return responseData;
    } catch (error) {
        console.error(`API Error [${method} ${url}]:`, error);
        throw error;
    }
}

// ============================================================
// 3. SPECIFIC ASSET API METHODS
// ============================================================

/**
 * Fetch all assets with optional query filters
 * @param {Object} filters - e.g., { status: 'available', type: 'laptop' }
 */
async function getAssets(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    const url = queryString ? `${ASSET_API_URL}?${queryString}` : ASSET_API_URL;
    return request(url);
}

/**
 * Fetch a single asset by ID
 */
async function getAssetById(id) {
    return request(`${ASSET_API_URL}/${id}/`);
}

/**
 * Create a new asset
 */
async function createAsset(assetData) {
    return request(ASSET_API_URL, 'POST', assetData);
}

/**
 * Update an existing asset
 */
async function updateAsset(id, assetData) {
    return request(`${ASSET_API_URL}/${id}/`, 'PUT', assetData);
}

/**
 * Delete an asset
 */
async function deleteAsset(id) {
    return request(`${ASSET_API_URL}/${id}/`, 'DELETE');
}

/**
 * Assign an asset to an employee
 */
async function assignAsset(assetId, employeeId) {
    return request(`${ASSET_API_URL}/${assetId}/assign/`, 'POST', { employee_id: employeeId });
}

/**
 * Return an asset (sets status back to available)
 */
async function returnAsset(assetId) {
    return request(`${ASSET_API_URL}/${assetId}/return/`, 'POST');
}

// ============================================================
// 4. BUSINESS LOGIC / STATE VALIDATORS
// ============================================================

function canAssign(status) {
    return status === STATUS.AVAILABLE;
}

function canReturn(status) {
    return status === STATUS.ASSIGNED;
}

function canDelete(status) {
    return status === STATUS.AVAILABLE || status === STATUS.DISPOSED;
}

// ============================================================
// 5. UI RENDERER - Asset Table / List
// ============================================================

/**
 * Main render function: builds the asset table and injects it into the container
 */
function renderAssetList(assets, containerId = 'asset-list-container') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container #${containerId} not found!`);
        return;
    }

    if (!assets || assets.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info text-center p-4">
                <i class="fas fa-box-open"></i> No assets found. Create your first asset using the "Add New Asset" button.
            </div>
        `;
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-hover asset-table">
                <thead class="table-light">
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Serial Number</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Assigned To</th>
                        <th style="min-width: 220px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    assets.forEach((asset) => {
        const statusLabel = STATUS_LABELS[asset.status] || asset.status;
        const badgeClass = STATUS_BADGE_CLASSES[asset.status] || 'badge-secondary';
        const assignedTo = asset.assigned_employee?.name || asset.assigned_employee?.username || '—';
        const assetId = asset.id || 'N/A';

        // Build action buttons dynamically based on state
        let actionsHtml = `
            <button class="btn btn-sm btn-outline-primary action-edit" data-id="${asset.id}">Edit</button>
            <button class="btn btn-sm btn-outline-info action-view" data-id="${asset.id}">View</button>
        `;

        if (canAssign(asset.status)) {
            actionsHtml += `
                <button class="btn btn-sm btn-success action-assign" data-id="${asset.id}" data-name="${asset.name}">Assign</button>
            `;
        }

        if (canReturn(asset.status)) {
            actionsHtml += `
                <button class="btn btn-sm btn-warning action-return" data-id="${asset.id}" data-name="${asset.name}">Return</button>
            `;
        }

        if (canDelete(asset.status)) {
            actionsHtml += `
                <button class="btn btn-sm btn-danger action-delete" data-id="${asset.id}" data-name="${asset.name}">Delete</button>
            `;
        }

        html += `
            <tr>
                <td>${assetId}</td>
                <td><strong>${asset.name || 'Unnamed'}</strong></td>
                <td><code>${asset.serial_number || '—'}</code></td>
                <td>${asset.type || '—'}</td>
                <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                <td>${assignedTo}</td>
                <td>
                    <div class="btn-group btn-group-sm flex-wrap" role="group">
                        ${actionsHtml}
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    // Re-bind event listeners to the new buttons (Event delegation is better, but we'll attach them directly for simplicity)
    attachTableEventListeners(container);
}

// ============================================================
// 6. EVENT HANDLING (Delegated)
// ============================================================

function attachTableEventListeners(container) {
    // Use event delegation on the container to handle all button clicks
    container.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const action = target.className.split(' ').find(cls => cls.startsWith('action-'));
        if (!action) return;

        const assetId = target.dataset.id;
        const assetName = target.dataset.name || 'Asset';

        // Prevent default button behavior
        e.preventDefault();

        try {
            switch (action) {
                case 'action-view':
                    window.location.href = `/assets/${assetId}/`;
                    break;

                case 'action-edit':
                    await loadAssetIntoForm(assetId);
                    break;

                case 'action-assign':
                    await handleAssignAction(assetId, assetName);
                    break;

                case 'action-return':
                    await handleReturnAction(assetId, assetName);
                    break;

                case 'action-delete':
                    await handleDeleteAction(assetId, assetName);
                    break;

                default:
                    break;
            }
        } catch (error) {
            alert(`Action failed: ${error.message}`);
        }
    });
}

// ============================================================
// 7. ACTION HANDLERS (Assign, Return, Delete)
// ============================================================

async function handleAssignAction(assetId, assetName) {
    const employeeId = prompt(`Assign "${assetName}" to which Employee ID?`);
    if (!employeeId) return; // User cancelled

    if (!confirm(`Confirm assigning Asset ID ${assetId} to Employee ID ${employeeId}?`)) {
        return;
    }

    await assignAsset(assetId, employeeId);
    alert(`✅ "${assetName}" successfully assigned to Employee #${employeeId}!`);
    refreshAssetList(); // Reload the table
}

async function handleReturnAction(assetId, assetName) {
    if (!confirm(`Return "${assetName}" back to inventory?`)) {
        return;
    }

    await returnAsset(assetId);
    alert(`✅ "${assetName}" successfully returned to inventory!`);
    refreshAssetList();
}

async function handleDeleteAction(assetId, assetName) {
    if (!confirm(`⚠️ Permanently delete "${assetName}"? This action cannot be undone.`)) {
        return;
    }

    await deleteAsset(assetId);
    alert(`🗑️ "${assetName}" has been deleted.`);
    refreshAssetList();
}

// ============================================================
// 8. FORM HANDLING (Create / Edit)
// ============================================================

/**
 * Load an asset's data into the form for editing
 */
async function loadAssetIntoForm(assetId) {
    const asset = await getAssetById(assetId);
    if (!asset) {
        alert('Asset not found!');
        return;
    }

    // Populate the form fields
    const form = document.getElementById('asset-form');
    if (!form) {
        console.warn('Form #asset-form not found. Skipping edit load.');
        return;
    }

    document.getElementById('asset-id').value = asset.id || '';
    document.getElementById('asset-name').value = asset.name || '';
    document.getElementById('asset-serial').value = asset.serial_number || '';
    document.getElementById('asset-type').value = asset.type || '';
    document.getElementById('asset-status').value = asset.status || STATUS.AVAILABLE;

    // Change button text to indicate update mode
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Update Asset';
        submitBtn.dataset.mode = 'edit';
    }

    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Reset the form to default (Create mode)
 */
function resetAssetForm() {
    const form = document.getElementById('asset-form');
    if (!form) return;

    form.reset();
    document.getElementById('asset-id').value = '';
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Create Asset';
        submitBtn.dataset.mode = 'create';
    }
}

/**
 * Handle form submission (Create or Update)
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const form = document.getElementById('asset-form');
    const assetId = document.getElementById('asset-id').value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const mode = submitBtn?.dataset?.mode || 'create';

    // Collect form data
    const formData = {
        name: document.getElementById('asset-name').value.trim(),
        serial_number: document.getElementById('asset-serial').value.trim(),
        type: document.getElementById('asset-type').value.trim(),
        status: document.getElementById('asset-status').value,
    };

    // Basic validation
    if (!formData.name) {
        alert('Please enter an Asset Name.');
        return;
    }

    try {
        let result;
        if (mode === 'edit' && assetId) {
            result = await updateAsset(assetId, formData);
            alert(`✅ Asset "${result.name}" updated successfully!`);
        } else {
            result = await createAsset(formData);
            alert(`✅ Asset "${result.name}" created successfully!`);
        }

        // Reset form back to create mode
        resetAssetForm();
        // Refresh the list
        refreshAssetList();

    } catch (error) {
        alert(`❌ Failed to save asset: ${error.message}`);
    }
}

// ============================================================
// 9. FILTER HANDLING
// ============================================================

function getFilterValues() {
    const filterForm = document.getElementById('filter-form');
    if (!filterForm) return {};

    const formData = new FormData(filterForm);
    const filters = {};
    for (const [key, value] of formData.entries()) {
        if (value.trim()) {
            filters[key] = value.trim();
        }
    }
    return filters;
}

// ============================================================
// 10. MAIN REFRESH / LOAD FUNCTION
// ============================================================

let currentFilters = {};

async function refreshAssetList() {
    const container = document.getElementById('asset-list-container');
    if (!container) return;

    // Show loading indicator
    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p>Loading assets...</p></div>`;

    try {
        currentFilters = getFilterValues();
        const assets = await getAssets(currentFilters);
        renderAssetList(assets);
    } catch (error) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error loading assets:</strong> ${error.message}
            </div>
        `;
        console.error(error);
    }
}

// ============================================================
// 11. INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- A. Initialize Asset List ---
    refreshAssetList();

    // --- B. Setup Filter Form ---
    const filterForm = document.getElementById('filter-form');
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            refreshAssetList();
        });

        // Reset filters
        const resetBtn = filterForm.querySelector('[type="reset"]');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                // Allow default reset to clear fields, then re-fetch
                setTimeout(refreshAssetList, 10);
            });
        }
    }

    // --- C. Setup Asset Form (Create/Edit) ---
    const assetForm = document.getElementById('asset-form');
    if (assetForm) {
        assetForm.addEventListener('submit', handleFormSubmit);

        // Cancel/Reset button inside the form
        const cancelBtn = assetForm.querySelector('[type="reset"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                resetAssetForm();
            });
        }
    }

    // --- D. Add New Asset Button (to clear form) ---
    const addBtn = document.getElementById('add-asset-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            resetAssetForm();
            document.getElementById('asset-form')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    console.log('✅ Asset Management Module initialized successfully.');
});

// ============================================================
// 12. EXPOSE GLOBALLY (Optional, for console debugging)
// ============================================================

// Make key functions available in the browser console for debugging
window.assetManager = {
    getAssets,
    createAsset,
    updateAsset,
    deleteAsset,
    assignAsset,
    returnAsset,
    refreshAssetList,
    resetAssetForm,
};