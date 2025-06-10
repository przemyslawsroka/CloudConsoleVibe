/**
 * Metric Store
 * Database operations for storing and retrieving metrics
 */

const { runQuery, getQuery, allQuery } = require('./init');

class MetricStore {
  constructor(logger) {
    this.logger = logger;
    this.totalProcessed = 0;
    this.totalErrors = 0;
  }

  async storeMetrics(type, metrics) {
    try {
      // Prepare batch insert
      const values = [];
      const placeholders = [];

      for (const metric of metrics) {
        values.push(
          metric.agentId,
          metric.name,
          metric.type,
          typeof metric.value === 'number' ? metric.value : null,
          typeof metric.value === 'object' ? JSON.stringify(metric.value) : null,
          metric.unit || null,
          metric.tags ? JSON.stringify(metric.tags) : null,
          metric.location?.provider || null,
          metric.location?.region || null,
          metric.location?.zone || null,
          metric.timestamp.toISOString(),
          metric.receivedAt.toISOString()
        );
        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      }

      const sql = `
        INSERT INTO metrics (
          agent_id, name, type, value, value_json, unit, tags,
          provider, region, zone, timestamp, received_at
        ) VALUES ${placeholders.join(', ')}
      `;

      await runQuery(sql, values);
      this.totalProcessed += metrics.length;

      this.logger.debug('Stored metrics batch', {
        type,
        count: metrics.length,
        totalProcessed: this.totalProcessed
      });

    } catch (error) {
      this.totalErrors += metrics.length;
      this.logger.error('Error storing metrics:', {
        type,
        count: metrics.length,
        error: error.message
      });
      throw error;
    }
  }

