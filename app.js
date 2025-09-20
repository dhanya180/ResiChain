const socket = io('http://localhost:3001');

// Chart instances
let salesChart;
let iotChart;
let inventoryTurnoverChart;
let onTimeDeliveryChart;
let supplierOnTimeChart;
let transportCostChart;
let webTrafficChart;
let impactChart; // New chart for decision impact

let activeAnomaly = null;

let activeCategory = 'sales-web'; // Default active category
let previousMetrics = {}; // To store previous metric values for trend indicators
//let storedSuggestions = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    showCategory(activeCategory); // Show default category on load

    document.getElementById('simulate-anomaly-btn').addEventListener('click', () => {
        const scenario = prompt("Enter anomaly type to simulate (e.g., demand_surge, delivery_delay, warehouse_fire, supplier_strike):");
        if (scenario) {
            socket.emit('simulate_anomaly', { scenario });
        }
    });

    document.getElementById('simulate-web-traffic-spike-btn').addEventListener('click', () => {
        socket.emit('simulate_anomaly', { scenario: 'web_traffic_spike' });
    });

    document.getElementById('simulate-inventory-fill-btn').addEventListener('click', () => {
        socket.emit('simulate_anomaly', { scenario: 'inventory_fill' });
    });

    document.getElementById('simulate-inventory-stockout-btn').addEventListener('click', () => {
        socket.emit('simulate_anomaly', { scenario: 'inventory_stockout' });
    });

    document.getElementById('simulate-seasonal-spike-btn').addEventListener('click', () => {
        socket.emit('simulate_anomaly', { scenario: 'seasonal_spike' });
    });

    // Category navigation logic
    document.querySelectorAll('.category-btn').forEach(button => {
        button.addEventListener('click', function() {
            const category = this.dataset.category;
            if (activeCategory !== category) {
                showCategory(category);
                document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    // Log tab switching logic
    document.querySelectorAll('.log-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.log-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            document.querySelectorAll('.log-content').forEach(content => content.style.display = 'none');
            document.getElementById(`log-content-${this.dataset.logCategory}`).style.display = 'block';
        });
    });
});

