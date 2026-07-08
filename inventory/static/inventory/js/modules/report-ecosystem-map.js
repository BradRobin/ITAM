/**
 * Simplified ITAM ecosystem overview map for Reports
 */
(function() {
    'use strict';

    var TYPE_DIMENSIONS = {
        hub: { width: 120, height: 52, radius: 26 },
        admin: { width: 108, height: 44, radius: 22 },
        module: { width: 118, height: 48, radius: 14 },
        metric: { width: 104, height: 40, radius: 12 },
        leaf: { width: 96, height: 36, radius: 10 }
    };

    var ANIMATION_MS = 420;
    var MAP_CENTER = { x: 620, y: 320 };
    var MODULE_RING_RADIUS = 250;
    var METRIC_RING_RADIUS = 390;
    var ADMIN_RING_RADIUS = 150;
    var EXPANSION_BASE_RADIUS = 145;
    var EXPANSION_RADIUS_STEP = 72;
    var COLLISION_GAP = 26;

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

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === 'function') {
            return window.CSS.escape(String(value));
        }
        return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    function EcosystemMap(container, graph) {
        this.container = container;
        this.graph = graph || { nodes: [], edges: [], expansions: {}, meta: {} };
        this.nodes = (this.graph.nodes || []).slice();
        this.edges = this.graph.edges || [];
        this.expansions = this.graph.expansions || {};
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.dragging = false;
        this.dragStart = null;
        this.selectedId = null;
        this.hoveredId = null;
        this.expandedIds = {};
        this.dynamicNodes = [];
        this.dynamicEdges = [];
        this.positions = {};
        this._animFrame = null;
        this.nodeDrag = null;
        this.panDrag = null;
        this.suppressClick = false;
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
            if (!self._animFrame) {
                self._render();
            }
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
                            '<p>Click modules or metrics to expand details</p>' +
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
            ['metric', 'Live metrics'],
            ['leaf', 'Expanded items']
        ];
        return '<h4>Legend</h4><ul>' + items.map(function(item) {
            return '<li><span class="ecosystem-legend-swatch ecosystem-legend-swatch--' + escapeHtml(item[0]) + '"></span>' + escapeHtml(item[1]) + '</li>';
        }).join('') + '</ul>';
    };

    EcosystemMap.prototype._nodeEl = function(nodeId) {
        if (!this.world || !nodeId) {
            return null;
        }
        return this.world.querySelector('[data-node-id="' + cssEscape(nodeId) + '"]');
    };

    EcosystemMap.prototype._edgeEl = function(edgeId) {
        if (!this.world || !edgeId) {
            return null;
        }
        return this.world.querySelector('[data-edge-id="' + cssEscape(edgeId) + '"]');
    };

    EcosystemMap.prototype._resolveNodeEl = function(event) {
        if (!event || !event.target) {
            return null;
        }
        var nodeEl = event.target.closest('.ecosystem-node');
        if (nodeEl && this.world && this.world.contains(nodeEl)) {
            return nodeEl;
        }
        return null;
    };

    EcosystemMap.prototype._refreshNodeStates = function() {
        var self = this;
        if (!this.world) {
            return;
        }
        this.world.querySelectorAll('.ecosystem-node').forEach(function(el) {
            var id = el.getAttribute('data-node-id');
            el.classList.toggle('is-selected', id === self.selectedId);
            el.classList.toggle('is-hovered', id === self.hoveredId);
            el.classList.toggle('is-expanded', !!self.expandedIds[id]);
            el.classList.toggle('is-highlighted', self._isHighlighted(id));
        });
        this.world.querySelectorAll('.ecosystem-edge').forEach(function(el) {
            var edgeId = el.getAttribute('data-edge-id');
            var edge = self._allEdges().find(function(item) { return item.id === edgeId; });
            if (!edge) {
                return;
            }
            el.classList.toggle(
                'is-highlighted',
                self._isHighlighted(edge.source) || self._isHighlighted(edge.target)
            );
        });
    };

    EcosystemMap.prototype._layout = function() {
        var centerX = MAP_CENTER.x;
        var centerY = MAP_CENTER.y;
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
        var itamHub = null;
        var admins = [];
        hubNodes.forEach(function(node) {
            if (node.type === 'hub' && !itamHub) {
                itamHub = node;
            } else {
                admins.push(node);
            }
        });
        if (!itamHub && hubNodes.length) {
            itamHub = hubNodes[0];
            admins = hubNodes.slice(1);
        }
        if (itamHub) {
            itamHub.x = centerX;
            itamHub.y = centerY;
        }
        admins.forEach(function(node, index) {
            var angle = -Math.PI / 2 + (index * (Math.PI / 3));
            node.x = centerX + Math.cos(angle) * ADMIN_RING_RADIUS;
            node.y = centerY + Math.sin(angle) * ADMIN_RING_RADIUS;
        });

        var modules = layerNodes[1] || [];
        modules.forEach(function(node, index) {
            var angle = (-Math.PI / 2) + ((index / Math.max(modules.length, 1)) * Math.PI * 2);
            node.x = centerX + Math.cos(angle) * MODULE_RING_RADIUS;
            node.y = centerY + Math.sin(angle) * MODULE_RING_RADIUS;
        });

        var metrics = layerNodes[2] || [];
        metrics.forEach(function(node, index) {
            var angle = (-Math.PI / 2) + ((index / Math.max(metrics.length, 1)) * Math.PI * 2);
            node.x = centerX + Math.cos(angle) * METRIC_RING_RADIUS;
            node.y = centerY + Math.sin(angle) * METRIC_RING_RADIUS;
        });

        this.nodes.forEach(function(node) {
            this.positions[node.id] = node;
            node.visible = true;
            node.opacity = 1;
        }, this);

        this.dynamicNodes.forEach(function(node) {
            this.positions[node.id] = node;
        }, this);
    };

    EcosystemMap.prototype._allNodes = function() {
        return this.nodes.concat(this.dynamicNodes);
    };

    EcosystemMap.prototype._allEdges = function() {
        return this.edges.concat(this.dynamicEdges);
    };

    EcosystemMap.prototype._nodeById = function(id) {
        return this.positions[id];
    };

    EcosystemMap.prototype._isExpandable = function(node) {
        if (!node) {
            return false;
        }
        var children = this.expansions[node.id];
        return !!(children && children.length && (node.meta || {}).expandable !== false);
    };

    EcosystemMap.prototype._nodeDimensions = function(node) {
        return TYPE_DIMENSIONS[node.type] || TYPE_DIMENSIONS.metric;
    };

    EcosystemMap.prototype._nodeRadius = function(node) {
        var dims = this._nodeDimensions(node);
        return Math.sqrt(Math.pow(dims.width / 2, 2) + Math.pow(dims.height / 2, 2));
    };

    EcosystemMap.prototype._collidesWithOccupied = function(candidate, occupied, candidateRadius) {
        return occupied.some(function(item) {
            var min = item.r + candidateRadius + COLLISION_GAP;
            var dx = candidate.x - item.x;
            var dy = candidate.y - item.y;
            return (dx * dx + dy * dy) < (min * min);
        });
    };

    EcosystemMap.prototype._findOpenTarget = function(parent, preferredAngle, occupied, candidateRadius) {
        for (var ring = 0; ring < 9; ring += 1) {
            var radius = EXPANSION_BASE_RADIUS + ring * EXPANSION_RADIUS_STEP;
            var steps = 1 + ring * 2;
            for (var i = -steps; i <= steps; i += 1) {
                var angle = preferredAngle + i * 0.19;
                var candidate = {
                    x: parent.x + Math.cos(angle) * radius,
                    y: parent.y + Math.sin(angle) * radius
                };
                if (!this._collidesWithOccupied(candidate, occupied, candidateRadius)) {
                    return candidate;
                }
            }
        }
        return {
            x: parent.x + Math.cos(preferredAngle) * (EXPANSION_BASE_RADIUS + 6 * EXPANSION_RADIUS_STEP),
            y: parent.y + Math.sin(preferredAngle) * (EXPANSION_BASE_RADIUS + 6 * EXPANSION_RADIUS_STEP)
        };
    };

    EcosystemMap.prototype._expansionTargets = function(parent, children) {
        var dx = parent.x - MAP_CENTER.x;
        var dy = parent.y - MAP_CENTER.y;
        var outward = Math.atan2(dy, dx);
        var count = children.length;
        var spread = Math.min(Math.PI * 1.25, Math.max(0.9, count * 0.2));
        var leafRadius = this._nodeRadius({ type: 'leaf' });
        var occupied = this._allNodes()
            .filter(function(node) { return node.id !== parent.id; })
            .map(function(node) {
                return { x: node.x, y: node.y, r: this._nodeRadius(node) };
            }, this);

        return children.map(function(child, index) {
            var angle = count === 1
                ? outward
                : outward - spread / 2 + (index / Math.max(count - 1, 1)) * spread;
            var candidate = this._findOpenTarget(parent, angle, occupied, leafRadius);
            occupied.push({ x: candidate.x, y: candidate.y, r: leafRadius });
            return {
                child: child,
                x: candidate.x,
                y: candidate.y
            };
        }, this);
    };

    EcosystemMap.prototype._toggleExpand = function(nodeId) {
        if (this.expandedIds[nodeId]) {
            this._collapseNode(nodeId);
            return;
        }
        this._expandNode(nodeId);
    };

    EcosystemMap.prototype._expandNode = function(parentId) {
        var parent = this._nodeById(parentId);
        var children = this.expansions[parentId];
        if (!parent || !children || !children.length) {
            return;
        }

        Object.keys(this.expandedIds).forEach(function(id) {
            if (id !== parentId) {
                this._collapseNode(id);
            }
        }, this);
        this.expandedIds[parentId] = true;
        var targets = this._expansionTargets(parent, children);
        var self = this;

        targets.forEach(function(target) {
            var child = target.child;
            var leafId = parentId + '::' + child.id;
            var node = {
                id: leafId,
                label: child.label,
                type: 'leaf',
                icon: child.icon || 'fa-circle',
                url: child.url || '',
                meta: child.meta || {},
                parentId: parentId,
                layer: 3,
                x: parent.x,
                y: parent.y,
                targetX: target.x,
                targetY: target.y,
                visible: true,
                opacity: 0.01
            };
            self.dynamicNodes.push(node);
            self.positions[leafId] = node;
            self.dynamicEdges.push({
                id: parentId + '->' + leafId,
                source: parentId,
                target: leafId,
                opacity: 0.01
            });
        });

        this._render();
        this._animateExpansion(parentId, true);
    };

    EcosystemMap.prototype._collapseNode = function(parentId) {
        var parent = this._nodeById(parentId);
        if (!parent) {
            return;
        }

        delete this.expandedIds[parentId];

        var collapsing = this.dynamicNodes.filter(function(node) {
            return node.parentId === parentId;
        });
        if (!collapsing.length) {
            return;
        }

        var self = this;
        collapsing.forEach(function(node) {
            node.targetX = parent.x;
            node.targetY = parent.y;
            node.opacity = 1;
        });

        this._animateExpansion(parentId, false, function() {
            self.dynamicNodes = self.dynamicNodes.filter(function(node) {
                return node.parentId !== parentId;
            });
            self.dynamicEdges = self.dynamicEdges.filter(function(edge) {
                return edge.source !== parentId;
            });
            collapsing.forEach(function(node) {
                delete self.positions[node.id];
            });
            self._render();
        });
    };

    EcosystemMap.prototype._animateExpansion = function(parentId, expanding, onComplete) {
        var self = this;
        var nodes = this.dynamicNodes.filter(function(node) {
            return node.parentId === parentId;
        });
        var edges = this.dynamicEdges.filter(function(edge) {
            return edge.source === parentId;
        });
        var start = null;

        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }

        function frame(timestamp) {
            if (!start) {
                start = timestamp;
                nodes.forEach(function(node) {
                    node._animFromX = node.x;
                    node._animFromY = node.y;
                });
            }
            var progress = Math.min(1, (timestamp - start) / ANIMATION_MS);
            var eased = easeOutCubic(progress);

            nodes.forEach(function(node) {
                var fromX = node._animFromX;
                var fromY = node._animFromY;
                node.x = fromX + (node.targetX - fromX) * eased;
                node.y = fromY + (node.targetY - fromY) * eased;
                node.opacity = expanding ? eased : 1 - eased;
            });

            edges.forEach(function(edge) {
                edge.opacity = expanding ? eased : 1 - eased;
            });

            self._applyPositions();
            self._refreshNodeStates();

            if (progress < 1) {
                self._animFrame = requestAnimationFrame(frame);
                return;
            }

            self._animFrame = null;
            nodes.forEach(function(node) {
                node.x = node.targetX;
                node.y = node.targetY;
                node.opacity = expanding ? 1 : 0;
                delete node._animFromX;
                delete node._animFromY;
            });
            edges.forEach(function(edge) {
                edge.opacity = expanding ? 1 : 0;
            });
            self._applyPositions();
            self._refreshNodeStates();
            if (typeof onComplete === 'function') {
                onComplete();
            }
        }

        this._animFrame = requestAnimationFrame(frame);
    };

    EcosystemMap.prototype._renderNode = function(node) {
        var dims = this._nodeDimensions(node);
        var selected = this.selectedId === node.id;
        var hovered = this.hoveredId === node.id;
        var highlighted = this._isHighlighted(node.id);
        var expanded = !!this.expandedIds[node.id];
        var expandable = this._isExpandable(node);
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
            '<g class="ecosystem-node ecosystem-node-' + escapeHtml(node.type) + stateClass + '" data-node-id="' + escapeHtml(node.id) + '" transform="translate(' + node.x + ',' + node.y + ')" style="opacity:' + opacity + '">' +
                '<rect class="ecosystem-node-card" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + dims.radius + '"></rect>' +
                '<foreignObject x="' + (x + 10) + '" y="' + (y + 8) + '" width="20" height="20" pointer-events="none">' +
                    '<div class="ecosystem-node-icon" xmlns="http://www.w3.org/1999/xhtml"><i class="fas ' + escapeHtml(node.icon || 'fa-circle') + '"></i></div>' +
                '</foreignObject>' +
                '<text class="ecosystem-node-label" x="0" y="' + (subtitle ? -2 : 4) + '">' + escapeHtml(node.label) + '</text>' +
                (subtitle ? '<text class="ecosystem-node-sublabel" x="0" y="14">' + escapeHtml(subtitle) + '</text>' : '') +
                (expandable ? '<text class="ecosystem-node-expand-hint" x="' + (w / 2 - 10) + '" y="' + (-h / 2 + 13) + '">▾</text>' : '') +
                '<rect class="ecosystem-node-hit" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + dims.radius + '" fill="transparent"></rect>' +
            '</g>'
        );
    };

    EcosystemMap.prototype._render = function() {
        var self = this;
        var edgeHtml = '';
        var nodeHtml = '';

        this._allEdges().forEach(function(edge) {
            var source = self.positions[edge.source];
            var target = self.positions[edge.target];
            if (!source || !target || source.visible === false || target.visible === false) {
                return;
            }
            var highlighted = self._isHighlighted(edge.source) || self._isHighlighted(edge.target);
            var opacity = edge.opacity != null ? edge.opacity : 1;
            edgeHtml +=
                '<g class="ecosystem-edge' + (highlighted ? ' is-highlighted' : '') + '" data-edge-id="' + escapeHtml(edge.id) + '" style="opacity:' + opacity + '">' +
                    '<line x1="' + source.x + '" y1="' + source.y + '" x2="' + target.x + '" y2="' + target.y + '"></line>' +
                '</g>';
        });

        this._allNodes().forEach(function(node) {
            if (node.visible === false) {
                return;
            }
            nodeHtml += self._renderNode(node);
        });

        this.world.innerHTML = edgeHtml + nodeHtml;
        this._updateTransform();
        this._refreshNodeStates();
    };

    EcosystemMap.prototype._applyPositions = function() {
        var self = this;

        this._allNodes().forEach(function(node) {
            var el = self._nodeEl(node.id);
            if (!el) {
                return;
            }
            el.setAttribute('transform', 'translate(' + node.x + ',' + node.y + ')');
            el.style.opacity = node.opacity != null ? node.opacity : 1;
        });

        this._allEdges().forEach(function(edge) {
            var source = self.positions[edge.source];
            var target = self.positions[edge.target];
            var el = self._edgeEl(edge.id);
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
    };

    EcosystemMap.prototype._isHighlighted = function(nodeId) {
        if (!this.hoveredId && !this.selectedId) {
            return false;
        }
        var focus = this.hoveredId || this.selectedId;
        if (focus === nodeId) {
            return true;
        }
        var focusNode = this._nodeById(focus);
        if (focusNode && focusNode.parentId === nodeId) {
            return true;
        }
        if (this.expandedIds[nodeId] && focusNode && focusNode.parentId === nodeId) {
            return true;
        }
        return this._allEdges().some(function(edge) {
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
        var visible = this._allNodes().filter(function(node) { return node.visible !== false; });
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
        this.scale = Math.max(0.35, Math.min(1.1, Math.min(scaleX, scaleY)));
        this.panX = (stageRect.width - graphWidth * this.scale) / 2 - minX * this.scale;
        this.panY = (stageRect.height - graphHeight * this.scale) / 2 - minY * this.scale;
        this._updateTransform();
    };

    EcosystemMap.prototype._showDetail = function(node) {
        if (!this.detail || !node) {
            return;
        }
        var meta = node.meta || {};
        var description = meta.description || meta.subtitle || '';
        var countLine = node.badge != null
            ? '<p class="ecosystem-map-detail-count"><strong>' + escapeHtml(node.badge) + '</strong> in system</p>'
            : '';
        var expandHint = this._isExpandable(node)
            ? '<p class="ecosystem-map-detail-type">Click again to collapse expanded items.</p>'
            : '';
        this.detail.hidden = false;
        this.detail.innerHTML =
            '<button type="button" class="ecosystem-map-detail-close" aria-label="Close details"><i class="fas fa-times"></i></button>' +
            '<h4>' + escapeHtml(node.label) + '</h4>' +
            (description ? '<p class="ecosystem-map-detail-type">' + escapeHtml(description) + '</p>' : '') +
            countLine +
            expandHint +
            (node.url ? '<a class="btn btn-secondary btn-sm" href="' + escapeHtml(node.url) + '">Open</a>' : '');
        var closeBtn = this.detail.querySelector('.ecosystem-map-detail-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                this.detail.hidden = true;
                this.selectedId = null;
                this._refreshNodeStates();
            }.bind(this));
        }
    };

    EcosystemMap.prototype._handleNodeClick = function(nodeId) {
        var node = this._nodeById(nodeId);
        if (!node) {
            return;
        }

        this.selectedId = nodeId;

        if (this._isExpandable(node)) {
            this._toggleExpand(nodeId);
        }

        this._showDetail(node);
        this._refreshNodeStates();
    };

    EcosystemMap.prototype._isNodeDraggable = function(node) {
        return !!node && (node.type === 'module' || node.type === 'metric' || node.type === 'leaf');
    };

    EcosystemMap.prototype._nodeDragIds = function(node) {
        var ids = [node.id];
        if (this.expandedIds[node.id]) {
            this.dynamicNodes.forEach(function(child) {
                if (child.parentId === node.id) {
                    ids.push(child.id);
                }
            });
        }
        return ids;
    };

    EcosystemMap.prototype._startNodeDrag = function(event, node) {
        var self = this;
        var ids = this._nodeDragIds(node);
        this.nodeDrag = {
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
            ids: ids,
            initial: ids.reduce(function(acc, id) {
                var current = self._nodeById(id);
                if (current) {
                    acc[id] = { x: current.x, y: current.y };
                }
                return acc;
            }, {})
        };
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
            if (event.button !== 0) {
                return;
            }
            var nodeEl = self._resolveNodeEl(event);
            if (nodeEl) {
                var node = self._nodeById(nodeEl.getAttribute('data-node-id'));
                if (self._isNodeDraggable(node)) {
                    self._startNodeDrag(event, node);
                    event.preventDefault();
                }
                return;
            }
            self.dragging = true;
            self.dragStart = { x: event.clientX - self.panX, y: event.clientY - self.panY };
        });

        window.addEventListener('mousemove', function(event) {
            if (self.nodeDrag) {
                var dx = (event.clientX - self.nodeDrag.startX) / self.scale;
                var dy = (event.clientY - self.nodeDrag.startY) / self.scale;
                if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                    self.nodeDrag.moved = true;
                }
                self.nodeDrag.ids.forEach(function(id) {
                    var node = self._nodeById(id);
                    var startPos = self.nodeDrag.initial[id];
                    if (!node || !startPos) {
                        return;
                    }
                    node.x = startPos.x + dx;
                    node.y = startPos.y + dy;
                });
                self._applyPositions();
                return;
            }
            if (!self.dragging || !self.dragStart) {
                return;
            }
            self.panX = event.clientX - self.dragStart.x;
            self.panY = event.clientY - self.dragStart.y;
            self._updateTransform();
        });

        window.addEventListener('mouseup', function() {
            if (self.nodeDrag) {
                self.suppressClick = self.nodeDrag.moved;
                self.nodeDrag = null;
                setTimeout(function() {
                    self.suppressClick = false;
                }, 0);
            }
            self.dragging = false;
            self.dragStart = null;
        });

        this.stage.addEventListener('mousemove', function(event) {
            if (self._animFrame || self.dragging) {
                return;
            }
            var nodeEl = self._resolveNodeEl(event);
            var nextId = nodeEl ? nodeEl.getAttribute('data-node-id') : null;
            if (nextId === self.hoveredId) {
                return;
            }
            self.hoveredId = nextId;
            self._refreshNodeStates();
        });

        this.stage.addEventListener('mouseleave', function() {
            if (self._animFrame) {
                return;
            }
            self.hoveredId = null;
            self._refreshNodeStates();
        });

        this.stage.addEventListener('click', function(event) {
            if (event.target.closest('.ecosystem-map-detail')) {
                return;
            }
            if (self.suppressClick) {
                return;
            }
            var nodeEl = self._resolveNodeEl(event);
            if (!nodeEl) {
                self.selectedId = null;
                if (self.detail) {
                    self.detail.hidden = true;
                }
                self._refreshNodeStates();
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            self._handleNodeClick(nodeEl.getAttribute('data-node-id'));
        });

        this.stage.addEventListener('dblclick', function(event) {
            if (self.suppressClick) {
                return;
            }
            var nodeEl = self._resolveNodeEl(event);
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
            activeMap.expansions = graph.expansions || {};
            activeMap.expandedIds = {};
            activeMap.dynamicNodes = [];
            activeMap.dynamicEdges = [];
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
