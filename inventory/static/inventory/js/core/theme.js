/**
 * THEME MANAGEMENT
 * Handles dark/light mode switching with persistence
 * FIXED: Prevents theme flash on page navigation
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
    var themeIcon = null;
    var initialized = false;
    
    // ============================================
    // Apply Theme IMMEDIATELY - Before DOM renders
    // ============================================
    function applyThemeImmediately() {
        // This runs synchronously before page render
        var savedTheme = localStorage.getItem(THEME_KEY);
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        var theme = LIGHT_CLASS;
        if (savedTheme) {
            theme = savedTheme;
        } else if (prefersDark) {
            theme = DARK_CLASS;
        }
        
        // Apply theme to html element immediately
        if (theme === DARK_CLASS) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.classList.add(DARK_CLASS);
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.classList.remove(DARK_CLASS);
        }
        
        return theme;
    }
    
    // ============================================
    // Initialize Theme
    // ============================================
    function initTheme() {
        // Prevent double initialization
        if (initialized) {
            return;
        }
        
        console.log('Theme module initializing...');
        
        // Get theme toggle element
        themeToggle = document.getElementById('themeToggle');
        
        if (themeToggle) {
            // Find the icon inside the toggle button
            themeIcon = themeToggle.querySelector('.theme-icon');
            
            // Remove existing listener to prevent duplicates
            themeToggle.removeEventListener('click', toggleTheme);
            themeToggle.addEventListener('click', toggleTheme);
            console.log('Theme toggle found and initialized.');
        } else {
            console.warn('Theme toggle button not found. Check if #themeToggle exists in the DOM.');
        }
        
        // Get current theme (already applied immediately)
        var currentTheme = document.documentElement.getAttribute('data-theme') || LIGHT_CLASS;
        
        // Update icon to match current theme
        updateThemeIcon(currentTheme);
        
        // Update any other theme toggle buttons on the page
        updateAllThemeIcons(currentTheme);
        
        initialized = true;
        console.log('Theme module initialized. Current theme:', currentTheme);
    }
    
    // ============================================
    // Set Theme
    // ============================================
    function setTheme(theme) {
        if (theme === DARK_CLASS) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.classList.add(DARK_CLASS);
            document.documentElement.classList.remove(LIGHT_CLASS);
            document.body.classList.add(DARK_CLASS);
            document.body.classList.remove(LIGHT_CLASS);
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.classList.remove(DARK_CLASS);
            document.documentElement.classList.add(LIGHT_CLASS);
            document.body.classList.remove(DARK_CLASS);
            document.body.classList.add(LIGHT_CLASS);
        }
        
        localStorage.setItem(THEME_KEY, theme);
        updateThemeIcon(theme);
        updateAllThemeIcons(theme);
        
        // Dispatch custom event for other modules to listen
        document.dispatchEvent(new CustomEvent('theme-changed', {
            detail: { theme: theme }
        }));
        
        console.log('Theme set to:', theme);
    }
    
    // ============================================
    // Toggle Theme
    // ============================================
    function toggleTheme() {
        var currentTheme = document.documentElement.getAttribute('data-theme');
        var newTheme = currentTheme === 'dark' ? LIGHT_CLASS : DARK_CLASS;
        setTheme(newTheme);
        
        // Close dropdown if open (for profile dropdown)
        var dropdown = document.querySelector('.profile-dropdown.open');
        if (dropdown) {
            dropdown.classList.remove('open');
        }
    }
    
    // ============================================
    // Update Theme Icon
    // ============================================
    function updateThemeIcon(theme) {
        if (!themeIcon) {
            // Try to find it again
            themeIcon = document.querySelector('.theme-icon');
            if (!themeIcon) {
                console.warn('Theme icon element not found. Cannot update icon.');
                return;
            }
        }
        
        var isDark = theme === DARK_CLASS;
        if (isDark) {
            themeIcon.className = 'fas fa-sun theme-icon';
        } else {
            themeIcon.className = 'fas fa-moon theme-icon';
        }
    }
    
    // ============================================
    // Update ALL Theme Icons on page
    // ============================================
    function updateAllThemeIcons(theme) {
        var allToggles = document.querySelectorAll('.theme-toggle-btn');
        allToggles.forEach(function(toggle) {
            var icon = toggle.querySelector('.theme-icon');
            if (icon) {
                var isDark = theme === DARK_CLASS;
                if (isDark) {
                    icon.className = 'fas fa-sun theme-icon';
                } else {
                    icon.className = 'fas fa-moon theme-icon';
                }
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
        console.log('Reinitializing theme...');
        // Don't reset initialized flag to prevent flash
        // Just update icons
        var currentTheme = getCurrentTheme();
        updateThemeIcon(currentTheme);
        updateAllThemeIcons(currentTheme);
        console.log('Theme reinitialized. Current theme:', currentTheme);
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
        updateThemeUI: updateAllThemeIcons,
        updateThemeIcon: updateThemeIcon
    };
    
    // ============================================
    // IMMEDIATE EXECUTION - Before DOM Content Loaded
    // This prevents the flash of light theme
    // ============================================
    applyThemeImmediately();
    
    // ============================================
    // Auto-init when DOM is ready
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM ready, initializing theme...');
            initTheme();
        });
    } else {
        // DOM already loaded, init immediately
        initTheme();
    }
    
    console.log('Theme module loaded.');
    
})();