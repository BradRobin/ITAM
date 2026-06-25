/**
 * MAIN ENTRY POINT
 * Orchestrates all modules and initializes the application
 */

(function() {
    'use strict';
    
    // ============================================
    // Page Detection
    // ============================================
    function getCurrentPage() {
        var path = window.location.pathname;
        if (path === '/' || path === '/dashboard/' || path.includes('dashboard')) {
            return 'dashboard';
        }
        if (path.includes('assets')) return 'assets';
        if (path.includes('employees')) return 'employees';
        if (path.includes('assign')) return 'assignments';
        if (path.includes('login') || path.includes('signup')) return 'auth';
        if (path.includes('logout')) return 'auth';
        return 'dashboard';
    }
    
    // ============================================
    // Load Core Modules
    // ============================================
    function loadCoreModules() {
        var modules = ['Utils', 'Loader', 'Theme', 'Navigation', 'Alerts'];
        var loaded = [];
        var missing = [];
        
        modules.forEach(function(module) {
            if (typeof window[module] !== 'undefined') {
                loaded.push(module);
            } else {
                missing.push(module);
            }
        });
        
        if (missing.length > 0) {
            console.warn('Missing core modules:', missing.join(', '));
        } else {
            console.log('All core modules loaded:', loaded.join(', '));
        }
        
        return loaded;
    }
    
    // ============================================
    // Load Page-Specific Modules
    // ============================================
    function loadPageModules(page) {
        console.log('Loading page modules for:', page);
        
        switch (page) {
            case 'dashboard':
                if (typeof window.Dashboard !== 'undefined' && typeof window.Dashboard.init === 'function') {
                    window.Dashboard.init();
                } else {
                    console.warn('Dashboard module not loaded.');
                }
                break;
                
            case 'assets':
                if (typeof window.AssetManager !== 'undefined' && typeof window.AssetManager.init === 'function') {
                    window.AssetManager.init();
                } else {
                    console.warn('AssetManager module not loaded.');
                }
                break;
                
            case 'employees':
                if (typeof window.EmployeeManager !== 'undefined' && typeof window.EmployeeManager.init === 'function') {
                    window.EmployeeManager.init();
                } else {
                    console.warn('EmployeeManager module not loaded.');
                }
                break;
                
            case 'assignments':
                if (typeof window.AssignmentManager !== 'undefined' && typeof window.AssignmentManager.init === 'function') {
                    window.AssignmentManager.init();
                } else {
                    console.warn('AssignmentManager module not loaded.');
                }
                break;
                
            default:
                break;
        }
    }
    
    // ============================================
    // Initialize Forms
    // ============================================
    function initForms() {
        if (typeof window.FormManager !== 'undefined' && typeof window.FormManager.init === 'function') {
            window.FormManager.init();
        }
    }
    
    // ============================================
    // Setup Loader - FIXED
    // ============================================
    function setupLoader() {
        if (typeof window.Loader !== 'undefined') {
            try {
                // Show loader on form submissions
                if (typeof window.Loader.showOnSubmit === 'function') {
                    window.Loader.showOnSubmit('form[data-loader="true"]');
                }
                // Show loader on navigation links
                if (typeof window.Loader.showOnNavigation === 'function') {
                    window.Loader.showOnNavigation('a[data-loader="true"]');
                }
                // Show loader on AJAX requests
                if (typeof window.Loader.showOnAjax === 'function') {
                    window.Loader.showOnAjax();
                }
            } catch (error) {
                console.warn('Error setting up loader:', error.message);
            }
        }
    }
    
    // ============================================
    // Initialize Application
    // ============================================
    function initApp() {
        try {
            console.log('ITAM System initializing...');
            
            // Load core modules check
            loadCoreModules();
            
            // Setup loader
            setupLoader();
            
            // Initialize forms
            initForms();
            
            // Detect current page and load modules
            var page = getCurrentPage();
            loadPageModules(page);
            
            // Dispatch ready event
            document.dispatchEvent(new CustomEvent('itam-ready', {
                detail: { page: page }
            }));
            
            console.log('ITAM System ready. Page:', page);
            
            // Hide loader if it was shown during page load
            if (typeof window.Loader !== 'undefined' && window.Loader.hide) {
                setTimeout(function() {
                    try {
                        window.Loader.hide();
                    } catch (e) {
                        // Ignore
                    }
                }, 500);
            }
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            try {
                if (window.Loader && typeof window.Loader.hide === 'function') {
                    window.Loader.hide();
                }
            } catch (e) {
                // Ignore
            }
            if (window.Utils && typeof window.Utils.showToast === 'function') {
                window.Utils.showToast('Failed to initialize application. Please refresh the page.', 'error');
            }
        }
    }
    
    // ============================================
    // Start Application
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            try {
                if (typeof window.Loader !== 'undefined' && window.Loader.show) {
                    window.Loader.show('Loading ITAM System...');
                }
            } catch (e) {
                // Ignore
            }
            initApp();
        });
    } else {
        try {
            if (typeof window.Loader !== 'undefined' && window.Loader.show) {
                window.Loader.show('Loading ITAM System...');
            }
        } catch (e) {
            // Ignore
        }
        initApp();
    }
    
    // ============================================
    // Export
    // ============================================
    window.MainApp = {
        getCurrentPage: getCurrentPage,
        init: initApp,
        refresh: function() {
            var page = getCurrentPage();
            loadPageModules(page);
        }
    };
    
    console.log('main.js loaded successfully.');
    
})();