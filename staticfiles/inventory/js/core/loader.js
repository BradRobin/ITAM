/**
 * LOADER MODULE
 * Handles loading spinner management
 */

(function() {
    'use strict';
    
    // ============================================
    // Configuration
    // ============================================
    var DEFAULT_MESSAGE = 'Loading...';
    var DEFAULT_TIMEOUT = 30000; // 30 seconds
    
    // ============================================
    // DOM Elements
    // ============================================
    var overlay = null;
    var spinner = null;
    var textEl = null;
    var ajaxIntercepted = false;
    
    // ============================================
    // Create Loading Overlay
    // ============================================
    function createOverlay() {
        // Remove existing overlay if present
        var existing = document.getElementById('loading-overlay');
        if (existing) {
            existing.remove();
        }
        
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner-container">
                <div class="spinner spinner-primary spinner-lg"></div>
                <p class="spinner-text">${DEFAULT_MESSAGE}</p>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        spinner = overlay.querySelector('.spinner');
        textEl = overlay.querySelector('.spinner-text');
        
        return overlay;
    }
    
    // ============================================
    // Show Loader
    // ============================================
    function showLoader(message) {
        message = message || DEFAULT_MESSAGE;
        
        if (!overlay || !document.body.contains(overlay)) {
            createOverlay();
        }
        
        if (textEl) {
            textEl.textContent = message;
        }
        
        // Force reflow for animation
        void overlay.offsetWidth;
        
        overlay.classList.add('active');
        
        // Auto-hide after timeout (safety net)
        clearTimeout(overlay._timeout);
        overlay._timeout = setTimeout(function() {
            hideLoader();
        }, DEFAULT_TIMEOUT);
    }
    
    // ============================================
    // Hide Loader
    // ============================================
    function hideLoader() {
        if (overlay) {
            overlay.classList.remove('active');
            clearTimeout(overlay._timeout);
            
            // Remove from DOM after transition
            setTimeout(function() {
                if (overlay && overlay.parentNode) {
                    overlay.remove();
                    overlay = null;
                    spinner = null;
                    textEl = null;
                }
            }, 300);
        }
    }
    
    // ============================================
    // Update Loader Message
    // ============================================
    function updateLoaderMessage(message) {
        if (textEl) {
            textEl.textContent = message || DEFAULT_MESSAGE;
        }
    }
    
    // ============================================
    // Create Inline Spinner
    // ============================================
    function createInlineSpinner(size) {
        size = size || 'sm';
        var spinnerEl = document.createElement('span');
        spinnerEl.className = 'spinner-inline';
        if (size === 'sm') {
            spinnerEl.style.width = '16px';
            spinnerEl.style.height = '16px';
        } else if (size === 'lg') {
            spinnerEl.style.width = '24px';
            spinnerEl.style.height = '24px';
        }
        return spinnerEl;
    }
    
    // ============================================
    // Show Loader on Form Submit
    // ============================================
    function showLoaderOnSubmit(formSelector) {
        var forms = document.querySelectorAll(formSelector || 'form[data-loader="true"]');
        forms.forEach(function(form) {
            form.addEventListener('submit', function() {
                var message = this.dataset.loaderMessage || 'Saving...';
                showLoader(message);
            });
        });
    }
    
    // ============================================
    // Show Loader on Navigation
    // ============================================
    function showLoaderOnNavigation(linksSelector) {
        var links = document.querySelectorAll(linksSelector || 'a[data-loader="true"]');
        links.forEach(function(link) {
            link.addEventListener('click', function() {
                var message = this.dataset.loaderMessage || 'Loading...';
                showLoader(message);
            });
        });
    }
    
    // ============================================
    // Show Loader on AJAX Requests - FIXED
    // ============================================
    function showLoaderOnAjax() {
        // Prevent duplicate interception
        if (ajaxIntercepted) {
            return;
        }
        ajaxIntercepted = true;
        
        // Intercept fetch requests
        if (typeof window.fetch === 'function') {
            var originalFetch = window.fetch;
            window.fetch = function() {
                var args = arguments;
                var url = args[0];
                // Don't show loader for static files
                if (typeof url === 'string' && 
                    !url.includes('/static/') && 
                    !url.includes('.css') && 
                    !url.includes('.js') &&
                    !url.includes('favicon') &&
                    !url.includes('manifest')) {
                    showLoader('Loading data...');
                }
                return originalFetch.apply(this, args).finally(function() {
                    hideLoader();
                });
            };
        }
        
        // Intercept XMLHttpRequest
        var originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            var args = arguments;
            var url = args[1];
            if (typeof url === 'string' && 
                !url.includes('/static/') && 
                !url.includes('.css') && 
                !url.includes('.js') &&
                !url.includes('favicon') &&
                !url.includes('manifest')) {
                showLoader('Loading data...');
            }
            var xhr = this;
            var originalOnReadyStateChange = xhr.onreadystatechange;
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    hideLoader();
                }
                if (originalOnReadyStateChange) {
                    originalOnReadyStateChange.apply(this, arguments);
                }
            };
            xhr.addEventListener('loadend', function() {
                hideLoader();
            });
            return originalXHROpen.apply(this, args);
        };
    }
    
    // ============================================
    // Check if Loader is Active
    // ============================================
    function isActive() {
        return overlay ? overlay.classList.contains('active') : false;
    }
    
    // ============================================
    // Export
    // ============================================
    window.Loader = {
        show: showLoader,
        hide: hideLoader,
        updateMessage: updateLoaderMessage,
        createInline: createInlineSpinner,
        showOnSubmit: showLoaderOnSubmit,
        showOnNavigation: showLoaderOnNavigation,
        showOnAjax: showLoaderOnAjax,
        isActive: isActive
    };
    
    console.log('Loader module loaded.');
    
})();