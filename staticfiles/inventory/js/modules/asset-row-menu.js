/**
 * Asset row actions menu.
 *
 * Builds the ⋮ menu markup for asset tables and routes asset-specific
 * actions (view / assign / delete). Generic dropdown mechanics live in
 * TableRowMenu; this module only owns asset concerns.
 */
(function() {
    'use strict';

    function escapeHtml(value) {
        if (window.Utils && typeof window.Utils.escapeHtml === 'function') {
            return window.Utils.escapeHtml(value);
        }
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function pageHeader() {
        return document.querySelector('[data-user-is-admin]');
    }

    function isAdminHost() {
        var host = pageHeader();
        return host && host.getAttribute('data-user-is-admin') === 'true';
    }

    function deleteUrlFor(assetId) {
        var host = pageHeader();
        var template = host && host.getAttribute('data-asset-delete-url-template');
        if (template) {
            return template.replace(/0(\/?)$/, encodeURIComponent(assetId) + '$1');
        }
        return '/assets/' + encodeURIComponent(assetId) + '/delete/';
    }

    function canAssignFromStatus(status) {
        if (!isAdminHost()) {
            return false;
        }
        var normalized = String(status || '').toLowerCase().trim();
        return normalized === 'available';
    }

    function canAssignAsset(asset) {
        if (!asset || !isAdminHost()) {
            return false;
        }
        if (asset.assigned_employee) {
            return false;
        }
        return canAssignFromStatus(asset.status_label || asset.status);
    }

    function menuItemHtml(action, label, icon, extraClass) {
        return '<button type="button" class="table-row-menu-item' + (extraClass ? ' ' + extraClass : '') +
            '" data-action="' + action + '" role="menuitem">' +
            '<i class="fas ' + icon + '" aria-hidden="true"></i>' +
            '<span>' + escapeHtml(label) + '</span>' +
            '</button>';
    }

    function cellHtml(assetId, assetName, options) {
        options = options || {};
        var id = String(assetId || '');
        var name = String(assetName || 'asset');
        var catalogOnly = !id;
        var showAdmin = options.showAdminActions !== false && isAdminHost();
        var canAssign = !!options.canAssign && showAdmin && !catalogOnly;

        var items = menuItemHtml('view', 'View', 'fa-eye');
        if (canAssign) {
            items += menuItemHtml('assign', 'Assign', 'fa-user-plus');
        }
        if (showAdmin && !catalogOnly) {
            items += menuItemHtml('delete', 'Delete', 'fa-trash-alt', 'table-row-menu-item-danger');
        }

        return '<td class="actions-cell" data-row-action="true">' +
            '<div class="table-row-menu" data-menu-type="asset"' +
                (id ? ' data-asset-id="' + escapeHtml(id) + '"' : ' data-catalog-only="true"') +
                ' data-asset-name="' + escapeHtml(name) + '">' +
                '<button type="button" class="table-row-menu-trigger" data-row-action="true" aria-label="Actions for ' + escapeHtml(name) + '" aria-haspopup="true" aria-expanded="false">' +
                    '<i class="fas fa-ellipsis-v" aria-hidden="true"></i>' +
                '</button>' +
                '<div class="table-row-menu-dropdown" role="menu" hidden>' + items + '</div>' +
            '</div>' +
        '</td>';
    }

    function headerCellHtml() {
        return '<th scope="col" class="actions-col">Actions</th>';
    }

    function handleAction(action, wrapper) {
        var assetId = wrapper.dataset.assetId;
        var assetName = wrapper.dataset.assetName || 'asset';

        if (action === 'view') {
            if (assetId) {
                if (window.AssetManager && typeof window.AssetManager.openAssetDetailCard === 'function') {
                    window.AssetManager.openAssetDetailCard(assetId);
                }
                return;
            }
            if (window.AssetManager && typeof window.AssetManager.activateRow === 'function') {
                var row = wrapper.closest('.asset-table-row');
                if (row) {
                    window.AssetManager.activateRow(row);
                }
            }
            return;
        }

        if (!assetId) {
            return;
        }

        if (action === 'assign') {
            if (window.AssetManager && typeof window.AssetManager.openAssetDetailCardForAssign === 'function') {
                window.AssetManager.openAssetDetailCardForAssign(assetId);
            } else if (window.AssetManager && typeof window.AssetManager.openAssetDetailCard === 'function') {
                window.AssetManager.openAssetDetailCard(assetId);
            }
            return;
        }

        if (action === 'delete') {
            var message = 'Delete "' + assetName + '"? You will be taken to the confirmation page.';
            if (!window.confirm(message)) {
                return;
            }
            window.location.href = deleteUrlFor(assetId);
        }
    }

    function init() {
        if (window.TableRowMenu) {
            window.TableRowMenu.register('asset', handleAction);
        }
    }

    window.AssetRowMenu = {
        init: init,
        cellHtml: cellHtml,
        headerCellHtml: headerCellHtml,
        canAssignAsset: canAssignAsset,
        canAssignFromStatus: canAssignFromStatus,
        close: function() {
            if (window.TableRowMenu) {
                window.TableRowMenu.close();
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
