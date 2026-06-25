/**
 * UTILITY FUNCTIONS
 * Core utility functions used across the application
 */

// ============================================
// CSRF Token Helper
// ============================================
function getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ============================================
// Toast Notification System
// ============================================
function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 4000;
    
    const container = document.getElementById('toast-container');
    if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = 'toast-container';
        newContainer.className = 'toast-container';
        document.body.appendChild(newContainer);
    }
    
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close toast">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', function() {
        toast.remove();
    });
    
    setTimeout(function() {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(function() {
                toast.remove();
            }, 300);
        }
    }, duration);
}

// ============================================
// Form Validation Helpers
// ============================================
function validateEmail(email) {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
}

function validateRequired(value) {
    return value !== null && value !== undefined && value.trim() !== '';
}

function validateMinLength(value, minLength) {
    return value && value.length >= minLength;
}

function validateMaxLength(value, maxLength) {
    return value && value.length <= maxLength;
}

function validatePattern(value, pattern) {
    const regex = new RegExp(pattern);
    return regex.test(value);
}

function validateNumber(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

// ============================================
// Form Error Display
// ============================================
function showFieldError(field, message) {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    
    // Remove existing errors
    clearFieldError(field);
    
    field.classList.add('is-invalid');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-message';
    errorDiv.textContent = message;
    formGroup.appendChild(errorDiv);
}

function clearFieldError(field) {
    field.classList.remove('is-invalid');
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    const errorDiv = formGroup.querySelector('.field-error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

function clearAllErrors(form) {
    form.querySelectorAll('.is-invalid').forEach(function(el) {
        el.classList.remove('is-invalid');
    });
    form.querySelectorAll('.field-error-message').forEach(function(el) {
        el.remove();
    });
}

// ============================================
// API Request Helper
// ============================================
async function apiRequest(url, method, data) {
    method = method || 'GET';
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
    }
    
    const csrfToken = getCSRFToken();
    if (csrfToken) {
        options.headers['X-CSRFToken'] = csrfToken;
    }
    
    try {
        const response = await fetch(url, options);
        const responseData = await response.json().catch(function() {
            return {};
        });
        
        if (!response.ok) {
            let errorMessage = 'An error occurred.';
            if (responseData.message) {
                errorMessage = responseData.message;
            } else if (responseData.detail) {
                errorMessage = responseData.detail;
            } else if (responseData.errors) {
                const errors = responseData.errors;
                const firstKey = Object.keys(errors)[0];
                if (firstKey) {
                    errorMessage = errors[firstKey];
                    if (Array.isArray(errorMessage)) {
                        errorMessage = errorMessage[0];
                    }
                }
            }
            throw new Error(errorMessage);
        }
        
        return responseData;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// ============================================
// Debounce Helper
// ============================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// DOM Ready Helper
// ============================================
function domReady(fn) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        fn();
    }
}

// ============================================
// Export for use in other modules
// ============================================
window.Utils = {
    getCSRFToken: getCSRFToken,
    showToast: showToast,
    validateEmail: validateEmail,
    validateRequired: validateRequired,
    validateMinLength: validateMinLength,
    validateMaxLength: validateMaxLength,
    validatePattern: validatePattern,
    validateNumber: validateNumber,
    showFieldError: showFieldError,
    clearFieldError: clearFieldError,
    clearAllErrors: clearAllErrors,
    apiRequest: apiRequest,
    debounce: debounce,
    domReady: domReady
};