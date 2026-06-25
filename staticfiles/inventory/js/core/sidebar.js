/**
 * SIDEBAR MODULE
 * Handles sidebar toggle functionality
 */

(function() {
    'use strict';
    
    var sidebar = null;
    var toggleBtn = null;
    var overlay = null;
    
    function initSidebar() {
        sidebar = document.getElementById('sidebar');
        toggleBtn = document.getElementById('sidebarToggle');
        overlay = document.getElementById('sidebarOverlay');
        
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', toggleSidebar);
        }
        
        if (overlay) {
            overlay.addEventListener('click', closeSidebar);
        }
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeSidebar();
            }
        });
    }
    
    function toggleSidebar(e) {
        if (e) {
            e.stopPropagation();
        }
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
        if (overlay) {
            overlay.classList.toggle('active');
        }
        if (toggleBtn) {
            toggleBtn.classList.toggle('open');
        }
    }
    
    function closeSidebar() {
        if (sidebar) {
            sidebar.classList.remove('open');
        }
        if (overlay) {
            overlay.classList.remove('active');
        }
        if (toggleBtn) {
            toggleBtn.classList.remove('open');
        }
    }
    
    function openSidebar() {
        if (sidebar) {
            sidebar.classList.add('open');
        }
        if (overlay) {
            overlay.classList.add('active');
        }
        if (toggleBtn) {
            toggleBtn.classList.add('open');
        }
    }
    
    window.Sidebar = {
        init: initSidebar,
        toggle: toggleSidebar,
        open: openSidebar,
        close: closeSidebar
    };
    
    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }
    
    console.log('Sidebar module loaded.');
    
})();