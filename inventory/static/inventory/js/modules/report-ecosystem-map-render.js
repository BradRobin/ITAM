/**
 * Ecosystem map SVG/DOM render helpers.
 */
(function(global) {
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

    function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === 'function') {
            return window.CSS.escape(String(value));
        }
        return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    function summaryHtml(summary) {
        if (!summary || !summary.length) {
            return '';
        }
        return '<div class="ecosystem-map-summary">' + summary.map(function(item) {
            return (
                '<div class="ecosystem-map-summary-item">' +
                    '<span class="ecosystem-map-summary-value">' + escapeHtml(item.value) + '</span>' +
                    '<span class="ecosystem-map-summary-label">' + escapeHtml(item.label) + '</span>' +
                '</div>'
            );
        }).join('') + '</div>';
    }

    function legendHtml() {
        var items = [
            ['hub', 'Platform'],
            ['module', 'Modules'],
            ['metric', 'Live metrics'],
            ['leaf', 'Expanded items']
        ];
        return '<h4>Legend</h4><ul>' + items.map(function(item) {
            return '<li><span class="ecosystem-legend-swatch ecosystem-legend-swatch--' +
                escapeHtml(item[0]) + '"></span>' + escapeHtml(item[1]) + '</li>';
        }).join('') + '</ul>';
    }

    function shellHtml(meta) {
        meta = meta || {};
        return (
            '<div class="ecosystem-map-shell">' +
                '<div class="ecosystem-map-toolbar">' +
                    '<div class="ecosystem-map-toolbar-left">' +
                        '<div class="ecosystem-map-title-block">' +
                            '<h4>' + escapeHtml(meta.base_label || 'ITAM Overview') + '</h4>' +
                            '<p>Click modules or metrics to expand details</p>' +
                        '</div>' +
                        summaryHtml(meta.summary) +
                    '</div>' +
                    '<div class="ecosystem-map-toolbar-right">' +
                        '<button type="button" class="ecosystem-map-tool-btn" data-map-action="fit" title="Fit to screen"><i class="fas fa-compress-arrows-alt"></i></button>' +
                        '<button type="button" class="ecosystem-map-tool-btn" data-map-action="zoom-out" title="Zoom out"><i class="fas fa-minus"></i></button>' +
                        '<span class="ecosystem-map-zoom-label" data-map-zoom>100%</span>' +
                        '<button type="button" class="ecosystem-map-tool-btn" data-map-action="zoom-in" title="Zoom in"><i class="fas fa-plus"></i></button>' +
                    '</div>' +
                '</div>' +
                '<div class="ecosystem-map-stage" data-map-stage>' +
                    '<svg class="ecosystem-map-svg" role="img" aria-label="ITAM ecosystem overview map">' +
                        '<g class="ecosystem-map-world"></g>' +
                    '</svg>' +
                    '<aside class="ecosystem-map-legend" aria-label="Map legend">' +
                        legendHtml() +
                    '</aside>' +
                    '<div class="ecosystem-map-detail" data-map-detail hidden></div>' +
                '</div>' +
            '</div>'
        );
    }

    function nodeHtml(node, state) {
        var dims = (window.EcosystemMapLayout && window.EcosystemMapLayout.nodeDimensions(node)) ||
            { width: 104, height: 40, radius: 12 };
        var selected = state.selectedId === node.id;
        var hovered = state.hoveredId === node.id;
        var highlighted = !!state.highlightedIds[node.id];
        var expanded = !!state.expandedIds[node.id];
        var expandable = !!state.expandableIds[node.id];
        var w = dims.width;
        var h = dims.height;
        var x = -w / 2;
        var y = -h / 2;
        var stateClass =
            (selected ? ' is-selected' : '') +
            (hovered ? ' is-hovered' : '') +
            (highlighted ? ' is-highlighted' : '') +
            (expanded ? ' is-expanded' : '') +
            (expandable ? ' is-expandable' : '');
        var badge = node.badge != null ? String(node.badge) : '';
        var subtitle = '';
        if (node.type === 'metric' && badge) {
            subtitle = badge;
        } else if (node.type === 'leaf' && node.meta && node.meta.subtitle) {
            subtitle = node.meta.subtitle;
        }
        var opacity = node.opacity != null ? node.opacity : 1;

        return (
            '<g class="ecosystem-node ecosystem-node-' + escapeHtml(node.type) + stateClass +
                '" data-node-id="' + escapeHtml(node.id) +
                '" transform="translate(' + node.x + ',' + node.y +
                ')" style="opacity:' + opacity + '">' +
                '<rect class="ecosystem-node-card" x="' + x + '" y="' + y +
                    '" width="' + w + '" height="' + h + '" rx="' + dims.radius + '"></rect>' +
                '<foreignObject x="' + (x + 10) + '" y="' + (y + 8) +
                    '" width="20" height="20" pointer-events="none">' +
                    '<div class="ecosystem-node-icon" xmlns="http://www.w3.org/1999/xhtml">' +
                        '<i class="fas ' + escapeHtml(node.icon || 'fa-circle') + '"></i>' +
                    '</div>' +
                '</foreignObject>' +
                '<text class="ecosystem-node-label" x="0" y="' + (subtitle ? -2 : 4) + '">' +
                    escapeHtml(node.label) + '</text>' +
                (subtitle
                    ? '<text class="ecosystem-node-sublabel" x="0" y="14">' + escapeHtml(subtitle) + '</text>'
                    : '') +
                (expandable
                    ? '<text class="ecosystem-node-expand-hint" x="' + (w / 2 - 10) +
                        '" y="' + (-h / 2 + 13) + '">▾</text>'
                    : '') +
                '<rect class="ecosystem-node-hit" x="' + x + '" y="' + y +
                    '" width="' + w + '" height="' + h + '" rx="' + dims.radius +
                    '" fill="transparent"></rect>' +
            '</g>'
        );
    }

    function worldHtml(nodes, edges, positions, state) {
        var edgeHtml = '';
        var nodeMarkup = '';

        edges.forEach(function(edge) {
            var source = positions[edge.source];
            var target = positions[edge.target];
            if (!source || !target || source.visible === false || target.visible === false) {
                return;
            }
            var highlighted = !!state.highlightedIds[edge.source] || !!state.highlightedIds[edge.target];
            var opacity = edge.opacity != null ? edge.opacity : 1;
            edgeHtml +=
                '<g class="ecosystem-edge' + (highlighted ? ' is-highlighted' : '') +
                    '" data-edge-id="' + escapeHtml(edge.id) +
                    '" style="opacity:' + opacity + '">' +
                    '<line x1="' + source.x + '" y1="' + source.y +
                        '" x2="' + target.x + '" y2="' + target.y + '"></line>' +
                '</g>';
        });

        nodes.forEach(function(node) {
            if (node.visible === false) {
                return;
            }
            nodeMarkup += nodeHtml(node, state);
        });

        return edgeHtml + nodeMarkup;
    }

    function applyPositions(world, nodes, edges, positions) {
        if (!world) {
            return;
        }
        nodes.forEach(function(node) {
            var el = world.querySelector('[data-node-id="' + cssEscape(node.id) + '"]');
            if (!el) {
                return;
            }
            el.setAttribute('transform', 'translate(' + node.x + ',' + node.y + ')');
            el.style.opacity = node.opacity != null ? node.opacity : 1;
        });
        edges.forEach(function(edge) {
            var source = positions[edge.source];
            var target = positions[edge.target];
            var el = world.querySelector('[data-edge-id="' + cssEscape(edge.id) + '"]');
            if (!source || !target || !el) {
                return;
            }
            var line = el.querySelector('line');
            if (!line) {
                return;
            }
            line.setAttribute('x1', source.x);
            line.setAttribute('y1', source.y);
            line.setAttribute('x2', target.x);
            line.setAttribute('y2', target.y);
            el.style.opacity = edge.opacity != null ? edge.opacity : 1;
        });
    }

    function refreshNodeStates(world, state, edges) {
        if (!world) {
            return;
        }
        world.querySelectorAll('.ecosystem-node').forEach(function(el) {
            var id = el.getAttribute('data-node-id');
            el.classList.toggle('is-selected', id === state.selectedId);
            el.classList.toggle('is-hovered', id === state.hoveredId);
            el.classList.toggle('is-expanded', !!state.expandedIds[id]);
            el.classList.toggle('is-highlighted', !!state.highlightedIds[id]);
        });
        world.querySelectorAll('.ecosystem-edge').forEach(function(el) {
            var edgeId = el.getAttribute('data-edge-id');
            var edge = edges.find(function(item) { return item.id === edgeId; });
            if (!edge) {
                return;
            }
            el.classList.toggle(
                'is-highlighted',
                !!state.highlightedIds[edge.source] || !!state.highlightedIds[edge.target]
            );
        });
    }

    function detailHtml(node, expandable) {
        var meta = node.meta || {};
        var description = meta.description || meta.subtitle || '';
        var countLine = node.badge != null
            ? '<p class="ecosystem-map-detail-count"><strong>' + escapeHtml(node.badge) + '</strong> in system</p>'
            : '';
        var expandHint = expandable
            ? '<p class="ecosystem-map-detail-type">Click again to collapse expanded items.</p>'
            : '';
        return (
            '<button type="button" class="ecosystem-map-detail-close" aria-label="Close details">' +
                '<i class="fas fa-times"></i></button>' +
            '<h4>' + escapeHtml(node.label) + '</h4>' +
            (description ? '<p class="ecosystem-map-detail-type">' + escapeHtml(description) + '</p>' : '') +
            countLine +
            expandHint +
            (node.url
                ? '<a class="btn btn-secondary btn-sm" href="' + escapeHtml(node.url) + '">Open</a>'
                : '')
        );
    }

    global.EcosystemMapRender = {
        escapeHtml: escapeHtml,
        cssEscape: cssEscape,
        shellHtml: shellHtml,
        worldHtml: worldHtml,
        applyPositions: applyPositions,
        refreshNodeStates: refreshNodeStates,
        detailHtml: detailHtml
    };
})(window);
