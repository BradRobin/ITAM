/**
 * EMPLOYEE MODULE
 * Handles employee management: list and actions
 */

(function() {
    'use strict';
    
    // ============================================
    // DOM Elements
    // ============================================
    let elements = {};
    
    // ============================================
    // Initialize Employee Module
    // ============================================
    function init() {
        // Cache DOM elements
        elements = {
            employeeTable: document.querySelector('.employee-table'),
            deleteButtons: document.querySelectorAll('.action-delete')
        };
        
        // Setup event listeners
        setupActionButtons();
        
        console.log('Employee module initialized.');
    }
    
    // ============================================
    // Setup Action Buttons
    // ============================================
    function setupActionButtons() {
        elements.deleteButtons.forEach(function(button) {
            button.addEventListener('click', function(event) {
                const employeeName = this.dataset.name;
                if (!confirm('Are you sure you want to delete "' + employeeName + '"? This action cannot be undone.')) {
                    event.preventDefault();
                }
            });
        });
    }
    
    // ============================================
    // Export
    // ============================================
    window.EmployeeManager = {
        init: init
    };
    
})();