/**
 * REPORTS MODULE - ITAM SYSTEM
 * Handles chart rendering and analytics
 */

(function() {
    'use strict';
    
    var chartInstances = {};
    var colorScheme = {
        light: {
            text: '#1e293b',
            grid: '#e2e8f0',
            border: '#cbd5e1'
        },
        dark: {
            text: '#f1f5f9',
            grid: '#334155',
            border: '#475569'
        }
    };
    
    var chartColors = [
        '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
        '#6366f1', '#84cc16'
    ];
    
    var colorMap = {
        'Available': '#22c55e',
        'Assigned': '#3b82f6',
        'Maintenance': '#f59e0b',
        'Retired': '#ef4444',
        'Lost': '#ec4899',
        'Damaged': '#f97316'
    };
    
    // ============================================
    // Helpers
    // ============================================
    function getTheme() {
        return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }
    
    function getColors() {
        return colorScheme[getTheme()] || colorScheme.light;
    }
    
    function getChartColors(count) {
        var colors = [];
        for (var i = 0; i < count; i++) {
            colors.push(chartColors[i % chartColors.length]);
        }
        return colors;
    }
    
    // ============================================
    // Chart Creators
    // ============================================
    function createDoughnut(id, data, labels, colors, label) {
        var ctx = document.getElementById(id);
        if (!ctx) return;
        
        var total = data.reduce(function(a, b) { return a + b; }, 0);
        var isDark = getTheme() === 'dark';
        var colorSet = colors || getChartColors(data.length);
        
        chartInstances[id] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colorSet,
                    borderWidth: 2,
                    borderColor: isDark ? '#1e293b' : '#ffffff',
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getColors().text,
                            padding: 12,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var value = context.parsed || 0;
                                var pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return context.label + ': ' + value + ' (' + pct + '%)';
                            }
                        }
                    }
                },
                animation: { duration: 1000 }
            },
            plugins: [{
                id: 'centerText',
                beforeDraw: function(chart) {
                    var w = chart.width, h = chart.height;
                    var ctx = chart.ctx;
                    var area = chart.chartArea;
                    var fs = Math.min(w, h) / 5;
                    
                    ctx.save();
                    ctx.font = 'bold ' + fs + 'px "Inter", sans-serif';
                    ctx.textBaseline = 'middle';
                    ctx.textAlign = 'center';
                    
                    var cx = (area.left + area.right) / 2;
                    var cy = (area.top + area.bottom) / 2 - 6;
                    
                    ctx.fillStyle = getColors().text;
                    ctx.fillText(total, cx, cy);
                    
                    ctx.font = (fs / 2.5) + 'px "Inter", sans-serif';
                    ctx.globalAlpha = 0.6;
                    ctx.fillText(label || '', cx, cy + fs / 1.8);
                    ctx.globalAlpha = 1;
                    ctx.restore();
                }
            }]
        });
    }
    
    function createBar(id, data, labels, horizontal) {
        var ctx = document.getElementById(id);
        if (!ctx) return;
        
        var isDark = getTheme() === 'dark';
        var colors = getChartColors(data.length);
        
        chartInstances[id] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.map(function(c) { return c + '80'; }),
                    borderColor: colors,
                    borderWidth: 1.5,
                    borderRadius: 6,
                    maxBarThickness: 50
                }]
            },
            options: {
                indexAxis: horizontal ? 'y' : 'x',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', drawBorder: false },
                        ticks: { color: getColors().text, font: { size: 10 } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: getColors().text, font: { size: 10 }, maxRotation: 0 }
                    }
                },
                animation: { duration: 800 }
            }
        });
    }
    
    function createLine(id, data, labels, color, fill) {
        var ctx = document.getElementById(id);
        if (!ctx) return;
        
        var isDark = getTheme() === 'dark';
        var baseColor = color || '#3b82f6';
        var grad = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
        grad.addColorStop(0, baseColor + '40');
        grad.addColorStop(1, baseColor + '00');
        
        chartInstances[id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    borderColor: baseColor,
                    backgroundColor: fill !== false ? grad : 'transparent',
                    fill: fill !== false,
                    tension: 0.4,
                    pointBackgroundColor: baseColor,
                    pointBorderColor: isDark ? '#1e293b' : '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { intersect: false, mode: 'index' }
                },
                scales: {
                    x: {
                        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', drawBorder: false },
                        ticks: { color: getColors().text, font: { size: 10 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', drawBorder: false },
                        ticks: { color: getColors().text, font: { size: 10 }, stepSize: 1 }
                    }
                },
                interaction: { intersect: false, mode: 'index' },
                animation: { duration: 1000 }
            }
        });
    }
    
    // ============================================
    // Destroy Charts
    // ============================================
    function destroyCharts() {
        Object.keys(chartInstances).forEach(function(key) {
            if (chartInstances[key] && typeof chartInstances[key].destroy === 'function') {
                chartInstances[key].destroy();
                delete chartInstances[key];
            }
        });
    }
    
    // ============================================
    // Update Charts on Theme Change
    // ============================================
    function updateCharts() {
        var colors = getColors();
        var isDark = getTheme() === 'dark';
        
        Object.keys(chartInstances).forEach(function(key) {
            var chart = chartInstances[key];
            if (!chart) return;
            
            if (chart.options && chart.options.plugins && chart.options.plugins.legend) {
                chart.options.plugins.legend.labels.color = colors.text;
            }
            
            if (chart.options && chart.options.scales) {
                ['x', 'y'].forEach(function(axis) {
                    if (chart.options.scales[axis]) {
                        chart.options.scales[axis].ticks.color = colors.text;
                        if (chart.options.scales[axis].grid) {
                            chart.options.scales[axis].grid.color = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                        }
                    }
                });
            }
            
            if (chart.config && (chart.config.type === 'doughnut' || chart.config.type === 'pie')) {
                chart.data.datasets.forEach(function(ds) {
                    ds.borderColor = isDark ? '#1e293b' : '#ffffff';
                });
            }
            
            chart.update();
        });
    }
    
    // ============================================
    // Parse JSON
    // ============================================
    function parseJson(value, fallback) {
        if (typeof value === 'object') return value;
        try { return JSON.parse(value); } catch (e) { return fallback; }
    }
    
    // ============================================
    // Initialize Reports
    // ============================================
    function init(data) {
        if (!data) return;
        
        destroyCharts();
        
        // Status Chart
        if (data.assetByStatus && Object.keys(data.assetByStatus).length > 0) {
            var sLabels = Object.keys(data.assetByStatus);
            var sData = Object.values(data.assetByStatus);
            var sColors = sLabels.map(function(l) { return colorMap[l] || chartColors[Math.floor(Math.random() * chartColors.length)]; });
            createDoughnut('statusChart', sData, sLabels, sColors, '');
        }
        
        // Type Chart
        if (data.assetByType && Object.keys(data.assetByType).length > 0) {
            createBar('typeChart', Object.values(data.assetByType), Object.keys(data.assetByType), true);
        }
        
        // Monthly Chart
        if (data.monthlyAssets && data.monthlyAssets.length > 0) {
            var mData = data.monthlyAssets.map(function(d) { return d.count || d.value || 0; });
            var mLabels = data.monthlyAssets.map(function(d) { return d.month || d.label || ''; });
            createLine('monthlyChart', mData, mLabels, '#3b82f6', true);
        }
        
        // Maintenance Chart
        if (data.maintenanceByMonth && data.maintenanceByMonth.length > 0) {
            var mtData = data.maintenanceByMonth.map(function(d) { return d.count || d.value || 0; });
            var mtLabels = data.maintenanceByMonth.map(function(d) { return d.month || d.label || ''; });
            createLine('maintenanceChart', mtData, mtLabels, '#f59e0b', false);
        }
        
        // Top Assets Chart
        if (data.topAssets && data.topAssets.length > 0) {
            var tData = data.topAssets.map(function(d) { return d.assignments || d.count || d.value || 0; });
            var tLabels = data.topAssets.map(function(d) { return d.name || d.label || ''; });
            createBar('topAssetsChart', tData, tLabels, true);
        }
        
        // Department Chart
        if (data.departmentData && Object.keys(data.departmentData).length > 0) {
            var dLabels = Object.keys(data.departmentData);
            var dData = Object.values(data.departmentData);
            createDoughnut('departmentChart', dData, dLabels, null, '');
        }
        
        document.addEventListener('theme-changed', function() {
            setTimeout(updateCharts, 150);
        });
    }
    
    // ============================================
    // Update Summary Cards
    // ============================================
    function updateSummaryCards(data) {
        var map = {
            total_assets: data.total_assets,
            assigned_assets: data.assigned_assets,
            available_assets: data.available_assets,
            maintenance_assets: data.maintenance_assets,
            total_employees: data.total_employees,
            utilization_rate: data.utilization_rate + '%'
        };
        
        Object.keys(map).forEach(function(key) {
            var el = document.querySelector('[data-summary-key="' + key + '"]');
            if (el) el.textContent = map[key];
        });
    }
    
    // ============================================
    // Update Additional Stats
    // ============================================
    function updateAdditionalStats(data) {
        var stats = {
            overdue_count: data.overdue_count || 0,
            asset_health_rate: (data.asset_health_rate || 0) + '%',
            total_assignments: data.total_assignments || 0
        };
        
        Object.keys(stats).forEach(function(key) {
            var el = document.querySelector('[data-stat-key="' + key + '"]');
            if (el) {
                el.textContent = stats[key];
                if (key === 'overdue_count') {
                    el.classList.toggle('danger', data.overdue_count > 0);
                    el.classList.toggle('success', data.overdue_count === 0);
                }
            }
        });
    }
    
    // ============================================
    // Load Async Reports
    // ============================================
    function loadAsync() {
        var container = document.querySelector('.reports-container');
        if (!container || !window.BackgroundJobs) return;
        
        container.classList.add('async-loading');
        window.BackgroundJobs.run('reports', { force: false })
            .then(function(job) {
                var data = job.result || {};
                container.classList.remove('async-loading');
                updateSummaryCards(data);
                updateAdditionalStats(data);
                init({
                    assetByStatus: parseJson(data.asset_by_status, {}),
                    assetByType: parseJson(data.asset_by_type, {}),
                    monthlyAssets: parseJson(data.monthly_assets, []),
                    maintenanceByMonth: parseJson(data.maintenance_by_month, []),
                    topAssets: parseJson(data.top_assets_data, []),
                    departmentData: parseJson(data.department_counts, {})
                });
            })
            .catch(function() {
                container.classList.remove('async-loading');
            });
    }
    
    // ============================================
    // Bootstrap
    // ============================================
    function bootstrap() {
        var container = document.querySelector('.reports-container');
        if (container && container.dataset.asyncReports === 'true') {
            loadAsync();
        }
    }
    
    // ============================================
    // Export
    // ============================================
    window.Reports = {
        init: init,
        bootstrap: bootstrap,
        refresh: loadAsync,
        updateCharts: updateCharts,
        destroy: destroyCharts
    };
    
})();