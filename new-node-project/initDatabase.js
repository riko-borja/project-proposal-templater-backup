const mongoose = require('mongoose');

const mongoURI = 'mongodb://192.168.50.57:27017/simple_database'; // Replace with your MongoDB URI

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Define a schema for users
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  emailId: String,
  isOnline: Boolean,
  firstLogin: Boolean,
  lastActivity: Date
});

// Define a schema for user logs (simplified for initial creation)
const userLogSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  activity: String,
  timestamp: Date
});

// Define a schema for folder structure
const folderSchema = new mongoose.Schema({
  name: String,
  parent: mongoose.Schema.Types.ObjectId, // null if it's a root folder
  path: String, // Full path for easy retrieval
  isImmutable: { type: Boolean, default: false } // Prevent deletion/renaming
});

// Create models
const User = mongoose.model('User', userSchema);
const UserLog = mongoose.model('UserLog', userLogSchema);
const Folder = mongoose.model('Folder', folderSchema);

// Function to create initial collections and data
async function initializeDatabase() {
  try {
    // Create a default admin user if not already exists
    const existingAdmin = await User.findOne({ username: 'Riko Borja' });
    if (!existingAdmin) {
      const adminUser = new User({
        username: 'Riko Borja',
        password: '$2b$10$ig9clPG/UOtuT5Og755IqOCdyrTKV1k1qa/VNWn.FiN/NZJKBKjuC', // Hashed password
        role: 'Admin',
        emailId: 'riko@gmail.com',
        isOnline: false,
        firstLogin: true, // Mark as true for first-time login prompt
        lastActivity: new Date()
      });
      await adminUser.save();
      console.log('Default admin user created');
    } else {
      console.log('Admin user already exists');
    }

    // Ensure the userlogs collection exists
    const userLogCount = await UserLog.countDocuments();
    if (userLogCount === 0) {
      console.log('User logs collection initialized (no initial data required)');
    }

    // Create initial folder structure
    const existingFolders = await Folder.countDocuments();
    if (existingFolders === 0) {
      // Create Local Disk (root folder for templates)
      const localDiskFolder = new Folder({
        name: 'local_disk',
        parent: null,
        path: 'local_disk',
        isImmutable: true // Prevent deletion/renaming
      });
      await localDiskFolder.save();
      console.log('Local Disk folder created');

      // Create Generated Documents folder (root folder for generated files)
      const generatedDocumentsFolder = new Folder({
        name: 'generated_documents',
        parent: null,
        path: 'generated_documents',
        isImmutable: true // Prevent deletion/renaming
      });
      await generatedDocumentsFolder.save();
      console.log('Generated Documents folder created');
    } else {
      console.log('Folder structure already exists');
    }

    console.log('Database initialization complete');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error initializing database:', error);
    mongoose.connection.close();
  }
}

// Run the initialization function
initializeDatabase();
