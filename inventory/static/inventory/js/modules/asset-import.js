/**
 * Asset CSV Import — modal wizard
 */
(function() {
    'use strict';

    var state = {
        rows: [],
        conflicts: [],
        resolutions: {},
        mode: 'merge',
        catalogName: ''
    };

    var els = {};

    function getCsrf() {
        if (window.Utils && typeof window.Utils.getCSRFToken === 'function') {
            return window.Utils.getCSRFToken();
        }
        var match = document.cookie.match(/csrftoken=([^;]+)/);
        return match ? match[1] : '';
    }

    function toast(message, type) {
        if (window.Utils && typeof window.Utils.showToast === 'function') {
            window.Utils.showToast(message, type);
        }
    }

    function cacheElements() {
        els.modal = document.getElementById('import-csv-modal');
        if (!els.modal) return false;
        els.backdrop = els.modal.querySelector('[data-import-close]');
        els.closeBtn = els.modal.querySelector('.import-modal-close');
        els.dropzone = document.getElementById('import-dropzone');
        els.fileInput = document.getElementById('import-file-input');
        els.chooseBtn = document.getElementById('import-choose-file-btn');
        els.uploadError = document.getElementById('import-upload-error');
        els.conflictList = document.getElementById('import-conflict-list');
        els.catalogNameWrap = document.getElementById('import-catalog-name-wrap');
        els.catalogNameInput = document.getElementById('import-catalog-name');
        els.backBtn = document.getElementById('import-back-btn');
        els.nextBtn = document.getElementById('import-next-btn');
        els.doneBtn = document.getElementById('import-done-btn');
        return true;
    }

    function showStep(stepId) {
        els.modal.querySelectorAll('.import-step').forEach(function(step) {
            step.classList.toggle('active', step.id === stepId);
        });
        els.backBtn.hidden = stepId === 'import-step-upload' || stepId === 'import-step-success';
        els.nextBtn.hidden = stepId === 'import-step-upload' || stepId === 'import-step-processing' || stepId === 'import-step-success';
        els.doneBtn.hidden = stepId !== 'import-step-success';

        if (stepId === 'import-step-conflicts') {
            els.nextBtn.textContent = state.conflicts.length ? 'Continue' : 'Continue';
        } else if (stepId === 'import-step-destination') {
            els.nextBtn.textContent = 'Import Assets';
        } else {
            els.nextBtn.textContent = 'Continue';
        }
    }

    function openModal() {
        resetState();
        els.modal.classList.add('open');
        els.modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('import-modal-open');
        showStep('import-step-upload');
    }

    function closeModal() {
        els.modal.classList.remove('open');
        els.modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('import-modal-open');
    }

    function resetState() {
        state.rows = [];
        state.conflicts = [];
        state.resolutions = {};
        state.mode = 'merge';
        state.catalogName = '';
        if (els.uploadError) els.uploadError.hidden = true;
        if (els.fileInput) els.fileInput.value = '';
        if (els.catalogNameInput) els.catalogNameInput.value = '';
        if (els.catalogNameWrap) els.catalogNameWrap.classList.remove('visible');
        els.modal.querySelectorAll('input[name="import-mode"]').forEach(function(radio) {
            radio.checked = radio.value === 'merge';
        });
    }

    function showUploadError(message) {
        els.uploadError.textContent = message;
        els.uploadError.hidden = false;
    }

    function validateFile(file) {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showUploadError('The chosen file was not a CSV, Try again.');
            return;
        }
        uploadFile(file);
    }

    function uploadFile(file) {
        els.uploadError.hidden = true;
        showStep('import-step-processing');
        els.modal.querySelector('#import-processing-label').textContent = 'Validating CSV...';

        var formData = new FormData();
        formData.append('file', file);

        fetch(els.modal.dataset.validateUrl, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
            headers: { 'X-CSRFToken': getCsrf() }
        })
            .then(function(response) {
                return response.json().then(function(data) {
                    return { ok: response.ok, data: data };
                });
            })
            .then(function(result) {
                if (!result.ok) {
                    showStep('import-step-upload');
                    showUploadError(result.data.detail || 'Unable to read CSV file.');
                    return;
                }
                state.rows = result.data.rows || [];
                state.conflicts = result.data.conflicts || [];
                state.resolutions = {};
                updateSummary(result.data);
                if (state.conflicts.length) {
                    renderConflicts();
                    showStep('import-step-conflicts');
                } else {
                    showStep('import-step-destination');
                }
            })
            .catch(function() {
                showStep('import-step-upload');
                showUploadError('Upload failed. Please try again.');
            });
    }

    function updateSummary(data) {
        var summary = document.getElementById('import-parse-summary');
        if (!summary) return;
        var valid = data.valid_count || 0;
        var errors = data.error_count || 0;
        summary.textContent = valid + ' valid row' + (valid === 1 ? '' : 's') +
            (errors ? ' · ' + errors + ' row' + (errors === 1 ? '' : 's') + ' skipped' : '');
    }

    function renderConflicts() {
        if (!els.conflictList) return;
        els.conflictList.innerHTML = state.conflicts.map(function(conflict) {
            var existingBlock = '';
            if (conflict.conflict_type === 'existing_asset') {
                existingBlock =
                    '<div class="import-conflict-item">' +
                        '<strong>' + escapeHtml(conflict.existing_name) + '</strong>' +
                        '<span>Existing · ' + escapeHtml(conflict.serial) + '</span>' +
                    '</div>' +
                    '<div class="import-conflict-vs">vs</div>';
            } else {
                existingBlock =
                    '<div class="import-conflict-item">' +
                        '<strong>' + escapeHtml(conflict.other_upload_name || 'Duplicate row') + '</strong>' +
                        '<span>Also in file · ' + escapeHtml(conflict.serial) + '</span>' +
                    '</div>' +
                    '<div class="import-conflict-vs">vs</div>';
            }

            return '<div class="import-conflict-card" data-serial="' + escapeHtml(conflict.serial) + '">' +
                '<h4>Serial conflict</h4>' +
                '<div class="import-conflict-pair">' +
                    '<div class="import-conflict-item">' +
                        '<strong>' + escapeHtml(conflict.upload_name) + '</strong>' +
                        '<span>From upload · ' + escapeHtml(conflict.serial) + '</span>' +
                    '</div>' +
                    existingBlock +
                '</div>' +
                '<div class="import-resolution-btns">' +
                    (conflict.conflict_type === 'existing_asset'
                        ? '<button type="button" class="btn btn-secondary" data-resolution="replace">Replace existing</button>'
                        : '') +
                    '<button type="button" class="btn btn-secondary" data-resolution="add_new">Add as new</button>' +
                '</div>' +
            '</div>';
        }).join('');

        els.conflictList.querySelectorAll('.import-resolution-btns .btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var card = btn.closest('.import-conflict-card');
                var serial = card.getAttribute('data-serial');
                state.resolutions[serial] = btn.getAttribute('data-resolution');
                card.querySelectorAll('.import-resolution-btns .btn').forEach(function(b) {
                    b.classList.toggle('selected', b === btn);
                });
            });
        });
    }

    function escapeHtml(value) {
        var div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    function allConflictsResolved() {
        return state.conflicts.every(function(conflict) {
            return Boolean(state.resolutions[conflict.serial]);
        });
    }

    function executeImport() {
        showStep('import-step-processing');
        els.modal.querySelector('#import-processing-label').textContent = 'Importing assets...';

        var payload = {
            rows: state.rows,
            mode: state.mode,
            catalog_name: state.catalogName,
            resolutions: state.resolutions
        };

        fetch(els.modal.dataset.executeUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrf()
            },
            body: JSON.stringify(payload)
        })
            .then(function(response) {
                return response.json().then(function(data) {
                    return { ok: response.ok, data: data };
                });
            })
            .then(function(result) {
                if (!result.ok) {
                    toast(result.data.detail || 'Import failed.', 'error');
                    showStep('import-step-destination');
                    return;
                }
                renderSuccess(result.data);
                showStep('import-step-success');
                if (state.mode === 'merge' && window.AssetManager && typeof window.AssetManager.loadAssetTable === 'function') {
                    window.AssetManager.loadAssetTable();
                }
                if (window.AssetSections && typeof window.AssetSections.init === 'function') {
                    window.AssetSections.init();
                }
            })
            .catch(function() {
                toast('Import failed. Please try again.', 'error');
                showStep('import-step-destination');
            });
    }

    function renderSuccess(data) {
        var mount = document.getElementById('import-success-body');
        if (!mount) return;
        if (data.mode === 'catalog') {
            mount.innerHTML =
                '<h3>Directory created</h3>' +
                '<p><strong>' + escapeHtml(data.catalog_name) + '</strong> saved with ' +
                data.created + ' asset' + (data.created === 1 ? '' : 's') + '.</p>';
        } else {
            mount.innerHTML =
                '<h3>Import complete</h3>' +
                '<p>' + data.created + ' created · ' + data.updated + ' updated' +
                (data.skipped ? ' · ' + data.skipped + ' skipped' : '') + '.</p>';
        }
    }

    function bindEvents() {
        document.getElementById('import-csv-btn').addEventListener('click', openModal);
        els.closeBtn.addEventListener('click', closeModal);
        els.backdrop.addEventListener('click', closeModal);
        els.doneBtn.addEventListener('click', closeModal);

        els.chooseBtn.addEventListener('click', function() {
            els.fileInput.click();
        });

        els.fileInput.addEventListener('change', function() {
            if (els.fileInput.files && els.fileInput.files[0]) {
                validateFile(els.fileInput.files[0]);
            }
        });

        ['dragenter', 'dragover'].forEach(function(eventName) {
            els.dropzone.addEventListener(eventName, function(e) {
                e.preventDefault();
                els.dropzone.classList.add('dragover');
            });
        });
        ['dragleave', 'drop'].forEach(function(eventName) {
            els.dropzone.addEventListener(eventName, function(e) {
                e.preventDefault();
                els.dropzone.classList.remove('dragover');
            });
        });
        els.dropzone.addEventListener('drop', function(e) {
            var file = e.dataTransfer.files && e.dataTransfer.files[0];
            validateFile(file);
        });
        els.dropzone.addEventListener('click', function() {
            els.fileInput.click();
        });

        els.modal.querySelectorAll('input[name="import-mode"]').forEach(function(radio) {
            radio.addEventListener('change', function() {
                state.mode = radio.value;
                els.catalogNameWrap.classList.toggle('visible', state.mode === 'catalog');
                els.modal.querySelectorAll('.import-destination-option').forEach(function(option) {
                    var input = option.querySelector('input[name="import-mode"]');
                    option.classList.toggle('selected', input && input.checked);
                });
            });
        });
        els.modal.querySelectorAll('.import-destination-option').forEach(function(option) {
            option.addEventListener('click', function() {
                var input = option.querySelector('input[type="radio"]');
                if (input) {
                    input.checked = true;
                    input.dispatchEvent(new Event('change'));
                }
            });
        });

        els.backBtn.addEventListener('click', function() {
            var active = els.modal.querySelector('.import-step.active');
            if (!active) return;
            if (active.id === 'import-step-destination') {
                showStep(state.conflicts.length ? 'import-step-conflicts' : 'import-step-upload');
            } else if (active.id === 'import-step-conflicts') {
                showStep('import-step-upload');
            }
        });

        els.nextBtn.addEventListener('click', function() {
            var active = els.modal.querySelector('.import-step.active');
            if (!active) return;
            if (active.id === 'import-step-conflicts') {
                if (!allConflictsResolved()) {
                    toast('Please resolve all serial conflicts before continuing.', 'warning');
                    return;
                }
                showStep('import-step-destination');
            } else if (active.id === 'import-step-destination') {
                state.catalogName = els.catalogNameInput ? els.catalogNameInput.value.trim() : '';
                if (state.mode === 'catalog' && !state.catalogName) {
                    toast('Enter a name for the new directory.', 'warning');
                    return;
                }
                executeImport();
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && els.modal.classList.contains('open')) {
                closeModal();
            }
        });
    }

    function init() {
        if (!cacheElements()) return;
        bindEvents();
    }

    window.AssetImport = { init: init, open: openModal };
})();
