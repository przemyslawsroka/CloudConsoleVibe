const express = require('express');
const cors = require('cors');
const monitoringRoutes = require('./routes/monitoring');

const app = express();

// Basic middleware
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Monitoring routes
app.use('/api/v1/monitoring', monitoringRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: {
      message: err.message,
      status: 500
    }
  });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Test Server running on http://localhost:${PORT}`);
  console.log(`🎭 Running in DEMO mode for deployment testing`);
}); 