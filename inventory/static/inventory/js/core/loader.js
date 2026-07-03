/**
 * LOADER MODULE - Logo + Text with Animated Dots
 * Animated logo with pulsing effect + "Please wait..." with bouncing dots
 */

(function() {
    'use strict';
    
    // ============================================
    // State
    // ============================================
    var state = {
        isActive: false,
        overlay: null,
        textEl: null,
        dotsEl: null,
        message: 'Loading...',
        dotInterval: null,
        isInitialized: false
    };
    
    // ============================================
    // Configuration
    // ============================================
    var CONFIG = {
        DEFAULT_MESSAGE: 'Loading...',
        DOT_INTERVAL: 400,
        SKIP_PAGES: ['/login', '/signup', '/logout', '/auth/', '/password-reset']
    };
    
    // ============================================
    // Check if current page is auth page
    // ============================================
    function isAuthPage() {
        var currentPath = window.location.pathname;
        for (var i = 0; i < CONFIG.SKIP_PAGES.length; i++) {
            if (currentPath.includes(CONFIG.SKIP_PAGES[i])) {
                return true;
            }
        }
        return false;
    }
    
    // ============================================
    // Create Loader Elements
    // ============================================
    function createLoaderElements() {
        // Check if overlay already exists
        var existingOverlay = document.getElementById('loading-overlay');
        if (existingOverlay) {
            state.overlay = existingOverlay;
            state.textEl = state.overlay.querySelector('#loaderText');
            state.dotsEl = state.overlay.querySelector('#loaderDots');
            return;
        }
        
        // Create new overlay
        state.overlay = document.createElement('div');
        state.overlay.id = 'loading-overlay';
        state.overlay.className = 'loading-overlay';
        state.overlay.style.display = 'none';
        state.overlay.innerHTML = `
            <div class="loader-container">
                <div class="loader-logo-wrapper">
                    <svg class="loader-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                        <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                        <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="loader-text-wrapper">
                    <span class="loader-text" id="loaderText">${state.message}</span>
                    <span class="loader-dots" id="loaderDots">
                        <span class="dot">.</span>
                        <span class="dot">.</span>
                        <span class="dot">.</span>
                    </span>
                </div>
            </div>
        `;
        
        document.body.appendChild(state.overlay);
        state.textEl = state.overlay.querySelector('#loaderText');
        state.dotsEl = state.overlay.querySelector('#loaderDots');
        
        console.log('Loader elements created');
    }
    
    // ============================================
    // Animate Dots
    // ============================================
    function animateDots() {
        if (!state.dotsEl) return;
        
        var dots = state.dotsEl.querySelectorAll('.dot');
        if (dots.length !== 3) return;
        
        // Clear existing interval
        if (state.dotInterval) {
            clearInterval(state.dotInterval);
            state.dotInterval = null;
        }
        
        var index = 0;
        
        dots.forEach(function(dot) {
            dot.style.opacity = '0.3';
            dot.style.transform = 'translateY(0)';
        });
        
        state.dotInterval = setInterval(function() {
            dots.forEach(function(dot) {
                dot.style.opacity = '0.3';
                dot.style.transform = 'translateY(0)';
            });
            
            if (dots[index]) {
                dots[index].style.opacity = '1';
                dots[index].style.transform = 'translateY(-4px)';
            }
            
            index = (index + 1) % dots.length;
        }, CONFIG.DOT_INTERVAL);
    }
    
    // ============================================
    // Stop Dot Animation
    // ============================================
    function stopDots() {
        if (state.dotInterval) {
            clearInterval(state.dotInterval);
            state.dotInterval = null;
        }
        
        if (state.dotsEl) {
            var dots = state.dotsEl.querySelectorAll('.dot');
            dots.forEach(function(dot) {
                dot.style.opacity = '0.3';
                dot.style.transform = 'translateY(0)';
            });
        }
    }
    
    // ============================================
    // Show Loader - Immediate
    // ============================================
    function show(message) {
        // Skip on auth pages
        if (isAuthPage()) {
            console.log('Loader: Skipped on auth page');
            return;
        }
        
        // Create overlay if not exists
        createLoaderElements();
        
        if (!state.overlay) {
            console.warn('Loader overlay not found');
            return;
        }
        
        // If already active, just update message
        if (state.isActive) {
            if (message) {
                updateMessage(message);
            }
            return;
        }
        
        // Update message if provided
        if (message) {
            state.message = message;
            if (state.textEl) {
                state.textEl.textContent = message;
            }
        }
        
        // Show overlay immediately
        state.overlay.style.display = 'flex';
        // Force reflow for animation
        void state.overlay.offsetWidth;
        state.overlay.classList.add('active');
        state.isActive = true;
        
        // Start dot animation
        animateDots();
        
        console.log('Loader shown:', message || CONFIG.DEFAULT_MESSAGE);
    }
    
    // ============================================
    // Hide Loader
    // ============================================
    function hide() {
        if (!state.overlay || !state.isActive) {
            state.isActive = false;
            return;
        }
        
        // Hide overlay
        state.overlay.classList.remove('active');
        state.isActive = false;
        
        // Stop dot animation
        stopDots();
        
        // Hide after fade animation
        setTimeout(function() {
            if (state.overlay && !state.isActive) {
                state.overlay.style.display = 'none';
            }
        }, 300);
        
        console.log('Loader hidden');
    }
    
    // ============================================
    // Update Message
    // ============================================
    function updateMessage(message) {
        if (state.textEl && message) {
            state.textEl.textContent = message;
            state.message = message;
        }
    }
    
    // ============================================
    // Check if Active
    // ============================================
    function isActive() {
        return state.isActive;
    }
    
    // ============================================
    // Force Hide (Emergency)
    // ============================================
    function forceHide() {
        if (state.overlay) {
            state.overlay.classList.remove('active');
            state.overlay.style.display = 'none';
        }
        state.isActive = false;
        stopDots();
        console.log('Loader force hidden');
    }
    
    // ============================================
    // Global Click Handler - CATCH ALL NAVIGATION
    // ============================================
    function setupGlobalClickHandler() {
        document.addEventListener('click', function(e) {
            // Find the closest anchor tag
            var link = e.target.closest('a[href]');
            if (!link) return;
            
            var href = link.getAttribute('href');
            
            // Skip invalid links
            if (!href || href === '#' || href === '' || href.startsWith('javascript:')) {
                return;
            }
            
            // Skip external links
            if (href.startsWith('http') && !href.includes(window.location.hostname)) {
                return;
            }
            
            // Skip download links
            if (href.includes('download') || link.hasAttribute('download')) {
                return;
            }
            
            // Skip if target is _blank
            if (link.target === '_blank') {
                return;
            }
            
            // Skip auth pages
            if (href.includes('/login') || href.includes('/logout') || href.includes('/signup') || href.includes('/auth/')) {
                return;
            }
            
            // Skip if it's a form submit or button inside form
            if (e.target.closest('button[type="submit"]') || e.target.closest('input[type="submit"]')) {
                return;
            }
            
            // Show loader immediately
            var message = link.getAttribute('data-loader-message') || CONFIG.DEFAULT_MESSAGE;
            show(message);
        });
    }
    
    // ============================================
    // Show Loader on Form Submissions
    // ============================================
    function setupFormHandler() {
        document.addEventListener('submit', function(e) {
            var form = e.target;
            
            // Skip if form has no data-loader attribute
            if (!form.hasAttribute('data-loader')) {
                return;
            }
            
            // Skip auth forms
            if (form.action && (form.action.includes('/login') || form.action.includes('/logout') || form.action.includes('/signup'))) {
                return;
            }
            
            var message = form.getAttribute('data-loader-message') || CONFIG.DEFAULT_MESSAGE;
            show(message);
        });
    }
    
    // ============================================
    // Cleanup
    // ============================================
    function cleanup() {
        if (state.dotInterval) {
            clearInterval(state.dotInterval);
            state.dotInterval = null;
        }
    }
    
    // ============================================
    // Export
    // ============================================
    window.Loader = {
        show: show,
        hide: hide,
        updateMessage: updateMessage,
        isActive: isActive,
        forceHide: forceHide,
        cleanup: cleanup
    };
    
    // ============================================
    // Auto-init on DOM ready
    // ============================================
    function init() {
        if (state.isInitialized) {
            return;
        }
        state.isInitialized = true;
        
        // Create loader elements
        createLoaderElements();
        
        // Hide loader initially
        forceHide();
        
        // Setup global click handler for ALL navigation
        setupGlobalClickHandler();
        
        // Setup form handler
        setupFormHandler();
        
        // Handle page navigation events - hide loader on page load
        document.addEventListener('turbo:load', function() {
            forceHide();
        });
        
        document.addEventListener('htmx:afterSwap', function() {
            forceHide();
        });
        
        // Handle back/forward cache
        window.addEventListener('pageshow', function() {
            forceHide();
        });
        
        // Handle beforeunload - cleanup
        window.addEventListener('beforeunload', function() {
            cleanup();
        });
        
        console.log('Loader module initialized - Global click handler attached');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    console.log('loader.js loaded - Logo + Text with Animated Dots');
    
})();