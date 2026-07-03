/**
 * EMPLOYEE NOTIFICATIONS MODULE
 * Handles notification interactions for employee portal
 */

(function() {
    'use strict';

    var notificationBadge = document.getElementById('notificationBadge');
    var notificationBell = document.getElementById('notificationBell');
    var notificationDropdown = document.getElementById('employeeNotificationDropdown');
    var markAllBtn = document.getElementById('markAllReadBtn');

    // ============================================
    // Mark Single Notification as Read
    // ============================================
    window.markAsRead = function(notificationId) {
        if (!notificationId) return;

        var item = document.querySelector('.notification-item[data-notification-id="' + notificationId + '"]');

        // Optimistically update UI
        if (item) {
            item.classList.remove('unread');
        }

        fetch('/api/notifications/mark-read/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ id: notificationId })
        })
        .then(function(response) {
            if (!response.ok) throw new Error('Failed to mark as read');
            return response.json();
        })
        .then(function(data) {
            updateBadgeCount();
            updateFilterCounts();
        })
        .catch(function(error) {
            console.warn('Error marking notification as read:', error);
            if (item) {
                item.classList.add('unread');
            }
            showToast('Error marking as read', 'error');
        });
    };

    // ============================================
    // Handle Notification Click
    // ============================================
    window.handleNotificationClick = function(notificationId, link) {
        var item = document.querySelector('.notification-item[data-notification-id="' + notificationId + '"]');
        if (item && item.classList.contains('unread')) {
            markAsRead(notificationId);
        }
        
        if (link) {
            setTimeout(function() {
                window.location.href = link;
            }, 300);
        }
    };

    // ============================================
    // Mark All Notifications as Read
    // ============================================
    window.markAllRead = function() {
        var btn = markAllBtn || document.querySelector('.notification-actions .btn-secondary:first-child');
        var items = document.querySelectorAll('.notification-item.unread');

        if (items.length === 0) {
            showToast('No unread notifications', 'info');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        // Optimistically update UI
        items.forEach(function(item) {
            item.classList.remove('unread');
        });

        fetch('/api/notifications/mark-all-read/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(function(response) {
            if (!response.ok) throw new Error('Failed to mark all as read');
            return response.json();
        })
        .then(function(data) {
            updateBadgeCount();
            updateFilterCounts();
            showToast('All notifications marked as read', 'success');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check-double"></i> Mark All Read';
            }
            // Update mark all button in dropdown
            var dropdownMarkAll = document.querySelector('.mark-all-link');
            if (dropdownMarkAll) {
                dropdownMarkAll.style.display = 'none';
            }
        })
        .catch(function(error) {
            console.warn('Error marking all as read:', error);
            items.forEach(function(item) {
                item.classList.add('unread');
            });
            showToast('Error marking all as read', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check-double"></i> Mark All Read';
            }
        });
    };

    // ============================================
    // Clear All Notifications
    // ============================================
    window.clearAll = function() {
        var items = document.querySelectorAll('.notification-item');
        
        if (items.length === 0) {
            showToast('No notifications to clear', 'info');
            return;
        }

        if (!confirm('Are you sure you want to clear all notifications?')) {
            return;
        }

        var btn = document.querySelector('.notification-actions .btn-secondary:last-child');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        fetch('/api/notifications/clear-all/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(function(response) {
            if (!response.ok) throw new Error('Failed to clear notifications');
            return response.json();
        })
        .then(function(data) {
            var list = document.querySelector('.notifications-list');
            if (list) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-bell-slash"></i></div>
                        <h3>No Notifications</h3>
                        <p>You're all caught up!</p>
                    </div>
                `;
            }
            updateBadgeCount();
            updateFilterCounts();
            showToast('All notifications cleared', 'success');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-trash-alt"></i> Clear All';
            }
        })
        .catch(function(error) {
            console.warn('Error clearing notifications:', error);
            showToast('Error clearing notifications', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-trash-alt"></i> Clear All';
            }
        });
    };

    // ============================================
    // Update Badge Count
    // ============================================
    function updateBadgeCount() {
        if (!notificationBadge) return;

        var unreadItems = document.querySelectorAll('.notification-item.unread');
        var count = unreadItems.length;

        if (count > 0) {
            notificationBadge.textContent = count > 99 ? '99+' : count;
            notificationBadge.classList.remove('hidden');
            if (count > 5) {
                notificationBadge.classList.add('many');
            } else {
                notificationBadge.classList.remove('many');
            }
        } else {
            notificationBadge.textContent = '';
            notificationBadge.classList.add('hidden');
            notificationBadge.classList.remove('many');
        }
    }

    // ============================================
    // Update Filter Counts
    // ============================================
    function updateFilterCounts() {
        var filters = document.querySelectorAll('.filter-btn');
        var allItems = document.querySelectorAll('.notification-item');
        var unreadItems = document.querySelectorAll('.notification-item.unread');
        var readItems = document.querySelectorAll('.notification-item:not(.unread)');
        var assetItems = document.querySelectorAll('.notification-item .notification-icon.asset');
        var systemItems = document.querySelectorAll('.notification-item .notification-icon.system');

        filters.forEach(function(filter) {
            var filterType = filter.dataset.filter;
            var count = 0;
            
            switch(filterType) {
                case 'all':
                    count = allItems.length;
                    break;
                case 'unread':
                    count = unreadItems.length;
                    break;
                case 'read':
                    count = readItems.length;
                    break;
                case 'asset':
                    count = assetItems.length;
                    break;
                case 'system':
                    count = systemItems.length;
                    break;
            }

            var badge = filter.querySelector('.filter-count');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline' : 'none';
            }
        });
    }

    // ============================================
    // Toggle Notification Dropdown
    // ============================================
    function initDropdown() {
        if (notificationBell && notificationDropdown) {
            notificationBell.addEventListener('click', function(e) {
                e.stopPropagation();
                notificationDropdown.classList.toggle('open');
                notificationBell.classList.toggle('active');
                
                if (notificationDropdown.classList.contains('open')) {
                    markNotificationsAsSeen();
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!notificationBell.contains(e.target) && !notificationDropdown.contains(e.target)) {
                    notificationDropdown.classList.remove('open');
                    notificationBell.classList.remove('active');
                }
            });

            // Close on escape
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && notificationDropdown.classList.contains('open')) {
                    notificationDropdown.classList.remove('open');
                    notificationBell.classList.remove('active');
                }
            });
        }
    }

    // ============================================
    // Mark Notifications as Seen
    // ============================================
    function markNotificationsAsSeen() {
        var unreadItems = document.querySelectorAll('.notification-item.unread');
        if (unreadItems.length === 0) return;

        fetch('/api/notifications/mark-seen/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .catch(function(error) {
            console.warn('Error marking notifications as seen:', error);
        });
    }

    // ============================================
    // Filter Notifications
    // ============================================
    function initFilters() {
        var filters = document.querySelectorAll('.filter-btn');
        
        filters.forEach(function(filter) {
            filter.addEventListener('click', function() {
                filters.forEach(function(f) {
                    f.classList.remove('active');
                });
                this.classList.add('active');

                var filterType = this.dataset.filter;
                var items = document.querySelectorAll('.notification-item');

                items.forEach(function(item) {
                    var isUnread = item.classList.contains('unread');
                    var icon = item.querySelector('.notification-icon');
                    var type = icon ? icon.className.split(' ')[1] : '';

                    switch(filterType) {
                        case 'all':
                            item.style.display = 'flex';
                            break;
                        case 'unread':
                            item.style.display = isUnread ? 'flex' : 'none';
                            break;
                        case 'read':
                            item.style.display = !isUnread ? 'flex' : 'none';
                            break;
                        case 'asset':
                            item.style.display = type === 'asset' ? 'flex' : 'none';
                            break;
                        case 'system':
                            item.style.display = type === 'system' ? 'flex' : 'none';
                            break;
                    }
                });
            });
        });
    }

    // ============================================
    // Get CSRF Token
    // ============================================
    function getCsrfToken() {
        var name = 'csrftoken';
        var cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // ============================================
    // Show Toast Notification
    // ============================================
    function showToast(message, type) {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(message);
        }
    }

    // ============================================
    // Poll for New Notifications
    // ============================================
    var pollInterval = null;

    function startPolling(interval) {
        interval = interval || 30000;
        
        if (pollInterval) {
            clearInterval(pollInterval);
        }
        
        pollInterval = setInterval(function() {
            if (!document.hidden) {
                fetchUnreadCount();
            }
        }, interval);
    }

    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    function fetchUnreadCount() {
        fetch('/api/notifications/unread-count/', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(function(response) {
            if (!response.ok) throw new Error('Failed to fetch unread count');
            return response.json();
        })
        .then(function(data) {
            if (notificationBadge) {
                var count = data.count || 0;
                if (count > 0) {
                    notificationBadge.textContent = count > 99 ? '99+' : count;
                    notificationBadge.classList.remove('hidden');
                } else {
                    notificationBadge.textContent = '';
                    notificationBadge.classList.add('hidden');
                }
            }
        })
        .catch(function(error) {
            console.warn('Error fetching unread count:', error);
        });
    }

    // ============================================
    // Initialize
    // ============================================
    function init() {
        initDropdown();
        initFilters();
        updateBadgeCount();
        updateFilterCounts();
        startPolling(30000);
        
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                fetchUnreadCount();
                updateBadgeCount();
                updateFilterCounts();
            }
        });

        console.log('Employee notifications module initialized');
    }

    // ============================================
    // Cleanup
    // ============================================
    function cleanup() {
        stopPolling();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.addEventListener('beforeunload', cleanup);

})();