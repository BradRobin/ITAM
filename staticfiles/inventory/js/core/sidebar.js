/**
 * SIDEBAR MODULE
 * Handles sidebar toggle functionality for mobile menu
 */

(function() {
    'use strict';

    var sidebar = null;
    var toggleBtn = null;
    var overlay = null;
    var initialized = false;

    function resolveElements() {
        toggleBtn = document.getElementById('sidebarToggle') ||
            document.getElementById('sidebarToggleEmployee');
        sidebar = document.getElementById('sidebar') ||
            document.getElementById('sidebarEmployee');
        overlay = document.getElementById('sidebarOverlay');
    }

    function initSidebar() {
        if (initialized) {
            return;
        }

        resolveElements();

        if (toggleBtn && sidebar) {
            // Remove existing listeners to prevent duplicates
            toggleBtn.removeEventListener('click', toggleSidebar);
            toggleBtn.addEventListener('click', toggleSidebar);
            console.log('Sidebar toggle initialized for:', sidebar.id);
        } else {
            console.warn('Sidebar or toggle button not found');
        }

        if (overlay) {
            overlay.removeEventListener('click', closeSidebar);
            overlay.addEventListener('click', closeSidebar);
            console.log('Overlay click handler attached');
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeSidebar();
            }
        });

        window.addEventListener('resize', function() {
            if (window.innerWidth > 768 && sidebar && sidebar.classList.contains('open')) {
                closeSidebar();
            }
        });

        initialized = true;
    }

    function toggleSidebar(e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        if (!sidebar) {
            resolveElements();
        }
        if (!sidebar) {
            return;
        }

        var isOpen = sidebar.classList.contains('open');
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    function closeSidebar() {
        if (!sidebar) {
            resolveElements();
        }
        
        // Close sidebar
        if (sidebar) {
            sidebar.classList.remove('open');
            sidebar.classList.remove('active'); // Remove both classes just in case
        }
        
        // Close overlay
        if (overlay) {
            overlay.classList.remove('active');
        }
        
        // Close toggle button
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
            toggleBtn.classList.remove('open');
            toggleBtn.setAttribute('aria-expanded', 'false');
        }
        
        // Remove body class
        document.body.classList.remove('sidebar-open');
        document.body.style.overflow = '';
        
        console.log('Sidebar closed');
    }

    function openSidebar() {
        if (!sidebar) {
            resolveElements();
        }
        
        // Open sidebar
        if (sidebar) {
            sidebar.classList.add('open');
        }
        
        // Open overlay
        if (overlay) {
            overlay.classList.add('active');
        }
        
        // Open toggle button
        if (toggleBtn) {
            toggleBtn.classList.add('active');
            toggleBtn.setAttribute('aria-expanded', 'true');
        }
        
        // Add body class
        document.body.classList.add('sidebar-open');
        document.body.style.overflow = 'hidden';
        
        console.log('Sidebar opened');
    }

    // Expose to window
    window.Sidebar = {
        init: initSidebar,
        toggle: toggleSidebar,
        open: openSidebar,
        close: closeSidebar
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }
    
    console.log('sidebar.js loaded successfully');
})();