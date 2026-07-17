/**
 * Add Asset Modal — create assets via API without leaving the page
 */
(function() {
    'use strict';

    var PER_TYPE = 8;
    var suggestionPool = [];
    var prefetchPromise = null;
    var previouslyFocused = null;
    var submitting = false;

    var els = {};

    function getCsrf() {
        if (window.Utils && typeof window.Utils.getCSRFToken === 'function') {
            return window.Utils.getCSRFToken();
        }
        var meta = document.querySelector('meta[name="csrf-token"]');
        if (meta && meta.content) {
            return meta.content;
        }
        var match = document.cookie.match(/csrftoken=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function toast(message, type) {
        if (window.Utils && typeof window.Utils.showToast === 'function') {
            window.Utils.showToast(message, type);
        }
    }

    function setStatus(message) {
        if (els.suggestStatus) {
            els.suggestStatus.textContent = message || '';
        }
    }

    function setSuggestButton(enabled, label) {
        if (!els.suggestBtn) {
            return;
        }
        els.suggestBtn.disabled = !enabled;
        if (label) {
            els.suggestBtn.innerHTML = label;
        }
    }

    function clearErrors() {
        if (els.formError) {
            els.formError.hidden = true;
            els.formError.textContent = '';
        }
        if (!els.modal) {
            return;
        }
        els.modal.querySelectorAll('[data-field-error]').forEach(function(node) {
            node.hidden = true;
            node.textContent = '';
        });
        els.modal.querySelectorAll('.form-group.has-error').forEach(function(group) {
            group.classList.remove('has-error');
        });
    }

    function showFormError(message) {
        if (!els.formError) {
            return;
        }
        els.formError.textContent = message;
        els.formError.hidden = !message;
    }

    function showFieldError(fieldName, message) {
        var node = els.modal.querySelector('[data-field-error="' + fieldName + '"]');
        if (!node) {
            return;
        }
        node.textContent = message;
        node.hidden = !message;
        var group = node.closest('.form-group');
        if (group) {
            group.classList.toggle('has-error', !!message);
        }
    }

    function parseDjangoFieldError(value) {
        if (!value) {
            return '';
        }
        if (typeof value === 'string') {
            return value;
        }
        if (Array.isArray(value) && value.length) {
            var first = value[0];
            if (typeof first === 'string') {
                return first;
            }
            if (first && typeof first.message === 'string') {
                return first.message;
            }
        }
        if (typeof value.message === 'string') {
            return value.message;
        }
        return String(value);
    }

    function applyApiErrors(errors) {
        if (!errors || typeof errors !== 'object') {
            return false;
        }
        var applied = false;
        Object.keys(errors).forEach(function(key) {
            var message = parseDjangoFieldError(errors[key]);
            if (!message) {
                return;
            }
            applied = true;
            if (key === '__all__' || key === 'non_field_errors') {
                showFormError(message);
            } else {
                showFieldError(key, message);
            }
        });
        return applied;
    }

    function mergeSuggestions(items) {
        if (!items || !items.length) {
            return;
        }
        var existing = {};
        suggestionPool.forEach(function(item) {
            existing[String(item.serial_number).toLowerCase()] = true;
        });
        items.forEach(function(item) {
            var key = String(item.serial_number).toLowerCase();
            if (!existing[key]) {
                suggestionPool.push(item);
                existing[key] = true;
            }
        });
    }

    function prefetchSuggestions(force) {
        if (!window.BackgroundJobs) {
            return Promise.reject(new Error('Background jobs unavailable'));
        }
        if (prefetchPromise && !force) {
            return prefetchPromise;
        }
        prefetchPromise = window.BackgroundJobs.run('serial_suggestions', {
            force: !!force,
            params: { per_type: PER_TYPE }
        }).then(function(job) {
            mergeSuggestions((job.result && job.result.suggestions) || []);
            prefetchPromise = null;
            return suggestionPool;
        }).catch(function(error) {
            prefetchPromise = null;
            throw error;
        });
        return prefetchPromise;
    }

    function takeSuggestionForType(assetType) {
        var index = suggestionPool.findIndex(function(item) {
            return item.asset_type === assetType;
        });
        if (index === -1) {
            return null;
        }
        return suggestionPool.splice(index, 1)[0];
    }

    function applySuggestion() {
        if (!els.type || !els.serial) {
            return;
        }
        if (!els.type.value) {
            setStatus('Select an asset type first.');
            els.type.focus();
            return;
        }

        var picked = takeSuggestionForType(els.type.value);
        if (!picked) {
            setSuggestButton(false, '<i class="fas fa-spinner fa-spin"></i> Suggest');
            setStatus('Generating a new suggestion...');
            prefetchSuggestions(true).then(function() {
                var retry = takeSuggestionForType(els.type.value);
                if (!retry) {
                    throw new Error('Could not generate a unique serial number.');
                }
                els.serial.value = retry.serial_number;
                setStatus('Suggested serial applied.');
                setSuggestButton(true, '<i class="fas fa-magic"></i> Suggest');
            }).catch(function(error) {
                setStatus(
                    window.Utils
                        ? window.Utils.getUserFacingError(error, 'Suggestion failed.')
                        : 'Suggestion failed.'
                );
                setSuggestButton(true, '<i class="fas fa-magic"></i> Suggest');
            });
            return;
        }

        els.serial.value = picked.serial_number;
        setStatus('Suggested serial applied.');
        els.serial.dispatchEvent(new Event('input', { bubbles: true }));

        var remainingForType = suggestionPool.filter(function(item) {
            return item.asset_type === els.type.value;
        }).length;
        if (remainingForType < 2) {
            prefetchSuggestions(true);
        }
    }

    function ensureSuggestionsReady() {
        if (!window.BackgroundJobs) {
            setSuggestButton(false, '<i class="fas fa-magic"></i> Suggest');
            setStatus('Suggestions unavailable. Enter a serial manually.');
            return;
        }
        setSuggestButton(false, '<i class="fas fa-spinner fa-spin"></i> Preparing...');
        setStatus('Preparing serial number suggestions...');
        var settled = false;
        var timeoutId = setTimeout(function() {
            if (settled) {
                return;
            }
            settled = true;
            setSuggestButton(true, '<i class="fas fa-magic"></i> Suggest');
            setStatus('Suggestions still loading — you can enter a serial manually.');
        }, 8000);
        prefetchSuggestions(false).then(function() {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeoutId);
            setSuggestButton(true, '<i class="fas fa-magic"></i> Suggest');
            setStatus('Suggestions ready.');
        }).catch(function(error) {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeoutId);
            setSuggestButton(true, '<i class="fas fa-magic"></i> Suggest');
            setStatus(
                window.Utils
                    ? window.Utils.getUserFacingError(error, 'Could not preload suggestions.')
                    : 'Could not preload suggestions.'
            );
        });
    }

    function resetForm() {
        if (els.form) {
            els.form.reset();
        }
        clearErrors();
        submitting = false;
        if (els.submitBtn) {
            els.submitBtn.disabled = false;
            els.submitBtn.innerHTML = '<i class="fas fa-plus-circle" aria-hidden="true"></i> Save Asset';
        }
    }

    function openModal() {
        if (!els.modal) {
            return;
        }
        previouslyFocused = document.activeElement;
        resetForm();
        els.modal.classList.add('open');
        els.modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('add-asset-modal-open');
        ensureSuggestionsReady();
        if (els.name) {
            setTimeout(function() {
                els.name.focus();
            }, 50);
        }
    }

    function closeModal() {
        if (!els.modal) {
            return;
        }
        els.modal.classList.remove('open');
        els.modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('add-asset-modal-open');
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
            previouslyFocused.focus();
        }
        previouslyFocused = null;
    }

    function isOpen() {
        return !!(els.modal && els.modal.classList.contains('open'));
    }

    function syncAfterCreate() {
        if (window.Notifications && typeof window.Notifications.fetchNotifications === 'function') {
            window.Notifications.fetchNotifications();
        }
        if (window.AssetManager && typeof window.AssetManager.refreshAllTables === 'function') {
            window.AssetManager.refreshAllTables();
        }
        if (window.Dashboard && typeof window.Dashboard.refresh === 'function') {
            window.Dashboard.refresh();
        }
        if (window.Reports && typeof window.Reports.refresh === 'function') {
            window.Reports.refresh();
        }
    }

    function validateClient() {
        clearErrors();
        var valid = true;
        if (!els.name.value.trim()) {
            showFieldError('name', 'This field is required.');
            valid = false;
        }
        if (!els.type.value) {
            showFieldError('type', 'This field is required.');
            valid = false;
        }
        if (!els.serial.value.trim()) {
            showFieldError('serial_number', 'This field is required.');
            valid = false;
        }
        return valid;
    }

    async function submitForm(event) {
        event.preventDefault();
        if (submitting) {
            return;
        }
        if (!validateClient()) {
            return;
        }

        var createUrl = els.modal.getAttribute('data-create-url') || '/api/assets';
        submitting = true;
        els.submitBtn.disabled = true;
        els.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        clearErrors();

        try {
            var response = await fetch(createUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRFToken': getCsrf()
                },
                body: JSON.stringify({
                    name: els.name.value.trim(),
                    type: els.type.value,
                    serial_number: els.serial.value.trim()
                })
            });

            var data = {};
            try {
                data = await response.json();
            } catch (parseError) {
                data = {};
            }

            if (!response.ok) {
                if (data.errors && applyApiErrors(data.errors)) {
                    throw new Error('Please fix the highlighted fields.');
                }
                var message = window.Utils
                    ? window.Utils.extractApiError(data, 'Could not create asset.')
                    : (data.detail || 'Could not create asset.');
                showFormError(message);
                throw new Error(message);
            }

            toast('Asset created successfully.', 'success');
            closeModal();
            syncAfterCreate();
        } catch (error) {
            if (!els.formError || els.formError.hidden) {
                showFormError(
                    window.Utils
                        ? window.Utils.getUserFacingError(error, 'Could not create asset.')
                        : (error.message || 'Could not create asset.')
                );
            }
        } finally {
            submitting = false;
            if (els.submitBtn) {
                els.submitBtn.disabled = false;
                els.submitBtn.innerHTML = '<i class="fas fa-plus-circle" aria-hidden="true"></i> Save Asset';
            }
        }
    }

    function shouldOpenFromTrigger(target) {
        if (!target || !target.closest) {
            return null;
        }
        return target.closest('[data-open-add-asset]');
    }

    function bindTriggers() {
        document.addEventListener('click', function(event) {
            var trigger = shouldOpenFromTrigger(event.target);
            if (!trigger) {
                return;
            }
            event.preventDefault();
            openModal();
        });
    }

    function bindModalChrome() {
        if (!els.modal) {
            return;
        }
        els.modal.querySelectorAll('[data-add-asset-close]').forEach(function(node) {
            node.addEventListener('click', closeModal);
        });
        if (els.form) {
            els.form.addEventListener('submit', submitForm);
        }
        if (els.suggestBtn) {
            els.suggestBtn.addEventListener('click', applySuggestion);
        }
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && isOpen()) {
                closeModal();
            }
        });
    }

    function maybeAutoOpen() {
        try {
            var params = new URLSearchParams(window.location.search);
            if (params.get('add') === '1') {
                openModal();
                params.delete('add');
                var next = params.toString();
                var cleanUrl = window.location.pathname + (next ? '?' + next : '') + window.location.hash;
                window.history.replaceState({}, '', cleanUrl);
            }
        } catch (error) {
            // Ignore URL API issues
        }
    }

    function init() {
        els.modal = document.getElementById('add-asset-modal');
        if (!els.modal) {
            return;
        }
        els.form = document.getElementById('add-asset-form');
        els.name = document.getElementById('add-asset-name');
        els.type = document.getElementById('add-asset-type');
        els.serial = document.getElementById('add-asset-serial');
        els.suggestBtn = document.getElementById('add-asset-suggest-btn');
        els.suggestStatus = document.getElementById('add-asset-suggest-status');
        els.formError = document.getElementById('add-asset-form-error');
        els.submitBtn = document.getElementById('add-asset-submit-btn');

        bindTriggers();
        bindModalChrome();
        maybeAutoOpen();
    }

    window.AddAssetModal = {
        init: init,
        open: openModal,
        close: closeModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
