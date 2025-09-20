const { GoogleGenerativeAI } = require('@google/generative-ai');

class MessageBroker {
    constructor(io) {
        this.topics = {};
        this.io = io;
    }

    subscribe(topic, subscriber) {
        if (!this.topics[topic]) {
            this.topics[topic] = [];
        }
        this.topics[topic].push(subscriber);
    }

    // publish(topic, data) {
    //     if (this.topics[topic]) {
    //         this.topics[topic].forEach(subscriber => {
    //             subscriber.notify(topic, data);
    //         });
    //     }
    //     this.io.emit(topic, data);
    //     console.log(`[MessageBroker] Published topic: ${topic}, data:`, data);
    // }

    publish(topic, data) {
  // First, dispatch to any in‑process subscribers...
  if (this.topics[topic]) {
    this.topics[topic].forEach(subscriber => {
      // If they subscribed by passing an object with notify(), use that:
      if (typeof subscriber.notify === 'function') {
        subscriber.notify(topic, data);
      }
      // If they subscribed with a function, call it directly:
      else if (typeof subscriber === 'function') {
        subscriber(data);
      }
    });
  }

  // Then emit via socket.io:
  this.io.emit(topic, data);
  console.log(`[MessageBroker] Published topic: ${topic}, data:`, data);
}

}

class DataIngestionService {
    constructor(broker) {
        this.broker = broker;
    }

    ingest(data) {
    // Simulate writing to data lake
    this.dataLake = this.dataLake || [];
    this.dataLake.push(data);
    console.log(`[DataLake] Stored ${this.dataLake.length} records`);
    this.broker.publish('raw_data', data);
}
}

class DataProcessingService {
    constructor(broker) {
        this.broker = broker;
        this.broker.subscribe('raw_data', this);
    }

    notify(topic, data) {
        if (topic === 'raw_data') {
            console.log('Data Processing: Writing to data warehouse', data);
            this.broker.publish('processed_data', data);
            this.broker.publish('update', data);
        }
    }
}

class AnomalyDetectionService {
    constructor(broker) {
        this.broker = broker;
        this.broker.subscribe('processed_data', this);
        this.broker.subscribe('metrics_update', this);
    }

    notify(topic, data) {
        let anomaly = null;
        if (topic === 'processed_data') {
            anomaly = this.detectProcessedDataAnomaly(data);
        } else if (topic === 'metrics_update') {
            anomaly = this.detectMetricsAnomaly(data);
        }

        if (anomaly) {
            this.broker.publish('anomaly', anomaly);
        }
    }

    detectProcessedDataAnomaly(data) {
        if (data.type === 'pos' && data.sales > 250) {
            return {
                type: 'demand_surge',
                severity: 'high',
                message: `Unusual high demand detected: ${data.sales} units in ${data.store_id}`,
                timestamp: new Date().toISOString(),
                location: data.store_id,
                affectedMetrics: ['total-sales', 'avg-transaction'],
                metricChanges: [{
                    id: 'total-sales',
                    changeType: 'increase',
                    valueChange: 'significant'
                }]
            };
        }
        return null;
    }

    detectMetricsAnomaly(metrics) {
        if (metrics.onTimeDelivery < 90) {
            return {
                type: 'delivery_delay',
                severity: 'high',
                message: `On-time delivery dropped to ${metrics.onTimeDelivery}%`,
                timestamp: new Date().toISOString(),
                affectedMetrics: ['on-time-delivery'],
                metricChanges: [{
                    id: 'on-time-delivery',
                    changeType: 'decrease',
                    valueChange: 'significant'
                }]
            };
        }
        if (metrics.warehouseOccupancy > 0.95) {
            return {
                type: 'warehouse_full',
                severity: 'medium',
                message: `Warehouse occupancy at ${metrics.warehouseOccupancy * 100}% - nearing capacity!`,
                timestamp: new Date().toISOString(),
                affectedMetrics: ['warehouse-occupancy'],
                metricChanges: [{
                    id: 'warehouse-occupancy',
                    changeType: 'increase',
                    valueChange: 'significant'
                }]
            };
        }
        if (metrics.returnRate > 0.10) {
            return {
                type: 'high_return_rate',
                severity: 'medium',
                message: `Return rate increased to ${metrics.returnRate * 100}%`,
                timestamp: new Date().toISOString(),
                affectedMetrics: ['return-rate'],
                metricChanges: [{
                    id: 'return-rate',
                    changeType: 'increase',
                    valueChange: 'significant'
                }]
            };
        }
        return null;
    }
}

