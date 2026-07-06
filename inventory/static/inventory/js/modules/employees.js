/**
 * EMPLOYEE MODULE
 *
 * Registers the employee row-menu action handler. Generic dropdown
 * mechanics live in TableRowMenu; edit/delete URLs come from the row
 * markup so routing stays owned by Django.
 */
(function() {
    'use strict';

    function handleAction(action, wrapper) {
        if (action === 'edit') {
            var editUrl = wrapper.dataset.editUrl;
            if (editUrl) {
                window.location.href = editUrl;
            }
            return;
        }

        if (action === 'delete') {
            var name = wrapper.dataset.employeeName || 'employee';
            var deleteUrl = wrapper.dataset.deleteUrl;
            if (!deleteUrl) {
                return;
            }
            var message = 'Are you sure you want to delete "' + name + '"? This action cannot be undone.';
            if (window.confirm(message)) {
                window.location.href = deleteUrl;
            }
        }
    }

    function init() {
        if (window.TableRowMenu) {
            window.TableRowMenu.register('employee', handleAction);
        }
    }

    window.EmployeeManager = {
        init: init
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
