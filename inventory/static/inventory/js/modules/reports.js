/**
 * REPORTS MODULE - ITAM SYSTEM
 * Handles chart rendering and analytics
 */

(function() {
    'use strict';
    
    var charts = {};
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
    
    // ============================================
    // Get Current Theme
    // ============================================
    function getCurrentTheme() {
        var theme = document.documentElement.getAttribute('data-theme');
        return theme === 'dark' ? 'dark' : 'light';
    }
    
    // ============================================
    // Get Color Scheme
    // ============================================
    function getColors() {
        return colorScheme[getCurrentTheme()] || colorScheme.light;
    }
    
    // ============================================
    // Create Status Chart (Pie)
    // ============================================
    function createStatusChart(data) {
        var ctx = document.getElementById('statusChart');
        if (!ctx) return;
        
        var labels = Object.keys(data);
        var values = Object.values(data);
        var colors = ['#22c55e', '#3b82f6', '#f59e0b'];
        
        charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: getColors().grid
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getColors().text,
                            padding: 15,
                            font: { size: 12 }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }
    
    // ============================================
    // Create Type Chart (Bar)
    // ============================================
    function createTypeChart(data) {
        var ctx = document.getElementById('typeChart');
        if (!ctx) return;
        
        var labels = Object.keys(data);
        var values = Object.values(data);
        
        charts.type = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Assets by Type',
                    data: values,
                    backgroundColor: chartColors.slice(0, labels.length),
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: getColors().text,
                            font: { size: 11 }
                        },
                        grid: {
                            color: getColors().grid
                        }
                    },
                    x: {
                        ticks: {
                            color: getColors().text,
                            font: { size: 11 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // ============================================
    // Create Monthly Chart (Line)
    // ============================================
    function createMonthlyChart(data) {
        var ctx = document.getElementById('monthlyChart');
        if (!ctx) return;
        
        var labels = data.map(function(d) { return d.month; });
        var values = data.map(function(d) { return d.count; });
        
        charts.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Assets Created',
                    data: values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: getColors().grid,
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: getColors().text,
                            font: { size: 12 }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: getColors().text,
                            font: { size: 11 },
                            stepSize: 1
                        },
                        grid: {
                            color: getColors().grid
                        }
                    },
                    x: {
                        ticks: {
                            color: getColors().text,
                            font: { size: 11 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // ============================================
    // Create Maintenance Chart (Bar)
    // ============================================
    function createMaintenanceChart(data) {
        var ctx = document.getElementById('maintenanceChart');
        if (!ctx) return;
        
        var labels = data.map(function(d) { return d.month; });
        var values = data.map(function(d) { return d.count; });
        
        charts.maintenance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Maintenance Logs',
                    data: values,
                    backgroundColor: '#f59e0b',
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: getColors().text,
                            font: { size: 12 }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: getColors().text,
                            font: { size: 11 },
                            stepSize: 1
                        },
                        grid: {
                            color: getColors().grid
                        }
                    },
                    x: {
                        ticks: {
                            color: getColors().text,
                            font: { size: 11 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // ============================================
    // Create Top Assets Chart (Horizontal Bar)
    // ============================================
    function createTopAssetsChart(data) {
        var ctx = document.getElementById('topAssetsChart');
        if (!ctx) return;
        
        var labels = data.map(function(d) { return d.name; });
        var values = data.map(function(d) { return d.assignments; });
        
        // Reverse for horizontal bar (top at top)
        labels.reverse();
        values.reverse();
        
        charts.topAssets = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Assignments',
                    data: values,
                    backgroundColor: '#8b5cf6',
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: getColors().text,
                            font: { size: 12 }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: getColors().text,
                            font: { size: 11 },
                            stepSize: 1
                        },
                        grid: {
                            color: getColors().grid
                        }
                    },
                    y: {
                        ticks: {
                            color: getColors().text,
                            font: { size: 11 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // ============================================
    // Create Department Chart (Pie)
    // ============================================
    function createDepartmentChart(data) {
        var ctx = document.getElementById('departmentChart');
        if (!ctx) return;
        
        var labels = Object.keys(data);
        var values = Object.values(data);
        
        charts.department = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: chartColors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: getColors().grid
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getColors().text,
                            padding: 15,
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    }
    
    // ============================================
    // Update All Charts on Theme Change
    // ============================================
    function updateChartsOnThemeChange() {
        var colors = getColors();
        
        Object.keys(charts).forEach(function(key) {
            var chart = charts[key];
            if (!chart) return;
            
            // Update colors based on chart type
            if (chart.config.type === 'doughnut' || chart.config.type === 'pie') {
                chart.options.plugins.legend.labels.color = colors.text;
            } else if (chart.config.type === 'line' || chart.config.type === 'bar') {
                chart.options.plugins.legend.labels.color = colors.text;
                chart.options.scales.x.ticks.color = colors.text;
                chart.options.scales.y.ticks.color = colors.text;
                chart.options.scales.y.grid.color = colors.grid;
                chart.options.scales.x.grid.color = colors.grid;
            }
            
            chart.update();
        });
    }
    
    function updateSummaryCards(data) {
        var mapping = {
            total_assets: data.total_assets,
            assigned_assets: data.assigned_assets,
            available_assets: data.available_assets,
            maintenance_assets: data.maintenance_assets,
            total_employees: data.total_employees,
            utilization_rate: data.utilization_rate + '%'
        };
        Object.keys(mapping).forEach(function(key) {
            var el = document.querySelector('[data-summary-key="' + key + '"]');
            if (el) {
                el.textContent = mapping[key];
            }
        });
    }

    function updateAdditionalStats(data) {
        var overdue = document.querySelector('[data-stat-key="overdue_count"]');
        var health = document.querySelector('[data-stat-key="asset_health_rate"]');
        var assignments = document.querySelector('[data-stat-key="total_assignments"]');
        if (overdue) {
            overdue.textContent = data.overdue_count;
            overdue.classList.toggle('danger', data.overdue_count > 0);
            overdue.classList.toggle('success', data.overdue_count === 0);
        }
        if (health) {
            health.textContent = data.asset_health_rate + '%';
            health.classList.toggle('success', data.asset_health_rate < 10);
            health.classList.toggle('warning', data.asset_health_rate >= 10);
        }
        if (assignments) {
            assignments.textContent = data.total_assignments || 0;
        }
    }

    function parseJsonField(value, fallback) {
        if (typeof value === 'object') {
            return value;
        }
        try {
            return JSON.parse(value);
        } catch (error) {
            return fallback;
        }
    }

    function loadAsyncReports() {
        var container = document.querySelector('.reports-container');
        if (!container || !window.BackgroundJobs) {
            return;
        }

        container.classList.add('async-loading');
        window.BackgroundJobs.run('reports', {
            force: false
        }).then(function(job) {
            var data = job.result || {};
            container.classList.remove('async-loading');
            updateSummaryCards(data);
            updateAdditionalStats(data);
            init({
                assetByStatus: parseJsonField(data.asset_by_status, {}),
                assetByType: parseJsonField(data.asset_by_type, {}),
                monthlyAssets: parseJsonField(data.monthly_assets, []),
                maintenanceByMonth: parseJsonField(data.maintenance_by_month, []),
                topAssets: parseJsonField(data.top_assets_data, []),
                departmentData: parseJsonField(data.department_counts, {})
            });
        }).catch(function(error) {
            container.classList.remove('async-loading');
            console.error('Reports async load failed:', error);
        });
    }

    // ============================================
    // Initialize Reports
    // ============================================
    function init(data) {
        console.log('Reports module initializing...');
        
        if (!data) {
            return;
        }

        // Create charts
        createStatusChart(data.assetByStatus);
        createTypeChart(data.assetByType);
        createMonthlyChart(data.monthlyAssets);
        createMaintenanceChart(data.maintenanceByMonth);
        createTopAssetsChart(data.topAssets);
        createDepartmentChart(data.departmentData);
        
        // Listen for theme changes
        document.addEventListener('theme-changed', function() {
            setTimeout(updateChartsOnThemeChange, 100);
        });
        
        // Refresh button
        var refreshBtn = document.getElementById('refreshReports');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                loadAsyncReports();
            });
        }
        
        console.log('Reports module initialized.');
    }

    function bootstrap() {
        var container = document.querySelector('.reports-container');
        if (container && container.dataset.asyncReports === 'true') {
            loadAsyncReports();
            return;
        }
        console.log('Reports module waiting for inline data.');
    }
    
    // ============================================
    // Export
    // ============================================
    window.Reports = {
        init: init,
        bootstrap: bootstrap,
        loadAsync: loadAsyncReports,
        updateCharts: updateChartsOnThemeChange
    };
    
    console.log('Reports module loaded.');
    
})();