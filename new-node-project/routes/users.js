// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User'); // Separate model file
const UserLogs = require('../models/UserLogs'); // Correct path for UserLogs model
const authenticateToken = require('../middleware/auth');

// Login Endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    console.log('Looking for user:', username);

    // Query the User model for the provided username
    const user = await User.findOne({ username });
    console.log('User found:', user);

    if (!user) {
      console.log('User not found:', username);
      return res.status(400).json({ message: 'User not found' });
    }

    // Validate the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Invalid password for user:', username);
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Check the user's role for authorization
    if (user.role !== 'Admin' && user.role !== 'User') {
      return res.status(403).json({ message: 'Unauthorized role' });
    }

    // Handle first login logic
    const isFirstLogin = user.firstLogin;

    if (isFirstLogin) {
      user.firstLogin = false; // Set firstLogin to false after the first login
      await user.save(); // Save the updated user information
    }

    // Log the user's login activity
    await UserLogs.create({
      username: user.username,
      loginTime: new Date(),
      lastHeartbeat: new Date(),
      action: 'login',
    });
    console.log('Login successful for user:', username);

    // Generate a JWT token for the user
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET_KEY || 'defaultsecret',
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    // Return the login response
    res.json({
      message: 'Login successful',
      user: {
        _id: user._id, // Include the user ID
        username: user.username,
        role: user.role,
        emailId: user.emailId,
        documentRole: user.documentRole,
      },
      token,
      firstLogin: isFirstLogin,
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register Endpoint
router.post('/register', async (req, res) => {
  const { username, password, role, emailId, documentRole } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, role, emailId, documentRole });
    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update User Endpoint
router.put('/update-user/:id', async (req, res) => {
  const userId = req.params.id;
  const { username, role, emailId, documentrole } = req.body;

  try {
    await User.findByIdAndUpdate(userId, { username, role, emailId, documentrole });
    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Get Users Endpoint
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Delete Users Endpoint
router.post('/delete', async (req, res) => {
  const { userIds } = req.body;

  try {
    const validObjectIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validObjectIds.length !== userIds.length) {
      return res.status(400).json({ message: 'Invalid user IDs provided' });
    }

    const objectIdArray = validObjectIds.map(id => new mongoose.Types.ObjectId(id));
    await User.deleteMany({ _id: { $in: objectIdArray } });
    res.json({ message: 'Users deleted successfully' });
  } catch (error) {
    console.error('Error deleting users:', error);
    res.status(500).json({ message: error.message || 'Error deleting users' });
  }
});

// Active Users Endpoint
router.get('/active-users', async (req, res) => {
  const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - TIMEOUT_DURATION);

  try {
    const onlineUsers = await UserLogs.aggregate([
      { $match: { loginTime: { $gte: fiveMinutesAgo }, action: 'login' } },
      {
        $lookup: {
          from: 'userlogs',
          let: { username: '$username' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$username', '$$username'] },
                    { $eq: ['$action', 'logout'] },
                    { $gte: ['$loginTime', fiveMinutesAgo] },
                  ],
                },
              },
            },
          ],
          as: 'logoutLogs',
        },
      },
      { $match: { 'logoutLogs.0': { $exists: false } } },
      { $group: { _id: '$username' } },
    ]).exec();

    const onlineUsernames = onlineUsers.map((user) => user._id);
    res.json({ count: onlineUsernames.length, users: onlineUsernames });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Heartbeat Endpoint
router.post('/heartbeat', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      console.log('Heartbeat received with no username');
      return res.status(400).json({ message: 'Username is required' });
    }

    const result = await UserLogs.findOneAndUpdate(
      { username, action: 'login' },
      { $set: { lastHeartbeat: new Date() } },
      { sort: { loginTime: -1 } }
    );

    if (result) {
      console.log('Heartbeat updated successfully for user:', username);
    } else {
      console.log('No login entry found for user:', username);
    }

    res.json({ message: 'Heartbeat received' });
  } catch (error) {
    console.error('Error in heartbeat endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
