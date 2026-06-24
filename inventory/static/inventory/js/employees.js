/**
 * ============================================================
 * EMPLOYEE MANAGEMENT MODULE - ITAM SYSTEM
 * ============================================================
 * This file handles:
 * - Listing all employees with search filters
 * - Creating new employees
 * - Editing existing employees
 * - Deleting employees (with confirmation)
 * - Viewing employee details, including assigned assets
 *
 * Dependencies: None (Pure Vanilla JS ES6+)
 * Backend endpoints expected:
 *   GET    /api/employees         -> List of employees (with optional search)
 *   POST   /api/employees         -> Create new employee
 *   GET    /api/employees/{id}/   -> Retrieve single employee (with assets)
 *   PUT    /api/employees/{id}/   -> Update employee
 *   DELETE /api/employees/{id}/   -> Delete employee
 *   GET    /api/employees/{id}/assets/ -> List assets assigned to this employee (optional)
 * ============================================================
 */

// ============================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================

const API_BASE = '/api';
const EMPLOYEES_API_URL = `${API_BASE}/employees`;

// ============================================================
// 2. API HELPER FUNCTIONS
// ============================================================

/**
 * Generic request handler
 */
async function apiRequest(url, method = 'GET', data = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
    };
    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errorMsg = responseData.message || responseData.detail || JSON.stringify(responseData);
        throw new Error(`API Error (${response.status}): ${errorMsg}`);
    }
    return responseData;
}

// ============================================================
// 3. SPECIFIC EMPLOYEE API METHODS
// ============================================================

/**
 * Fetch all employees with optional search query
 */
async function getEmployees(search = '') {
    const url = search ? `${EMPLOYEES_API_URL}?search=${encodeURIComponent(search)}` : EMPLOYEES_API_URL;
    return apiRequest(url);
}

/**
 * Fetch a single employee by ID (includes assigned assets if backend supports it)
 */
async function getEmployeeById(id) {
    return apiRequest(`${EMPLOYEES_API_URL}/${id}/`);
}

/**
 * Create a new employee
 */
async function createEmployee(employeeData) {
    return apiRequest(EMPLOYEES_API_URL, 'POST', employeeData);
}

/**
 * Update an existing employee
 */
async function updateEmployee(id, employeeData) {
    return apiRequest(`${EMPLOYEES_API_URL}/${id}/`, 'PUT', employeeData);
}

/**
 * Delete an employee
 */
async function deleteEmployee(id) {
    return apiRequest(`${EMPLOYEES_API_URL}/${id}/`, 'DELETE');
}

/**
 * Fetch assets assigned to a specific employee (optional)
 */
async function getEmployeeAssets(employeeId) {
    // If your backend supports this endpoint:
    // return apiRequest(`${EMPLOYEES_API_URL}/${employeeId}/assets/`);
    // Fallback: return an empty array
    return [];
}

// ============================================================
// 4. UI RENDERER - Employee Table
// ============================================================

/**
 * Render the employee list into the container
 */
function renderEmployeeList(employees, containerId = 'employee-list-container') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container #${containerId} not found!`);
        return;
    }

    if (!employees || employees.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info text-center p-4">
                <i class="fas fa-users"></i> No employees found. Add your first employee using the "Add Employee" button.
            </div>
        `;
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-hover employee-table">
                <thead class="table-light">
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th>Assigned Assets</th>
                        <th style="min-width: 180px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    employees.forEach((emp) => {
        const assetCount = emp.assigned_assets_count || emp.assigned_assets?.length || 0;
        const assignedAssets = emp.assigned_assets || [];

        html += `
            <tr>
                <td>${emp.id}</td>
                <td><strong>${emp.name || 'Unnamed'}</strong></td>
                <td>${emp.email || '—'}</td>
                <td>${emp.department || '—'}</td>
                <td>
                    <span class="badge bg-primary">${assetCount}</span>
                    ${assetCount > 0 ? `<small class="text-muted d-block">${assignedAssets.map(a => a.name).join(', ')}</small>` : ''}
                </td>
                <td>
                    <div class="btn-group btn-group-sm flex-wrap" role="group">
                        <button class="btn btn-outline-primary action-view" data-id="${emp.id}">View</button>
                        <button class="btn btn-outline-secondary action-edit" data-id="${emp.id}">Edit</button>
                        <button class="btn btn-outline-danger action-delete" data-id="${emp.id}" data-name="${emp.name}">Delete</button>
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

    // Attach event listeners to the action buttons
    attachTableEventListeners(container);
}

// ============================================================
// 5. EVENT HANDLING (Delegated)
// ============================================================

