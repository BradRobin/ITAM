/**
 * TABLE ROW MENU (shared)
 *
 * Generic vertical-dots dropdown mechanics for any table row menu.
 * Markup contract (per row):
 *   <div class="table-row-menu" data-menu-type="asset" ...data-*>
 *     <button class="table-row-menu-trigger" ...>⋮</button>
 *     <div class="table-row-menu-dropdown" role="menu" hidden>
 *       <button class="table-row-menu-item" data-action="view">…</button>
 *     </div>
 *   </div>
 *
 * Consumers register an action handler for their menu type:
 *   TableRowMenu.register('asset', function(action, wrapper) { ... });
 *
 * This module owns open/close, positioning, keyboard (Esc), outside-click,
 * and resize/scroll dismissal for every menu type at once.
 */
(function() {
    'use strict';

    var bound = false;
    var openMenu = null;
    var handlers = {};

    function closeOpenMenu() {
        if (!openMenu) {
            return;
        }
        var dropdown = openMenu.querySelector('.table-row-menu-dropdown');
        var trigger = openMenu.querySelector('.table-row-menu-trigger');
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
        var trigger = wrapper.querySelector('.table-row-menu-trigger');
        var dropdown = wrapper.querySelector('.table-row-menu-dropdown');
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

    function dispatchAction(action, wrapper) {
        var type = wrapper.getAttribute('data-menu-type');
        var handler = type && handlers[type];
        if (typeof handler === 'function') {
            handler(action, wrapper);
        }
    }

    function bindEvents() {
        if (bound) {
            return;
        }
        bound = true;

        document.addEventListener('click', function(event) {
            var item = event.target.closest('.table-row-menu-item');
            if (item) {
                event.preventDefault();
                event.stopPropagation();
                var wrapper = item.closest('.table-row-menu');
                if (wrapper) {
                    dispatchAction(item.dataset.action, wrapper);
                }
                closeOpenMenu();
                return;
            }

            var trigger = event.target.closest('.table-row-menu-trigger');
            if (trigger) {
                event.preventDefault();
                event.stopPropagation();
                var menu = trigger.closest('.table-row-menu');
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

            if (!event.target.closest('.table-row-menu-dropdown')) {
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

    function register(menuType, handler) {
        handlers[menuType] = handler;
        bindEvents();
    }

    window.TableRowMenu = {
        init: bindEvents,
        register: register,
        close: closeOpenMenu
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindEvents);
    } else {
        bindEvents();
    }
})();
