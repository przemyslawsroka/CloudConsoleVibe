/**
 * Metrics API Routes
 * REST API endpoints for querying monitoring metrics
 */

const express = require('express');
const { validateQuery } = require('../websocket/validation');
const { MetricStore } = require('../database/metricStore');

const router = express.Router();

// Initialize metric store
const logger = {
  debug: console.log,
  info: console.log,
  warn: console.warn,
  error: console.error
};
const metricStore = new MetricStore(logger);

// Get metrics with filtering and pagination
router.get('/', async (req, res) => {
  try {
    // Validate query parameters
    const validation = validateQuery('metrics', req.query);
    if (validation.error) {
      return res.status(400).json({
        error: validation.error.details[0].message
      });
    }

    const query = validation.value;
    const metrics = await metricStore.getMetrics(query);

    res.json({
      metrics,
      query: {
        ...query,
        startTime: query.startTime ? new Date(query.startTime) : null,
        endTime: query.endTime ? new Date(query.endTime) : null
      },
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: metrics.length === query.limit
      }
    });

  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get aggregated metrics
router.get('/aggregated', async (req, res) => {
  try {
    // Validate query parameters
    const validation = validateQuery('metrics', req.query);
    if (validation.error) {
      return res.status(400).json({
        error: validation.error.details[0].message
      });
    }

    const query = validation.value;
    const aggregatedMetrics = await metricStore.getAggregatedMetrics(query);

    res.json({
      metrics: aggregatedMetrics,
      query: {
        ...query,
        startTime: query.startTime ? new Date(query.startTime) : null,
        endTime: query.endTime ? new Date(query.endTime) : null
      },
      aggregation: {
        type: query.aggregation || 'avg',
        interval: query.interval || '1h'
      }
    });

  } catch (error) {
    console.error('Error getting aggregated metrics:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get metric history for a specific metric name
router.get('/history/:metricName', async (req, res) => {
  try {
    const { metricName } = req.params;
    const { timeRange = '24h' } = req.query;

    const history = await metricStore.getMetricHistory(metricName, timeRange);

    res.json({
      metricName,
      timeRange,
      history
    });

  } catch (error) {
    console.error('Error getting metric history:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get metrics for a specific agent
router.get('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { timeRange = '24h' } = req.query;

    const metrics = await metricStore.getAgentMetrics(agentId, timeRange);

    res.json({
      agentId,
      timeRange,
      metrics
    });

  } catch (error) {
    console.error('Error getting agent metrics:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get metric names (for autocomplete/dropdowns)
router.get('/names', async (req, res) => {
  try {
    const { allQuery } = require('../database/init');
    
    const { provider, region, agentId } = req.query;
    
    let sql = 'SELECT DISTINCT name, type FROM metrics WHERE 1=1';
    const params = [];

    if (provider) {
      sql += ' AND provider = ?';
      params.push(provider);
    }

    if (region) {
      sql += ' AND region = ?';
      params.push(region);
    }

    if (agentId) {
      sql += ' AND agent_id = ?';
      params.push(agentId);
    }

    sql += ' ORDER BY name';

    const metricNames = await allQuery(sql, params);

    res.json({
      metricNames: metricNames.map(row => ({
        name: row.name,
        type: row.type
      })),
      filters: {
        provider,
        region,
        agentId
      }
    });

  } catch (error) {
    console.error('Error getting metric names:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get metric statistics
router.get('/stats', async (req, res) => {
  try {
    const { allQuery, getQuery } = require('../database/init');
    const { timeRange = '24h' } = req.query;

    // Parse time range
    const ranges = {
      '1h': 3600000,
      '6h': 21600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000
    };

    const timeMs = ranges[timeRange] || 86400000;
    const startTime = new Date(Date.now() - timeMs);

    // Overall statistics
    const overallStats = await getQuery(`
      SELECT 
        COUNT(*) as total_metrics,
        COUNT(DISTINCT name) as unique_metrics,
        COUNT(DISTINCT agent_id) as agents,
        COUNT(DISTINCT provider) as providers,
        COUNT(DISTINCT region) as regions,
        MIN(timestamp) as first_metric,
        MAX(timestamp) as last_metric
      FROM metrics 
      WHERE timestamp >= ?
    `, [startTime.toISOString()]);

    // Metrics by type
    const metricsByType = await allQuery(`
      SELECT 
        type, 
        COUNT(*) as count,
        COUNT(DISTINCT name) as unique_names,
        COUNT(DISTINCT agent_id) as agents
      FROM metrics 
      WHERE timestamp >= ?
      GROUP BY type
      ORDER BY count DESC
    `, [startTime.toISOString()]);

    // Top metrics by volume
    const topMetrics = await allQuery(`
      SELECT 
        name, 
        type,
        COUNT(*) as count,
        COUNT(DISTINCT agent_id) as agents
      FROM metrics 
      WHERE timestamp >= ?
      GROUP BY name, type
      ORDER BY count DESC
      LIMIT 20
    `, [startTime.toISOString()]);

    // Metrics by provider
    const metricsByProvider = await allQuery(`
      SELECT 
        provider, 
        COUNT(*) as count,
        COUNT(DISTINCT name) as unique_metrics,
        COUNT(DISTINCT agent_id) as agents
      FROM metrics 
      WHERE timestamp >= ? AND provider IS NOT NULL
      GROUP BY provider
      ORDER BY count DESC
    `, [startTime.toISOString()]);

    res.json({
      timeRange,
      period: {
        start: startTime,
        end: new Date()
      },
      overview: {
        ...overallStats,
        first_metric: overallStats.first_metric ? new Date(overallStats.first_metric) : null,
        last_metric: overallStats.last_metric ? new Date(overallStats.last_metric) : null
      },
      breakdown: {
        byType: metricsByType,
        byProvider: metricsByProvider,
        topMetrics
      }
    });

  } catch (error) {
    console.error('Error getting metric stats:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get real-time metrics (last 5 minutes)
router.get('/realtime', async (req, res) => {
  try {
    const { allQuery } = require('../database/init');
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const realtimeMetrics = await allQuery(`
      SELECT 
        agent_id, name, type, value, value_json, provider, region, timestamp
      FROM metrics 
      WHERE timestamp >= ?
      ORDER BY timestamp DESC
      LIMIT 1000
    `, [fiveMinutesAgo.toISOString()]);

    // Group by agent for easier consumption
    const metricsByAgent = realtimeMetrics.reduce((acc, metric) => {
      if (!acc[metric.agent_id]) {
        acc[metric.agent_id] = {
          agentId: metric.agent_id,
          provider: metric.provider,
          region: metric.region,
          metrics: []
        };
      }
      
      acc[metric.agent_id].metrics.push({
        name: metric.name,
        type: metric.type,
        value: metric.value_json ? JSON.parse(metric.value_json) : metric.value,
        timestamp: new Date(metric.timestamp)
      });
      
      return acc;
    }, {});

    res.json({
      timeWindow: {
        start: fiveMinutesAgo,
        end: new Date()
      },
      totalMetrics: realtimeMetrics.length,
      agents: Object.values(metricsByAgent)
    });

  } catch (error) {
    console.error('Error getting realtime metrics:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Search metrics by name pattern
router.get('/search', async (req, res) => {
  try {
    const { allQuery } = require('../database/init');
    const { q, limit = 50 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        error: 'Query parameter "q" must be at least 2 characters long'
      });
    }

    const searchResults = await allQuery(`
      SELECT DISTINCT 
        name, type, 
        COUNT(*) as occurrence_count,
        COUNT(DISTINCT agent_id) as agent_count,
        MAX(timestamp) as last_seen
      FROM metrics 
      WHERE name LIKE ?
      GROUP BY name, type
      ORDER BY occurrence_count DESC, last_seen DESC
      LIMIT ?
    `, [`%${q}%`, parseInt(limit)]);

    res.json({
      query: q,
      results: searchResults.map(row => ({
        ...row,
        last_seen: new Date(row.last_seen)
      }))
    });

  } catch (error) {
    console.error('Error searching metrics:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router; 