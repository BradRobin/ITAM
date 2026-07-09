/**
 * Ecosystem map layout helpers (ring base + outward fan expansions).
 */
(function(global) {
    'use strict';

    var TYPE_DIMENSIONS = {
        hub: { width: 120, height: 52, radius: 26 },
        admin: { width: 108, height: 44, radius: 22 },
        module: { width: 118, height: 48, radius: 14 },
        metric: { width: 104, height: 40, radius: 12 },
        leaf: { width: 96, height: 36, radius: 10 }
    };

    var MAP_CENTER = { x: 620, y: 320 };
    var MODULE_RING_RADIUS = 250;
    var METRIC_RING_RADIUS = 390;
    var ADMIN_RING_RADIUS = 150;
    var EXPANSION_RADIUS = 150;
    var EXPANSION_ARC_STEP = 0.22;

    function nodeDimensions(node) {
        return TYPE_DIMENSIONS[(node && node.type) || 'metric'] || TYPE_DIMENSIONS.metric;
    }

    function placeOnRing(nodes, centerX, centerY, radius, startAngle) {
        var count = nodes.length;
        nodes.forEach(function(node, index) {
            var angle = startAngle + ((index / Math.max(count, 1)) * Math.PI * 2);
            node.x = centerX + Math.cos(angle) * radius;
            node.y = centerY + Math.sin(angle) * radius;
        });
    }

    function layoutBaseNodes(nodes, positions) {
        var centerX = MAP_CENTER.x;
        var centerY = MAP_CENTER.y;
        var byLayer = { 0: [], 1: [], 2: [] };

        nodes.forEach(function(node) {
            var layer = node.layer || 0;
            if (!byLayer[layer]) {
                byLayer[layer] = [];
            }
            byLayer[layer].push(node);
        });

        Object.keys(byLayer).forEach(function(key) {
            byLayer[key].sort(function(a, b) {
                return (a.order || 0) - (b.order || 0);
            });
        });

        var hubNodes = byLayer[0] || [];
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

        placeOnRing(byLayer[1] || [], centerX, centerY, MODULE_RING_RADIUS, -Math.PI / 2);
        placeOnRing(byLayer[2] || [], centerX, centerY, METRIC_RING_RADIUS, -Math.PI / 2);

        nodes.forEach(function(node) {
            positions[node.id] = node;
            node.visible = true;
            node.opacity = 1;
        });
    }

    /**
     * Place children on a simple outward fan from the parent — no collision search.
     */
    function expansionTargets(parent, children) {
        var outward = Math.atan2(parent.y - MAP_CENTER.y, parent.x - MAP_CENTER.x);
        var count = children.length;
        var spread = Math.min(Math.PI * 1.2, Math.max(0.8, (count - 1) * EXPANSION_ARC_STEP));

        return children.map(function(child, index) {
            var angle = count === 1
                ? outward
                : outward - spread / 2 + (index / Math.max(count - 1, 1)) * spread;
            return {
                child: child,
                x: parent.x + Math.cos(angle) * EXPANSION_RADIUS,
                y: parent.y + Math.sin(angle) * EXPANSION_RADIUS
            };
        });
    }

    global.EcosystemMapLayout = {
        TYPE_DIMENSIONS: TYPE_DIMENSIONS,
        MAP_CENTER: MAP_CENTER,
        nodeDimensions: nodeDimensions,
        layoutBaseNodes: layoutBaseNodes,
        expansionTargets: expansionTargets
    };
})(window);
