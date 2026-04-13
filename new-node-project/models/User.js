const { oldConnection } = require('./oldConnection'); // Import oldConnection
const mongoose = require('mongoose');

// Define the schema for the User model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true }, // Application role
  emailId: { type: String, required: true },
  documentRole: { type: String, required: false },
  isOnline: { type: Boolean, default: false },
  lastActivity: { type: Date, default: Date.now },
  firstLogin: { type: Boolean, default: true }, // Field to track if user is new
}, { collection: 'users' }); // Explicitly map to 'users' collection

// Create the User model using oldConnection
const User = oldConnection.model('User', userSchema);

module.exports = User;
