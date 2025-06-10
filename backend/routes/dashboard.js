/**
 * Dashboard API Routes
 * Aggregated data endpoints for monitoring dashboard
 */

const express = require('express');
const { validateQuery } = require('../websocket/validation');
const { MetricStore } = require('../database/metricStore');
const { allQuery, getQuery } = require('../database/init');

const router = express.Router();

// Initialize metric store
const logger = {
  debug: console.log,
  info: console.log,
  warn: console.warn,
  error: console.error
};
const metricStore = new MetricStore(logger);

// Get dashboard overview data
router.get('/overview', async (req, res) => {
  try {
    // Validate query parameters
    const validation = validateQuery('dashboard', req.query);
    if (validation.error) {
      return res.status(400).json({
        error: validation.error.details[0].message
      });
    }

    const query = validation.value;
    const dashboardData = await metricStore.getDashboardData(query);

    res.json(dashboardData);

  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get monitoring health status
router.get('/health', async (req, res) => {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Agent health
    const agentHealth = await getQuery(`
      SELECT 
        COUNT(*) as total_agents,
        COUNT(CASE WHEN last_seen >= ? THEN 1 END) as healthy_agents,
        COUNT(CASE WHEN last_seen < ? AND last_seen >= ? THEN 1 END) as warning_agents,
        COUNT(CASE WHEN last_seen < ? THEN 1 END) as stale_agents
      FROM agents
    `, [fiveMinutesAgo.toISOString(), fiveMinutesAgo.toISOString(), oneHourAgo.toISOString(), oneHourAgo.toISOString()]);

    // Metric ingestion health
    const metricHealth = await getQuery(`
      SELECT 
        COUNT(*) as total_metrics_5m,
        COUNT(DISTINCT agent_id) as active_agents_5m,
        AVG(
          CASE 
            WHEN total_metrics > 0 
            THEN CAST(processed AS FLOAT) / total_metrics 
            ELSE 1 
          END
        ) as success_rate
      FROM metric_batches 
      WHERE created_at >= ?
    `, [fiveMinutesAgo.toISOString()]);

    // System health score calculation
    const healthScore = calculateHealthScore(agentHealth, metricHealth);

    // Recent errors
    const recentErrors = await allQuery(`
      SELECT 
        agent_id, 
        SUM(errors) as error_count,
        MAX(created_at) as last_error
      FROM metric_batches 
      WHERE created_at >= ? AND errors > 0
      GROUP BY agent_id
      ORDER BY error_count DESC
      LIMIT 10
    `, [oneHourAgo.toISOString()]);

    res.json({
      timestamp: now,
      healthScore,
      status: getHealthStatus(healthScore),
      agents: {
        ...agentHealth,
        healthPercentage: agentHealth.total_agents > 0 
          ? Math.round((agentHealth.healthy_agents / agentHealth.total_agents) * 100)
          : 100
      },
      metrics: {
        ...metricHealth,
        successPercentage: Math.round((metricHealth.success_rate || 1) * 100)
      },
      issues: {
        recentErrors: recentErrors.map(error => ({
          ...error,
          last_error: new Date(error.last_error)
        }))
      }
    });

  } catch (error) {
    console.error('Error getting dashboard health:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get real-time activity feed
router.get('/activity', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Recent agent connections/disconnections
    const agentActivity = await allQuery(`
      SELECT 
        'agent_activity' as type,
        id as agent_id,
        provider,
        region,
        status,
        connected_at as timestamp,
        'connected' as action
      FROM agents 
      WHERE connected_at >= ?
      ORDER BY connected_at DESC
      LIMIT ?
    `, [oneHourAgo.toISOString(), Math.floor(limit / 2)]);

    // Recent metric batches with errors
    const errorActivity = await allQuery(`
      SELECT 
        'error' as type,
        agent_id,
        errors as error_count,
        total_metrics,
        created_at as timestamp,
        'metric_errors' as action
      FROM metric_batches 
      WHERE created_at >= ? AND errors > 0
      ORDER BY created_at DESC
      LIMIT ?
    `, [oneHourAgo.toISOString(), Math.floor(limit / 2)]);

    // Combine and sort activities
    const allActivity = [...agentActivity, ...errorActivity]
      .map(activity => ({
        ...activity,
        timestamp: new Date(activity.timestamp)
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    res.json({
      activity: allActivity,
      timeWindow: {
        start: oneHourAgo,
        end: new Date()
      }
    });

  } catch (error) {
    console.error('Error getting dashboard activity:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Helper functions
function calculateHealthScore(agentHealth, metricHealth) {
  let score = 100;
  
  // Reduce score based on agent health
  if (agentHealth.total_agents > 0) {
    const agentHealthPercentage = agentHealth.healthy_agents / agentHealth.total_agents;
    score *= agentHealthPercentage;
  }
  
  // Reduce score based on metric success rate
  if (metricHealth.success_rate) {
    score *= metricHealth.success_rate;
  }
  
  return Math.round(score);
}

function getHealthStatus(healthScore) {
  if (healthScore >= 90) return 'excellent';
  if (healthScore >= 75) return 'good';
  if (healthScore >= 50) return 'warning';
  return 'critical';
}

module.exports = router; 