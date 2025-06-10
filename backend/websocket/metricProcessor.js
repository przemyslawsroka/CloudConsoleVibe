/**
 * Metric Processor
 * Processes and stores metrics from monitoring agents
 */

const { MetricStore } = require('../database/metricStore');

class MetricProcessor {
  constructor(logger) {
    this.logger = logger;
    this.metricStore = new MetricStore(logger);
    this.processingQueue = [];
    this.isProcessing = false;
    
    // Start background processing
    this.startBackgroundProcessing();
  }

  async processMetrics(data) {
    const { agentId, timestamp, location, metrics } = data;
    
    const result = {
      processed: 0,
      errors: 0,
      details: []
    };

    try {
      // Validate input
      if (!agentId || !metrics || !Array.isArray(metrics)) {
        throw new Error('Invalid input data');
      }

      // Process each metric
      for (const metric of metrics) {
        try {
          await this.processMetric({
            agentId,
            timestamp: timestamp || new Date().toISOString(),
            location: location || {},
            metric
          });
          
          result.processed++;
          result.details.push({
            name: metric.name,
            status: 'success'
          });

        } catch (error) {
          result.errors++;
          result.details.push({
            name: metric.name,
            status: 'error',
            error: error.message
          });

          this.logger.error('Error processing individual metric:', {
            agentId,
            metricName: metric.name,
            error: error.message
          });
        }
      }

      // Store batch record
      await this.metricStore.storeBatchRecord({
        agentId,
        timestamp,
        location,
        totalMetrics: metrics.length,
        processed: result.processed,
        errors: result.errors
      });

      this.logger.debug('Metrics batch processed', {
        agentId,
        total: metrics.length,
        processed: result.processed,
        errors: result.errors
      });

    } catch (error) {
      this.logger.error('Error processing metrics batch:', {
        agentId,
        error: error.message,
        stack: error.stack
      });
      
      result.errors = metrics.length;
      throw error;
    }

    return result;
  }

  async processMetric(data) {
    const { agentId, timestamp, location, metric } = data;

    // Validate metric structure
    if (!this.validateMetric(metric)) {
      throw new Error(`Invalid metric structure: ${JSON.stringify(metric)}`);
    }

    // Enrich metric with metadata
    const enrichedMetric = {
      ...metric,
      agentId,
      timestamp: new Date(timestamp),
      location,
      receivedAt: new Date(),
      processed: false
    };

    // Add to processing queue
    this.processingQueue.push(enrichedMetric);

    // Trigger processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  validateMetric(metric) {
    // Required fields
    if (!metric.name || typeof metric.name !== 'string') {
      return false;
    }

    if (metric.value === undefined || metric.value === null) {
      return false;
    }

    if (!metric.type || typeof metric.type !== 'string') {
      return false;
    }

    // Valid metric types
    const validTypes = ['gauge', 'counter', 'histogram', 'timer'];
    if (!validTypes.includes(metric.type)) {
      return false;
    }

    // Type-specific validation
    switch (metric.type) {
      case 'gauge':
      case 'counter':
        if (typeof metric.value !== 'number') {
          return false;
        }
        break;

      case 'histogram':
      case 'timer':
        if (typeof metric.value !== 'object' || !metric.value.value) {
          return false;
        }
        break;
    }

    return true;
  }

  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process in batches
      const batchSize = 100;
      
      while (this.processingQueue.length > 0) {
        const batch = this.processingQueue.splice(0, batchSize);
        
        await this.processBatch(batch);
        
        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 10));
      }

    } catch (error) {
      this.logger.error('Error processing metric queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processBatch(metrics) {
    try {
      // Group metrics by type for optimized storage
      const metricsByType = this.groupMetricsByType(metrics);

      // Process each type
      for (const [type, typeMetrics] of Object.entries(metricsByType)) {
        await this.metricStore.storeMetrics(type, typeMetrics);
      }

      // Mark as processed
      metrics.forEach(metric => {
        metric.processed = true;
      });

      this.logger.debug('Processed metrics batch', {
        total: metrics.length,
        types: Object.keys(metricsByType)
      });

    } catch (error) {
      this.logger.error('Error processing metrics batch:', error);
      throw error;
    }
  }

  groupMetricsByType(metrics) {
    const grouped = {};

    metrics.forEach(metric => {
      if (!grouped[metric.type]) {
        grouped[metric.type] = [];
      }
      grouped[metric.type].push(metric);
    });

    return grouped;
  }

  startBackgroundProcessing() {
    // Process queue every 5 seconds
    setInterval(() => {
      if (this.processingQueue.length > 0) {
        this.processQueue();
      }
    }, 5000);

    // Cleanup old metrics every hour
    setInterval(async () => {
      try {
        await this.metricStore.cleanupOldMetrics();
      } catch (error) {
        this.logger.error('Error during metric cleanup:', error);
      }
    }, 3600000); // 1 hour
  }

  // Public methods for querying metrics
  async getMetrics(query) {
    return await this.metricStore.getMetrics(query);
  }

  async getAggregatedMetrics(query) {
    return await this.metricStore.getAggregatedMetrics(query);
  }

  async getMetricHistory(metricName, timeRange) {
    return await this.metricStore.getMetricHistory(metricName, timeRange);
  }

  async getAgentMetrics(agentId, timeRange) {
    return await this.metricStore.getAgentMetrics(agentId, timeRange);
  }

  // Statistics
  getProcessingStats() {
    return {
      queueSize: this.processingQueue.length,
      isProcessing: this.isProcessing,
      totalProcessed: this.metricStore.getTotalProcessed(),
      totalErrors: this.metricStore.getTotalErrors()
    };
  }
}

module.exports = { MetricProcessor }; 