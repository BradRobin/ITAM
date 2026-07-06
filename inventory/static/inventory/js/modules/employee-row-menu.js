/**
 * Row actions menu (vertical dots) for employee tables
 */
(function() {
    'use strict';

    var bound = false;
    var openMenu = null;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function closeOpenMenu() {
        if (!openMenu) {
            return;
        }
        var dropdown = openMenu.querySelector('.employee-row-menu-dropdown');
        var trigger = openMenu.querySelector('.employee-row-menu-trigger');
        if (dropdown) {
            dropdown.hidden = true;
            dropdown.classList.remove('open');
        }
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
        }
        openMenu.classList.remove('is-open');
        openMenu = null;
    }

    function positionDropdown(trigger, dropdown) {
        var rect = trigger.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.minWidth = '9.5rem';
        dropdown.style.zIndex = '1300';

        var top = rect.bottom + 4;
        var left = rect.right - dropdown.offsetWidth;

        if (left < 8) {
            left = 8;
        }
        if (top + dropdown.offsetHeight > window.innerHeight - 8) {
            top = Math.max(8, rect.top - dropdown.offsetHeight - 4);
        }

        dropdown.style.top = top + 'px';
        dropdown.style.left = left + 'px';
    }

    function openMenuFor(wrapper) {
        closeOpenMenu();
        var trigger = wrapper.querySelector('.employee-row-menu-trigger');
        var dropdown = wrapper.querySelector('.employee-row-menu-dropdown');
        if (!trigger || !dropdown) {
            return;
        }

        dropdown.hidden = false;
        dropdown.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        wrapper.classList.add('is-open');
        positionDropdown(trigger, dropdown);
        openMenu = wrapper;
    }

    function handleAction(action, employeeId, employeeName) {
        if (!employeeId) {
            return;
        }

        if (action === 'edit') {
            window.location.href = '/employees/' + encodeURIComponent(employeeId) + '/edit/';
            return;
        }

        if (action === 'delete') {
            var message = 'Are you sure you want to delete "' + employeeName + '"? This action cannot be undone.';
            if (!window.confirm(message)) {
                return;
            }
            window.location.href = '/employees/' + encodeURIComponent(employeeId) + '/delete/';
        }
    }

    function bindEvents() {
        if (bound) {
            return;
        }
        bound = true;

        document.addEventListener('click', function(event) {
            var item = event.target.closest('.employee-row-menu-item');
            if (item) {
                event.preventDefault();
                event.stopPropagation();
                var wrapper = item.closest('.employee-row-menu');
                if (!wrapper) {
                    return;
                }
                handleAction(
                    item.dataset.action,
                    wrapper.dataset.employeeId,
                    wrapper.dataset.employeeName || 'employee'
                );
                closeOpenMenu();
                return;
            }

            var trigger = event.target.closest('.employee-row-menu-trigger');
            if (trigger) {
                event.preventDefault();
                event.stopPropagation();
                var menu = trigger.closest('.employee-row-menu');
                if (!menu) {
                    return;
                }
                if (openMenu === menu) {
                    closeOpenMenu();
                } else {
                    openMenuFor(menu);
                }
                return;
            }

            if (!event.target.closest('.employee-row-menu-dropdown')) {
                closeOpenMenu();
            }
        });

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeOpenMenu();
            }
        });

        window.addEventListener('resize', closeOpenMenu);
        window.addEventListener('scroll', closeOpenMenu, true);
    }

    function init() {
        bindEvents();
    }

    window.EmployeeRowMenu = {
        init: init,
        close: closeOpenMenu
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
