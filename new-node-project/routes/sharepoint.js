const express = require('express');
const router = express.Router();
const { newConnection } = require('../models/newConnection');
const axios = require('axios'); // For testing SharePoint API connections
const mongoose = require('mongoose');

// Schema to store SharePoint configurations
const sharePointConfigSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  tenantId: { type: String, required: true },
  clientSecret: { type: String, required: true },
  siteUrl: { type: String, required: true },
  siteId: { type: String, required: true },
  driveId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const SharePointConfig = newConnection.model('SharePointConfig', sharePointConfigSchema);

// Test connection endpoint
router.post('/test-connection', async (req, res) => {
  const { clientId, tenantId, clientSecret, siteUrl, siteId, driveId } = req.body;

  if (!clientId || !tenantId || !clientSecret || !siteUrl || !siteId || !driveId) {
    return res.status(400).json({ error: 'All fields are required for testing connection.' });
  }

  try {
    // Get an access token using client credentials
    const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenResponse = await axios.post(authUrl, new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }));
    const accessToken = tokenResponse.data.access_token;

    // Validate access to the SharePoint drive
    const driveUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}`;
    const driveResponse = await axios.get(driveUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (driveResponse.status === 200) {
      return res.status(200).json({ success: true, message: 'Connection to SharePoint validated successfully.' });
    }
  } catch (error) {
    console.error('Error testing SharePoint connection:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to connect to SharePoint. Check your credentials and configuration.' });
  }
});

// Save configuration endpoint
router.post('/save-configuration', async (req, res) => {
  const { clientId, tenantId, clientSecret, siteUrl, siteId, driveId } = req.body;

  if (!clientId || !tenantId || !clientSecret || !siteUrl || !siteId || !driveId) {
    return res.status(400).json({ error: 'All fields are required for saving configuration.' });
  }

  try {
    // Save the configuration to the database
    const existingConfig = await SharePointConfig.findOne({});
    if (existingConfig) {
      // Update existing configuration
      existingConfig.clientId = clientId;
      existingConfig.tenantId = tenantId;
      existingConfig.clientSecret = clientSecret;
      existingConfig.siteUrl = siteUrl;
      existingConfig.siteId = siteId;
      existingConfig.driveId = driveId;
      await existingConfig.save();
    } else {
      // Create a new configuration
      const newConfig = new SharePointConfig({
        clientId,
        tenantId,
        clientSecret,
        siteUrl,
        siteId,
        driveId,
      });
      await newConfig.save();
    }

    return res.status(200).json({ success: true, message: 'SharePoint configuration saved successfully.' });
  } catch (error) {
    console.error('Error saving SharePoint configuration:', error);
    return res.status(500).json({ error: 'Failed to save SharePoint configuration.' });
  }
});

module.exports = router;