function showCategory(category) {
    document.querySelectorAll('.category-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(`${category}-section`).style.display = 'block';
    activeCategory = category;
    console.log(`[app.js] Switched to category: ${activeCategory}`);
}


function initializeCharts() {
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    salesChart = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Sales',
                data: [],
                borderColor: '#0071ce',
                backgroundColor: 'rgba(0, 113, 206, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                },
                y: {
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    const iotCtx = document.getElementById('iotChart').getContext('2d');
    iotChart = new Chart(iotCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature (°C)',
                data: [],
                borderColor: '#ffc220',
                backgroundColor: 'rgba(255, 194, 32, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                },
                y: {
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    const inventoryTurnoverCtx = document.getElementById('inventoryTurnoverChart').getContext('2d');
    inventoryTurnoverChart = new Chart(inventoryTurnoverCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Inventory Turnover',
                data: [],
                backgroundColor: '#0071ce',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    const onTimeDeliveryCtx = document.getElementById('onTimeDeliveryChart').getContext('2d');
    onTimeDeliveryChart = new Chart(onTimeDeliveryCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'On-Time Delivery',
                data: [],
                borderColor: '#0071ce',
                backgroundColor: 'rgba(0, 113, 206, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    const supplierOnTimeCtx = document.getElementById('supplierOnTimeChart').getContext('2d');
    supplierOnTimeChart = new Chart(supplierOnTimeCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Supplier On-Time Delivery',
                data: [],
                backgroundColor: '#ffc220',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    const transportCostCtx = document.getElementById('transportCostChart').getContext('2d');
    transportCostChart = new Chart(transportCostCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Transportation Cost/Mile',
                data: [],
                borderColor: '#ffc220',
                backgroundColor: 'rgba(255, 194, 32, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    const webTrafficCtx = document.getElementById('webTrafficChart').getContext('2d');
    webTrafficChart = new Chart(webTrafficCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Web Traffic',
                data: [],
                borderColor: '#0071ce',
                backgroundColor: 'rgba(0, 113, 206, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#666' },
                    grid: { color: '#eee' }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    const impactCtx = document.getElementById('impactChart').getContext('2d');
    impactChart = new Chart(impactCtx, {
        type: 'bar',
        data: {
            labels: ['Sales Increase', 'Inventory Saved'],
            datasets: [{
                label: 'Impact',
                data: [0, 0],
                backgroundColor: ['#4ade80', '#0071ce'],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

socket.on('update', (data) => {
    const lastUpdateEl = document.getElementById('last-update');
    lastUpdateEl.textContent = new Date().toLocaleTimeString();

    // The 'update' event is primarily for IoT data now. Sales are in metrics_update.
    if (data.type === 'iot') {
        updateChart(iotChart, data.timestamp, data.value);
        document.getElementById('current-temp').textContent = `${data.value.toFixed(1)}°C`;
        addLogEntry('metric-update', `IoT Data: Temperature - ${data.value.toFixed(1)}°C`);
    }
});

socket.on('anomaly', (anomaly) => {
    const anomalyAlertsEl = document.getElementById('anomaly-alerts');
    const alertEl = document.createElement('div');
    alertEl.className = 'alert-item';
    alertEl.innerHTML = `<strong>${anomaly.type.replace(/_/g, ' ').toUpperCase()}</strong>: ${anomaly.message}`;
    anomalyAlertsEl.prepend(alertEl);

    highlightMetrics(anomaly.affectedMetrics, 'red');
    applyAnomalyTrendIndicators(anomaly.metricChanges);
    activeAnomaly = anomaly;
    addLogEntry('anomaly', `Anomaly Detected: ${anomaly.message}`);
});

socket.on('decision', (decision) => {
    const decisionsDisplayEl = document.getElementById('decisions-display');
    const decisionEl = document.createElement('div');
    decisionEl.className = 'decision-item';
    decisionEl.innerHTML = `<strong>${decision.type.replace(/_/g, ' ').toUpperCase()}</strong>: ${decision.message}`;
    decisionsDisplayEl.prepend(decisionEl);
    addLogEntry('decision', `Decision Made: ${decision.message}`);
});

socket.on('decision_suggestion', (suggestion) => {
    //storedSuggestions[suggestion.id] = suggestion;
    const suggestionsContainer = document.getElementById('decision-suggestions');
    const suggestionEl = document.createElement('div');
    suggestionEl.id = `suggestion-${suggestion.id}`;
    suggestionEl.className = 'alert-item'; // Re-use alert-item style for now
    suggestionEl.innerHTML = `
        <p><strong>Suggested Decision:</strong> ${suggestion.message}</p>
        <button class="btn" onclick="approveDecision(${suggestion.id})">Approve</button>
        <button class="btn" onclick="rejectDecision(${suggestion.id})">Reject</button>
    `;
    suggestionsContainer.prepend(suggestionEl);
    addLogEntry('decision-suggestion', `New Decision Suggestion: ${suggestion.message}`);
});

socket.on('decision_impact_reported', (impactData) => {
    const impactDisplay = document.getElementById('decision-impact-display');
    document.getElementById('impact-sales-increase').textContent = impactData.impact.salesIncrease;
    document.getElementById('impact-inventory-saved').textContent = impactData.impact.inventorySaved;

    // Update impact chart
    impactChart.data.datasets[0].data[0] = impactData.impact.salesIncrease;
    impactChart.data.datasets[0].data[1] = impactData.impact.inventorySaved;
    impactChart.update();

    addLogEntry('decision-impact', `Decision Impact: ${impactData.message}. Sales Increase: ${impactData.impact.salesIncrease}, Inventory Saved: ${impactData.impact.inventorySaved} units`);
});

async function approveDecision(suggestionId) {
    const suggestionEl = document.getElementById(`suggestion-${suggestionId}`);
    if (!suggestionEl) return;

    // Retrieve the original suggestion data (you might need to store it globally or in a map)
    // For simplicity, let's assume we can reconstruct it or fetch it if needed.
    // In a real app, you'd pass the full suggestion object or its ID to the backend
    // and the backend would retrieve it from its temporary store.
    // For this example, we'll just send the ID and a generic message.
    const decisionToApprove = {
        id: suggestionId,
        type: 'user_approved',
        message: `User approved decision for suggestion ID ${suggestionId}`,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch('http://localhost:3001/api/approve_decision', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ decision: decisionToApprove }),
        });
        const result = await response.json();
        console.log(result.message);
        addLogEntry('decision', `Decision Approved: ${decisionToApprove.message}`);
        suggestionEl.remove(); // Remove the suggestion from UI
    } catch (error) {
        console.error('Error approving decision:', error);
        addLogEntry('error', `Error approving decision: ${error.message}`);
    }
}

function rejectDecision(suggestionId) {
    const suggestionEl = document.getElementById(`suggestion-${suggestionId}`);
    if (suggestionEl) {
        suggestionEl.remove();
        addLogEntry('decision-rejected', `Decision Rejected for suggestion ID ${suggestionId}`);
    }
}

socket.on('metrics_update', (metrics) => {
    document.getElementById('warehouse-occupancy').textContent = `${(metrics.warehouseOccupancy * 100).toFixed(1)}%`;
    document.getElementById('warehouse-items').textContent = metrics.warehouseItems;
    document.getElementById('waste-saved').textContent = `${metrics.wasteSaved} kg`;
    document.getElementById('carbon-reduced').textContent = `${metrics.carbonReduced} kg`;
    document.getElementById('open-stores').textContent = metrics.openStores;
    document.getElementById('on-time-delivery').textContent = `${metrics.onTimeDelivery}%`;
    document.getElementById('inventory-turnover').textContent = `${metrics.inventoryTurnover.toFixed(2)}`;
    document.getElementById('order-fulfillment-time').textContent = `${metrics.orderFulfillmentTime} hrs`;
    document.getElementById('supplier-on-time').textContent = `${metrics.supplierOnTimeDelivery}%`;
    document.getElementById('supplier-defect-rate').textContent = `${metrics.supplierDefectRate}%`;
    document.getElementById('transport-cost-per-mile').textContent = `${metrics.transportationCostPerMile}`;
    document.getElementById('warehouse-pick-rate').textContent = metrics.warehousePickRate;
    document.getElementById('return-rate').textContent = `${(metrics.returnRate * 100).toFixed(2)}%`;
    document.getElementById('current-web-traffic').textContent = metrics.webTraffic;
    document.getElementById('total-sales').textContent = metrics.sales; // Update sales from metrics_update

    document.getElementById('weather-icon').textContent = getWeatherIcon(metrics.weather.condition);
    document.getElementById('weather-temp').textContent = `${metrics.weather.temperature}°C`;
    document.getElementById('weather-condition').textContent = metrics.weather.condition;
    document.getElementById('humidity').textContent = `${metrics.weather.humidity}%`;

    // Update ALL charts regardless of active category
    updateChart(salesChart, new Date().toISOString(), metrics.sales);
    updateChart(webTrafficChart, new Date().toISOString(), metrics.webTraffic);
    updateChart(inventoryTurnoverChart, new Date().toISOString(), metrics.inventoryTurnover);
    updateChart(onTimeDeliveryChart, new Date().toISOString(), metrics.onTimeDelivery);
    updateChart(supplierOnTimeChart, new Date().toISOString(), metrics.supplierOnTimeDelivery);
    updateChart(transportCostChart, new Date().toISOString(), metrics.transportationCostPerMile);

    // Apply trend indicators
    applyTrendIndicators(metrics, previousMetrics);
    previousMetrics = { ...metrics }; // Store current metrics for next comparison

    // Re-apply anomaly highlighting on metric updates if an anomaly is active
    if (activeAnomaly) {
        highlightMetrics(activeAnomaly.affectedMetrics, 'red');
    }
    addLogEntry('metric-update', `Metrics Updated: Sales - ${metrics.sales}, Web Traffic - ${metrics.webTraffic}`);
});

function applyTrendIndicators(currentMetrics, previousMetrics) {
    for (const key in currentMetrics) {
        if (previousMetrics[key] !== undefined && typeof currentMetrics[key] === 'number' && typeof previousMetrics[key] === 'number') {
            const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase()); // Convert camelCase to kebab-case
            if (element) {
                let trendIndicator = '';
                if (currentMetrics[key] > previousMetrics[key]) {
                    trendIndicator = ' 📈'; // Up arrow
                } else if (currentMetrics[key] < previousMetrics[key]) {
                    trendIndicator = ' 📉'; // Down arrow
                }
                // Remove old indicator and add new one
                element.innerHTML = element.textContent.replace(/ [📈📉]/g, '') + trendIndicator;
            }
        }
    }
}

socket.on('ai_insights', (insight) => {
    document.getElementById('ai-insights-content').textContent = insight.insight;
    addLogEntry('ai-insight', `AI Insight: ${insight.insight}`);
});

socket.on('ai_solution', (data) => {
    const aiInsightsContent = document.getElementById('ai-insights-content');
    const solutionEl = document.createElement('div');
    solutionEl.className = 'ai-solution-item';
    solutionEl.innerHTML = `<strong>AI Solution for ${data.anomaly.type.replace(/_/g, ' ').toUpperCase()}:</strong> ${data.solution}`;
    aiInsightsContent.prepend(solutionEl);

    addLogEntry('ai-insight', `AI Solution: ${data.solution}`);

    // Clear anomaly highlighting after a solution is provided (or after a delay)
    setTimeout(() => {
        clearHighlights();
        clearAnomalyTrendIndicators(); // Clear anomaly trend indicators
        activeAnomaly = null;
    }, 10000); // Clear after 10 seconds
});

socket.on('simulation_result', (data) => {
    addLogEntry('simulation', `Simulation Result: ${data.message}`);
    highlightMetrics(data.affectedMetrics, 'red');
    applyAnomalyTrendIndicators(data.metricChanges);
    activeAnomaly = data;
});

// Add these socket listeners:
socket.on('demand_forecast', (data) => {
    document.getElementById('predicted-demand').textContent = data.predicted_demand;
    addLogEntry('forecast', `Demand Forecast: ${data.predicted_demand} units`);
});

socket.on('stock_levels_update', (data) => {
    console.log('Stock levels updated:', data);
    
    // Update warehouse stock displays
    const warehouse1Element = document.getElementById('warehouse-1-stock');
    const warehouse2Element = document.getElementById('warehouse-2-stock');
    const warehouse3Element = document.getElementById('warehouse-3-stock');
    const totalStockElement = document.getElementById('total-stock');
    
    if (warehouse1Element) {
        warehouse1Element.textContent = `${data.warehouse_1} units`;
    }
    if (warehouse2Element) {
        warehouse2Element.textContent = `${data.warehouse_2} units`;
    }
    if (warehouse3Element) {
        warehouse3Element.textContent = `${data.warehouse_3} units`;
    }
    if (totalStockElement) {
        totalStockElement.textContent = `${data.total_stock} units`;
    }
});

function applyAnomalyTrendIndicators(metricChanges) {
    clearAnomalyTrendIndicators(); // Clear existing indicators before applying new ones
    metricChanges.forEach(change => {
        const element = document.getElementById(change.id);
        if (element) {
            let indicator = '';
            if (change.changeType === 'increase') {
                indicator = ' ⬆️';
            } else if (change.changeType === 'decrease') {
                indicator = ' ⬇️';
            }
            // Remove existing anomaly indicators before adding new one
            element.innerHTML = element.textContent.replace(/ [⬆️⬇️]/g, '') + indicator;

            // Add a class for styling if needed (e.g., red for negative impact, green for positive)
            if (change.valueChange === 'significant' || change.valueChange === 'moderate') {
                if (change.changeType === 'decrease') {
                    element.classList.add('anomaly-negative-trend');
                } else if (change.changeType === 'increase') {
                    element.classList.add('anomaly-positive-trend');
                }
            }
        }
    });
}

function clearAnomalyTrendIndicators() {
    document.querySelectorAll('.anomaly-negative-trend').forEach(el => el.classList.remove('anomaly-negative-trend'));
    document.querySelectorAll('.anomaly-positive-trend').forEach(el => el.classList.remove('anomaly-positive-trend'));
    // Also remove the arrows
    document.querySelectorAll('.metric-value').forEach(el => {
        el.innerHTML = el.textContent.replace(/ [⬆️⬇️]/g, '');
    });
}

function updateChart(chart, label, newData) {
    chart.data.labels.push(new Date(label).toLocaleTimeString());
    chart.data.datasets.forEach((dataset) => {
        dataset.data.push(newData);
    });
    if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets.forEach((dataset) => {
            dataset.data.shift();
        });
    }
    chart.update();
}

function getWeatherIcon(condition) {
    switch (condition.toLowerCase()) {
        case 'sunny': return '☀️';
        case 'cloudy': return '☁️';
        case 'rainy': return '🌧️';
        case 'partly cloudy': return '⛅';
        case 'stormy': return '⛈️';
        default: return '❓';
    }
}

function highlightMetrics(metricIds, colorClass) {
    // Clear any existing highlights first
    clearHighlights();

    metricIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add(`highlight-${colorClass}`);
            // Also highlight the parent card for better visibility
            let parentCard = element.closest('.card');
            if (parentCard) {
                parentCard.classList.add(`highlight-${colorClass}-border`);
            }
        }
    });
}

function highlightStockLevels(stockLevel, element) {
    if (stockLevel < 200) {
        element.classList.add('highlight-red');
        element.classList.remove('highlight-green');
    } else if (stockLevel > 1500) {
        element.classList.add('highlight-green');
        element.classList.remove('highlight-red');
    } else {
        element.classList.remove('highlight-red', 'highlight-green');
    }
}

function clearHighlights() {
    document.querySelectorAll('.highlight-red').forEach(el => el.classList.remove('highlight-red'));
    document.querySelectorAll('.highlight-green').forEach(el => el.classList.remove('highlight-green'));
    document.querySelectorAll('.highlight-red-border').forEach(el => el.classList.remove('highlight-red-border'));
    document.querySelectorAll('.highlight-green-border').forEach(el => el.classList.remove('highlight-green-border'));
}

function addLogEntry(category, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `<div class="log-entry ${category}"><strong>[${timestamp}] [${category.toUpperCase()}]</strong> ${message}</div>`;

    document.getElementById('log-content-all').prepend(htmlToElement(logEntry));
    if (document.getElementById(`log-content-${category}`)) {
        document.getElementById(`log-content-${category}`).prepend(htmlToElement(logEntry));
    }
}

function htmlToElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}
