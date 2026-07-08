/**
 * Simplified ITAM ecosystem overview map for Reports
 */
(function() {
    'use strict';

    var TYPE_DIMENSIONS = {
        hub: { width: 120, height: 52, radius: 26 },
        admin: { width: 108, height: 44, radius: 22 },
        module: { width: 118, height: 48, radius: 14 },
        metric: { width: 104, height: 40, radius: 12 }
    };

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

    function EcosystemMap(container, graph) {
        this.container = container;
        this.graph = graph || { nodes: [], edges: [], meta: {} };
        this.nodes = (this.graph.nodes || []).slice();
        this.edges = this.graph.edges || [];
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.dragging = false;
        this.dragStart = null;
        this.selectedId = null;
        this.hoveredId = null;
        this.positions = {};
        this._buildDom();
        this._layout();
        this._render();
        this._bind();
        this._watchTheme();
        this.fitToView();
    }

    EcosystemMap.prototype._watchTheme = function() {
        if (this._themeObserver) {
            return;
        }
        var self = this;
        this._themeObserver = new MutationObserver(function() {
            self._render();
        });
        this._themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme', 'class']
        });
    };

    EcosystemMap.prototype._summaryHtml = function() {
        var summary = (this.graph.meta && this.graph.meta.summary) || [];
        if (!summary.length) {
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
    };

    EcosystemMap.prototype._buildDom = function() {
        var meta = this.graph.meta || {};
        this.container.innerHTML =
            '<div class="ecosystem-map-shell">' +
                '<div class="ecosystem-map-toolbar">' +
                    '<div class="ecosystem-map-toolbar-left">' +
                        '<div class="ecosystem-map-title-block">' +
                            '<h4>' + escapeHtml(meta.base_label || 'ITAM Overview') + '</h4>' +
                            '<p>How modules connect to live inventory metrics</p>' +
                        '</div>' +
                        this._summaryHtml() +
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
                        this._legendHtml() +
                    '</aside>' +
                    '<div class="ecosystem-map-detail" data-map-detail hidden></div>' +
                '</div>' +
            '</div>';

        this.stage = this.container.querySelector('[data-map-stage]');
        this.world = this.container.querySelector('.ecosystem-map-world');
        this.detail = this.container.querySelector('[data-map-detail]');
        this.zoomLabel = this.container.querySelector('[data-map-zoom]');
    };

    EcosystemMap.prototype._legendHtml = function() {
        var items = [
            ['hub', 'Platform'],
            ['module', 'Modules'],
            ['metric', 'Live metrics']
        ];
        return '<h4>Legend</h4><ul>' + items.map(function(item) {
            return '<li><span class="ecosystem-legend-swatch ecosystem-legend-swatch--' + escapeHtml(item[0]) + '"></span>' + escapeHtml(item[1]) + '</li>';
        }).join('') + '</ul>';
    };

    EcosystemMap.prototype._layout = function() {
        var centerX = 560;
        var centerY = 320;
        var layerNodes = { 0: [], 1: [], 2: [] };

        this.nodes.forEach(function(node) {
            var layer = node.layer || 0;
            if (!layerNodes[layer]) {
                layerNodes[layer] = [];
            }
            layerNodes[layer].push(node);
        });

        Object.keys(layerNodes).forEach(function(layerKey) {
            layerNodes[layerKey].sort(function(a, b) {
                return (a.order || 0) - (b.order || 0);
            });
        });

        var hubNodes = layerNodes[0] || [];
        hubNodes.forEach(function(node, index) {
            if (hubNodes.length === 1) {
                node.x = centerX;
                node.y = centerY;
            } else {
                node.x = centerX + (index === 0 ? -70 : 70);
                node.y = centerY - 10;
            }
        });

        var modules = layerNodes[1] || [];
        var moduleRadius = 175;
        modules.forEach(function(node, index) {
            var angle = (-Math.PI / 2) + (index / Math.max(modules.length, 1)) * Math.PI * 1.35;
            node.x = centerX + Math.cos(angle) * moduleRadius;
            node.y = centerY + Math.sin(angle) * moduleRadius;
        });

        var metrics = layerNodes[2] || [];
        var metricRadius = 300;
        metrics.forEach(function(node, index) {
            var angle = (-Math.PI / 2) + (index / Math.max(metrics.length, 1)) * Math.PI * 1.6;
            node.x = centerX + Math.cos(angle) * metricRadius;
            node.y = centerY + Math.sin(angle) * metricRadius;
        });

        this.nodes.forEach(function(node) {
            this.positions[node.id] = node;
            node.visible = true;
        }, this);
    };

    EcosystemMap.prototype._nodeById = function(id) {
        return this.positions[id];
    };

    EcosystemMap.prototype._nodeDimensions = function(node) {
        return TYPE_DIMENSIONS[node.type] || TYPE_DIMENSIONS.metric;
    };

    EcosystemMap.prototype._renderNode = function(node) {
        var dims = this._nodeDimensions(node);
        var selected = this.selectedId === node.id;
        var hovered = this.hoveredId === node.id;
        var highlighted = this._isHighlighted(node.id);
        var w = dims.width;
        var h = dims.height;
        var x = -w / 2;
        var y = -h / 2;
        var stateClass = (selected ? ' is-selected' : '') + (hovered ? ' is-hovered' : '') + (highlighted ? ' is-highlighted' : '');
        var badge = node.badge != null ? String(node.badge) : '';
        var subtitle = node.type === 'metric' && badge ? badge : '';

        return (
            '<g class="ecosystem-node ecosystem-node-' + escapeHtml(node.type) + stateClass + '" data-node-id="' + escapeHtml(node.id) + '" transform="translate(' + node.x + ',' + node.y + ')">' +
                '<rect class="ecosystem-node-card" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + dims.radius + '"></rect>' +
                '<foreignObject x="' + (x + 10) + '" y="' + (y + 10) + '" width="20" height="20">' +
                    '<div class="ecosystem-node-icon"><i class="fas ' + escapeHtml(node.icon || 'fa-circle') + '"></i></div>' +
                '</foreignObject>' +
                '<text class="ecosystem-node-label" x="0" y="' + (subtitle ? -2 : 4) + '">' + escapeHtml(node.label) + '</text>' +
                (subtitle ? '<text class="ecosystem-node-sublabel" x="0" y="14">' + escapeHtml(subtitle) + '</text>' : '') +
            '</g>'
        );
    };

    EcosystemMap.prototype._render = function() {
        var self = this;
        var edgeHtml = '';
        var nodeHtml = '';

        this.edges.forEach(function(edge) {
            var source = self.positions[edge.source];
            var target = self.positions[edge.target];
            if (!source || !target || !source.visible || !target.visible) {
                return;
            }
            var highlighted = self._isHighlighted(edge.source) || self._isHighlighted(edge.target);
            edgeHtml +=
                '<g class="ecosystem-edge' + (highlighted ? ' is-highlighted' : '') + '">' +
                    '<line x1="' + source.x + '" y1="' + source.y + '" x2="' + target.x + '" y2="' + target.y + '"></line>' +
                '</g>';
        });

        this.nodes.forEach(function(node) {
            if (!node.visible) {
                return;
            }
            nodeHtml += self._renderNode(node);
        });

        this.world.innerHTML = edgeHtml + nodeHtml;
        this._updateTransform();
    };

    EcosystemMap.prototype._isHighlighted = function(nodeId) {
        if (!this.hoveredId && !this.selectedId) {
            return false;
        }
        var focus = this.hoveredId || this.selectedId;
        if (focus === nodeId) {
            return true;
        }
        return this.edges.some(function(edge) {
            return (edge.source === focus && edge.target === nodeId) ||
                (edge.target === focus && edge.source === nodeId);
        });
    };

    EcosystemMap.prototype._updateTransform = function() {
        this.world.setAttribute('transform', 'translate(' + this.panX + ',' + this.panY + ') scale(' + this.scale + ')');
        if (this.zoomLabel) {
            this.zoomLabel.textContent = Math.round(this.scale * 100) + '%';
        }
    };

    EcosystemMap.prototype._zoomAt = function(clientX, clientY, scaleFactor) {
        if (!this.stage) {
            return;
        }
        var rect = this.stage.getBoundingClientRect();
        var mx = clientX - rect.left;
        var my = clientY - rect.top;
        var worldX = (mx - this.panX) / this.scale;
        var worldY = (my - this.panY) / this.scale;
        var newScale = Math.max(0.35, Math.min(1.6, this.scale * scaleFactor));
        if (newScale === this.scale) {
            return;
        }
        this.panX = mx - worldX * newScale;
        this.panY = my - worldY * newScale;
        this.scale = newScale;
        this._updateTransform();
    };

    EcosystemMap.prototype.fitToView = function() {
        var visible = this.nodes.filter(function(node) { return node.visible !== false; });
        if (!visible.length || !this.stage) {
            this.scale = 1;
            this.panX = 40;
            this.panY = 40;
            this._updateTransform();
            return;
        }
        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;
        visible.forEach(function(node) {
            minX = Math.min(minX, node.x - 80);
            minY = Math.min(minY, node.y - 40);
            maxX = Math.max(maxX, node.x + 80);
            maxY = Math.max(maxY, node.y + 40);
        });
        var stageRect = this.stage.getBoundingClientRect();
        var graphWidth = Math.max(maxX - minX, 1);
        var graphHeight = Math.max(maxY - minY, 1);
        var padding = 48;
        var scaleX = (stageRect.width - padding * 2) / graphWidth;
        var scaleY = (stageRect.height - padding * 2) / graphHeight;
        this.scale = Math.max(0.45, Math.min(1.1, Math.min(scaleX, scaleY)));
        this.panX = (stageRect.width - graphWidth * this.scale) / 2 - minX * this.scale;
        this.panY = (stageRect.height - graphHeight * this.scale) / 2 - minY * this.scale;
        this._updateTransform();
    };

    EcosystemMap.prototype._showDetail = function(node) {
        if (!this.detail || !node) {
            return;
        }
        var meta = node.meta || {};
        var description = meta.description || '';
        var countLine = node.badge != null ? '<p class="ecosystem-map-detail-count"><strong>' + escapeHtml(node.badge) + '</strong> in system</p>' : '';
        this.detail.hidden = false;
        this.detail.innerHTML =
            '<button type="button" class="ecosystem-map-detail-close" aria-label="Close details"><i class="fas fa-times"></i></button>' +
            '<h4>' + escapeHtml(node.label) + '</h4>' +
            (description ? '<p class="ecosystem-map-detail-type">' + escapeHtml(description) + '</p>' : '') +
            countLine +
            (node.url ? '<a class="btn btn-secondary btn-sm" href="' + escapeHtml(node.url) + '">Open</a>' : '');
        var closeBtn = this.detail.querySelector('.ecosystem-map-detail-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                this.detail.hidden = true;
                this.selectedId = null;
                this._render();
            }.bind(this));
        }
    };

    EcosystemMap.prototype._bind = function() {
        var self = this;

        this.container.querySelectorAll('[data-map-action]').forEach(function(button) {
            button.addEventListener('click', function() {
                var action = button.getAttribute('data-map-action');
                if (action === 'zoom-in' || action === 'zoom-out') {
                    var rect = self.stage.getBoundingClientRect();
                    var cx = rect.left + rect.width / 2;
                    var cy = rect.top + rect.height / 2;
                    var factor = action === 'zoom-in' ? 1.12 : 1 / 1.12;
                    self._zoomAt(cx, cy, factor);
                } else if (action === 'fit') {
                    self.fitToView();
                }
            });
        });

        this.stage.addEventListener('wheel', function(event) {
            event.preventDefault();
            var factor = event.deltaY > 0 ? 0.92 : 1.08;
            self._zoomAt(event.clientX, event.clientY, factor);
        }, { passive: false });

        this.stage.addEventListener('mousedown', function(event) {
            if (event.target.closest('.ecosystem-node')) {
                return;
            }
            self.dragging = true;
            self.dragStart = { x: event.clientX - self.panX, y: event.clientY - self.panY };
        });

        window.addEventListener('mousemove', function(event) {
            if (!self.dragging || !self.dragStart) {
                return;
            }
            self.panX = event.clientX - self.dragStart.x;
            self.panY = event.clientY - self.dragStart.y;
            self._updateTransform();
        });

        window.addEventListener('mouseup', function() {
            self.dragging = false;
            self.dragStart = null;
        });

        this.world.addEventListener('mouseover', function(event) {
            var nodeEl = event.target.closest('.ecosystem-node');
            self.hoveredId = nodeEl ? nodeEl.getAttribute('data-node-id') : null;
            self._render();
        });

        this.world.addEventListener('mouseleave', function() {
            self.hoveredId = null;
            self._render();
        });

        this.world.addEventListener('click', function(event) {
            var nodeEl = event.target.closest('.ecosystem-node');
            if (!nodeEl) {
                self.selectedId = null;
                if (self.detail) {
                    self.detail.hidden = true;
                }
                self._render();
                return;
            }
            event.stopPropagation();
            var nodeId = nodeEl.getAttribute('data-node-id');
            var node = self._nodeById(nodeId);
            if (!node) {
                return;
            }
            self.selectedId = nodeId;
            self._showDetail(node);
            self._render();
        });

        this.world.addEventListener('dblclick', function(event) {
            var nodeEl = event.target.closest('.ecosystem-node');
            if (!nodeEl) {
                return;
            }
            var node = self._nodeById(nodeEl.getAttribute('data-node-id'));
            if (node && node.url) {
                window.location.href = node.url;
            }
        });
    };

    var activeMap = null;

    function init(containerId, graph) {
        var container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;
        if (!container || !graph || !graph.nodes || !graph.nodes.length) {
            return null;
        }
        if (activeMap && activeMap.container === container) {
            activeMap.graph = graph;
            activeMap.nodes = (graph.nodes || []).slice();
            activeMap.edges = graph.edges || [];
            activeMap._layout();
            activeMap._render();
            activeMap.fitToView();
            return activeMap;
        }
        activeMap = new EcosystemMap(container, graph);
        return activeMap;
    }

    window.ReportEcosystemMap = {
        init: init,
        destroy: function() {
            activeMap = null;
        }
    };
})();
