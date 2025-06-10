/**
 * Agent Management Routes
 * REST API endpoints for managing monitoring agents
 */

const express = require('express');
const { validateQuery, validateAgentConfig } = require('../websocket/validation');
const { runQuery, getQuery, allQuery } = require('../database/init');

const router = express.Router();

// Get all agents
router.get('/', async (req, res) => {
  try {
    // Validate query parameters
    const validation = validateQuery('agents', req.query);
    if (validation.error) {
      return res.status(400).json({
        error: validation.error.details[0].message
      });
    }

    const query = validation.value;
    let sql = `
      SELECT 
        id, provider, region, zone, instance_id, ip_address, version,
        status, capabilities, connected_at, last_seen, last_registration,
        total_messages, total_metrics, total_errors
      FROM agents 
      WHERE 1=1
    `;
    const params = [];

    // Apply filters
    if (query.status !== 'all') {
      sql += ' AND status = ?';
      params.push(query.status);
    }

    if (query.provider) {
      sql += ' AND provider = ?';
      params.push(query.provider);
    }

    if (query.region) {
      sql += ' AND region = ?';
      params.push(query.region);
    }

    // Order and pagination
    sql += ' ORDER BY last_seen DESC';
    
    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    const agents = await allQuery(sql, params);

    // Parse JSON fields
    const processedAgents = agents.map(agent => ({
      ...agent,
      capabilities: agent.capabilities ? JSON.parse(agent.capabilities) : [],
      connected_at: new Date(agent.connected_at),
      last_seen: new Date(agent.last_seen),
      last_registration: agent.last_registration ? new Date(agent.last_registration) : null
    }));

    // Get total count for pagination
    let countSQL = 'SELECT COUNT(*) as total FROM agents WHERE 1=1';
    const countParams = [];

    if (query.status !== 'all') {
      countSQL += ' AND status = ?';
      countParams.push(query.status);
    }

    if (query.provider) {
      countSQL += ' AND provider = ?';
      countParams.push(query.provider);
    }

    if (query.region) {
      countSQL += ' AND region = ?';
      countParams.push(query.region);
    }

    const countResult = await getQuery(countSQL, countParams);

    res.json({
      agents: processedAgents,
      pagination: {
        total: countResult.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: countResult.total > (query.offset + query.limit)
      }
    });

  } catch (error) {
    console.error('Error getting agents:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get specific agent
router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await getQuery(`
      SELECT 
        id, provider, region, zone, instance_id, ip_address, version,
        status, capabilities, connected_at, last_seen, last_registration,
        total_messages, total_metrics, total_errors, created_at, updated_at
      FROM agents 
      WHERE id = ?
    `, [agentId]);

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found'
      });
    }

    // Parse JSON fields
    const processedAgent = {
      ...agent,
      capabilities: agent.capabilities ? JSON.parse(agent.capabilities) : [],
      connected_at: new Date(agent.connected_at),
      last_seen: new Date(agent.last_seen),
      last_registration: agent.last_registration ? new Date(agent.last_registration) : null,
      created_at: new Date(agent.created_at),
      updated_at: new Date(agent.updated_at)
    };

    // Get recent metrics for this agent
    const recentMetrics = await allQuery(`
      SELECT name, type, value, value_json, timestamp
      FROM metrics 
      WHERE agent_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 10
    `, [agentId]);

    processedAgent.recentMetrics = recentMetrics.map(metric => ({
      ...metric,
      value: metric.value_json ? JSON.parse(metric.value_json) : metric.value,
      timestamp: new Date(metric.timestamp)
    }));

    res.json(processedAgent);

  } catch (error) {
    console.error('Error getting agent:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get agent statistics
router.get('/:agentId/stats', async (req, res) => {
  try {
    const { agentId } = req.params;
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

    // Get metric statistics
    const stats = await getQuery(`
      SELECT 
        COUNT(*) as total_metrics,
        COUNT(DISTINCT name) as unique_metrics,
        MIN(timestamp) as first_metric,
        MAX(timestamp) as last_metric
      FROM metrics 
      WHERE agent_id = ? AND timestamp >= ?
    `, [agentId, startTime.toISOString()]);

    // Get metrics by type
    const metricsByType = await allQuery(`
      SELECT 
        type, 
        COUNT(*) as count,
        COUNT(DISTINCT name) as unique_names
      FROM metrics 
      WHERE agent_id = ? AND timestamp >= ?
      GROUP BY type
      ORDER BY count DESC
    `, [agentId, startTime.toISOString()]);

    // Get top metrics by count
    const topMetrics = await allQuery(`
      SELECT 
        name, 
        type,
        COUNT(*) as count,
        MIN(value) as min_value,
        MAX(value) as max_value,
        AVG(value) as avg_value
      FROM metrics 
      WHERE agent_id = ? AND timestamp >= ? AND value IS NOT NULL
      GROUP BY name, type
      ORDER BY count DESC
      LIMIT 10
    `, [agentId, startTime.toISOString()]);

    res.json({
      timeRange,
      period: {
        start: startTime,
        end: new Date()
      },
      overview: {
        ...stats,
        first_metric: stats.first_metric ? new Date(stats.first_metric) : null,
        last_metric: stats.last_metric ? new Date(stats.last_metric) : null
      },
      metricsByType,
      topMetrics
    });

  } catch (error) {
    console.error('Error getting agent stats:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Update agent configuration
router.put('/:agentId/config', async (req, res) => {
  try {
    const { agentId } = req.params;
    const config = req.body;

    // Validate configuration
    const validation = validateAgentConfig(config);
    if (validation.error) {
      return res.status(400).json({
        error: validation.error.details[0].message
      });
    }

    // Check if agent exists
    const agent = await getQuery('SELECT id FROM agents WHERE id = ?', [agentId]);
    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found'
      });
    }

    // Upsert configuration
    const configJSON = JSON.stringify(validation.value);
    
    await runQuery(`
      INSERT INTO agent_configs (agent_id, config, version, updated_at) 
      VALUES (?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(agent_id) DO UPDATE SET 
        config = excluded.config,
        version = version + 1,
        updated_at = CURRENT_TIMESTAMP
    `, [agentId, configJSON]);

    res.json({
      message: 'Configuration updated successfully',
      agentId,
      config: validation.value
    });

  } catch (error) {
    console.error('Error updating agent config:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get agent configuration
router.get('/:agentId/config', async (req, res) => {
  try {
    const { agentId } = req.params;

    const configRow = await getQuery(`
      SELECT config, version, created_at, updated_at
      FROM agent_configs 
      WHERE agent_id = ?
    `, [agentId]);

    if (!configRow) {
      return res.status(404).json({
        error: 'Configuration not found'
      });
    }

    res.json({
      agentId,
      config: JSON.parse(configRow.config),
      version: configRow.version,
      created_at: new Date(configRow.created_at),
      updated_at: new Date(configRow.updated_at)
    });

  } catch (error) {
    console.error('Error getting agent config:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Delete agent (admin only)
router.delete('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;

    // Check if agent exists
    const agent = await getQuery('SELECT id FROM agents WHERE id = ?', [agentId]);
    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found'
      });
    }

    // Delete related data
    await runQuery('DELETE FROM metrics WHERE agent_id = ?', [agentId]);
    await runQuery('DELETE FROM metric_batches WHERE agent_id = ?', [agentId]);
    await runQuery('DELETE FROM agent_configs WHERE agent_id = ?', [agentId]);
    await runQuery('DELETE FROM agents WHERE id = ?', [agentId]);

    res.json({
      message: 'Agent deleted successfully',
      agentId
    });

  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get agent summary statistics
router.get('/summary/stats', async (req, res) => {
  try {
    // Overall statistics
    const overallStats = await getQuery(`
      SELECT 
        COUNT(*) as total_agents,
        COUNT(CASE WHEN status = 'connected' THEN 1 END) as connected_agents,
        COUNT(DISTINCT provider) as total_providers,
        COUNT(DISTINCT region) as total_regions
      FROM agents
    `);

    // Stats by provider
    const providerStats = await allQuery(`
      SELECT 
        provider, 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'connected' THEN 1 END) as connected
      FROM agents 
      GROUP BY provider
      ORDER BY total DESC
    `);

    // Stats by region
    const regionStats = await allQuery(`
      SELECT 
        region, 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'connected' THEN 1 END) as connected
      FROM agents 
      GROUP BY region
      ORDER BY total DESC
      LIMIT 10
    `);

    // Recent agent activity
    const recentActivity = await allQuery(`
      SELECT 
        id, provider, region, status, last_seen
      FROM agents 
      ORDER BY last_seen DESC 
      LIMIT 20
    `);

    res.json({
      overall: overallStats,
      byProvider: providerStats,
      byRegion: regionStats,
      recentActivity: recentActivity.map(agent => ({
        ...agent,
        last_seen: new Date(agent.last_seen)
      }))
    });

  } catch (error) {
    console.error('Error getting agent summary:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router; 