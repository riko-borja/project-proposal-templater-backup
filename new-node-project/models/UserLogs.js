const { oldConnection } = require('./oldConnection'); // Import oldConnection
const mongoose = require('mongoose');

// Define the schema for the UserLogs model
const userLogsSchema = new mongoose.Schema({
  username: String,
  loginTime: Date,
  action: String, // e.g., "login" or "logout"
}, { collection: 'userlogs' }); // Explicitly map to the 'userlogs' collection

// Create the UserLogs model using oldConnection
const UserLogs = oldConnection.model('UserLogs', userLogsSchema);

module.exports = UserLogs;
