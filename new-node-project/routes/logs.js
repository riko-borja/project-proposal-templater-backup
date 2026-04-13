const express = require('express');
const router = express.Router();
const UserLogs = require('../models/UserLogs'); // Correct path to UserLogs model
const { oldConnection } = require('../models/oldConnection'); // Needed for direct database interactions

// Fetch Logs Endpoint
router.get('/', async (req, res) => {
  try {
    const logs = await UserLogs.find().sort({ loginTime: -1 }).exec(); // Use correct sorting field
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Server error fetching logs' });
  }
});

// Fetch User Logs Endpoint
router.get('/userlogs', async (req, res) => {
  try {
    const userLogs = await UserLogs.find().exec();
    res.json(userLogs);
  } catch (error) {
    console.error('Error fetching user logs:', error);
    res.status(500).json({ message: 'Failed to fetch user logs' });
  }
});

// Document Processed Logging Endpoint
router.post('/document-processed', async (req, res) => {
  const { username, timestamp } = req.body;

  try {
    const collection = oldConnection.db.collection('documentprocessed');
    const result = await collection.insertOne({ username, timestamp });

    if (result.acknowledged) {
      res.status(201).json({ message: 'Document download logged successfully', insertedId: result.insertedId });
    } else {
      res.status(500).json({ message: 'Failed to log document download' });
    }
  } catch (error) {
    console.error('Error logging document download:', error);
    res.status(500).json({ message: 'Server error logging document download' });
  }
});

module.exports = router;
