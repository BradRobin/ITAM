/**
 * EMPLOYEE MODULE
 * Handles employee management: list and actions
 */

(function() {
    'use strict';

    function init() {
        if (window.EmployeeRowMenu && typeof window.EmployeeRowMenu.init === 'function') {
            window.EmployeeRowMenu.init();
        }
    }

    window.EmployeeManager = {
        init: init
    };

})();
