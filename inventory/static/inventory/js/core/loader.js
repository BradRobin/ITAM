/**
 * LOADER MODULE - Best Practice Implementation
 * Single, unified loader with immediate feedback
 */

(function() {
    'use strict';
    
    // ============================================
    // State Management
    // ============================================
    var state = {
        isActive: false,
        message: 'Loading',
        timeoutId: null,
        pendingCalls: 0,
        overlay: null,
        textEl: null,
        dotContainer: null,
        dotInterval: null
    };
    
    // ============================================
    // Configuration
    // ============================================
    var CONFIG = {
        DEFAULT_MESSAGE: 'Loading',
        TIMEOUT: 30000,        // 30 seconds safety net
        DOT_INTERVAL: 400,     // Dot animation speed
        TRANSITION_DELAY: 300  // Hide transition delay
    };
    
    // ============================================
    // Create Loader Elements (Lazy Loading)
    // ============================================
    function createLoaderElements() {
        if (state.overlay) return;
        
        state.overlay = document.createElement('div');
        state.overlay.id = 'loading-overlay';
        state.overlay.className = 'loading-overlay';
        state.overlay.innerHTML = `
            <div class="spinner-container">
                <div class="spinner-wrapper">
                    <svg class="spinner-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                        <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                        <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="spinner-text-wrapper">
                    <span class="spinner-text" id="loaderText">${CONFIG.DEFAULT_MESSAGE}</span>
                    <span class="dots-container" id="dotsContainer">
                        <span class="dot">.</span>
                        <span class="dot">.</span>
                        <span class="dot">.</span>
                    </span>
                </div>
            </div>
        `;
        
        document.body.appendChild(state.overlay);
        state.textEl = state.overlay.querySelector('.spinner-text');
        state.dotContainer = state.overlay.querySelector('.dots-container');
    }
    
    // ============================================
    // Animate Dots
    // ============================================
    function animateDots() {
        if (!state.dotContainer) return;
        
        var dots = state.dotContainer.querySelectorAll('.dot');
        if (dots.length !== 3) return;
        
        var dotIndex = 0;
        
        dots.forEach(function(dot) {
            dot.style.opacity = '0.3';
            dot.style.transform = 'translateY(0)';
        });
        
        if (state.dotInterval) {
            clearInterval(state.dotInterval);
        }
        
        state.dotInterval = setInterval(function() {
            dots.forEach(function(dot) {
                dot.style.opacity = '0.3';
                dot.style.transform = 'translateY(0)';
            });
            
            if (dots[dotIndex]) {
                dots[dotIndex].style.opacity = '1';
                dots[dotIndex].style.transform = 'translateY(-4px)';
            }
            
            dotIndex = (dotIndex + 1) % dots.length;
        }, CONFIG.DOT_INTERVAL);
    }
    
    // ============================================
    // Show Loader - Core Function
    // ============================================
    function show(message) {
        // Prevent duplicate
        if (state.isActive) {
            // Update message if provided
            if (message && state.textEl) {
                state.textEl.textContent = message;
            }
            return;
        }
        
        // Create elements if needed
        createLoaderElements();
        
        // Update message
        var msg = message || CONFIG.DEFAULT_MESSAGE;
        if (state.textEl) {
            state.textEl.textContent = msg;
        }
        
        // Clear any existing timeout
        if (state.timeoutId) {
            clearTimeout(state.timeoutId);
            state.timeoutId = null;
        }
        
        // Show with slight delay to ensure DOM is ready
        requestAnimationFrame(function() {
            state.overlay.classList.add('active');
            state.isActive = true;
            
            // Start dot animation
            setTimeout(animateDots, 100);
        });
        
        // Safety timeout
        state.timeoutId = setTimeout(function() {
            hide();
        }, CONFIG.TIMEOUT);
        
        return state.isActive;
    }
    
    // ============================================
    // Hide Loader - Core Function
    // ============================================
    function hide() {
        if (!state.isActive) return;
        
        state.isActive = false;
        
        // Clear intervals and timeouts
        if (state.dotInterval) {
            clearInterval(state.dotInterval);
            state.dotInterval = null;
        }
        
        if (state.timeoutId) {
            clearTimeout(state.timeoutId);
            state.timeoutId = null;
        }
        
        // Hide with transition
        state.overlay.classList.remove('active');
        
        // Remove from DOM after transition
        setTimeout(function() {
            if (state.overlay && state.overlay.parentNode) {
                state.overlay.remove();
                state.overlay = null;
                state.textEl = null;
                state.dotContainer = null;
            }
        }, CONFIG.TRANSITION_DELAY);
    }
    
    // ============================================
    // Update Message
    // ============================================
    function updateMessage(message) {
        if (state.textEl && message) {
            state.textEl.textContent = message;
        }
    }
    
    // ============================================
    // Check if Active
    // ============================================
    function isActive() {
        return state.isActive;
    }
    
    // ============================================
    // Setup Navigation Interceptor (Best Practice)
    // ============================================
    function setupNavigationInterceptor() {
        var links = document.querySelectorAll('a[data-loader="true"], .sidebar-link');
        
        links.forEach(function(link) {
            link.addEventListener('click', function(e) {
                var href = this.getAttribute('href');
                if (!href || href === '#' || href.startsWith('javascript:')) {
                    return;
                }
                
                // Show loader immediately
                var message = this.dataset.loaderMessage || CONFIG.DEFAULT_MESSAGE;
                show(message);
                
                // Let navigation happen naturally
                // Loader stays visible until page loads
            });
        });
    }
    
    // ============================================
    // Setup Form Submit Interceptor
    // ============================================
    function setupFormInterceptor() {
        var forms = document.querySelectorAll('form[data-loader="true"]');
        
        forms.forEach(function(form) {
            form.addEventListener('submit', function() {
                var message = this.dataset.loaderMessage || 'Processing';
                show(message);
            });
        });
    }
    
    // ============================================
    // Setup AJAX Interceptor (Only for API calls)
    // ============================================
    function setupAjaxInterceptor() {
        // Intercept fetch
        if (typeof window.fetch === 'function') {
            var originalFetch = window.fetch;
            window.fetch = function() {
                var args = arguments;
                var url = args[0];
                var isApiCall = false;
                
                if (typeof url === 'string') {
                    isApiCall = url.includes('/api/') && 
                               !url.includes('/static/') && 
                               !url.includes('.css') && 
                               !url.includes('.js');
                }
                
                if (isApiCall) {
                    show('Loading');
                }
                
                return originalFetch.apply(this, args).finally(function() {
                    if (isApiCall) {
                        hide();
                    }
                });
            };
        }
        
        // Intercept XMLHttpRequest
        var originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            var args = arguments;
            var url = args[1];
            var isApiCall = false;
            
            if (typeof url === 'string') {
                isApiCall = url.includes('/api/') && 
                           !url.includes('/static/') && 
                           !url.includes('.css') && 
                           !url.includes('.js');
            }
            
            if (isApiCall) {
                show('Loading');
            }
            
            var xhr = this;
            var originalOnReadyStateChange = xhr.onreadystatechange;
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 && isApiCall) {
                    hide();
                }
                if (originalOnReadyStateChange) {
                    originalOnReadyStateChange.apply(this, arguments);
                }
            };
            
            xhr.addEventListener('loadend', function() {
                if (isApiCall) {
                    hide();
                }
            });
            
            return originalXHROpen.apply(this, args);
        };
    }
    
    // ============================================
    // Initialize - Best Practice
    // ============================================
    function init() {
        console.log('Loader module initializing...');
        
        // Setup interceptors
        setupNavigationInterceptor();
        setupFormInterceptor();
        setupAjaxInterceptor();
        
        // Hide loader on page load
        if (document.readyState === 'complete') {
            setTimeout(hide, 300);
        } else {
            window.addEventListener('load', function() {
                setTimeout(hide, 300);
            });
        }
        
        console.log('Loader module initialized.');
    }
    
    // ============================================
    // Export
    // ============================================
    window.Loader = {
        show: show,
        hide: hide,
        updateMessage: updateMessage,
        isActive: isActive,
        init: init
    };
    
    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    console.log('Loader module loaded.');
    
})();