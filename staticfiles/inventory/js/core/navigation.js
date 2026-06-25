/**
 * NAVIGATION MANAGEMENT
 * Handles active link highlighting for sidebar
 */

(function() {
    'use strict';
    
    var initialized = false;
    
    // ============================================
    // Initialize Navigation
    // ============================================
    function initNavigation() {
        if (initialized) {
            console.log('Navigation already initialized.');
            return;
        }
        
        console.log('Navigation module initializing...');
        
        // Highlight active link
        highlightActiveLink();
        
        initialized = true;
    }
    
    // ============================================
    // Active Link Highlighting
    // ============================================
    function highlightActiveLink() {
        var currentPath = window.location.pathname;
        var navLinks = document.querySelectorAll('.sidebar-link');
        
        navLinks.forEach(function(link) {
            var href = link.getAttribute('href');
            if (href && href !== '#') {
                link.classList.remove('active');
                
                if (currentPath === href || 
                    (href !== '/' && currentPath.startsWith(href) && href.length > 1)) {
                    link.classList.add('active');
                }
            }
        });
    }
    
    // ============================================
    // Reinitialize (for dynamic content)
    // ============================================
    function reinit() {
        console.log('Reinitializing navigation...');
        initialized = false;
        initNavigation();
    }
    
    // ============================================
    // Export
    // ============================================
    window.Navigation = {
        init: initNavigation,
        reinit: reinit,
        highlightActive: highlightActiveLink,
        isInitialized: function() { return initialized; }
    };
    
    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM ready, initializing navigation...');
            initNavigation();
        });
    } else {
        if (!initialized) {
            console.log('DOM already ready, initializing navigation...');
            initNavigation();
        }
    }
    
    console.log('Navigation module loaded.');
    
})();