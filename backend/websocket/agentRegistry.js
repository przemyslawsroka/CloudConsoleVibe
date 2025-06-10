/**
 * Agent Registry
 * Manages connected monitoring agents and their metadata
 */

class AgentRegistry {
  constructor(logger) {
    this.logger = logger;
    this.agents = new Map(); // agentId -> agent data
    this.agentsByProvider = new Map(); // provider -> Set of agentIds
    this.agentsByRegion = new Map(); // region -> Set of agentIds
  }

  registerAgent(agentId, agentData) {
    const agent = {
      id: agentId,
      ...agentData,
      registeredAt: new Date(),
      lastSeen: new Date(),
      status: 'connected',
      metrics: {
        totalMessages: 0,
        totalMetrics: 0,
        lastMetricTime: null,
        errors: 0
      }
    };

    this.agents.set(agentId, agent);

    // Add to provider index
    if (agentData.provider) {
      if (!this.agentsByProvider.has(agentData.provider)) {
        this.agentsByProvider.set(agentData.provider, new Set());
      }
      this.agentsByProvider.get(agentData.provider).add(agentId);
    }

    // Add to region index
    if (agentData.region) {
      if (!this.agentsByRegion.has(agentData.region)) {
        this.agentsByRegion.set(agentData.region, new Set());
      }
      this.agentsByRegion.get(agentData.region).add(agentId);
    }

    this.logger.info('Agent registered in registry', {
      agentId,
      provider: agentData.provider,
      region: agentData.region,
      totalAgents: this.agents.size
    });

    return agent;
  }

  unregisterAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      this.logger.warn('Attempted to unregister unknown agent', { agentId });
      return false;
    }

    // Remove from provider index
    if (agent.provider && this.agentsByProvider.has(agent.provider)) {
      this.agentsByProvider.get(agent.provider).delete(agentId);
      if (this.agentsByProvider.get(agent.provider).size === 0) {
        this.agentsByProvider.delete(agent.provider);
      }
    }

    // Remove from region index
    if (agent.region && this.agentsByRegion.has(agent.region)) {
      this.agentsByRegion.get(agent.region).delete(agentId);
      if (this.agentsByRegion.get(agent.region).size === 0) {
        this.agentsByRegion.delete(agent.region);
      }
    }

    this.agents.delete(agentId);

    this.logger.info('Agent unregistered from registry', {
      agentId,
      duration: Date.now() - agent.registeredAt.getTime(),
      totalMessages: agent.metrics.totalMessages,
      totalAgents: this.agents.size
    });

    return true;
  }

  updateAgent(agentId, updates) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      this.logger.warn('Attempted to update unknown agent', { agentId });
      return false;
    }

    // Update agent data
    Object.assign(agent, updates, { lastSeen: new Date() });

    this.logger.debug('Agent updated', { agentId, updates });
    return true;
  }

  updateAgentStats(agentId, stats) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Update metrics
    if (stats.metricsReceived) {
      agent.metrics.totalMetrics += stats.metricsReceived;
      agent.metrics.totalMessages++;
    }

    if (stats.lastMetricTime) {
      agent.metrics.lastMetricTime = stats.lastMetricTime;
    }

    if (stats.errors) {
      agent.metrics.errors += stats.errors;
    }

    agent.lastSeen = new Date();

    return true;
  }

  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  getAgents() {
    return Array.from(this.agents.values()).map(agent => ({
      ...agent,
      // Don't include WebSocket object in serialized data
      websocket: undefined
    }));
  }

  getAgentsByProvider(provider) {
    const agentIds = this.agentsByProvider.get(provider);
    if (!agentIds) {
      return [];
    }

    return Array.from(agentIds).map(id => {
      const agent = this.agents.get(id);
      return agent ? { ...agent, websocket: undefined } : null;
    }).filter(Boolean);
  }

  getAgentsByRegion(region) {
    const agentIds = this.agentsByRegion.get(region);
    if (!agentIds) {
      return [];
    }

    return Array.from(agentIds).map(id => {
      const agent = this.agents.get(id);
      return agent ? { ...agent, websocket: undefined } : null;
    }).filter(Boolean);
  }

  getStats() {
    const agents = Array.from(this.agents.values());
    
    const stats = {
      totalAgents: agents.length,
      connectedAgents: agents.filter(a => a.status === 'connected').length,
      providers: {},
      regions: {},
      totalMetrics: 0,
      totalMessages: 0,
      totalErrors: 0
    };

    // Calculate provider stats
    for (const [provider, agentIds] of this.agentsByProvider) {
      stats.providers[provider] = agentIds.size;
    }

    // Calculate region stats
    for (const [region, agentIds] of this.agentsByRegion) {
      stats.regions[region] = agentIds.size;
    }

    // Calculate totals
    agents.forEach(agent => {
      stats.totalMetrics += agent.metrics.totalMetrics;
      stats.totalMessages += agent.metrics.totalMessages;
      stats.totalErrors += agent.metrics.errors;
    });

    return stats;
  }

  getHealthyAgents() {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    return Array.from(this.agents.values())
      .filter(agent => {
        const timeSinceLastSeen = now - agent.lastSeen;
        return agent.status === 'connected' && timeSinceLastSeen < staleThreshold;
      })
      .map(agent => ({ ...agent, websocket: undefined }));
  }

  getStaleAgents() {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    return Array.from(this.agents.values())
      .filter(agent => {
        const timeSinceLastSeen = now - agent.lastSeen;
        return timeSinceLastSeen >= staleThreshold;
      })
      .map(agent => ({ ...agent, websocket: undefined }));
  }

  // Cleanup stale agents
  cleanupStaleAgents() {
    const staleAgents = this.getStaleAgents();
    
    staleAgents.forEach(agent => {
      this.logger.warn('Cleaning up stale agent', {
        agentId: agent.id,
        lastSeen: agent.lastSeen,
        duration: Date.now() - agent.lastSeen.getTime()
      });
      
      // Close WebSocket if still open
      if (agent.websocket) {
        try {
          agent.websocket.terminate();
        } catch (error) {
          this.logger.error('Error terminating stale agent WebSocket:', error);
        }
      }
      
      this.unregisterAgent(agent.id);
    });

    return staleAgents.length;
  }
}

module.exports = { AgentRegistry }; 