/**
 * Pointer gesture state machine for the reports ecosystem map.
 */
(function(global) {
    'use strict';

    var DRAG_THRESHOLD_PX = 3;

    function GestureController(map) {
        this.map = map;
        this.stage = map.stage;
        this.session = null;
        this._handlers = {
            pointerDown: this._onPointerDown.bind(this),
            pointerMove: this._onPointerMove.bind(this),
            pointerUp: this._onPointerUp.bind(this),
            pointerCancel: this._onPointerCancel.bind(this)
        };
        this.stage.addEventListener('pointerdown', this._handlers.pointerDown);
        this.stage.addEventListener('pointermove', this._handlers.pointerMove);
        this.stage.addEventListener('pointerup', this._handlers.pointerUp);
        this.stage.addEventListener('pointercancel', this._handlers.pointerCancel);
    }

    GestureController.prototype.isActive = function() {
        return this.session !== null;
    };

    GestureController.prototype._onPointerDown = function(event) {
        if (event.button !== 0 || event.isPrimary === false) {
            return;
        }
        if (event.target.closest('.ecosystem-map-detail')) {
            return;
        }

        var nodeEl = this.map._resolveNodeEl(event);
        var node = nodeEl
            ? this.map._nodeById(nodeEl.getAttribute('data-node-id'))
            : null;
        var draggable = this.map._isNodeDraggable(node);
        var session = {
            pointerId: event.pointerId,
            kind: node ? 'node' : 'pan',
            nodeId: node ? node.id : null,
            draggable: draggable,
            startX: event.clientX,
            startY: event.clientY,
            moved: false
        };

        if (draggable) {
            session.initial = {};
            session.nodeIds = this.map._nodeDragIds(node);
            session.nodeIds.forEach(function(id) {
                var current = this.map._nodeById(id);
                if (current) {
                    session.initial[id] = { x: current.x, y: current.y };
                }
            }, this);
        } else if (!node) {
            session.initialPanX = this.map.panX;
            session.initialPanY = this.map.panY;
        }

        this.session = session;
        this.stage.setPointerCapture(event.pointerId);
        event.preventDefault();
    };

    GestureController.prototype._onPointerMove = function(event) {
        var session = this.session;
        if (!session || event.pointerId !== session.pointerId) {
            return;
        }

        var clientDx = event.clientX - session.startX;
        var clientDy = event.clientY - session.startY;
        if (Math.hypot(clientDx, clientDy) >= DRAG_THRESHOLD_PX) {
            session.moved = true;
        }

        if (session.kind === 'node' && session.draggable) {
            var worldDx = clientDx / this.map.scale;
            var worldDy = clientDy / this.map.scale;
            session.nodeIds.forEach(function(id) {
                var node = this.map._nodeById(id);
                var initial = session.initial[id];
                if (node && initial) {
                    node.x = initial.x + worldDx;
                    node.y = initial.y + worldDy;
                }
            }, this);
            this.map._applyPositions();
        } else if (session.kind === 'pan') {
            this.map.panX = session.initialPanX + clientDx;
            this.map.panY = session.initialPanY + clientDy;
            this.map._updateTransform();
        }
    };

    GestureController.prototype._finish = function(event, cancelled) {
        var session = this.session;
        if (!session || event.pointerId !== session.pointerId) {
            return;
        }

        this.session = null;
        if (this.stage.hasPointerCapture(event.pointerId)) {
            this.stage.releasePointerCapture(event.pointerId);
        }
        if (cancelled || session.moved) {
            return;
        }

        if (session.kind === 'node') {
            this.map._handleNodeClick(session.nodeId);
        } else {
            this.map._clearSelection();
        }
    };

    GestureController.prototype._onPointerUp = function(event) {
        this._finish(event, false);
    };

    GestureController.prototype._onPointerCancel = function(event) {
        this._finish(event, true);
    };

    GestureController.prototype.destroy = function() {
        this.stage.removeEventListener('pointerdown', this._handlers.pointerDown);
        this.stage.removeEventListener('pointermove', this._handlers.pointerMove);
        this.stage.removeEventListener('pointerup', this._handlers.pointerUp);
        this.stage.removeEventListener('pointercancel', this._handlers.pointerCancel);
        this.session = null;
        this._handlers = {};
        this.map = null;
        this.stage = null;
    };

    global.EcosystemMapGestures = {
        Controller: GestureController
    };
})(window);