class SmartAutonomousDecisionMakingService {
    constructor(broker, io, aiInsightsService) {
        this.broker = broker;
        this.io = io;
        this.aiInsightsService = aiInsightsService; // Inject AIInsightsService
        this.broker.subscribe('anomaly', this);
        this.broker.subscribe('simulation_result', this);
    }

    notify(topic, data) {
        if (topic === 'anomaly' || topic === 'simulation_result') {
            const decisionSuggestion = this.makeDecision(data);
            if (decisionSuggestion) {
                decisionSuggestion.id = Date.now(); // Unique ID for the suggestion
                this.broker.publish('decision_suggestion', decisionSuggestion);
            }

            // Trigger AI insights for solution if it's an anomaly or simulation result
            if (data.type === 'anomaly' || data.type === 'simulation_result') {
                this.aiInsightsService.generateSolution(data);
            }
        }
    }

    executeApprovedDecision(decision) {
        console.log(`[SADM] Executing approved decision:`, decision);
        this.broker.publish('decision_made', decision);
        // Simulate impact after a delay
        setTimeout(() => {
            this.broker.publish('decision_impact_reported', {
                decisionId: decision.id,
                impact: {
                    salesIncrease: Math.floor(Math.random() * 500) + 100, // Example impact
                    inventorySaved: Math.floor(Math.random() * 200) + 50
                },
                message: `Decision '${decision.type}' impact reported.`
            });
        }, 10000); // Report impact after 10 seconds
    }

    makeDecision(data) {
        let decision = null;
        const anomalyType = data.anomaly ? data.anomaly.type : data.scenario; // Handle both anomaly and simulation_result

        switch (anomalyType) {
            case 'demand_surge':
            case 'seasonal_spike':
                decision = {
                    type: 'high_priority_restock',
                    message: `Suggested: High priority restock due to ${anomalyType.replace(/_/g, ' ')}.`,
                    timestamp: new Date().toISOString(),
                    details: { quantity: 500, priority: 'high', reason: anomalyType },
                    anomaly: data,
                };
                break;
            case 'delivery_delay':
                decision = {
                    type: 'reroute_shipment',
                    message: `Suggested: Reroute delayed shipments.`,
                    timestamp: new Date().toISOString(),
                    details: { impact: 'medium' },
                    anomaly: data,
                };
                break;
            case 'warehouse_full':
                decision = {
                    type: 'transfer_inventory',
                    message: `Suggested: Initiate inventory transfer to less occupied warehouse.`,
                    timestamp: new Date().toISOString(),
                    details: { quantity: 500, destination: 'Warehouse B' },
                    anomaly: data,
                };
                break;
            // Add other specific anomaly types here if needed
            default:
                decision = {
                    type: 'ai_suggested_action',
                    message: `Suggested action for ${anomalyType.replace(/_/g, ' ')}.`,
                    timestamp: new Date().toISOString(),
                    anomaly: data,
                };
                break;
        }
        return decision;
    }
}

class SimulationService {
    constructor(broker) {
        this.broker = broker;
        this.webTraffic = 1000; // Initial web traffic
    }

