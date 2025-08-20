const express = require('express');
const axios = require('axios');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const response = await axios.get('https://api.ipify.org?format=json');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching IP from ipify:', error);
    res.status(500).json({ error: 'Failed to fetch IP address' });
  }
});

module.exports = router;
