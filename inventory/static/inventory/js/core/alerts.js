/**
 * ALERT MANAGEMENT
 * Handles auto-dismissal and manual dismissal of alerts
 */

(function() {
    'use strict';
    
    // ============================================
    // Configuration
    // ============================================
    const ALERT_DISMISS_DELAY = 5000;
    const ALERT_TRANSITION_DELAY = 300;
    
    // ============================================
    // Initialize Alerts
    // ============================================
    function initAlerts() {
        const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
        
        alerts.forEach(function(alert) {
            // Add close button if not present
            let closeBtn = alert.querySelector('.alert-close');
            if (!closeBtn) {
                closeBtn = document.createElement('button');
                closeBtn.className = 'alert-close';
                closeBtn.setAttribute('aria-label', 'Close alert');
                closeBtn.innerHTML = '&times;';
                alert.appendChild(closeBtn);
            }
            
            // Close on button click
            closeBtn.addEventListener('click', function() {
                dismissAlert(alert);
            });
            
            // Auto-dismiss after delay
            setTimeout(function() {
                dismissAlert(alert);
            }, ALERT_DISMISS_DELAY);
        });
    }
    
    // ============================================
    // Dismiss Alert
    // ============================================
    function dismissAlert(alert) {
        if (!alert || !alert.parentNode) return;
        
        alert.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-10px)';
        
        setTimeout(function() {
            if (alert.parentNode) {
                alert.remove();
            }
        }, ALERT_TRANSITION_DELAY);
    }
    
    // ============================================
    // Show Alert
    // ============================================
    function showAlert(message, type, containerId) {
        type = type || 'info';
        containerId = containerId || 'messages-container';
        
        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'messages-container';
            const main = document.querySelector('main');
            if (main) {
                main.parentNode.insertBefore(container, main);
            } else {
                document.body.prepend(container);
            }
        }
        
        const alert = document.createElement('div');
        alert.className = 'alert alert-' + type;
        alert.innerHTML = `
            <span class="alert-message">${message}</span>
            <button class="alert-close" aria-label="Close alert">&times;</button>
        `;
        
        container.appendChild(alert);
        
        // Auto-dismiss
        setTimeout(function() {
            dismissAlert(alert);
        }, ALERT_DISMISS_DELAY);
        
        return alert;
    }
    
    // ============================================
    // Export
    // ============================================
    window.Alerts = {
        init: initAlerts,
        dismiss: dismissAlert,
        show: showAlert
    };
    
    // Auto-init when DOM is ready
    document.addEventListener('DOMContentLoaded', initAlerts);
    
})();