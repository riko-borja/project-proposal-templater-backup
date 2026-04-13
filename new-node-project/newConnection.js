const mongoose = require('mongoose');

// Define the URI for your new MongoDB connection
const newMongoURI = 'mongodb://192.168.50.57:27017/simple_database';

// Create a new Mongoose connection instance
const newConnection = mongoose.createConnection(newMongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Log connection status
newConnection.on('connected', () => {
  console.log('Connected to MongoDB for specific endpoint');
});

newConnection.on('error', (err) => {
  console.error('Error connecting to MongoDB for specific endpoint:', err);
});

// Export the new connection
module.exports = newConnection;