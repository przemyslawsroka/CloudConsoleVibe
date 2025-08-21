const express = require('express');
const axios = require('axios');

const router = express.Router();

router.get('/', async (req, res) => {
  console.log('🔍 IPify route hit!');
  try {
    console.log('📡 Fetching IP from api.ipify.org...');
    const response = await axios.get('https://api.ipify.org?format=json');
    console.log('✅ IP fetched successfully:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error fetching IP from ipify:', error);
    res.status(500).json({ error: 'Failed to fetch IP address' });
  }
});

module.exports = router;
