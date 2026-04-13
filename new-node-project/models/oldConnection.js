const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb'); // Required for GridFS operations

// MongoDB URI for the old database
const oldMongoURI = process.env.OLD_MONGO_URI || 'mongodb://192.168.50.57:27017/local';

// Create a connection to the old database
const oldConnection = mongoose.createConnection(oldMongoURI);

// Event listeners for connection status
oldConnection.on('connected', () => {
  console.log('Connected to the old database (local) successfully.');
});

oldConnection.on('error', (err) => {
  console.error('Error connecting to the old database (local):', err);
});

// Initialize GridFS buckets
let wordGridfsBucket;
let excelGridfsBucket;
let stdContentsBucket;

// Create a Promise that resolves when the connection is open and buckets are initialized
const connectionReady = new Promise((resolve, reject) => {
  oldConnection.once('open', () => {
    const db = oldConnection.db;

    // Initialize GridFS buckets for different purposes
    wordGridfsBucket = new GridFSBucket(db, { bucketName: 'fs' }); // For Word documents
    excelGridfsBucket = new GridFSBucket(db, { bucketName: 'excel_files' }); // For Excel files
    stdContentsBucket = new GridFSBucket(db, { bucketName: 'std_contents' }); // For templates

    console.log('GridFSBuckets initialized for the old database.');

    resolve(); // Resolve the Promise indicating readiness
  });

  oldConnection.on('error', (err) => {
    reject(err); // Reject the Promise if an error occurs
  });
});

// Function to get wordGridfsBucket
const getWordGridfsBucket = () => wordGridfsBucket;

// Export the old connection, buckets, and the readiness Promise
module.exports = {
  oldConnection,
  getWordGridfsBucket,
  excelGridfsBucket,
  stdContentsBucket,
  connectionReady, // Export the connectionReady Promise
};