  async storeBatchRecord(batchData) {
    try {
      const sql = `
        INSERT INTO metric_batches (
          agent_id, timestamp, total_metrics, processed, errors, location
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      await runQuery(sql, [
        batchData.agentId,
        batchData.timestamp,
        batchData.totalMetrics,
        batchData.processed,
        batchData.errors,
        JSON.stringify(batchData.location || {})
      ]);

    } catch (error) {
      this.logger.error('Error storing batch record:', error);
      throw error;
    }
  }

  async getMetrics(query) {
    try {
      let sql = `
        SELECT 
          id, agent_id, name, type, value, value_json, unit, tags,
          provider, region, zone, timestamp, received_at
        FROM metrics 
        WHERE 1=1
      `;
      const params = [];

      // Apply filters
      if (query.agentId) {
        sql += ' AND agent_id = ?';
        params.push(query.agentId);
      }

      if (query.provider) {
        sql += ' AND provider = ?';
        params.push(query.provider);
      }

      if (query.region) {
        sql += ' AND region = ?';
        params.push(query.region);
      }

      if (query.metricName) {
        sql += ' AND name = ?';
        params.push(query.metricName);
      }

      if (query.metricType) {
        sql += ' AND type = ?';
        params.push(query.metricType);
      }

      if (query.startTime) {
        sql += ' AND timestamp >= ?';
        params.push(query.startTime);
      }

      if (query.endTime) {
        sql += ' AND timestamp <= ?';
        params.push(query.endTime);
      }

      // Order and limit
      sql += ' ORDER BY timestamp DESC';
      
      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      if (query.offset) {
        sql += ' OFFSET ?';
        params.push(query.offset);
      }

      const rows = await allQuery(sql, params);

      // Parse JSON fields
      return rows.map(row => ({
        ...row,
        value: row.value_json ? JSON.parse(row.value_json) : row.value,
        tags: row.tags ? JSON.parse(row.tags) : null,
        timestamp: new Date(row.timestamp),
        received_at: new Date(row.received_at)
      }));

    } catch (error) {
      this.logger.error('Error getting metrics:', error);
      throw error;
    }
  }

  async getAggregatedMetrics(query) {
    try {
      const { aggregation = 'avg', interval = '1h' } = query;
      
      // SQLite doesn't have native interval functions, so we'll group by time buckets
      const intervalMinutes = this.parseInterval(interval);
      
      let sql = `
        SELECT 
          name,
          type,
          provider,
          region,
          datetime(
            strftime('%s', timestamp) / ${intervalMinutes * 60} * ${intervalMinutes * 60},
            'unixepoch'
          ) as time_bucket,
          ${this.getAggregationSQL(aggregation)} as value,
          COUNT(*) as count
        FROM metrics 
        WHERE 1=1
      `;
      const params = [];

      // Apply same filters as getMetrics
      if (query.agentId) {
        sql += ' AND agent_id = ?';
        params.push(query.agentId);
      }

      if (query.provider) {
        sql += ' AND provider = ?';
        params.push(query.provider);
      }

      if (query.region) {
        sql += ' AND region = ?';
        params.push(query.region);
      }

      if (query.metricName) {
        sql += ' AND name = ?';
        params.push(query.metricName);
      }

      if (query.startTime) {
        sql += ' AND timestamp >= ?';
        params.push(query.startTime);
      }

      if (query.endTime) {
        sql += ' AND timestamp <= ?';
        params.push(query.endTime);
      }

      sql += ' GROUP BY name, type, provider, region, time_bucket';
      sql += ' ORDER BY time_bucket DESC';

      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      const rows = await allQuery(sql, params);

      return rows.map(row => ({
        ...row,
        time_bucket: new Date(row.time_bucket)
      }));

    } catch (error) {
      this.logger.error('Error getting aggregated metrics:', error);
      throw error;
    }
  }

  async getMetricHistory(metricName, timeRange) {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - this.parseTimeRange(timeRange));

      const sql = `
        SELECT 
          agent_id, provider, region, timestamp, value, value_json
        FROM metrics 
        WHERE name = ? AND timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC
      `;

      const rows = await allQuery(sql, [metricName, startTime.toISOString(), endTime.toISOString()]);

      return rows.map(row => ({
        ...row,
        value: row.value_json ? JSON.parse(row.value_json) : row.value,
        timestamp: new Date(row.timestamp)
      }));

    } catch (error) {
      this.logger.error('Error getting metric history:', error);
      throw error;
    }
  }

  async getAgentMetrics(agentId, timeRange) {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - this.parseTimeRange(timeRange));

      const sql = `
        SELECT 
          name, type, value, value_json, unit, tags, timestamp
        FROM metrics 
        WHERE agent_id = ? AND timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp DESC
      `;

      const rows = await allQuery(sql, [agentId, startTime.toISOString(), endTime.toISOString()]);

      return rows.map(row => ({
        ...row,
        value: row.value_json ? JSON.parse(row.value_json) : row.value,
        tags: row.tags ? JSON.parse(row.tags) : null,
        timestamp: new Date(row.timestamp)
      }));

    } catch (error) {
      this.logger.error('Error getting agent metrics:', error);
      throw error;
    }
  }

  async getDashboardData(query) {
    try {
      const { timeRange = '24h' } = query;
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - this.parseTimeRange(timeRange));

      // Get summary statistics
      const summarySQL = `
        SELECT 
          COUNT(DISTINCT agent_id) as total_agents,
          COUNT(*) as total_metrics,
          COUNT(DISTINCT name) as unique_metrics,
          COUNT(DISTINCT provider) as providers,
          COUNT(DISTINCT region) as regions
        FROM metrics 
        WHERE timestamp >= ? AND timestamp <= ?
      `;

      const summary = await getQuery(summarySQL, [startTime.toISOString(), endTime.toISOString()]);

      // Get metrics by provider
      const providerSQL = `
        SELECT 
          provider, 
          COUNT(*) as metric_count,
          COUNT(DISTINCT agent_id) as agent_count
        FROM metrics 
        WHERE timestamp >= ? AND timestamp <= ?
        GROUP BY provider
        ORDER BY metric_count DESC
      `;

      const providerStats = await allQuery(providerSQL, [startTime.toISOString(), endTime.toISOString()]);

      // Get recent metrics
      const recentSQL = `
        SELECT 
          agent_id, name, type, value, value_json, provider, region, timestamp
        FROM metrics 
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp DESC
        LIMIT 100
      `;

      const recentMetrics = await allQuery(recentSQL, [startTime.toISOString(), endTime.toISOString()]);

      return {
        summary,
        providerStats,
        recentMetrics: recentMetrics.map(row => ({
          ...row,
          value: row.value_json ? JSON.parse(row.value_json) : row.value,
          timestamp: new Date(row.timestamp)
        })),
        timeRange: {
          start: startTime,
          end: endTime
        }
      };

    } catch (error) {
      this.logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  async cleanupOldMetrics() {
    try {
      // Delete metrics older than 30 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const sql = 'DELETE FROM metrics WHERE timestamp < ?';
      const result = await runQuery(sql, [cutoffDate.toISOString()]);

      this.logger.info('Cleaned up old metrics', {
        deletedRows: result.changes,
        cutoffDate: cutoffDate.toISOString()
      });

      return result.changes;

    } catch (error) {
      this.logger.error('Error cleaning up old metrics:', error);
      throw error;
    }
  }

  // Helper methods
  parseInterval(interval) {
    const intervals = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '1h': 60,
      '6h': 360,
      '1d': 1440
    };
    return intervals[interval] || 60;
  }

  parseTimeRange(timeRange) {
    const ranges = {
      '1h': 3600000,
      '6h': 21600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000
    };
    return ranges[timeRange] || 86400000;
  }

  getAggregationSQL(aggregation) {
    switch (aggregation) {
      case 'sum':
        return 'SUM(value)';
      case 'min':
        return 'MIN(value)';
      case 'max':
        return 'MAX(value)';
      case 'count':
        return 'COUNT(*)';
      case 'avg':
      default:
        return 'AVG(value)';
    }
  }

  getTotalProcessed() {
    return this.totalProcessed;
  }

  getTotalErrors() {
    return this.totalErrors;
  }
}

module.exports = { MetricStore }; 