    run(scenario) {
        let message = `Simulating anomaly: ${scenario}.`;
        let impact = {};
        let affectedMetrics = [];
        let metricChanges = [];

        switch (scenario) {
            case 'demand_surge':
                message += ' Expect increased sales and potential stockouts.';
                impact = { salesIncrease: 0.3, stockoutRisk: true };
                affectedMetrics = ['total-sales', 'avg-transaction', 'inventory-turnover'];
                metricChanges = [
                    { id: 'total-sales', changeType: 'increase', valueChange: 'significant' },
                    { id: 'avg-transaction', changeType: 'increase', valueChange: 'moderate' },
                    { id: 'inventory-turnover', changeType: 'increase', valueChange: 'slight' }
                ];
                break;
            case 'delivery_delay':
                message += ' Expect delays in incoming inventory and potential customer dissatisfaction.';
                impact = { inventoryDelay: '24h', customerImpact: 'medium' };
                affectedMetrics = ['on-time-delivery', 'order-fulfillment-time'];
                metricChanges = [
                    { id: 'on-time-delivery', changeType: 'decrease', valueChange: 'significant' },
                    { id: 'order-fulfillment-time', changeType: 'increase', valueChange: 'significant' }
                ];
                break;
            case 'warehouse_fire':
                message += ' Simulating a warehouse fire. Expect significant inventory loss and operational disruption.';
                impact = { inventoryLoss: '80%', operationalDown: '48h' };
                affectedMetrics = ['warehouse-occupancy', 'warehouse-items', 'warehouse-pick-rate'];
                metricChanges = [
                    { id: 'warehouse-occupancy', changeType: 'decrease', valueChange: 'significant' },
                    { id: 'warehouse-items', changeType: 'decrease', valueChange: 'significant' },
                    { id: 'warehouse-pick-rate', changeType: 'decrease', valueChange: 'significant' }
                ];
                break;
            case 'supplier_strike':
                message += ' Simulating a supplier strike. Expect raw material shortages and production halts.';
                impact = { materialShortage: true, productionImpact: 'high' };
                affectedMetrics = ['supplier-on-time', 'supplier-defect-rate'];
                metricChanges = [
                    { id: 'supplier-on-time', changeType: 'decrease', valueChange: 'significant' },
                    { id: 'supplier-defect-rate', changeType: 'increase', valueChange: 'significant' }
                ];
                break;
            case 'web_traffic_spike':
                message += ' Simulating a web traffic spike. Expect increased website visitors and potential impact on sales.';
                this.webTraffic = Math.floor(this.webTraffic * 1.5); // Increase web traffic by 50%
                affectedMetrics = ['current-web-traffic', 'total-sales'];
                metricChanges = [
                    { id: 'current-web-traffic', changeType: 'increase', valueChange: 'significant' },
                    { id: 'total-sales', changeType: 'increase', valueChange: 'moderate' }
                ];
                break;
            case 'inventory_fill':
                message += ' Simulating inventory being filled. Expect increased warehouse occupancy and items.';
                affectedMetrics = ['warehouse-occupancy', 'warehouse-items'];
                metricChanges = [
                    { id: 'warehouse-occupancy', changeType: 'increase', valueChange: 'moderate' },
                    { id: 'warehouse-items', changeType: 'increase', valueChange: 'moderate' }
                ];
                break;
            case 'inventory_stockout':
                message += ' Simulating an inventory stockout. Expect decreased warehouse items and potential lost sales.';
                affectedMetrics = ['warehouse-occupancy', 'warehouse-items', 'total-sales'];
                metricChanges = [
                    { id: 'warehouse-occupancy', changeType: 'decrease', valueChange: 'moderate' },
                    { id: 'warehouse-items', changeType: 'decrease', valueChange: 'moderate' },
                    { id: 'total-sales', changeType: 'decrease', valueChange: 'moderate' }
                ];
                break;
            case 'seasonal_spike':
                message += ' Simulating a seasonal spike. Expect significant increase in sales and web traffic.';
                affectedMetrics = ['total-sales', 'current-web-traffic'];
                metricChanges = [
                    { id: 'total-sales', changeType: 'increase', valueChange: 'significant' },
                    { id: 'current-web-traffic', changeType: 'increase', valueChange: 'significant' }
                ];
                break;
            default:
                message += ' Unknown scenario.';
        }

        const result = {
            type: 'simulation_result',
            message: message,
            timestamp: new Date().toISOString(),
            scenario: scenario,
            impact: impact,
            affectedMetrics: affectedMetrics,
            metricChanges: metricChanges,
        };
        this.broker.publish('simulation_result', result);
    }

    getWebTraffic() {
        return this.webTraffic;
    }

    setWebTraffic(value) {
        this.webTraffic = value;
    }
}

class MetricsService {
    constructor(broker, simulationService) {
        this.broker = broker;
        this.simulationService = simulationService; // Inject SimulationService
        this.warehouseOccupancy = 0.75;
        this.warehouseItems = 15000;
        this.wasteSaved = 1200;
        this.carbonReduced = 800;
        this.openStores = 4500;
        this.onTimeDelivery = 98.5;
        this.inventoryTurnover = 12;
        this.orderFulfillmentTime = 24; // hours
        this.supplierOnTimeDelivery = 95;
        this.supplierDefectRate = 1.5;
        this.transportationCostPerMile = 2.50;
        this.warehousePickRate = 150;
        this.returnRate = 0.05;
        this.weather = {
            temperature: 25,
            condition: 'Sunny',
            humidity: 60,
            wind: 15
        };

        setInterval(() => this.generateMetrics(), 5000);
    }

