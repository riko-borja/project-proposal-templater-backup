// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const { GridFSBucket } = require('mongodb'); // Removed MongoClient as it's not used
const jwt = require('jsonwebtoken');
const fs = require('fs');
const multer = require('multer');
const { Readable } = require('stream');
const XlsxPopulate = require('xlsx-populate');
const docx = require('docx'); // We'll use 'docx' library to manipulate Word documents
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const expressListEndpoints = require("express-list-endpoints");



const app = express();
app.use(express.json());

// Middleware: Log to console
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware: Save logs to file
app.use((req, res, next) => {
  const log = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\n`;
  fs.appendFileSync("endpoint-usage.log", log);
  next();
});



require('dotenv').config();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());


const storage = multer.memoryStorage();
const upload = multer({ storage });


const jwtSecretKey = process.env.JWT_SECRET_KEY || 'defaultsecret';
console.log('JWT Secret Key:', process.env.JWT_SECRET_KEY);



// Serve the static files from the dist folder
app.use(express.static(path.join(__dirname, 'dist')));



let wordGridfsBucket;
let excelGridfsBucket;
let stdContentsBucket;

// Helper function to read files from GridFS
async function getFileBufferFromGridFS(gridfsBucket, fileId) {
  return new Promise((resolve, reject) => {
    const _id = new mongoose.Types.ObjectId(fileId);
    const downloadStream = gridfsBucket.openDownloadStream(_id);

    const chunks = [];
    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    downloadStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    downloadStream.on('error', (err) => {
      reject(err);
    });
  });
}

// Helper function to save a buffer back to GridFS (overwriting existing file)
async function saveFileBufferToGridFS(gridfsBucket, buffer, filename, fileId) {
  return new Promise((resolve, reject) => {
    const _id = new mongoose.Types.ObjectId(fileId);

    // Upload the new file with the new _id
    const uploadStream = gridfsBucket.openUploadStreamWithId(_id, filename);

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);

    readableStream.pipe(uploadStream)
      .on('error', (err) => {
        console.error('Error saving buffer to GridFS:', err);
        reject(err);
      })
      .on('finish', () => {
        console.log(`File saved successfully with ID: ${uploadStream.id}`);
        resolve(uploadStream.id);
      });
  });
}


/*
 NEWLY ADDED
 Route to save the modified Excel file
app.post('/api/save-excel', async (req, res) => {
  const { fileData } = req.body;

  if (!fileData) {
    return res.status(400).json({ error: 'Missing fileData' });
  }

  try {
     Generate a new fileId for the new Excel file
    const newFileId = new mongoose.Types.ObjectId();

     Convert base64 fileData to buffer
    const buffer = Buffer.from(fileData, 'base64');

 Save the new Excel file in GridFS with the new fileId
    await saveFileBufferToGridFS(excelGridfsBucket, buffer, `modified_excel_${newFileId}.xlsx`, newFileId);

    console.log(`Excel file saved with new ID: ${newFileId}`);
    res.json({ success: true, fileId: newFileId });
  } catch (error) {
    console.error('Error saving Excel file:', error);
    res.status(500).json({ error: 'Failed to save Excel file' });
  }
 }); */


/*
// 2. Route to copy data from Excel and paste it into a Word document
app.post('/api/paste-excel-into-word', async (req, res) => {
  const { excelFileId, wordFileId, sheetName, sourceRange } = req.body;

  if (!excelFileId || !wordFileId || !sheetName || !sourceRange) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // 2.1 Fetch the Excel file from GridFS
    const excelBuffer = await getFileBufferFromGridFS(excelGridfsBucket, excelFileId);

    // 2.2 Extract data from the specified range in Excel
    const workbook = await XlsxPopulate.fromDataAsync(excelBuffer);
    const sheet = workbook.sheet(sheetName);
    const rangeData = sheet.range(sourceRange).value();

    // Format the Excel data as a string (tab-separated for readability)
    let formattedTable = '';
    rangeData.forEach(row => {
      formattedTable += row.join('\t') + '\n'; // Tabs between columns, new lines between rows
    });

    // 3. Fetch the Word document from GridFS
    const wordBuffer = await getFileBufferFromGridFS(wordGridfsBucket, wordFileId);

    // 4. Load the Word document using docxtemplater
    const zip = new PizZip(wordBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Set the template variables
    doc.setData({
      ExcelDataHere: formattedTable,
    });

    try {
      // Render the document (replace the placeholders)
      doc.render();
    } catch (error) {
      console.error('Error rendering document:', error);
      return res.status(500).json({ error: 'Error rendering Word document' });
    }

    // Generate the updated document buffer
    const updatedDocBuffer = doc.getZip().generate({ type: 'nodebuffer' });

    // 5. Save the updated Word document back to GridFS, overwriting the original
    await saveFileBufferToGridFS(wordGridfsBucket, updatedDocBuffer, `word_${wordFileId}.docx`, wordFileId);

    console.log(`Word document updated with ID: ${wordFileId}`);
    res.json({ success: true, wordFileId });
  } catch (error) {
    console.error('Error copying Excel data into Word:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); */



//app.use('/web-apps', express.static('/var/www/onlyoffice/documentserver/web-apps', {
//  setHeaders: (res, path) => {
//    if (path.endsWith('.js')) {
//     res.setHeader('Content-Type', 'application/javascript');
//    }
//  }
// }));


// Function to generate a unique document key
function generateDocumentKey() {
  return `doc_${Math.random().toString(36).substring(2, 15)}`; // Generate a random key for the document
}


// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'mongodb://192.168.50.57:27017/local';
console.log('MongoDB URI:', process.env.MONGO_URI);
mongoose.connect(mongoURI);

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.log('Error connecting to MongoDB:', err);
});

const User = require('./models/User'); // Import the User model from models folder
const UserLogs = require('./models/UserLogs');
const Data = require('./models/Data');
const CustomerData = require('./models/CustomerData');

// Determine online status based on recent activity
const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes





// Initialize GridFSBucket instances
mongoose.connection.once('open', () => {
  const db = mongoose.connection.db;
  
  // Initialize GridFSBucket for Word documents (fs)
  wordGridfsBucket = new GridFSBucket(db, { bucketName: 'fs' }); // For Word documents

  // Initialize GridFSBucket for Excel files (excel_files)
  excelGridfsBucket = new GridFSBucket(db, { bucketName: 'excel_files' }); // For Excel files

  // Initialize GridFSBucket for Standard Contents (std_contents)
  stdContentsBucket = new GridFSBucket(db, { bucketName: 'std_contents' }); // For Word template
  
  console.log('GridFSBuckets initialized.');
});

// Make sure the GridFSBucket is created only after the connection is open
const connection = mongoose.connection;
connection.once('open', () => {
  console.log('MongoDB connected successfully.');

  // Create a new GridFSBucket for modified documents
  const modifiedBucket = new GridFSBucket(connection.db, {
    bucketName: 'modified_documents',
  });

  // Endpoint to upload modified document for approval
  app.post('/api/upload-modified-document', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) {
      console.error('No file uploaded.');
      return res.status(400).send('No file uploaded.');
    }

    const userId = req.user.userId; // Get userId from the authenticated token
    console.log('UserId from token:', userId); // Log the userId

    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    const filename = req.file.originalname;
    const writeStream = modifiedBucket.openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: { userId, status: 'pending' }, // Add userId and initial status
    });

    readableStream.pipe(writeStream);

    writeStream.on('finish', () => {
      console.log(`Modified document uploaded successfully by user ${userId}, ID: ${writeStream.id}`);
      res.status(200).send({ fileId: writeStream.id, filename: req.file.originalname });
    });

    writeStream.on('error', (err) => {
      console.error('Error uploading modified document:', err);
      res.status(500).send(err);
    });
  });
});

// Endpoint to fetch the list of collections from the database
app.get('/api/collections', async (req, res) => {
  try {
    // Get all collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    // Extract only the collection names
    const collectionNames = collections.map((collection) => collection.name);

    res.json(collectionNames); // Send collection names as the response
  } catch (err) {
    console.error('Error fetching collection names:', err);
    res.status(500).json({ message: 'Error fetching collection names' });
  }
});



/*
app.post('/api/file-upload', upload.single('file'), async (req, res) => {
  const { version, folder } = req.body;
  const file = req.file;

  if (!file || !version || !folder) {
    return res.status(400).json({ message: 'File, version, and folder are required.' });
  }

  const collectionName = collectionMap[folder];

  if (!collectionName) {
    return res.status(400).json({ message: 'Invalid folder specified.' });
  }

  try {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: collectionName });

    // Check if a file with the same name and version exists
    const existingFile = await mongoose.connection.db.collection(`${collectionName}.files`).findOne({
      filename: file.originalname,
      'metadata.version': version,
    });

    if (existingFile) {
      return res.status(409).json({ message: 'File with the same name and version already exists.' });
    }

    const readableStream = new Readable();
    readableStream.push(file.buffer);
    readableStream.push(null);

    const writeStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: { version, uploadDate: new Date() },
    });

    readableStream.pipe(writeStream)
      .on('finish', () => {
        res.status(200).json({ message: 'File uploaded successfully.' });
      })
      .on('error', (err) => {
        console.error('Error uploading file:', err);
        res.status(500).json({ message: 'Error uploading file.' });
      });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error during file upload.' });
  }
}); */



/*
// Endpoint to handle new customer data from SowPage.vue
app.post('/api/new-customer-data', async (req, res) => {
  const { sections, date, currentDate, dynamicInputs } = req.body;

  try {
    const newCustomerData = new CustomerData({
      sections,
      date,
      currentDate,
      dynamicInputs, // Save dynamic inputs in the collection
    });
    const savedData = await newCustomerData.save();
    res.json({ message: 'Customer data saved successfully', savedDataId: savedData._id });
  } catch (error) {
    console.error('Error saving customer data:', error);
    res.status(500).json({ message: 'Server error' });
  }
}); */

// Endpoint to create a new collection dynamically
app.post('/api/create-category', async (req, res) => {
  const { categoryName } = req.body;

  if (!categoryName) {
    return res.status(400).json({ message: 'Category name is required.' });
  }

  try {
    // Check if the collections already exist
    const existingCollections = await mongoose.connection.db.listCollections({ name: `${categoryName}.files` }).toArray();
    if (existingCollections.length > 0) {
      return res.status(400).json({ message: `A GridFS bucket named "${categoryName}" already exists.` });
    }

    // Create a new GridFS bucket and upload a placeholder file
    const gridFsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: categoryName,
    });

    // Upload a placeholder file to trigger the bucket creation
    const uploadStream = gridFsBucket.openUploadStream('placeholder');
    uploadStream.end();

    uploadStream.on('finish', async () => {
      try {
        // Delete the placeholder file after it's uploaded
        await gridFsBucket.delete(uploadStream.id);
        res.status(201).json({ message: `GridFS bucket "${categoryName}" created successfully and placeholder file removed.` });
      } catch (deleteError) {
        console.error('Error deleting placeholder file:', deleteError);
        res.status(500).json({ message: 'Category created but failed to delete placeholder file.' });
      }
    });

    uploadStream.on('error', (err) => {
      console.error('Error uploading placeholder file:', err);
      res.status(500).json({ message: 'Error creating category bucket.' });
    });
  } catch (err) {
    console.error('Error creating GridFS bucket:', err);
    res.status(500).json({ message: 'Error creating category bucket.' });
  }
});


app.post('/api/upload-template', upload.single('file'), async (req, res) => {
  const { collectionName } = req.body; // This should be the main category name without '.files'
  const filename = req.file.originalname;
  const version = req.body.version;

  if (!version || !collectionName) {
    return res.status(400).json({ message: 'Version and collection name are required.' });
  }

  try {
    // Ensure that the GridFSBucket references the existing bucket by name
    const gridFsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: collectionName.replace('.files', ''), // Ensure only the base name is used
    });

    // Check if a document with the same filename and version already exists
    const existingFile = await mongoose.connection.db.collection(`${collectionName}`).findOne({
      filename,
      'metadata.version': version,
    });

    if (existingFile) {
      return res.status(400).json({ message: 'A document with this filename and version already exists. Please change the version.' });
    }

    // Proceed with the upload
    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    const writeStream = gridFsBucket.openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: { version },
    });

    readableStream.pipe(writeStream);

    writeStream.on('finish', () => {
      res.status(200).json({ message: `File uploaded successfully to "${collectionName}".`, version });
    });

    writeStream.on('error', (err) => {
      console.error('Error uploading file:', err);
      res.status(500).json({ message: 'Error uploading file' });
    });
  } catch (err) {
    console.error('Error in upload-template endpoint:', err);
    res.status(500).json({ message: 'Server error' });
  }
});






// Middleware to authenticate JWT token and extract user information
function authenticateToken(req, res, next) {
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

mongoose.connection.once('open', () => {
  console.log('MongoDB connected successfully.');

  // Create a new GridFSBucket for processed templates
  const processedTemplatesGridfsBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'processedTemplates', // Ensure bucket creation after connection is open
  });

  // Endpoint to upload the preprocessed template
  app.post('/api/upload-processed-template', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) {
      console.error('No processed template uploaded.');
      return res.status(400).send('No file uploaded.');
    }

    const userId = req.user.userId; // Get userId from the authenticated token
    console.log('UserId from token:', userId);

    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    const filename = `ProcessedTemplate_${Date.now()}.docx`; // Unique filename for processed templates
    const writeStream = processedTemplatesGridfsBucket.openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: { userId }, // Associates the file with the authenticated user
    });

    readableStream.pipe(writeStream);

    writeStream.on('finish', () => {
      console.log(`Processed template uploaded successfully by user ${userId}, ID: ${writeStream.id}`);
      res.status(200).send({ fileId: writeStream.id });
    });

    writeStream.on('error', (err) => {
      console.error('Error uploading processed template:', err);
      res.status(500).send(err);
    });
  });
});

let processedTemplatesGridfsBucket;

// Initialize GridFSBucket when the connection is open
mongoose.connection.once('open', () => {
  console.log('MongoDB connected successfully.');
  processedTemplatesGridfsBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'processedTemplates',
  });
  console.log('ProcessedTemplates GridFSBucket initialized.');
});




// Updated endpoint to upload generated document and tie it to a user
app.post('/api/upload-generated-document', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }

  const userId = req.user.userId; // Get userId from the authenticated token
  console.log('UserId from token:', userId); // Log the userId extracted from the token

  const readableStream = new Readable();
  readableStream.push(req.file.buffer);
  readableStream.push(null);

  const filename = req.file.originalname;
  const writeStream = wordGridfsBucket.openUploadStream(filename, {
    contentType: req.file.mimetype,
    metadata: { userId }, // Save the userId as metadata with the document
  });

  readableStream.pipe(writeStream);

  writeStream.on('finish', () => {
    console.log(`File uploaded successfully by user ${userId}, ID: ${writeStream.id}`);
    res.status(200).send({ fileId: writeStream.id });
  });

  writeStream.on('error', (err) => {
    console.error('Error uploading file:', err);
    res.status(500).send(err);
  });
});



/*
// Endpoint to fetch sections from the Word document
app.get('/api/sections', async (req, res) => {
  try {
    const templateResponse = await fetchTemplateFromDatabase(); // Function to fetch the template
    const content = templateResponse.data;
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Get the full text of the document
    const fullText = doc.getFullText();

    // Regular expression to find all sections with start and end tags
    const sectionRegex = /<<section_start:(.*?)>>(.*?)<<section_end:\1>>/gs;
    const sections = [];
    let match;

    // Extract each section based on the regex
    while ((match = sectionRegex.exec(fullText)) !== null) {
      sections.push({
        label: match[1].trim(),
        content: match[2].trim(),
      });
    }

    res.json({ sections });
  } catch (error) {
    console.error('Error in /api/sections endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
}); */





/*
// Endpoint to get the Word template using async/await
app.get('/api/template', async (req, res) => {
  const filename = 'OP###_Client_GridOS-DF_SER_v0.0.docx';
  console.log('Fetching template with filename:', filename);

  try {
    const files = await stdContentsBucket.find({ filename }).toArray();
    
    if (!files || files.length === 0) {
      console.error('Template not found');
      return res.status(404).json({ message: 'Template not found' });
    }

    const file = files[0];
    console.log('Template found:', file);

    const downloadStream = stdContentsBucket.openDownloadStream(file._id);

    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });

    downloadStream.on('error', (err) => {
      console.error('Error reading file from GridFS:', err);
      res.status(500).json({ message: 'Error reading file' });
    });

    downloadStream.on('finish', () => {
      console.log('File successfully sent to the client.');
    });

    downloadStream.pipe(res);
  } catch (err) {
    console.error('Error in /api/template endpoint:', err);
    res.status(500).json({ message: 'Server error' });
  }
});  */

app.get('/api/templates', async (req, res) => {
  const { folderId } = req.query;

  if (!folderId) {
    console.error('No folderId provided.');
    return res.status(400).json({ message: 'folderId is required' });
  }

  try {
    // Fetch all storage folder IDs under the provided folderId
    const storageFolderIds = await getAllStorageFolderIds(new mongoose.Types.ObjectId(folderId));

    // Fetch templates associated with these storage folders
    const templates = await Template.find({ folderId: { $in: storageFolderIds } }).lean();
    console.log(`Templates fetched for folderId ${folderId}:`, templates);

    // Format the templates as needed
    const formattedTemplates = templates.map((template) => ({
      label: template.filename.replace('.docx', ''),
      filename: template.filename,
    }));

    res.json(formattedTemplates);
  } catch (err) {
    console.error(`Error fetching templates for folderId ${folderId}:`, err);
    res.status(500).json({ message: `Error fetching templates for folderId ${folderId}` });
  }
});

// Helper function to recursively fetch all storage folder IDs
async function getAllStorageFolderIds(parentId) {
  
  if (!(parentId instanceof mongoose.Types.ObjectId)) {
    parentId = new mongoose.Types.ObjectId(parentId);
  }

  const folders = await Folder.find({ parent: parentId }).lean();
  let storageFolderIds = [];

  for (const folder of folders) {
    if (folder.type === 'storage') {
      storageFolderIds.push(folder._id);
    } else {
      // Recursively get storage folder IDs from subfolders
      const childStorageFolderIds = await getAllStorageFolderIds(folder._id);
      storageFolderIds = storageFolderIds.concat(childStorageFolderIds);
    }
  }

  return storageFolderIds;
}





// Endpoint to get the Word template for SowPage.vue
app.get('/api/sow-template', async (req, res) => {
  const { filename } = req.query;
  console.log('Fetching template with filename:', filename);

  if (!filename) {
    console.error('No filename provided in request');
    return res.status(400).json({ message: 'Filename is required' });
  }

  try {
    // Log the filename used in the database query
    console.log(`Looking for file in the database with filename: ${filename}`);
    
    const files = await stdContentsBucket.find({ filename }).toArray();
    
    if (!files || files.length === 0) {
      console.error(`No file found for filename: ${filename}`);
      return res.status(404).json({ message: 'Template not found' });
    }

    const file = files[0];
    console.log(`Template found in database: ${file.filename} (ID: ${file._id})`);

    // Create the download stream
    const downloadStream = stdContentsBucket.openDownloadStream(file._id);

    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });

    // Handle errors during streaming
    downloadStream.on('error', (err) => {
      console.error('Error reading file from GridFS:', err);
      res.status(500).json({ message: 'Error reading file' });
    });

    // Pipe the download stream to the response
    downloadStream.pipe(res);
  } catch (err) {
    console.error('Error in /api/sow-template endpoint:', err);
    res.status(500).json({ message: 'Server error' });
  }
});




app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found:', username);
      return res.status(400).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', username);
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Enforce role case sensitivity (optional)
    if (user.role !== 'Admin' && user.role !== 'User') {
      return res.status(403).json({ message: 'Unauthorized role' });
    }

    // Check if it's the user's first login
    const isFirstLogin = user.firstLogin;

    // If this is the user's first login, update firstLogin to false
    if (isFirstLogin) {
      user.firstLogin = false; // Set firstLogin to false after the first login
      await user.save(); // Save the updated user information
    }

    // Create a new log entry
    const logEntry = {
      username: user.username,
      loginTime: new Date(), // Current timestamp
      lastHeartbeat: new Date(), // Initial heartbeat timestamp
      action: 'login',
    };

    // Insert the log entry into the 'User_logs' collection
    await UserLogs.create(logEntry);
    console.log('Login successful for user:', username);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET_KEY || 'defaultsecret',
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    // Send back the user information along with the token and firstLogin status
    res.json({ message: 'Login successful', user, token, firstLogin: isFirstLogin });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});




// NEED TO DOUBLE CHECK THIS PART
// Endpoint to log user logout
app.post('/api/logout', async (req, res) => {
  const { username } = req.body;
  try {
    // Log user logout
    await UserLogs.create({
      username: username,
      loginTime: new Date(),
      action: 'logout'
    });
    console.log('Logout successful for user:', username);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ message: 'Server error' });
  }
});




// API route for active users
app.get('/api/active-users', async (req, res) => {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - TIMEOUT_DURATION);

  try {
      console.log('Fetching active users...');
      // Fetch users who logged in within the last 5 minutes and have not logged out
      const onlineUsers = await UserLogs.aggregate([
          {
              $match: {
                  loginTime: { $gte: fiveMinutesAgo },
                  action: 'login'
              }
          },
          {
              $lookup: {
                  from: 'userlogs',
                  let: { username: '$username' },
                  pipeline: [
                      { $match: { $expr: { $and: [{ $eq: ['$username', '$$username'] }, { $eq: ['$action', 'logout'] }, { $gte: ['$loginTime', fiveMinutesAgo] }] } } }
                  ],
                  as: 'logoutLogs'
              }
          },
          {
              $match: {
                  'logoutLogs.0': { $exists: false }
              }
          },
          {
              $group: {
                  _id: "$username"
              }
          }
      ]).exec();

      const onlineUsernames = onlineUsers.map(user => user._id);
      const onlineUsersCount = onlineUsernames.length;

      console.log('Active users count:', onlineUsersCount);
      console.log('Active users list:', onlineUsernames);

      res.json({ count: onlineUsersCount, users: onlineUsernames });
  } catch (error) {
      console.error('Error fetching online users:', error);
      res.status(500).json({ message: 'Server error' });
  }
});


// Heartbeat Endpoint
app.post('/api/heartbeat', async (req, res) => {
  try {
      const { username } = req.body;

      if (!username) {
          console.log('Heartbeat received with no username');
          return res.status(400).json({ message: 'Username is required' });
      }

      console.log('Heartbeat received for user:', username);

      // Update the most recent login entry for this user
      const result = await UserLogs.findOneAndUpdate(
          { username: username, action: 'login' },
          { $set: { lastHeartbeat: new Date() } },
          { sort: { loginTime: -1 } } // Sort by loginTime to find the most recent login
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




/*
app.get('/api/document/:id', async (req, res) => {
  const fileId = req.params.id;  // Document ID from frontend
  try {
    const file = await mongoose.connection.db.collection('fs.files')
      .findOne({ _id: mongoose.Types.ObjectId(fileId) });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const downloadStream = gridfsBucket.openDownloadStream(file._id);

    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ message: 'Server error' });
  }
});  */






// Data Saving Endpoint for Vuex Store
app.post('/api/data', async (req, res) => {
  const data = new Data(req.body);
  try {
    const savedData = await data.save();
    res.json({ message: 'Data saved successfully', savedData });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User creation endpoint
app.post('/api/register', async (req, res) => {
  const { username, password, role, emailId, documentRole } = req.body; // Updated here
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, password: hashedPassword, role, emailId, documentRole }); // Updated here
    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user endpoint
app.put('/api/update-user/:id', async (req, res) => {
  const userId = req.params.id;
  const { username, role, emailId, documentrole } = req.body;
  try {
    // Find user by ID and update
    await User.findByIdAndUpdate(userId, { username, role, emailId, documentrole });
    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user' });
  }
});


// Fetch all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Delete users
app.post('/api/delete', async (req, res) => {
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

/*
// Trigger download endpoint
app.get('/trigger-download', async (req, res) => {
  try {
    const filenameToFind = 'processed_document_with_link.docx'; // Modify if needed
    const file = await mongoose.connection.db.collection('fs.files')
      .find({ filename: filenameToFind })
      .sort({ uploadDate: -1 })
      .limit(1)
      .next();

    if (!file) {
      console.log('No file found');
      return res.status(404).json({ message: 'No file found' });
    }

    console.log(`Found file: ${file.filename}`);

    const downloadStream = gridfsBucket.openDownloadStream(file._id);

    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    downloadStream.pipe(res);

    downloadStream.on('error', (err) => {
      console.error('Error downloading file:', err);
      res.status(500).json({ message: 'Error downloading file' });
    });

    downloadStream.on('end', () => {
      res.end();
    });

  } catch (error) {
    console.error('Error triggering download:', error);
    res.status(500).json({ message: 'Server error' });
  }
});   */

// Fetch logs
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await mongoose.connection.db.collection('userlogs')
      .find({})
      .sort({ startTime: -1 })
      .toArray();

    

    res.setHeader('Content-Type', 'application/json');
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Server error fetching logs' });
  }
});

app.get('/api/userlogs', async (req, res) => {
  try {
    // Fetch user logs directly from the MongoDB collection
    const userLogs = await mongoose.connection.db.collection('userlogs')
      .find({})
      .toArray();

    // Return the fetched user logs as JSON

    res.setHeader('Content-Type', 'application/json');
    res.json(userLogs);
  } catch (error) {
    console.error('Error fetching user logs:', error);
    res.status(500).json({ message: 'Failed to fetch user logs' });
  }
});  


// Endpoint to log document download
app.post('/api/document-processed', async (req, res) => {
  const { username, timestamp } = req.body;

  console.log('Received data:', { username, timestamp });

  try {
    // Access the MongoDB collection directly
    const collection = mongoose.connection.db.collection('documentprocessed');

    // Insert a new document into the 'documentprocesseds' collection
    const result = await collection.insertOne({
      username,
      timestamp
    });

    // Check if the insertion was successful
    if (result.acknowledged) {
      res.status(201).json({ message: 'Document download logged successfully', insertedId: result.insertedId });
    } else {
      res.status(500).json({ message: 'Failed to log document download' });
    }
  } catch (error) {
    console.error('Error logging document download:', error);
    res.status(500).json({ message: 'Server error logging document download' });
  }
});

/*
// Endpoint to log button click events
app.post('/api/button-clicked', async (req, res) => {
  const { username, timestamp, action } = req.body;

  console.log('Button click logged:', { username, timestamp, action });

  try {
    // Access the MongoDB collection directly
    const collection = mongoose.connection.db.collection('buttonclicklogs');

    // Insert a new document into the 'buttonclicklogs' collection
    const result = await collection.insertOne({
      username,
      timestamp,
      action
    });

    if (result.acknowledged) {
      res.status(201).json({ message: 'Button click logged successfully', insertedId: result.insertedId });
    } else {
      res.status(500).json({ message: 'Failed to log button click' });
    }
  } catch (error) {
    console.error('Error logging button click:', error);
    res.status(500).json({ message: 'Server error logging button click' });
  }
});  */


/*
// Fetch button click logs
app.get('/api/button-click-logs', async (req, res) => {
  try {
    const logs = await mongoose.connection.db.collection('buttonclicklogs')
      .find({})
      .sort({ timestamp: -1 }) // Sort by timestamp, descending
      .toArray();

    res.json(logs);
  } catch (error) {
    console.error('Error fetching button click logs:', error);
    res.status(500).json({ message: 'Error fetching button click logs' });
  }
});   */






// Initialize GridFSBucket for Word documents (fs)
mongoose.connection.once('open', () => {
  const db = mongoose.connection.db;
  wordGridfsBucket = new GridFSBucket(db, { bucketName: 'fs' }); // For Word documents
});

// Initialize GridFSBucket for Excel files (excel_files)
mongoose.connection.once('open', () => {
  const db = mongoose.connection.db;
  excelGridfsBucket = new GridFSBucket(db, { bucketName: 'excel_files' }); // For Excel files
});

/*
// Fetch the latest Excel file from GridFS
app.get('/api/excel-file', async (req, res) => {
  try {
    const file = await mongoose.connection.db.collection('excel_files.files')
      .find({})
      .sort({ uploadDate: -1 })
      .limit(1)
      .next();

    if (!file) {
      return res.status(404).json({ message: 'No Excel file found' });
    }

    console.log(`Found Excel file: ${file.filename}`);

    const downloadStream = gridfsBucket.openDownloadStream(file._id);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);

    downloadStream.pipe(res);

    downloadStream.on('error', (err) => {
      if (err.code === 'ENOENT') {
        console.error('File not found in chunks collection:', err);
        return res.status(404).json({ message: 'File chunks not found, possibly corrupted or not fully uploaded' });
      }
      console.error('Error downloading file:', err);
      res.status(500).json({ message: 'Error downloading file' });
    });

    downloadStream.on('end', () => {
      res.end();
    });
  } catch (error) {
    console.error('Error fetching Excel file:', error);
    res.status(500).json({ message: 'Server error fetching Excel file' });
  }
});   */


/*
// Route to generate document URL and JWT token
app.post('/api/generate-editor-url1', (req, res) => {
  const documentKey = generateDocumentKey();
  const documentTitle = `Document_${Date.now()}`;

  const document = {
    fileType: "docx",
    key: documentKey,
    title: documentTitle,
    url: "http://192.168.50.57:5001/document", // Updated URL
    permissions: { edit: true, review: true }
  };

  const editorConfig = {
    mode: "edit",
    user: {
      id: "user123",
      name: "User"
    }
  };

  const config = {
    document,
    documentType: "word",
    editorConfig
  };

  // Generate the JWT token with the entire config as payload
  const token = jwt.sign(config, jwtSecretKey, { expiresIn: '1h' });

  console.log('Generated JWT Token:', token);

  res.json({ document, token });
});   */

// Route to generate editor URL and JWT token
app.post('/api/generate-editor-url', async (req, res) => {
  const { fileId } = req.body;

  if (!fileId) {
    return res.status(400).json({ error: 'fileId is required' });
  }

  try {
    // Correct the ObjectId creation
    const _id = new mongoose.Types.ObjectId(fileId);

    // Fetch the file from GridFS
    const files = await wordGridfsBucket.find({ _id }).toArray();

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];

    // Generate a unique document key instead of using fileId directly
    const documentKey = generateDocumentKey(); // Generate the document key like in the working setup
    
    // Update the document URL to use port 5001
    const documentUrl = `http://192.168.50.57:5001/document/${fileId}`;

    const document = {
      fileType: "docx",
      key: documentKey, // Use generated key here
      title: file.filename,
      url: documentUrl,
      permissions: { edit: true, review: true },
    };

    const editorConfig = {
      mode: "edit",
      user: {
        id: "user123",
        name: "User",
      },
    };

    const config = {
      document,
      documentType: "word",
      editorConfig,
    };

    // Generate the JWT token with the entire config as payload
  const token = jwt.sign(config, jwtSecretKey, { expiresIn: '1h' });

    console.log('Generated Dynamic JWT Token:', token);
    res.json({ document, token });
  } catch (error) {
    console.error('Error generating editor URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Route to serve the document file
app.get('/document/:fileId', (req, res) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify the JWT token
  jwt.verify(token, jwtSecretKey, (err, decoded) => {
    if (err) {
      console.error('JWT Verification Error:', err);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { fileId } = req.params;

    // OPTIONAL: If document key validation is necessary, ensure it matches
    if (decoded.document && decoded.document.key !== fileId) {
      return res.status(403).json({ error: 'Access denied: document key mismatch' });
    }

    // Correct ObjectId creation using 'new'
    const downloadStream = wordGridfsBucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));

    downloadStream.on('error', (err) => {
      console.error('Error downloading file:', err);
      res.status(404).json({ error: 'File not found' });
    });

    // Set the appropriate Content-Type header for a DOCX file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="downloaded-file.docx"`);

    // Pipe the file to the response
    downloadStream.pipe(res);
  });
});   



/*
// Route to serve the document file
app.get('/document', (req, res) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify the JWT token
  jwt.verify(token, jwtSecretKey, (err, decoded) => {
    if (err) {
      console.error('JWT Verification Error:', err);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Path to your document file
    const filePath = 'C:\\Users\\rikog\\Downloads\\OP###_Client_GridOS-DF_SER_v0.0.docx';
    

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return res.status(404).json({ error: 'File not found' });
    }

    // Set the appropriate Content-Type header for a DOCX file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="OP###_Client_GridOS-DF_SER_v0.0.docx"');

    // Send the file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Error sending file');
      } else {
        console.log('File sent successfully:', filePath);
      }
    });
  });
});  */

/*
app.get('/api/get-excel', (req, res) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify the JWT token
  jwt.verify(token, jwtSecretKey, async (err, decoded) => {
    if (err) {
      console.error('JWT Verification Error:', err);
      return res.status(401).json({ error: 'Invalid token' });
    }

    try {
      const filename = 'RACI_Table.xlsx'; // Hardcoded filename

      const file = await mongoose.connection.db.collection('excel_files.files')
        .findOne({ filename });

      if (!file) {
        return res.status(404).json({ message: 'Excel file not found' });
      }

      // Use excelGridfsBucket to open the download stream
      const downloadStream = excelGridfsBucket.openDownloadStream(file._id);

      res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      downloadStream.pipe(res);

      downloadStream.on('error', (err) => {
        console.error('Error downloading Excel file:', err);
        res.status(500).json({ message: 'Error streaming Excel document' });
      });

      downloadStream.on('end', () => {
        res.end();
      });
    } catch (error) {
      console.error('Error fetching Excel document:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
});  */

/*
// Route to generate Excel document URL and JWT token
app.post('/api/generate-excel-editor-url1', (req, res) => {
  const documentKey = generateDocumentKey();
  const documentTitle = 'RACI_Table.xlsx';

  const document = {
    fileType: "xlsx",
    key: documentKey,
    title: documentTitle,
    url: "http://192.168.50.57:5001/api/get-excel",
    permissions: { edit: true, review: true }
  };

  const editorConfig = {
    mode: "edit",
    user: {
      id: "user123",
      name: "User"
    }
  };

  const config = {
    document,
    documentType: "cell",
    editorConfig
  };

  // Generate the JWT token with the entire config as payload
  const token = jwt.sign(config, jwtSecretKey, { expiresIn: '1h' });

  console.log('Generated JWT Token for Excel:', token);

  // Return { document, token } instead of { config, token }
  res.json({ document, token });
});

// Route to generate editor URL and JWT token for Excel files
app.post('/api/generate-editor-url-excel', async (req, res) => {
  const { fileId } = req.body;

  if (!fileId) {
    return res.status(400).json({ error: 'fileId is required' });
  }

  try {
    // Fetch the file from GridFS
    const _id = new mongoose.Types.ObjectId(fileId);
    const files = await excelGridfsBucket.find({ _id }).toArray();

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];
    
    // Generate a unique document key for the Excel file
    const documentKey = generateDocumentKey();
    
    // Set the URL to access the Excel file in ONLYOFFICE
    const documentUrl = `http://192.168.50.57:5001/excel/${fileId}`;

    const document = {
      fileType: "xlsx",  // Excel file type
      key: documentKey,
      title: file.filename,
      url: documentUrl,
      permissions: { edit: true, review: true },
    };

    const editorConfig = {
      mode: "edit",
      user: {
        id: "user123",
        name: "User",
      },
    };

    const config = {
      document,
      documentType: "cell",  // Specify Excel (cell) document type
      editorConfig,
    };

    // Generate the JWT token for Excel files
    const token = jwt.sign(config, jwtSecretKey, { expiresIn: '1h' });

    res.json({ document, token });
  } catch (error) {
    console.error('Error generating editor URL for Excel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 


// Route to serve the Excel file
app.get('/excel/:fileId', (req, res) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify the JWT token
  jwt.verify(token, jwtSecretKey, (err, decoded) => {
    if (err) {
      console.error('JWT Verification Error:', err);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { fileId } = req.params;

    // **Change this check**: If document key validation is necessary, ensure it matches the fileId
    // Instead of comparing the fileId, compare it with the document's actual fileId, not documentKey
    if (decoded.document && decoded.document.url.split('/').pop() !== fileId) {
      return res.status(403).json({ error: 'Access denied: document key mismatch' });
    }

    // Fetch the Excel file from MongoDB
    const downloadStream = excelGridfsBucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));

    downloadStream.on('error', (err) => {
      console.error('Error downloading Excel file:', err);
      res.status(404).json({ error: 'File not found' });
    });

    // Set the appropriate Content-Type header for Excel files
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="downloaded-excel.xlsx"`);

    // Pipe the Excel file to the response
    downloadStream.pipe(res);
  });
});   */
/*
const stdUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: (req, file, cb) => {
    // Accept images, Word docs, Excel files, and text files
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'text/plain',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});


const collectionMap = {
  // All std_ folders map to 'uploads' bucket
  'GOS_gridos_std_architectures': 'uploads',
  'GOS_gridos_std_contents': 'uploads',
  'GOS_gridos_std_estimates': 'uploads',
  'GOS_gridos_std_gantts': 'uploads',
  'GOS_gridos_std_risks': 'uploads',
  'NLF_networklife_std_architectures': 'uploads',
  'NLF_networklife_std_contents': 'uploads',
  'NLF_networklife_std_estimates': 'uploads',
  'NLF_networklife_std_gantts': 'uploads',
  'NLF_networklife_std_risks': 'uploads',

  // Other mappings (if any)
  'Users': 'users',
  'UserLogs': 'userlogs',
  'Generated_proposals': 'fs.files',
};




app.get('/files/:folder', async (req, res) => {
  const folder = req.params.folder;
  console.log(`Received request for files in folder: ${folder}`);

  try {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    
    // Fetch files for the specific folder
    const files = await bucket.find({ 'metadata.folder': folder }).toArray();

    if (!files.length) {
      console.log(`No files found for folder: ${folder}`);
    }

    const formattedFiles = files.map((file) => ({
      _id: file._id,
      filename: file.filename,
      contentType: file.contentType,
      isImage: file.contentType && file.contentType.startsWith('image/'),
    }));

    res.json({ type: 'files', files: formattedFiles });
  } catch (error) {
    console.error(`Error fetching files for folder: ${folder}`, error);
    res.status(500).json({ message: 'Error fetching files', error: error.message });
  }
});



let imageGridfsBucket;

// Initialize GridFSBucket for images
mongoose.connection.once('open', () => {
  const db = mongoose.connection.db;
  imageGridfsBucket = new GridFSBucket(db, { bucketName: 'images' });
  console.log('GridFSBucket for images initialized.');
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
});

app.post('/api/upload-image', imageUpload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  const readableStream = new Readable();
  readableStream.push(req.file.buffer);
  readableStream.push(null);

  const writeStream = imageGridfsBucket.openUploadStream(req.file.originalname, {
    contentType: req.file.mimetype,
  });

  readableStream.pipe(writeStream)
    .on('finish', () => {
      console.log(`Image uploaded successfully with ID: ${writeStream.id}`);
      res.status(200).json({ fileId: writeStream.id, filename: req.file.originalname });
    })
    .on('error', (err) => {
      console.error('Error uploading image:', err);
      res.status(500).json({ message: 'Error uploading image' });
    });
});

app.get('/api/images/:fileId', (req, res) => {
  const fileId = req.params.fileId;

  const downloadStream = imageGridfsBucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));

  downloadStream.on('data', (chunk) => {
    res.write(chunk);
  });

  downloadStream.on('end', () => {
    res.end();
  });

  downloadStream.on('error', (err) => {
    console.error('Error fetching image:', err);
    res.status(404).json({ message: 'Image not found' });
  });
});

// Delete endpoint for images and files
app.delete('/api/delete-file/:folder/:fileId', async (req, res) => {
  const { folder, fileId } = req.params;

  try {
    let bucketName = 'uploads'; // Default bucket for regular files
    let collectionName = null;

    // Determine if it's a special folder and set the collection name accordingly
    if (folder === 'Admin_Users') {
      collectionName = 'users';
    } else if (folder === 'Admin_UserLogs') {
      collectionName = 'userlogs';
    } else if (folder === 'Generated_proposals') {
      collectionName = 'fs.files';
    }

    if (collectionName) {
      // Handle deletion from a special collection
      const db = mongoose.connection.db;
      const file = await db.collection(collectionName).findOne({ _id: new mongoose.Types.ObjectId(fileId) });

      if (!file) {
        return res.status(404).json({ message: 'File not found in the special collection.' });
      }

      // Delete file from the special collection
      await db.collection(collectionName).deleteOne({ _id: new mongoose.Types.ObjectId(fileId) });

      console.log(`File deleted from ${collectionName} with ID: ${fileId}`);
      return res.status(200).json({ message: 'File deleted successfully from the special collection.' });
    }

    // Handle deletion from the regular 'uploads' bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName });
    const file = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();

    if (file.length === 0) {
      return res.status(404).json({ message: 'File not found in uploads.' });
    }

    await bucket.delete(new mongoose.Types.ObjectId(fileId));

    console.log(`File deleted from ${bucketName} with ID: ${fileId}`);
    return res.status(200).json({ message: 'File deleted successfully from uploads.' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ message: 'Error deleting file.', error: error.message });
  }
});



// Updated route to handle uploading files to specific folders
app.post('/files/upload/:folder', stdUpload.single('file'), (req, res) => {
  const folder = req.params.folder;

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });

  const readableStream = new Readable();
  readableStream.push(req.file.buffer);
  readableStream.push(null);

  const writeStream = bucket.openUploadStream(req.file.originalname, {
    contentType: req.file.mimetype,
    metadata: {
      folder: folder, // Ensure folder metadata is set
    },
  });

  readableStream.pipe(writeStream)
    .on('finish', () => {
      console.log(`File uploaded successfully to folder ${folder} with ID: ${writeStream.id}`);
      res.status(200).json({ fileId: writeStream.id, filename: req.file.originalname });
    })
    .on('error', (err) => {
      console.error('Error uploading file:', err);
      res.status(500).json({ message: 'Error uploading file' });
    });
});   */



// Fetch documents from fs.files collection
app.get('/api/documents', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const documents = await db.collection('fs.files').find({}).toArray();

    // Filter documents to include only those with userId in metadata
    const filteredDocuments = documents.filter(doc => doc.metadata && doc.metadata.userId);

    

    res.json(filteredDocuments);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Error fetching documents', error: error.message });
  }
});


