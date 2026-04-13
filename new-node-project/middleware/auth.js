// middleware/auth.js
const jwt = require('jsonwebtoken');

// Middleware to authenticate JWT token and extract user information
function authenticateToken(req, res, next) {
  console.log(`authenticateToken: Received request for ${req.path}`);
  
  // Public routes that don't require authentication
  const publicPaths = ['/api/users/login', '/api/users/register', '/api/users/logout', '/api/users/delete', '/api/data/register', '/api/data/login']; // Adjust as necessary

  if (publicPaths.includes(req.path)) {
    return next(); // Skip authentication for public routes
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract the token from the 'Authorization' header

  console.log('JWT token received on server:', token); // Log the JWT token received

  if (!token) {
    console.error('Access token missing or invalid');
    return res.status(401).json({ message: 'Access token missing or invalid' });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY || 'defaultsecret', (err, user) => {
    if (err) {
      console.error('Invalid or expired token:', err);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    console.log('Decoded JWT payload:', user); // Log the decoded token (user info)
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
