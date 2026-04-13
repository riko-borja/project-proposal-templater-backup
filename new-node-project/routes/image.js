const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { getOrCreateBucket, Folder } = require('../models/newConnection');

// Serve an Image by File ID
router.get('/:fileId', async (req, res) => {
    const { fileId } = req.params;
  
    try {
      // Validate fileId format
      if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(400).json({ error: 'Invalid fileId format.' });
      }
  
      const objectId = new mongoose.Types.ObjectId(fileId);
  
      // Step 1: Resolve the bucket name dynamically from the folder collection
      const fileDetails = await Folder.findOne({ bucketName: 'local_disk_Images' }); // Adjust query as needed
  
      if (!fileDetails) {
        return res.status(404).json({ error: 'File metadata not found in folders collection.' });
      }
  
      const bucketName = fileDetails.bucketName;
  
      // Step 2: Get the GridFS bucket
      const gridFsBucket = getOrCreateBucket(bucketName);
  
      // Step 3: Fetch the file details
      const file = await gridFsBucket.find({ _id: objectId }).next();
  
      if (!file) {
        return res.status(404).json({ error: 'File not found in GridFS.' });
      }
  
      // Step 4: Stream the file content
      res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
      const downloadStream = gridFsBucket.openDownloadStream(objectId);
  
      downloadStream.pipe(res).on('error', (err) => {
        console.error('Error streaming image:', err);
        res.status(500).json({ error: 'Error streaming image.' });
      });
    } catch (error) {
      console.error('Error fetching image:', error);
      res.status(500).json({ error: 'Internal server error while fetching image.' });
    }
  });
  

// Export the router
module.exports = router;
