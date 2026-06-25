/**
 * SETTINGS MODULE - ITAM SYSTEM
 * Handles settings page interactions
 */

(function() {
    'use strict';
    
    // ============================================
    // Initialize Settings
    // ============================================
    function init() {
        console.log('Settings module initializing...');
        
        setupThemeToggles();
        setupToggleSwitches();
        setupSelects();
        
        console.log('Settings module initialized.');
    }
    
    // ============================================
    // Setup Theme Toggles
    // ============================================
    function setupThemeToggles() {
        var buttons = document.querySelectorAll('.settings-toggle-btn');
        var currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        
        buttons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                buttons.forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                
                var theme = this.id.replace('ModeBtn', '').toLowerCase();
                if (theme === 'system') {
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    theme = prefersDark ? 'dark' : 'light';
                }
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('theme', theme);
                
                if (window.Theme && typeof window.Theme.updateThemeUI === 'function') {
                    window.Theme.updateThemeUI(theme);
                }
            });
        });
        
        // Highlight current theme
        var themeMap = {
            'light': 'lightModeBtn',
            'dark': 'darkModeBtn'
        };
        var btnId = themeMap[currentTheme] || 'systemModeBtn';
        var activeBtn = document.getElementById(btnId);
        if (activeBtn) {
            buttons.forEach(function(b) { b.classList.remove('active'); });
            activeBtn.classList.add('active');
        }
    }
    
    // ============================================
    // Setup Toggle Switches
    // ============================================
    function setupToggleSwitches() {
        var toggles = document.querySelectorAll('.settings-toggle-switch input[type="checkbox"]');
        toggles.forEach(function(toggle) {
            // Load saved state from localStorage
            var key = 'setting_' + toggle.id;
            var saved = localStorage.getItem(key);
            if (saved !== null) {
                toggle.checked = saved === 'true';
            }
            
            toggle.addEventListener('change', function() {
                localStorage.setItem('setting_' + this.id, this.checked);
                if (window.Utils && typeof window.Utils.showToast === 'function') {
                    var message = this.checked ? 'Setting enabled.' : 'Setting disabled.';
                    window.Utils.showToast(message, 'info');
                }
            });
        });
    }
    
    // ============================================
    // Setup Selects
    // ============================================
    function setupSelects() {
        var selects = document.querySelectorAll('.settings-select');
        selects.forEach(function(select) {
            var key = 'setting_' + select.id || 'setting_' + select.name;
            var saved = localStorage.getItem(key);
            if (saved !== null) {
                select.value = saved;
            }
            
            select.addEventListener('change', function() {
                var key = 'setting_' + this.id || 'setting_' + this.name;
                localStorage.setItem(key, this.value);
                if (window.Utils && typeof window.Utils.showToast === 'function') {
                    window.Utils.showToast('Setting updated.', 'success');
                }
            });
        });
    }
    
    // ============================================
    // Export
    // ============================================
    window.Settings = {
        init: init
    };
    
    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    console.log('Settings module loaded.');
    
})();