function attachTableEventListeners(container) {
    container.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const action = target.className.split(' ').find(cls => cls.startsWith('action-'));
        if (!action) return;

        const employeeId = target.dataset.id;
        const employeeName = target.dataset.name || 'Employee';

        e.preventDefault();

        try {
            switch (action) {
                case 'action-view':
                    await showEmployeeDetails(employeeId);
                    break;

                case 'action-edit':
                    await loadEmployeeIntoForm(employeeId);
                    break;

                case 'action-delete':
                    await handleDeleteEmployee(employeeId, employeeName);
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
// 6. ACTION HANDLERS
// ============================================================

async function handleDeleteEmployee(employeeId, employeeName) {
    if (!confirm(`⚠️ Permanently delete employee "${employeeName}"? This may affect assigned assets.`)) {
        return;
    }

    await deleteEmployee(employeeId);
    alert(`🗑️ Employee "${employeeName}" has been deleted.`);
    refreshEmployeeList();
}

// ============================================================
// 7. EMPLOYEE DETAIL VIEW (Modal)
// ============================================================

async function showEmployeeDetails(employeeId) {
    try {
        const employee = await getEmployeeById(employeeId);
        if (!employee) {
            alert('Employee not found.');
            return;
        }

        // Fetch assigned assets if not included
        const assets = employee.assigned_assets || await getEmployeeAssets(employeeId);

        // Build a modal dynamically
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = 'employee-detail-modal';

        let assetsHtml = '';
        if (assets && assets.length > 0) {
            assetsHtml = `
                <h6 class="mt-3">Assigned Assets</h6>
                <ul class="list-group">
                    ${assets.map(a => `<li class="list-group-item">${a.name} (${a.type || 'N/A'}) - ${a.serial_number || 'No SN'}</li>`).join('')}
                </ul>
            `;
        } else {
            assetsHtml = `<p class="text-muted mt-3">No assets currently assigned.</p>`;
        }

        modalOverlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Employee Details</h5>
                    <button type="button" class="modal-close-btn" id="close-detail-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Name:</strong> ${employee.name}</p>
                    <p><strong>Email:</strong> ${employee.email || '—'}</p>
                    <p><strong>Department:</strong> ${employee.department || '—'}</p>
                    <p><strong>Employee ID:</strong> ${employee.employee_id || employee.id}</p>
                    ${assetsHtml}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="close-detail-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        document.body.style.overflow = 'hidden';

        // Close handlers
        const closeModal = () => {
            if (modalOverlay.parentNode) {
                modalOverlay.parentNode.removeChild(modalOverlay);
            }
            document.body.style.overflow = '';
        };

        document.getElementById('close-detail-modal')?.addEventListener('click', closeModal);
        document.getElementById('close-detail-btn')?.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

    } catch (error) {
        alert(`Could not load employee details: ${error.message}`);
    }
}

// ============================================================
// 8. FORM HANDLING (Create / Edit)
// ============================================================

/**
 * Load employee data into the form for editing
 */
async function loadEmployeeIntoForm(employeeId) {
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
        alert('Employee not found!');
        return;
    }

    const form = document.getElementById('employee-form');
    if (!form) {
        console.warn('Form #employee-form not found.');
        return;
    }

    document.getElementById('employee-id').value = employee.id || '';
    document.getElementById('employee-name').value = employee.name || '';
    document.getElementById('employee-email').value = employee.email || '';
    document.getElementById('employee-department').value = employee.department || '';
    document.getElementById('employee-employee-id').value = employee.employee_id || '';

    // Change button text to update mode
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Update Employee';
        submitBtn.dataset.mode = 'edit';
    }

    form.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Reset the form to create mode
 */
function resetEmployeeForm() {
    const form = document.getElementById('employee-form');
    if (!form) return;

    form.reset();
    document.getElementById('employee-id').value = '';
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Create Employee';
        submitBtn.dataset.mode = 'create';
    }
}

/**
 * Handle form submission (Create or Update)
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const form = document.getElementById('employee-form');
    const employeeId = document.getElementById('employee-id').value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const mode = submitBtn?.dataset?.mode || 'create';

    const formData = {
        name: document.getElementById('employee-name').value.trim(),
        email: document.getElementById('employee-email').value.trim(),
        department: document.getElementById('employee-department').value.trim(),
        employee_id: document.getElementById('employee-employee-id').value.trim() || undefined,
    };

    // Basic validation
    if (!formData.name) {
        alert('Please enter the employee name.');
        return;
    }

    try {
        let result;
        if (mode === 'edit' && employeeId) {
            result = await updateEmployee(employeeId, formData);
            alert(`✅ Employee "${result.name}" updated successfully!`);
        } else {
            result = await createEmployee(formData);
            alert(`✅ Employee "${result.name}" created successfully!`);
        }

        resetEmployeeForm();
        refreshEmployeeList();

    } catch (error) {
        alert(`❌ Failed to save employee: ${error.message}`);
    }
}

// ============================================================
// 9. SEARCH / FILTER
// ============================================================

function getSearchTerm() {
    const searchInput = document.getElementById('employee-search');
    return searchInput ? searchInput.value.trim() : '';
}

// ============================================================
// 10. MAIN REFRESH FUNCTION
// ============================================================

async function refreshEmployeeList() {
    const container = document.getElementById('employee-list-container');
    if (!container) return;

    // Show loading
    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><p>Loading employees...</p></div>`;

    try {
        const search = getSearchTerm();
        const employees = await getEmployees(search);
        renderEmployeeList(employees);
    } catch (error) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error loading employees:</strong> ${error.message}
            </div>
        `;
        console.error(error);
    }
}

// ============================================================
// 11. INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- A. Load employee list ---
    refreshEmployeeList();

    // --- B. Setup search ---
    const searchInput = document.getElementById('employee-search');
    if (searchInput) {
        let debounceTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(refreshEmployeeList, 300);
        });
    }

    // --- C. Setup form ---
    const form = document.getElementById('employee-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        const resetBtn = form.querySelector('[type="reset"]');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => resetEmployeeForm());
        }
    }

    // --- D. Add New Employee button ---
    const addBtn = document.getElementById('add-employee-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            resetEmployeeForm();
            document.getElementById('employee-form')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    console.log('✅ Employee Module initialized successfully.');
});

// ============================================================
// 12. EXPOSE GLOBALLY (for debugging and external calls)
// ============================================================

window.EmployeeManager = {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    refresh: refreshEmployeeList,
    resetForm: resetEmployeeForm,
};

// Also expose the fetch function for use by assignment.js
window.fetchEmployees = getEmployees;
