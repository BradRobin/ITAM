/**
 * THEME MANAGEMENT
 * Handles dark/light mode switching with persistence
 */

(function() {
    'use strict';
    
    // ============================================
    // Theme Configuration
    // ============================================
    var THEME_KEY = 'itam_theme';
    var DARK_CLASS = 'dark';
    var LIGHT_CLASS = 'light';
    
    // ============================================
    // DOM Elements
    // ============================================
    var themeToggle = null;
    var themeIconSvg = null;
    var initialized = false;
    
    // ============================================
    // SVG Icon Paths
    // ============================================
    var ICONS = {
        moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
        sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    };
    
    // ============================================
    // Initialize Theme
    // ============================================
    function initTheme() {
        // Prevent double initialization
        if (initialized) {
            return;
        }
        
        // Get theme toggle element
        themeToggle = document.getElementById('themeToggle');
        
        if (themeToggle) {
            // Find the SVG icon inside the toggle button
            themeIconSvg = themeToggle.querySelector('.theme-icon-svg');
            
            // Attach event listener
            themeToggle.addEventListener('click', toggleTheme);
        }
        
        // Load saved theme or system preference
        var savedTheme = localStorage.getItem(THEME_KEY);
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        var theme = LIGHT_CLASS;
        if (savedTheme) {
            theme = savedTheme;
        } else if (prefersDark) {
            theme = DARK_CLASS;
        }
        
        setTheme(theme);
        initialized = true;
    }
    
    // ============================================
    // Set Theme
    // ============================================
    function setTheme(theme) {
        if (theme === DARK_CLASS) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.body.classList.add(DARK_CLASS);
            document.body.classList.remove(LIGHT_CLASS);
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            document.body.classList.add(LIGHT_CLASS);
            document.body.classList.remove(DARK_CLASS);
        }
        
        localStorage.setItem(THEME_KEY, theme);
        updateThemeIcon(theme);
        
        // Dispatch custom event for other modules to listen
        document.dispatchEvent(new CustomEvent('theme-changed', {
            detail: { theme: theme }
        }));
    }
    
    // ============================================
    // Toggle Theme
    // ============================================
    function toggleTheme() {
        var currentTheme = document.documentElement.getAttribute('data-theme');
        var newTheme = currentTheme === 'dark' ? LIGHT_CLASS : DARK_CLASS;
        setTheme(newTheme);
        
        // Close dropdown if open (for profile dropdown)
        var dropdown = themeToggle ? themeToggle.closest('.profile-dropdown') : null;
        if (dropdown) {
            dropdown.classList.remove('open');
        }
    }
    
    // ============================================
    // Update Theme Icon (SVG)
    // ============================================
    function updateThemeIcon(theme) {
        if (!themeIconSvg) return;
        
        var isDark = theme === DARK_CLASS;
        var iconPath = isDark ? ICONS.moon : ICONS.sun;
        themeIconSvg.innerHTML = iconPath;
    }
    
    // ============================================
    // Update Theme UI (for settings page)
    // ============================================
    function updateThemeUI(theme) {
        // Update the icon if needed
        updateThemeIcon(theme);
        
        // Update any theme toggle buttons on the page
        var allToggles = document.querySelectorAll('.theme-toggle-btn');
        allToggles.forEach(function(toggle) {
            var svg = toggle.querySelector('.theme-icon-svg');
            if (svg) {
                var isDark = theme === DARK_CLASS;
                var iconPath = isDark ? ICONS.moon : ICONS.sun;
                svg.innerHTML = iconPath;
            }
        });
    }
    
    // ============================================
    // Get Current Theme
    // ============================================
    function getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || LIGHT_CLASS;
    }
    
    // ============================================
    // Re-initialize (for dynamic content)
    // ============================================
    function reinit() {
        initialized = false;
        initTheme();
    }
    
    // ============================================
    // Export
    // ============================================
    window.Theme = {
        init: initTheme,
        reinit: reinit,
        setTheme: setTheme,
        toggle: toggleTheme,
        getCurrent: getCurrentTheme,
        updateThemeUI: updateThemeUI,
        updateThemeIcon: updateThemeIcon
    };
    
    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }
    
    console.log('Theme module loaded.');
    
})();