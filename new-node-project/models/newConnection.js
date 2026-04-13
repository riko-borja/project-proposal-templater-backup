// models/newConnection.js
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb'); // Required for GridFS operations

// Use environment variable for MongoDB URI
const newMongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/simple_database';

// Create a connection to the new database
const newConnection = mongoose.createConnection(newMongoURI);

newConnection.on('connected', () => {
  console.log('Connected to the new database (simple_database) successfully.');
});

newConnection.on('error', (err) => {
  console.error('Error connecting to the new database (simple_database):', err);
});

// Dynamic GridFS Bucket Management
const gridFSBuckets = {}; // Cache for initialized buckets

const getOrCreateBucket = (bucketName) => {
  if (!gridFSBuckets[bucketName]) {
    gridFSBuckets[bucketName] = new GridFSBucket(newConnection.db, { bucketName });
    console.log(`GridFSBucket initialized: ${bucketName}`);
  }
  return gridFSBuckets[bucketName];
};

// Define the schema and models for the new database

// Template schema and model
const templateSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: true }, // Reference to Folder
    createdAt: { type: Date, default: Date.now }, // Optional: To track when the template was created
  },
  { collection: 'templates' } // Explicitly map to the 'templates' collection
);
const Template = newConnection.model('Template', templateSchema);

// Folder schema and model
const folderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    path: { type: String, required: true },
    type: { type: String, enum: ['organizational', 'storage', 'category', 'subcategory', 'generated'], required: true },
    storageType: { type: String, enum: ['Image', 'Document'], default: null },
    createdAt: { type: Date, default: Date.now },
    bucketName: { type: String, default: null },
    isMirrored: { type: Boolean, default: false }, // Flag to indicate mirrored folders
  },
  { collection: 'folders' } // Explicitly map to the 'folders' collection
);
const Folder = newConnection.model('Folder', folderSchema);

// Export the connection, models, and GridFS helper
module.exports = {
  newConnection,
  Template,
  Folder,
  getOrCreateBucket, // Export dynamic bucket helper
};