    generateMetrics() {
        this.warehouseOccupancy = Math.min(1, Math.max(0.6, this.warehouseOccupancy + (Math.random() * 0.03 - 0.015)));
        this.warehouseItems = Math.floor(this.warehouseItems + (Math.random() * 200 - 100));
        this.wasteSaved = Math.floor(this.wasteSaved + (Math.random() * 20 - 10));
        this.carbonReduced = Math.floor(this.carbonReduced + (Math.random() * 15 - 7));
        this.openStores = Math.floor(this.openStores + (Math.random() * 5 - 2));
        this.onTimeDelivery = Math.min(100, Math.max(85, this.onTimeDelivery + (Math.random() * 1 - 0.5)));
        this.inventoryTurnover = Math.max(8, this.inventoryTurnover + (Math.random() * 0.5 - 0.25));
        this.orderFulfillmentTime = Math.max(18, this.orderFulfillmentTime + (Math.random() * 2 - 1));
        this.supplierOnTimeDelivery = Math.min(100, Math.max(80, this.supplierOnTimeDelivery + (Math.random() * 1 - 0.5)));
        this.supplierDefectRate = Math.max(0.5, this.supplierDefectRate + (Math.random() * 0.2 - 0.1));
        this.transportationCostPerMile = Math.max(2.00, this.transportationCostPerMile + (Math.random() * 0.1 - 0.05));
        this.warehousePickRate = Math.floor(this.warehousePickRate + (Math.random() * 10 - 5));
        this.returnRate = Math.max(0.01, this.returnRate + (Math.random() * 0.01 - 0.005));

        this.weather.temperature = Math.floor(20 + Math.random() * 15);
        this.weather.humidity = Math.floor(40 + Math.random() * 40);
        this.weather.wind = Math.floor(5 + Math.random() * 20);

        const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Stormy'];
        this.weather.condition = conditions[Math.floor(Math.random() * conditions.length)];

        // Incorporate web traffic into sales data
        const baseSales = Math.floor(Math.random() * 300);
        const webTrafficFactor = this.simulationService.getWebTraffic() / 1000; // Normalize by initial traffic
        const salesWithTraffic = Math.floor(baseSales * webTrafficFactor);

        const metricsData = {
            warehouseOccupancy: this.warehouseOccupancy.toFixed(2),
            warehouseItems: this.warehouseItems,
            wasteSaved: this.wasteSaved,
            carbonReduced: this.carbonReduced,
            openStores: this.openStores,
            onTimeDelivery: this.onTimeDelivery.toFixed(2),
            inventoryTurnover: this.inventoryTurnover,
            orderFulfillmentTime: this.orderFulfillmentTime.toFixed(0),
            supplierOnTimeDelivery: this.supplierOnTimeDelivery.toFixed(2),
            supplierDefectRate: this.supplierDefectRate.toFixed(2),
            transportationCostPerMile: this.transportationCostPerMile.toFixed(2),
            warehousePickRate: this.warehousePickRate,
            returnRate: this.returnRate.toFixed(3),
            weather: this.weather,
            webTraffic: this.simulationService.getWebTraffic(),
            sales: salesWithTraffic, // Updated sales
        };
        console.log('[MetricsService] Generated metrics:', metricsData);
        this.broker.publish('metrics_update', metricsData);
    }
}

class AIInsightsService {
    constructor(broker) {
        this.broker = broker;
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your-api-key here');
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        setInterval(() => this.generateInsights(), 15000);
    }

    async generateInsights() {
        try {
            const prompt = "Generate a concise, actionable supply chain insight or a potential anomaly alert. Focus on metrics like inventory, delivery, or sustainability. Keep it under 40 words.";
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            this.broker.publish('ai_insights', { insight: text });
        } catch (error) {
            console.error("Error generating AI insights:", error);
            this.broker.publish('ai_insights', { insight: "Error generating insights. Check API key or model access." });
        }
    }

