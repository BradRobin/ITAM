/**
 * ASSET MODULE
 * Handles asset management: list, detail, and actions
 */

(function() {
    'use strict';
    
    // ============================================
    // DOM Elements
    // ============================================
    let elements = {};
    
    // ============================================
    // Initialize Asset Module
    // ============================================
    function init() {
        // Cache DOM elements
        elements = {
            assetTable: document.querySelector('.asset-table'),
            filterForm: document.querySelector('.filter-form'),
            assignButtons: document.querySelectorAll('.action-assign'),
            returnButtons: document.querySelectorAll('.action-return'),
            deleteButtons: document.querySelectorAll('.action-delete')
        };
        
        // Setup event listeners
        setupFilterForm();
        setupActionButtons();
        
        console.log('Asset module initialized.');
    }
    
    // ============================================
    // Setup Filter Form
    // ============================================
    function setupFilterForm() {
        if (elements.filterForm) {
            const selectors = elements.filterForm.querySelectorAll('select');
            selectors.forEach(function(select) {
                select.addEventListener('change', function() {
                    elements.filterForm.submit();
                });
            });
        }
    }
    
    // ============================================
    // Setup Action Buttons
    // ============================================
    function setupActionButtons() {
        // Assign buttons
        elements.assignButtons.forEach(function(button) {
            button.addEventListener('click', function(event) {
                const assetId = this.dataset.id;
                const assetName = this.dataset.name;
                handleAssign(assetId, assetName);
            });
        });
        
        // Return buttons
        elements.returnButtons.forEach(function(button) {
            button.addEventListener('click', function(event) {
                const assetId = this.dataset.id;
                const assetName = this.dataset.name;
                handleReturn(assetId, assetName);
            });
        });
        
        // Delete buttons
        elements.deleteButtons.forEach(function(button) {
            button.addEventListener('click', function(event) {
                const assetId = this.dataset.id;
                const assetName = this.dataset.name;
                if (!confirm('Are you sure you want to delete "' + assetName + '"? This action cannot be undone.')) {
                    event.preventDefault();
                }
            });
        });
    }
    
    // ============================================
    // Handle Assign Action
    // ============================================
    function handleAssign(assetId, assetName) {
        const employeeId = prompt('Enter the Employee ID to assign "' + assetName + '":');
        
        if (!employeeId) return;
        
        if (!employeeId.match(/^\d+$/)) {
            if (window.Utils && typeof window.Utils.showToast === 'function') {
                window.Utils.showToast('Please enter a valid Employee ID.', 'error');
            }
            return;
        }
        
        if (confirm('Assign "' + assetName + '" to Employee ID ' + employeeId + '?')) {
            performAssign(assetId, employeeId);
        }
    }
    
    // ============================================
    // Perform Assign API Call
    // ============================================
    async function performAssign(assetId, employeeId) {
        try {
            if (window.Utils && typeof window.Utils.showToast === 'function') {
                window.Utils.showToast('Assigning asset...', 'info');
            }
            
            const url = '/api/assets/' + assetId + '/assign/';
            const data = { employee_id: employeeId };
            
            const result = await window.Utils.apiRequest(url, 'POST', data);
            
            if (window.Utils && typeof window.Utils.showToast === 'function') {
                window.Utils.showToast('Asset assigned successfully!', 'success');
            }
            
            // Refresh the page to update the list
            setTimeout(function() {
                window.location.reload();
            }, 1000);
            
        } catch (error) {
            console.error('Assignment failed:', error);
            if (window.Utils && typeof window.Utils.showToast === 'function') {
                window.Utils.showToast('Assignment failed: ' + error.message, 'error');
            }
        }
    }
    
    // ============================================
    // Handle Return Action
    // ============================================
    function handleReturn(assetId, assetName) {
        if (!confirm('Return "' + assetName + '" to inventory?')) {
            return;
        }
        
        performReturn(assetId);
    }
    
    // ============================================
    // Perform Return API Call
    // ============================================
    async function performReturn(assetId) {
        try {
            if (window.Utils && typeof window.Utils.showToast === 'function') {
                window.Utils.showToast('Returning asset...', 'info');
            }
            
            const url = '/api/assets/' + assetId + '/return/';
            
            await window.Utils.apiRequest(url, 'POST');
            
            if (window.Utils && typeof window.Utils.showToast === 'function') {
                window.Utils.showToast('Asset returned successfully!', 'success');
            }
            
            // Refresh the page to update the list
            setTimeout(function() {
                window.location.reload();
            }, 1000);
            
        } catch (error) {
            console.error('Return failed:', error);
            if (window.Utils && typeof window.Utils.showToast === 'function') {
                window.Utils.showToast('Return failed: ' + error.message, 'error');
            }
        }
    }
    
    // ============================================
    // Export
    // ============================================
    window.AssetManager = {
        init: init,
        handleAssign: handleAssign,
        handleReturn: handleReturn
    };
    
})();