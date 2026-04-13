require('dotenv').config(); // Load environment variables first

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const expressListEndpoints = require('express-list-endpoints');
const cors = require('cors');

const app = express();
app.use(cors());

// Import Folder model for initializing mirrored root
const { Folder } = require('./models/newConnection');

// Middleware: Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware: Log to console and save logs to file
app.use((req, res, next) => {
  const log = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\n`;
  fs.appendFileSync("endpoint-usage.log", log, "utf8", (err) => {
    if (err) {
      console.error('Error saving log to file:', err);
    }
  });
  console.log(log);
  next();
});

// Serve static files from 'dist' (including favicon)
app.use(express.static(path.join(__dirname, 'dist')));

// MongoDB Connections
const { newConnection } = require('./models/newConnection');
const { oldConnection } = require('./models/oldConnection');

// Import and mount API routes
const folderRoutes = require('./routes/folders');
const fileRoutes = require('./routes/files');
const userRoutes = require('./routes/users');
const logRoutes = require('./routes/logs');
const dataRoutes = require('./routes/data');
const imageRoutes = require('./routes/image');
const sharePointRoutes = require('./routes/sharepoint');


// Mount Routes
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/sharepoint', sharePointRoutes);

// Serve index.html for any other routes to enable client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Function to initialize the mirrored root folder
async function initializeMirroredRoot() {
  const rootPath = 'generated_documents';
  try {
    let rootFolder = await Folder.findOne({ path: rootPath });
    if (!rootFolder) {
      rootFolder = new Folder({
        name: 'generated_documents',
        path: rootPath,
        parent: null,
        type: 'root', // Define as 'root' or another type if needed
        isMirrored: true, // Mark as mirrored since it's the mirrored root
        createdAt: new Date(),
      });
      await rootFolder.save();
      console.log('Root mirrored folder created during initialization:', rootFolder);
    } else {
      console.log('Root mirrored folder already exists:', rootFolder);
    }
  } catch (error) {
    console.error('Error initializing mirrored root folder:', error);
  }
}

// Wrap server startup in an async function
async function startServer() {
  try {
    await initializeMirroredRoot(); // Ensure the mirrored root folder exists

    // Generate and save list of endpoints (optional)
    const endpoints = expressListEndpoints(app);
    fs.writeFileSync("endpoints.json", JSON.stringify(endpoints, null, 2), "utf-8");
    console.log("Endpoints have been saved to endpoints.json");

    // Start the server
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`Server is running on http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    console.error('Error during server startup:', error);
  }
}

// Call the async server startup function
startServer();