    async generateSolution(anomalyData) {
        try {
            const prompt = `An anomaly has been detected in the supply chain: ${anomalyData.message}. Its type is ${anomalyData.type}. The affected metrics are: ${JSON.stringify(anomalyData.metricChanges)}. What is a plausible solution or recommended action? Keep it concise, under 70 words.`;
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            this.broker.publish('ai_solution', { solution: text, anomaly: anomalyData });
        } catch (error) {
            console.error("Error generating AI solution:", error);
            this.broker.publish('ai_solution', { solution: "Could not generate solution.", anomaly: anomalyData });
        }
    }
}

class DemandForecastingService {
    constructor(broker) {
        this.broker = broker;
        this.broker.subscribe('processed_data', this);
        this.forecastData = { predicted_demand: 100, confidence: 0.8 };
    }
    
    notify(topic, data) {
        if (topic === 'processed_data') {
            // Simple forecasting logic
            this.forecastData.predicted_demand = Math.floor(80 + Math.random() * 40);
            this.broker.publish('demand_forecast', this.forecastData);
        }
    }
}

class InventoryManagementService {
    constructor(broker) {
        this.broker = broker;
        this.broker.subscribe('demand_forecast', this);
        this.broker.subscribe('processed_data', this);
        this.broker.subscribe('simulation_result', this);
        this.stockLevels = { 
            warehouse_1: 1000, 
            warehouse_2: 800, 
            warehouse_3: 1200 
        };
        
        // Update stock levels periodically
        setInterval(() => this.updateStockLevels(), 8000);
    }
    
    notify(topic, data) {
        if (topic === 'demand_forecast' && data.predicted_demand > 120) {
            this.broker.publish('restock_alert', {
                message: 'High demand predicted - consider restocking',
                predicted_demand: data.predicted_demand
            });
        }
        
        if (topic === 'simulation_result') {
            this.handleSimulationImpact(data);
        }
    }
    
    updateStockLevels() {
        // Simulate normal stock level changes
        this.stockLevels.warehouse_1 = Math.max(0, this.stockLevels.warehouse_1 + (Math.random() * 100 - 50));
        this.stockLevels.warehouse_2 = Math.max(0, this.stockLevels.warehouse_2 + (Math.random() * 80 - 40));
        this.stockLevels.warehouse_3 = Math.max(0, this.stockLevels.warehouse_3 + (Math.random() * 120 - 60));
        
        const totalStock = this.stockLevels.warehouse_1 + this.stockLevels.warehouse_2 + this.stockLevels.warehouse_3;
        
        this.broker.publish('stock_levels_update', {
            warehouse_1: Math.floor(this.stockLevels.warehouse_1),
            warehouse_2: Math.floor(this.stockLevels.warehouse_2),
            warehouse_3: Math.floor(this.stockLevels.warehouse_3),
            total_stock: Math.floor(totalStock)
        });
    }
    
    handleSimulationImpact(data) {
        switch(data.scenario) {
            case 'inventory_fill':
                this.stockLevels.warehouse_1 += 200;
                this.stockLevels.warehouse_2 += 150;
                this.stockLevels.warehouse_3 += 250;
                break;
            case 'inventory_stockout':
                this.stockLevels.warehouse_1 = Math.max(0, this.stockLevels.warehouse_1 - 300);
                this.stockLevels.warehouse_2 = Math.max(0, this.stockLevels.warehouse_2 - 200);
                this.stockLevels.warehouse_3 = Math.max(0, this.stockLevels.warehouse_3 - 400);
                break;
            case 'demand_surge':
            case 'seasonal_spike':
                this.stockLevels.warehouse_1 = Math.max(0, this.stockLevels.warehouse_1 - 100);
                this.stockLevels.warehouse_2 = Math.max(0, this.stockLevels.warehouse_2 - 80);
                this.stockLevels.warehouse_3 = Math.max(0, this.stockLevels.warehouse_3 - 120);
                break;
        }
        
        // Emit updated stock levels immediately after simulation
        this.updateStockLevels();
    }
}

module.exports = { MessageBroker, DataIngestionService, DataProcessingService, AnomalyDetectionService, SmartAutonomousDecisionMakingService, SimulationService, MetricsService, AIInsightsService, DemandForecastingService, InventoryManagementService };