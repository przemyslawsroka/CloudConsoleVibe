/**
 * Database Initialization
 * Sets up SQLite database with monitoring schema
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db = null;

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create database connection
    const dbPath = path.join(dataDir, 'monitoring.db');
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      console.log('Connected to SQLite database');
      createTables()
        .then(() => resolve(db))
        .catch(reject);
    });
  });
}

async function createTables() {
  return new Promise((resolve, reject) => {
    const tables = [
      // Agents table
      `CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        region TEXT NOT NULL,
        zone TEXT,
        instance_id TEXT,
        ip_address TEXT,
        version TEXT,
        status TEXT DEFAULT 'connected',
        capabilities TEXT, -- JSON array
        connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_registration DATETIME,
        total_messages INTEGER DEFAULT 0,
        total_metrics INTEGER DEFAULT 0,
        total_errors INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Metrics table (time-series data)
      `CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        value REAL,
        value_json TEXT, -- For complex values (histograms, etc.)
        unit TEXT,
        tags TEXT, -- JSON object
        provider TEXT,
        region TEXT,
        zone TEXT,
        timestamp DATETIME NOT NULL,
        received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents (id)
      )`,

      // Metric batches table (for tracking batch processing)
      `CREATE TABLE IF NOT EXISTS metric_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        total_metrics INTEGER NOT NULL,
        processed INTEGER NOT NULL,
        errors INTEGER NOT NULL,
        location TEXT, -- JSON object
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents (id)
      )`,

      // Agent configurations table
      `CREATE TABLE IF NOT EXISTS agent_configs (
        agent_id TEXT PRIMARY KEY,
        config TEXT NOT NULL, -- JSON object
        version INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents (id)
      )`,

      // Alert rules table
      `CREATE TABLE IF NOT EXISTS alert_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        condition TEXT NOT NULL, -- 'gt', 'lt', 'eq', etc.
        threshold REAL NOT NULL,
        severity TEXT DEFAULT 'warning',
        enabled BOOLEAN DEFAULT 1,
        agent_filter TEXT, -- JSON object for filtering agents
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Alert instances table
      `CREATE TABLE IF NOT EXISTS alert_instances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id INTEGER NOT NULL,
        agent_id TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        value REAL NOT NULL,
        threshold REAL NOT NULL,
        severity TEXT NOT NULL,
        status TEXT DEFAULT 'active', -- 'active', 'resolved'
        triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (rule_id) REFERENCES alert_rules (id),
        FOREIGN KEY (agent_id) REFERENCES agents (id)
      )`
    ];

    const indexes = [
      // Metrics indexes for performance
      'CREATE INDEX IF NOT EXISTS idx_metrics_agent_timestamp ON metrics (agent_id, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_metrics_name_timestamp ON metrics (name, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_metrics_provider_region ON metrics (provider, region)',
      'CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics (timestamp)',
      
      // Agents indexes
      'CREATE INDEX IF NOT EXISTS idx_agents_provider_region ON agents (provider, region)',
      'CREATE INDEX IF NOT EXISTS idx_agents_status ON agents (status)',
      'CREATE INDEX IF NOT EXISTS idx_agents_last_seen ON agents (last_seen)',
      
      // Batches indexes
      'CREATE INDEX IF NOT EXISTS idx_batches_agent_timestamp ON metric_batches (agent_id, timestamp)',
      
      // Alerts indexes
      'CREATE INDEX IF NOT EXISTS idx_alert_instances_status ON alert_instances (status)',
      'CREATE INDEX IF NOT EXISTS idx_alert_instances_triggered ON alert_instances (triggered_at)'
    ];

    let completed = 0;
    const total = tables.length + indexes.length;

    function checkComplete() {
      completed++;
      if (completed === total) {
        resolve();
      }
    }

    // Create tables
    tables.forEach(tableSQL => {
      db.run(tableSQL, (err) => {
        if (err) {
          reject(err);
          return;
        }
        checkComplete();
      });
    });

    // Create indexes
    indexes.forEach(indexSQL => {
      db.run(indexSQL, (err) => {
        if (err) {
          reject(err);
          return;
        }
        checkComplete();
      });
    });
  });
}

function getDatabase() {
  return db;
}

// Cleanup function
function closeDatabase() {
  return new Promise((resolve) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Database utilities
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  runQuery,
  getQuery,
  allQuery
}; 