// Fetch users from users collection based on userId
app.get('/api/users', async (req, res) => {
  try {
    const userIds = req.query.userIds.split(',');

    // Find users by their IDs
    const users = await mongoose.model('User').find({ _id: { $in: userIds } });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});



/*
app.get('/api/files/:fileId', (req, res) => {
  const fileId = req.params.fileId;

  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });

  const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));

  downloadStream.on('data', (chunk) => {
    res.write(chunk);
  });

  downloadStream.on('end', () => {
    res.end();
  });

  downloadStream.on('error', (err) => {
    console.error('Error fetching file:', err);
    res.status(404).json({ message: 'File not found' });
  });
});

app.get('/files/special/:folder', async (req, res) => {
  const folder = req.params.folder;

  let collectionName;
  if (folder === 'Admin_Users') {
    collectionName = 'users';
  } else if (folder === 'Admin_UserLogs') {
    collectionName = 'userlogs';
  } else if (folder === 'Generated_proposals') {
    collectionName = 'fs.files';
  }

  if (!collectionName) {
    return res.status(400).json({ message: 'Invalid folder specified' });
  }

  try {
    const db = mongoose.connection.db;
    const files = await db.collection(collectionName).find({}).toArray();

    const formattedFiles = files.map(file => ({
      _id: file._id,
      filename: file.filename,
      contentType: file.contentType,
      isImage: file.contentType && file.contentType.startsWith('image/'),
    }));

    res.json({ type: 'files', files: formattedFiles });
  } catch (error) {
    console.error(`Error fetching files for folder: ${folder}`, error);
    res.status(500).json({ message: 'Error fetching files', error: error.message });
  }
});   */





const newMongoURI = 'mongodb://192.168.50.57:27017/simple_database';

const newConnection = mongoose.createConnection(newMongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

newConnection.on('connected', () => {
  console.log('Connected to MongoDB for specific endpoint successfully.');
});

newConnection.on('error', (err) => {
  console.error('Error connecting to MongoDB for specific endpoint:', err);
});

module.exports = newConnection;

const { Schema } = require('mongoose');



const templateSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: true }, // Reference to Folder
  createdAt: { type: Date, default: Date.now }, // Optional: To track when the template was created
});

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;


