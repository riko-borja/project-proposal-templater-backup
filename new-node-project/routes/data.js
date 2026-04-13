// routes/data.js
const express = require('express');
const router = express.Router();
const { Data } = require('../models/oldConnection');

// Data Submission Endpoint
router.post('/', async (req, res) => {
  const data = new Data(req.body);
  try {
    const savedData = await data.save();
    res.json({ message: 'Data saved successfully', savedData });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
