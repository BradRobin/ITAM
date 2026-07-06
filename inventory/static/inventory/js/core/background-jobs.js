/**
 * BACKGROUND JOBS - shared async job runner with polling
 */
(function() {
    'use strict';

    var POLL_MS = 1500;
    var activePolls = {};

    function getCsrfToken() {
        if (window.Utils && typeof window.Utils.getCSRFToken === 'function') {
            return window.Utils.getCSRFToken();
        }
        var match = document.cookie.match(/csrftoken=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function parseResponse(response) {
        if (window.Utils && typeof window.Utils.parseJsonResponse === 'function') {
            return window.Utils.parseJsonResponse(response);
        }
        return response.json();
    }

    function sleep(ms) {
        return new Promise(function(resolve) {
            setTimeout(resolve, ms);
        });
    }

    function createJob(jobType, options) {
        options = options || {};
        return fetch('/api/jobs/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
                'Accept': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                job_type: jobType,
                force: !!options.force,
                params: options.params || {}
            })
        }).then(function(response) {
            return parseResponse(response).then(function(data) {
                if (!response.ok) {
                    throw new Error(data.detail || 'Failed to start background job');
                }
                return data;
            });
        });
    }

    function fetchJob(jobId) {
        return fetch('/api/jobs/' + jobId + '/', {
            headers: { 'Accept': 'application/json' },
            credentials: 'same-origin'
        }).then(function(response) {
            return parseResponse(response).then(function(data) {
                if (!response.ok) {
                    throw new Error(data.detail || 'Failed to fetch job status');
                }
                return data;
            });
        });
    }

    function waitForJob(jobId, onProgress) {
        if (activePolls[jobId]) {
            return activePolls[jobId];
        }

        var promise = (async function() {
            while (true) {
                var job = await fetchJob(jobId);
                if (typeof onProgress === 'function') {
                    onProgress(job);
                }
                if (job.status === 'completed') {
                    return job;
                }
                if (job.status === 'failed') {
                    throw new Error(job.error_message || 'Background job failed');
                }
                await sleep(POLL_MS);
            }
        })();

        activePolls[jobId] = promise;
        return promise.finally(function() {
            delete activePolls[jobId];
        });
    }

    function run(jobType, options) {
        options = options || {};
        return createJob(jobType, options).then(function(job) {
            if (job.status === 'completed') {
                if (typeof options.onProgress === 'function') {
                    options.onProgress(job);
                }
                return job;
            }
            return waitForJob(job.id, options.onProgress);
        });
    }

    function downloadExport(job) {
        if (!job || !job.download_url) {
            return;
        }
        window.location.href = job.download_url;
    }

    window.BackgroundJobs = {
        run: run,
        createJob: createJob,
        waitForJob: waitForJob,
        downloadExport: downloadExport
    };
})();