const folderSchema = new Schema({
  name: { type: String, required: true },
  parent: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
  path: { type: String, required: true },
  type: { type: String, enum: ['organizational', 'storage', 'category', 'subcategory'], required: true },
  storageType: { type: String, enum: ['Image', 'Document'], default: null },
  createdAt: { type: Date, default: Date.now },
  bucketName: { type: String, default: null },
});

const Folder = newConnection.model('Folder', folderSchema);

module.exports = Folder;




const router = express.Router();

router.get('/folders', async (req, res) => {
  const { type, parent } = req.query;

  try {
    const query = {};
    if (type) query.type = type;
    if (parent) query.parent = parent;

    const folders = await Folder.find(query).lean();
    res.status(200).json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

module.exports = router;


// Endpoint for creating a folder
app.post('/api/create-folder', async (req, res) => {
  const { path, type, storageType } = req.body;

  if (!path || !type) {
    return res.status(400).json({ message: 'Path and type are required' });
  }

  try {
    // Check if the folder already exists
    const existingFolder = await Folder.findOne({ path });
    if (existingFolder) {
      return res.status(400).json({ message: 'Folder already exists' });
    }

    // Determine the folder name and parent
    const pathSegments = path.split('/');
    const name = pathSegments[pathSegments.length - 1];
    let parent = null;

    if (pathSegments.length > 1) {
      const parentPath = pathSegments.slice(0, -1).join('/');
      const parentFolder = await Folder.findOne({ path: parentPath });
      if (!parentFolder) {
        return res.status(400).json({ message: 'Parent folder does not exist' });
      }
      parent = parentFolder._id;
    }

    // Initialize bucketName
    let bucketName = null;

    // Create a GridFS bucket if it's a storage folder
    if (type === 'storage') {
      bucketName = path.replace(/\//g, '_'); // Use consistent bucket naming
      const gridFsBucket = new mongoose.mongo.GridFSBucket(newConnection.db, {
        bucketName,
      });
      // Initialize the bucket with a placeholder file (optional)
      const writableStream = gridFsBucket.openUploadStream('placeholder');
      writableStream.end();
      console.log(`GridFS bucket created for storage folder: ${bucketName}`);
    }

    // Create a new folder document
    const newFolder = new Folder({
      path,
      name,
      parent,
      type,
      storageType: type === 'storage' ? storageType : null,
      createdAt: new Date(),
      bucketName, // Assign the bucketName here
    });

    await newFolder.save();

    // **Add a console log to confirm bucketName is set**
    console.log('New folder created:', newFolder);

    res.status(201).json({ message: 'Folder created successfully', folder: newFolder }); // Include the folder object
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});




module.exports = router;

app.get('/api/folder-structure', async (req, res) => {
  try {
    // Fetch all folder documents using Mongoose model
    const folders = await Folder.find({}).lean(); // .lean() returns plain JS objects

 

    // Format folders to include 'type' and 'storageType'
    const formattedFolders = folders.map(folder => ({
      _id: folder._id.toString(),
      name: folder.name,
      parent: folder.parent ? folder.parent.toString() : null,
      path: folder.path,
      type: folder.type, // Include the folder type
      storageType: folder.storageType || null, // Include storage type if applicable
      children: [], // Initialize children array for hierarchical structure
    }));

    // Create a map for easy lookup
    const folderMap = {};
    formattedFolders.forEach(folder => {
      folderMap[folder._id] = folder;
    });

    // Build the hierarchical tree
    const rootFolders = [];

    formattedFolders.forEach(folder => {
      if (!folder.parent) {
        // Root folder
        rootFolders.push(folder);
      } else {
        // Child folder
        const parentFolder = folderMap[folder.parent];
        if (parentFolder) {
          parentFolder.children.push(folder);
        } else {
          console.warn(`Parent folder with ID ${folder.parent} not found for folder ${folder.name}`);
        }
      }
    });

    console.log('Constructed folder hierarchy:', rootFolders); // Debug log

    res.status(200).json(rootFolders);
  } catch (error) {
    console.error('Error fetching folder structure:', error);
    res.status(500).json({ message: 'Error fetching folder structure' });
  }
});



module.exports = router;

app.delete('/api/delete-folder', async (req, res) => {
  const { path } = req.body;

  if (!path) {
    return res.status(400).json({ message: 'Path is required' });
  }

  // Prevent deleting the home folder
  if (path === 'local_disk') {
    return res.status(403).json({ message: 'Deleting the home folder is not allowed' });
  }

  try {
    // Find the folder to delete
    const folderToDelete = await Folder.findOne({ path });
    if (!folderToDelete) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    console.log('Folder to delete:', folderToDelete);

    // Check if the folder has subfolders
    const hasChildren = await Folder.exists({ parent: folderToDelete._id });
    if (hasChildren) {
      return res.status(400).json({ message: 'Folder contains subfolders. Please delete them first.' });
    }

    // If the folder is a storage type, check if it contains files
    if (folderToDelete.type === 'storage' && folderToDelete.storageType) {
      const db = newConnection.db; // Use newConnection
      const bucketName = folderToDelete.bucketName; // Retrieve stored bucket name

      console.log('Bucket name to check:', bucketName);

      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName });

      try {
        const files = await bucket.find().toArray();

        // Prevent deletion if files exist
        if (files.length > 0) {
          console.log(`Storage folder contains files: ${files.length} files found.`);
          return res.status(400).json({
            message: `Folder contains ${files.length} files. Please delete the files first.`,
          });
        }
      } catch (error) {
        console.error('Error accessing GridFS bucket:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }
    }

    // Delete the folder document
    await Folder.deleteOne({ _id: folderToDelete._id });

    res.status(200).json({ message: 'Folder deleted successfully.' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/check-folder', async (req, res) => {
  const { path } = req.body;

  if (!path) {
    return res.status(400).json({ message: 'Path is required' });
  }

  try {
    // Find the folder to check
    const folder = await Folder.findOne({ path });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Check for subfolders
    const hasSubfolders = await Folder.exists({ parent: folder._id });

    // Check for files in the bucket if it's a storage folder
    let containsFiles = false;
    let fileCount = 0;

    if (folder.type === 'storage' && folder.bucketName) {
      const db = newConnection.db;
      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: folder.bucketName });
      const files = await bucket.find().toArray();
      fileCount = files.length;
      containsFiles = fileCount > 0;
    }

    // Respond with folder state
    res.status(200).json({
      hasSubfolders,
      containsFiles,
      fileCount,
    });
  } catch (error) {
    console.error('Error checking folder:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/folders', async (req, res) => {
  const { type, parent } = req.query;

  try {
    const query = {};
    if (type) query.type = type;
    if (parent) query.parent = parent;

    const folders = await Folder.find(query);
    res.status(200).json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});


app.put('/api/rename-folder', async (req, res) => {
  const { oldPath, newName } = req.body;
  if (!oldPath || !newName) {
    return res.status(400).json({ message: 'Old path and new name are required' });
  }

  // Prevent renaming the home folder
  if (oldPath === 'local_disk') {
    return res.status(403).json({ message: 'Renaming the home folder is not allowed' });
  }

  try {
    const folder = await Folder.findOne({ path: oldPath });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Prevent duplicate folder names under the same parent
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    const existingFolder = await Folder.findOne({ path: newPath });
    if (existingFolder) {
      return res.status(400).json({ message: 'A folder with the new name already exists in this location.' });
    }

    // Update the folder's name and path
    folder.name = newName;
    folder.path = newPath;
    await folder.save();

    // Update paths of all subfolders recursively
    const subfolders = await Folder.find({ path: { $regex: `^${oldPath}/` } });
    for (const subfolder of subfolders) {
      subfolder.path = subfolder.path.replace(oldPath, newPath);
      await subfolder.save();
    }

    res.status(200).json({ message: 'Folder renamed successfully.', folder });
  } catch (error) {
    console.error('Error renaming folder:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



app.get('/api/files', async (req, res) => {
  let folderPath = req.query.path;

  // Default to 'Root' if no path is provided
  if (!folderPath) {
    folderPath = 'local_disk'; // or '/' based on your naming convention
  }

  try {
    // Fetch files from the database
    const files = await getFilesInFolder(folderPath);
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ message: 'Failed to fetch files' });
  }
});


const getFilesInFolder = async (folderPath) => {
  try {
    console.log('getFilesInFolder called with path:', folderPath);

    // Find the folder by path
    const folder = await Folder.findOne({ path: folderPath });
    console.log('Folder found:', folder);

    if (!folder) {
      console.error('Folder not found for path:', folderPath);
      throw new Error('Folder not found');
    }

    // Check if the folder is a storage type
    if (folder.type === 'storage' && folder.bucketName) {
      console.log('Storage folder detected with bucketName:', folder.bucketName);

      // Use newConnection.db directly for creating the GridFSBucket
      const bucket = new mongoose.mongo.GridFSBucket(newConnection.db, {
        bucketName: folder.bucketName,
      });
      console.log('GridFS bucket initialized:', bucket);

     

      try {
        const fileList = await bucket.find().toArray();
        console.log('Number of files found:', fileList.length);

        if (fileList.length === 0) {
          console.log('No files found in the GridFS bucket');
        }

        const files = fileList.map((file) => {
          
          return {
            id: file._id.toString(),
            name: file.filename,
            length: file.length,
            uploadDate: file.uploadDate,
          };
        });

        
        return files;
      } catch (err) {
        console.error('Error fetching files from GridFS bucket:', err);
        throw err;
      }
    } else {
      console.log('No storage type detected or non-storage folder. Returning empty array.');
      return [];
    }
  } catch (error) {
    console.error('Error in getFilesInFolder:', error);
    throw error;
  }
};

// Endpoint to create category or subcategory folders
app.post('/api/create-category-folder', async (req, res) => {
  const { name, type, parentId } = req.body;

  // Validate input
  if (!name || !type || (type === 'subcategory' && !parentId)) {
    return res.status(400).json({ message: 'Invalid request parameters.' });
  }

  try {
    // Validate folder type
    if (type !== 'category' && type !== 'subcategory') {
      return res.status(400).json({ message: 'Invalid folder type.' });
    }

    // Check if parent exists (for subcategory)
    let parentFolder = null;
    if (parentId) {
      parentFolder = await Folder.findById(parentId);
      if (!parentFolder) {
        return res.status(400).json({ message: 'Parent folder not found.' });
      }
      if (type === 'subcategory' && parentFolder.type !== 'category') {
        return res.status(400).json({ message: 'Subcategories can only be created within categories.' });
      }
    }

    // Construct the path
    const path = parentFolder ? `${parentFolder.path}/${name}` : name;

    // Check if a folder with the same path already exists
    const existingFolder = await Folder.findOne({ path });
    if (existingFolder) {
      return res.status(400).json({ message: 'Folder already exists.' });
    }

    // Create the folder
    const newFolder = new Folder({
      name,
      parent: parentId || null,
      path,
      type,
    });

    await newFolder.save();

    res.status(201).json({ message: 'Category folder created successfully.', folder: newFolder });
  } catch (error) {
    console.error('Error creating category folder:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});


module.exports = {
  router,
  getFilesInFolder,
};

app.put('/api/rename-file', async (req, res) => {
  const { fileId, newName, folderPath } = req.body;

  if (!fileId || !newName || !folderPath) {
    return res.status(400).json({ message: 'File ID, new name, and folder path are required.' });
  }

  try {
    // Determine the folder and bucketName dynamically
    const folder = await Folder.findOne({ path: folderPath });
    if (!folder || folder.type !== 'storage' || !folder.bucketName) {
      return res.status(400).json({ message: 'Invalid storage folder or bucket.' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(newConnection.db, { bucketName: folder.bucketName });

    const file = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    if (!file.length) {
      return res.status(404).json({ message: 'File not found in the specified bucket.' });
    }

    const originalFile = file[0];

    const downloadStream = bucket.openDownloadStream(originalFile._id);
    const newUploadStream = bucket.openUploadStream(newName, { metadata: originalFile.metadata });

    downloadStream.pipe(newUploadStream).on('finish', async () => {
      await bucket.delete(originalFile._id);
      res.status(200).json({ message: 'File renamed successfully.' });
    }).on('error', (err) => {
      console.error('Error during file rename operation:', err);
      res.status(500).json({ message: 'Error renaming file.' });
    });
  } catch (error) {
    console.error('Error renaming file:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});


app.delete('/api/delete-file', async (req, res) => {
  const { fileId } = req.body;

  if (!fileId) {
    return res.status(400).json({ message: 'File ID is required' });
  }

  try {
    // Initialize GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(newConnection.db, {
      bucketName: 'yourBucketName', // Replace with your logic to get the bucket name dynamically if needed
    });

    // Delete the file
    await bucket.delete(mongoose.Types.ObjectId(fileId));
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/download-file', async (req, res) => {
  const { fileId } = req.query;

  if (!fileId) {
    return res.status(400).json({ message: 'File ID is required' });
  }

  try {
    // Initialize GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(newConnection.db, {
      bucketName: 'yourBucketName', // Replace with your logic to get the bucket name dynamically if needed
    });

    // Find the file and stream it to the response
    const downloadStream = bucket.openDownloadStream(mongoose.Types.ObjectId(fileId));
    downloadStream.pipe(res).on('error', (err) => {
      console.error('Error during file download:', err);
      res.status(500).json({ message: 'Error downloading file' });
    });

    downloadStream.on('end', () => {
      res.end();
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});




app.use((req, res, next) => {
  const log = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\n`;
  fs.appendFileSync("endpoint-usage.log", log); // Append logs to a file
  console.log(log); // Also log to console
  next();
});



console.log(expressListEndpoints(app));

const endpoints = expressListEndpoints(app);

// Write the endpoints to a file
fs.writeFileSync("endpoints.json", JSON.stringify(endpoints, null, 2), "utf-8");

console.log("Endpoints have been saved to endpoints.json");


// Handle SPA (Single Page Application) fallback (for Vue Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});



// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on http://192.168.50.57:${PORT}`);
});