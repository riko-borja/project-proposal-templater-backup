// routes/files.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const { Readable } = require('stream');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getOrCreateBucket, Folder, newConnection } = require('../models/newConnection');
const { GridFSBucket } = require('mongodb');
const { getFileBufferFromGridFS, saveFileBufferToGridFS } = require('../utils/gridFsHelpers');
const { oldConnection, getWordGridfsBucket, connectionReady } = require('../models/oldConnection'); // Import the readiness Promise
const authenticateToken = require('../middleware/auth');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

// Configure Multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });
const ONLYOFFICE_TOKEN_SECRET =
  process.env.ONLYOFFICE_JWT_SECRET ||
  process.env.JWT_SECRET_KEY ||
  'defaultsecret';

const normalizeBucketName = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const buildOnlyOfficeDocumentKey = ({ fileId, bucketName, uploadDate }) => {
  const raw = `${bucketName}|${fileId}|${new Date(uploadDate || Date.now()).toISOString()}`;
  return crypto.createHash('sha1').update(raw).digest('hex').slice(0, 20);
};

const getOldWordBucket = async () => {
  await connectionReady;
  return getWordGridfsBucket();
};

const resolveViewerBucket = async (bucketName) => {
  const normalizedBucketName = normalizeBucketName(bucketName);
  if (normalizedBucketName) {
    return { bucket: getOrCreateBucket(normalizedBucketName), bucketName: normalizedBucketName };
  }

  // Backward-compatibility path for legacy preview flow where no bucketName was passed.
  return { bucket: await getOldWordBucket(), bucketName: 'fs' };
};

// Process Dropdown Logic Endpoint
router.post('/process-dropdown-logic', authenticateToken, async (req, res) => {
  const { dataModel, fileId, bucketName, userId, allTags } = req.body; // `userId` is accepted for transition compatibility only
  // Trust boundary: authenticated user identity comes from JWT, not client payload.
  const authenticatedUserId = req.user?.userId;

  console.log('Received Request Body:');
  console.log('dataModel:', dataModel);
  console.log('fileId:', fileId);
  console.log('bucketName:', bucketName);
  console.log('userId (client-supplied, non-authoritative):', userId);
  console.log('authenticatedUserId (authoritative):', authenticatedUserId);
  console.log('allTags:', allTags);

  if (!authenticatedUserId) {
    console.error('Authenticated userId missing from token payload.');
    return res.status(401).json({ error: 'Authenticated user identity is required.' });
  }

  if (!dataModel || !fileId || !bucketName || !allTags) { // Ensure `allTags` is provided
    console.error('Missing required fields: dataModel, fileId, bucketName, or allTags.');
    return res.status(400).json({ error: 'dataModel, fileId, bucketName, and allTags are required.' });
  }

  try {
    const templatesBucket = getOrCreateBucket(bucketName);
    const fileObjectId = new mongoose.Types.ObjectId(fileId);
    const file = await templatesBucket.find({ _id: fileObjectId }).next();

    if (!file) {
      console.error(`Template with ID "${fileId}" not found in bucket "${bucketName}".`);
      return res.status(404).json({ error: `Template with ID "${fileId}" not found.` });
    }
    console.log('File Retrieved Successfully:', file.filename);

    const fileBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      const downloadStream = templatesBucket.openDownloadStream(file._id);
      downloadStream.on('data', (chunk) => chunks.push(chunk));
      downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
      downloadStream.on('error', (err) => reject(err));
    });

    const zip = new PizZip(fileBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: (part) => {
        // Leave undefined tags untouched
        return '';
      },
    });

    // Use dataModel directly
    console.log('Using dataModel as dropdown logic:');
    const dropdownLogic = dataModel; // dataModel is already an object with the correct structure
    console.log('this is the content of the dropdownLogic:', dropdownLogic)

    // Combine `allTags` with `dropdownLogic`
    const data = {
      ...allTags,       // Include all tags from Vuex
      ...dropdownLogic, // Override or add dropdown-specific logic
    };

    console.log('Final Data Passed to Docxtemplater:', data);

    // Render the document with the combined data
    try {
      doc.render(data);
      console.log('Document Rendered Successfully');
    } catch (error) {
      console.error('Error during document rendering:', error);
      res.status(500).json({ error: 'Document rendering failed.', details: error.message });
      return; // Exit the function to prevent further processing
    }

    const modifiedBuffer = doc.getZip().generate({ type: 'nodebuffer' });
    const tempBucketName = 'temp_files';
    const tempBucket = getOrCreateBucket(tempBucketName);
    const modifiedFilename = `modified_${file.filename}`;
    const uploadStream = tempBucket.openUploadStream(modifiedFilename, {
      metadata: {
        originalFileId: fileId,
        processedWith: 'dropdown',
        userId: authenticatedUserId, // Authoritative identity from JWT
        timestamp: new Date(),
      },
    });

    Readable.from(modifiedBuffer).pipe(uploadStream);

    uploadStream.on('error', (err) => {
      console.error('Error uploading modified document:', err);
      res.status(500).json({ error: 'Failed to save modified document.', details: err.message });
    });

    uploadStream.on('finish', () => {
      console.log(`Modified document saved to temporary bucket: ${tempBucketName}`);
      res.status(200).json({
        message: 'Dropdown logic applied successfully.',
        modifiedFileId: uploadStream.id,
        tempBucketName,
        modifiedFilename,
      });
    });
  } catch (error) {
    console.error('Error processing dropdown logic:', error.message);
    res.status(500).json({ error: 'Failed to process dropdown logic.', details: error.message });
  }
});





// Fetch Template Files Endpoint
router.get('/fetch-template-files', async (req, res) => {
  const { hierarchy } = req.query;

  console.log('Received hierarchy:', hierarchy);

  if (!hierarchy) {
    console.error('Error: Hierarchy parameter is missing.');
    return res.status(400).json({ error: 'Hierarchy parameter is required.' });
  }

  try {
    // Parse the hierarchy
    let hierarchyArray;
    try {
      hierarchyArray = JSON.parse(hierarchy);
      console.log('Parsed hierarchy array:', hierarchyArray);
    } catch (error) {
      console.error('Error parsing hierarchy JSON:', error.message);
      return res.status(400).json({ error: 'Invalid hierarchy format.' });
    }

    // Get the path of the last folder in the hierarchy
    const lastFolder = hierarchyArray[hierarchyArray.length - 1];
    if (!lastFolder || !lastFolder.path) {
      console.error('Error: Last folder in the hierarchy is missing or invalid.', lastFolder);
      return res.status(400).json({ error: 'Hierarchy does not contain valid folder information.' });
    }

    const folderPath = lastFolder.path;
    console.log('Using folder path:', folderPath);

    // Find the folder in the database
    const folder = await Folder.findOne({ path: folderPath });
    if (!folder) {
      console.error(`Error: Folder not found in database for path "${folderPath}".`);
      return res.status(404).json({ error: `Folder with path "${folderPath}" not found.` });
    }
    console.log('Found folder in database:', folder);

    // Derive the bucket name
    const bucketName = folder.bucketName || folderPath.replace(/\//g, '_');
    console.log('Resolved bucket name:', bucketName);

    // Connect to the GridFS bucket
    const gridFsBucket = getOrCreateBucket(bucketName);
    console.log('Connected to GridFS bucket:', bucketName);

    // Fetch files from the bucket
    const files = [];
    const cursor = gridFsBucket.find();
    await cursor.forEach(file => {
      console.log('File found in bucket:', file.filename);
      files.push({
        _id: file._id,
        filename: file.filename,
        contentType: file.contentType,
        length: file.length,
        uploadDate: file.uploadDate,
        metadata: file.metadata || {},
        bucketName: bucketName, // Added this line
        path: folderPath, // Include the path
      });
    });

    if (files.length === 0) {
      console.warn(`No files found in GridFS bucket "${bucketName}".`);
      return res.status(404).json({ message: `No files found in bucket "${bucketName}".` });
    }

    // Send the files as a response
    console.log('Files fetched successfully:', files);
    res.status(200).json(files);
  } catch (error) {
    console.error('Unhandled error in /fetch-template-files endpoint:', error.message);
    res.status(500).json({ error: 'Failed to fetch template files.', details: error.message });
  }
});

// Fetch Modified Document Endpoint
router.get('/fetch-modified-template', authenticateToken, async (req, res) => {
  const { userId, originalFileId } = req.query;
  // Trust boundary: authenticated user identity comes from JWT, not query params.
  const authenticatedUserId = req.user?.userId;

  // Validate query parameters
  if (!authenticatedUserId) {
    return res.status(401).json({ error: 'Authenticated user identity is required.' });
  }

  if (!originalFileId) {
    return res.status(400).json({ error: 'originalFileId is required.' });
  }

  try {
    // Connect to the temp_files GridFS bucket
    const gridFsBucket = getOrCreateBucket('temp_files');
    console.log('Connected to temp_files bucket');

    // Find the latest modified document for the user
    const modifiedFile = await gridFsBucket.find({
      'metadata.userId': authenticatedUserId,
      'metadata.originalFileId': originalFileId,
      'metadata.processedWith': 'dropdown',
    })
    .sort({ uploadDate: -1 }) // Get the latest version
    .limit(1)
    .next();

    if (!modifiedFile) {
      console.error(`No modified document found for authenticated userId "${authenticatedUserId}" and originalFileId "${originalFileId}".`);
      return res.status(404).json({ error: 'No modified document found.' });
    }

    console.log('Found modified document:', modifiedFile);

    // Set appropriate headers
    res.setHeader('Content-Type', modifiedFile.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${modifiedFile.filename}"`);

    // Stream the file content to the client
    const downloadStream = gridFsBucket.openDownloadStream(modifiedFile._id);
    downloadStream.pipe(res);

    // Handle stream errors
    downloadStream.on('error', (err) => {
      console.error('Error streaming modified document:', err);
      res.status(500).json({ error: 'Error streaming modified document.' });
    });

    downloadStream.on('end', () => {
      console.log('Modified document streaming completed.');
    });
  } catch (error) {
    console.error('Unhandled error in /fetch-modified-template:', error.message);
    res.status(500).json({ error: 'Failed to fetch modified document.', details: error.message });
  }
});


// Fetch Specific File Content Endpoint
router.get('/fetch-template-content', async (req, res) => {
  const { fileId, bucketName } = req.query;

  // Validate query parameters
  if (!fileId || !bucketName) {
    return res.status(400).json({ error: 'fileId and bucketName are required.' });
  }

  try {
    // Validate the fileId format
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid fileId format.' });
    }

    // Connect to the specified GridFS bucket
    const gridFsBucket = getOrCreateBucket(bucketName);
    console.log('Connected to GridFS bucket:', bucketName);

    // Fetch the file stream by fileId
    const _id = new mongoose.Types.ObjectId(fileId);
    const file = await gridFsBucket.find({ _id }).next();

    if (!file) {
      console.error(`Error: File with ID "${fileId}" not found in bucket "${bucketName}".`);
      return res.status(404).json({ error: `File with ID "${fileId}" not found.` });
    }

    console.log('Found file in bucket:', file);

    // Set appropriate headers based on file metadata
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);

    // Stream the file content to the client
    const downloadStream = gridFsBucket.openDownloadStream(_id);

    downloadStream.pipe(res);

    // Handle stream errors
    downloadStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      res.status(500).json({ error: 'Error streaming file content.' });
    });

    downloadStream.on('end', () => {
      console.log('File streaming completed.');
    });
  } catch (error) {
    console.error('Unhandled error in /fetch-template-content:', error.message);
    res.status(500).json({ error: 'Failed to fetch template content.', details: error.message });
  }
});


// Read File Endpoint
router.get('/read-file', async (req, res) => {
  const { fileId } = req.query;

  try {
    const buffer = await getFileBufferFromGridFS(wordGridfsBucket, fileId);
    res.status(200).send(buffer);
  } catch (err) {
    console.error('Error reading file:', err);
    res.status(500).send('Failed to read file');
  }
});

router.get('/get-files', async (req, res) => {
  const { path } = req.query;

  console.log('Received path:', path);

  if (!path) {
    return res.status(400).json({ message: 'Path is required to fetch files.' });
  }

  try {
    // Find the folder using the path
    const folder = await Folder.findOne({ path });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    const bucketName = folder.bucketName || path.replace(/\//g, '_');
    console.log('Resolved bucket name:', bucketName);

    // Fetch files from GridFS using the bucketName
    const gridFsBucket = new GridFSBucket(newConnection.db, { bucketName });
    const files = await gridFsBucket.find().toArray();

    // Validate and filter out inconsistencies
    const validFiles = files.filter(file => {
      // Optional: Add further validation logic if necessary
      return file && file.filename && file.length > 0; // Ensure basic file validity
    });

    console.log('Valid files:', validFiles);
    res.status(200).json(validFiles);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ message: 'Error fetching files' });
  }
});




// Save File Endpoint
router.post('/save-file', upload.single('file'), async (req, res) => {
  const { fileId } = req.body;
  const file = req.file;

  try {
    await saveFileBufferToGridFS(wordGridfsBucket, file.buffer, file.originalname, fileId);
    res.status(200).send('File saved successfully');
  } catch (err) {
    console.error('Error saving file:', err);
    res.status(500).send('Failed to save file');
  }
});

// Upload Modified Document Endpoint
router.post('/upload-modified-document', upload.single('file'), async (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }

  const userId = req.user.userId || 'unknown'; // Extracted from JWT
  console.log('UserId from token:', userId);

  const readableStream = new Readable();
  readableStream.push(req.file.buffer);
  readableStream.push(null);

  const filename = req.file.originalname;
  const writeStream = new GridFSBucket(newConnection.db, { bucketName: 'modified_documents' })
    .openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: { userId, status: 'pending' },
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

// Upload Processed Template Endpoint
router.post('/upload-processed-template', upload.single('file'), async (req, res) => {
  if (!req.file) {
    console.error('No processed template uploaded.');
    return res.status(400).send('No file uploaded.');
  }

  const userId = req.user.userId || 'unknown'; // Extracted from JWT
  console.log('UserId from token:', userId);

  const readableStream = new Readable();
  readableStream.push(req.file.buffer);
  readableStream.push(null);

  const filename = `ProcessedTemplate_${Date.now()}.docx`;
  const writeStream = processedTemplatesGridfsBucket.openUploadStream(filename, {
    contentType: req.file.mimetype,
    metadata: { userId },
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


// Delete File Endpoint
router.delete('/delete-file', async (req, res) => {
  const { path, fileId } = req.query;
  console.log('Delete request received with:', { path, fileId });

  if (!path || !fileId) {
    console.error('Invalid request: Missing path or fileId.');
    return res.status(400).json({ message: 'Path and fileId are required to delete a file.' });
  }

  try {
    // Step 1: Try to find the folder in both `local_disk` and `generated_documents`
    let folder = await Folder.findOne({ path, type: 'storage' });

    if (!folder) {
      console.warn(`Folder not found for path: ${path}. Attempting mirrored folder lookup.`);
      const mirroredPath = path.replace(/^local_disk/, 'generated_documents');
      folder = await Folder.findOne({ path: mirroredPath, type: 'storage' });
    }

    if (!folder || !folder.bucketName) {
      console.error(`Folder not found for path: ${path} or its mirrored path.`);
      return res.status(404).json({ message: 'Storage folder not found or invalid.' });
    }

    console.log(`Folder and bucket found: ${folder.name}, bucketName: ${folder.bucketName}`);
    const bucketName = folder.bucketName;

    // Step 2: Get the GridFS bucket (you can keep this for logging or other operations if needed)
    const gridFsBucket = new GridFSBucket(newConnection.db, { bucketName });

    // Step 3: Check if the file exists in GridFS
    const files = await gridFsBucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    console.log('Files found for deletion:', files);
    if (files.length === 0) {
      console.warn(`File with ID ${fileId} not found in GridFS. Treating as already deleted.`);
      return res.status(200).json({ message: 'File already deleted or not found.' });
    }

    // Step 4: Delete the file from GridFS using direct collection methods
    try {
      console.log('Initiating direct deletion operation in GridFS...');
      const filesCollection = newConnection.db.collection(`${bucketName}.files`);
      const chunksCollection = newConnection.db.collection(`${bucketName}.chunks`);

      // Delete the file document
      const fileDeleteResult = await filesCollection.deleteOne({ _id: new mongoose.Types.ObjectId(fileId) });

      if (fileDeleteResult.deletedCount === 0) {
        console.warn(`File with ID ${fileId} not found in files collection.`);
        return res.status(404).json({ message: 'File not found in GridFS files collection.' });
      }

      // Delete the chunks associated with the file
      const chunksDeleteResult = await chunksCollection.deleteMany({ files_id: new mongoose.Types.ObjectId(fileId) });

      console.log(`File with ID ${fileId} deleted successfully. Deleted ${chunksDeleteResult.deletedCount} chunks.`);
      console.log('Direct GridFS delete operation completed. About to send response to frontend...');
    } catch (err) {
      console.error('Error during direct GridFS file deletion:', err);
      throw err;
    }

    // Send response after deletion is complete
    console.log('About to send success response to frontend...');
    return res.status(200).json({ message: 'File deleted successfully.' });
  } catch (error) {
    console.error('Unhandled error during file deletion:', error);
    res.status(500).json({ message: 'Internal server error during file deletion.' });
  }
});



// Upload File Endpoint
router.post('/upload-file', upload.array('files'), async (req, res) => {
  const { path } = req.body; // Folder path sent by the frontend
  const files = req.files; // Files uploaded via multer

  if (!path) {
    return res.status(400).json({ message: 'Folder path is required to upload files.' });
  }

  try {
    // Step 1: Find the folder in the database
    const folder = await Folder.findOne({ path, type: 'storage' });
    if (!folder || !folder.bucketName) {
      return res.status(404).json({ message: 'Storage folder not found or invalid.' });
    }

    const bucketName = folder.bucketName;

    // Step 2: Get the GridFS bucket for the folder
    const gridFsBucket = new GridFSBucket(newConnection.db, { bucketName });

    // Step 3: Upload files to GridFS
    const uploadedFiles = [];
    for (const file of files) {
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null); // Signal end of the stream

      const uploadStream = gridFsBucket.openUploadStream(file.originalname, {
        contentType: file.mimetype,
        metadata: {
          uploadDate: new Date(),
          folderId: folder._id,
          folderPath: folder.path,
        },
      });

      await new Promise((resolve, reject) => {
        readableStream
          .pipe(uploadStream)
          .on('finish', () => {
            uploadedFiles.push({
              filename: file.originalname,
              fileId: uploadStream.id,
              metadata: uploadStream.metadata,
            });
            resolve();
          })
          .on('error', (err) => {
            console.error('Error uploading file:', err);
            reject(err);
          });
      });
    }

    console.log('Files uploaded successfully:', uploadedFiles);
    res.status(201).json({ message: 'Files uploaded successfully.', files: uploadedFiles });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ message: 'Internal server error during file upload.' });
  }
});



// Upload Generated Document Endpoint
router.post('/upload-generated-document', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }

  const userId = req.user?.userId || 'unknown'; // Extracted from JWT
  console.log('UserId from token:', userId);

  const { folderPath } = req.body;
  if (!folderPath) {
    console.error('No folder path provided.');
    return res.status(400).json({ message: 'Folder path is required.' });
  }

  console.log('Folder path received:', folderPath);

  try {
    // Map the mirrored folder path
    const mirroredFolderPath = folderPath.replace(/^local_disk/, 'generated_documents');
    console.log('Mapped mirrored folder path:', mirroredFolderPath);

    // Check if the folder is a storage folder
    const folder = await Folder.findOne({ path: folderPath });
    if (!folder) {
      console.error(`Original folder not found for path: ${folderPath}`);
      return res.status(404).json({ message: `Folder not found for path: ${folderPath}` });
    }

    let mirroredFolder;

    // If the folder is a storage folder, append "Generated Folder" to the mirrored folder name
    if (folder.type === 'storage') {
      const parentPath = mirroredFolderPath.substring(0, mirroredFolderPath.lastIndexOf('/'));
      const mirroredFolderName = `Generated Folder ${folder.name}`;
      const generatedFolderPath = `${parentPath}/${mirroredFolderName}`;
      console.log('Adjusted mirrored folder path for storage:', generatedFolderPath);

      mirroredFolder = await Folder.findOne({ path: generatedFolderPath });
    } else {
      // For non-storage folders, use the default mirrored path
      mirroredFolder = await Folder.findOne({ path: mirroredFolderPath });
    }

    if (!mirroredFolder) {
      console.error(`Mirrored folder not found for path: ${mirroredFolderPath}`);
      return res.status(404).json({ message: `Mirrored folder not found for path: ${mirroredFolderPath}` });
    }

    console.log('Mirrored folder found:', mirroredFolder);

    // Use the bucket name from the mirrored folder or derive it
    const bucketName = mirroredFolder.bucketName || mirroredFolder.path.replace(/\//g, '_');
    console.log('Resolved bucket name:', bucketName);

    // Get or create the GridFS bucket
    const gridFsBucket = getOrCreateBucket(bucketName);

    // Create a readable stream from the file buffer
    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    const filename = req.file.originalname;

    // Initialize the upload stream to GridFS
    const writeStream = gridFsBucket.openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: { userId },
    });

    // Pipe the readable stream into the write stream
    readableStream.pipe(writeStream);

    // Handle the finish event
    writeStream.on('finish', () => {
      console.log(`File uploaded successfully by user ${userId}, ID: ${writeStream.id}`);
      res.status(200).json({ fileId: writeStream.id });
    });

    // Handle any errors during upload
    writeStream.on('error', (err) => {
      console.error('Error uploading file:', err);
      res.status(500).json({ error: 'Error uploading file.' });
    });
  } catch (error) {
    console.error('Unhandled error during document upload:', error);
    res.status(500).json({ error: 'Internal server error during upload.', details: error.message });
  }
});



// Generate Editor URL Endpoint
router.post('/generate-editor-url', async (req, res) => {
  const { fileId, bucketName } = req.body || {};

  if (!fileId) {
    return res.status(400).json({ error: 'fileId is required' });
  }

  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    return res.status(400).json({ error: 'Invalid fileId format' });
  }

  try {
    const { bucket, bucketName: resolvedBucketName } = await resolveViewerBucket(bucketName);
    const _id = new mongoose.Types.ObjectId(fileId);
    const files = await bucket.find({ _id }).toArray();

    if (files.length === 0) {
      return res.status(404).json({
        error: `File not found for fileId "${fileId}" in bucket "${resolvedBucketName}".`,
      });
    }

    const file = files[0];
    const docRef = {
      fileId: String(file?._id || '').trim(),
      bucketName: String(resolvedBucketName || '').trim(),
    };

    if (!docRef.fileId || !docRef.bucketName) {
      console.error('Failed to build ONLYOFFICE docRef payload', {
        fileId: docRef.fileId,
        bucketName: docRef.bucketName,
      });
      return res.status(500).json({ error: 'Failed to build document token payload.' });
    }

    const downloadToken = jwt.sign(
      {
        docRef,
      },
      ONLYOFFICE_TOKEN_SECRET,
      { expiresIn: '1h' }
    );
    const documentKey = buildOnlyOfficeDocumentKey({
      fileId: String(fileId),
      bucketName: resolvedBucketName,
      uploadDate: file.uploadDate,
    });
    const publicBaseUrl = process.env.PUBLIC_API_URL || process.env.BACKEND_BASE_URL || 'http://host.docker.internal:5001';
    const documentUrl = `${publicBaseUrl}/api/files/document/${fileId}?bucketName=${encodeURIComponent(resolvedBucketName)}&docToken=${encodeURIComponent(downloadToken)}`;

    const document = {
      fileType: "docx",
      key: documentKey,
      title: file.filename,
      url: documentUrl,
      permissions: { edit: false, review: false },
    };

    const editorConfig = {
      mode: "view",
      user: {
        id: 'tag-authoring',
        name: 'Tag Authoring',
      },
    };

    const config = {
      document,
      documentType: "word",
      editorConfig,
      docRef,
    };

    const token = jwt.sign(config, ONLYOFFICE_TOKEN_SECRET, { expiresIn: '1h' });
    res.json({
      document,
      token,
      bucketName: resolvedBucketName,
    });
  } catch (error) {
    console.error('Error generating editor URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download Document Endpoint
router.get('/document/:fileId', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';
  const tokenFromQuery = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  const docTokenFromQuery = typeof req.query.docToken === 'string' ? req.query.docToken.trim() : '';
  const token = docTokenFromQuery || tokenFromHeader || tokenFromQuery;
  const tokenSource = docTokenFromQuery ? 'docToken' : (tokenFromHeader ? 'authorization' : (tokenFromQuery ? 'token' : 'none'));
  const { fileId: paramFileId } = req.params;
  const requestedBucketName = normalizeBucketName(req.query.bucketName);

  console.log('[ONLYOFFICE document] Incoming request', {
    fileId: paramFileId,
    requestedBucketName,
    hasAuthHeader: Boolean(authHeader),
    hasTokenQuery: Boolean(tokenFromQuery),
    hasDocTokenQuery: Boolean(docTokenFromQuery),
    tokenSource,
  });

  if (!token) {
    console.error('[ONLYOFFICE document] Rejecting request: missing token');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, ONLYOFFICE_TOKEN_SECRET);
    const tokenFileId = String(decoded?.docRef?.fileId || '');
    const tokenBucketName = normalizeBucketName(decoded?.docRef?.bucketName);
    console.log('[ONLYOFFICE document] Token verified', {
      tokenFileId,
      tokenBucketName,
    });

    if (!mongoose.Types.ObjectId.isValid(paramFileId)) {
      console.error('[ONLYOFFICE document] Rejecting request: invalid fileId format', { fileId: paramFileId });
      return res.status(400).json({ error: 'Invalid fileId format' });
    }

    if (!tokenFileId || tokenFileId !== String(paramFileId)) {
      console.error('[ONLYOFFICE document] Rejecting request: file mismatch', {
        tokenFileId,
        paramFileId: String(paramFileId),
      });
      return res.status(403).json({ error: 'Access denied: file mismatch' });
    }

    if (!tokenBucketName || (requestedBucketName && requestedBucketName !== tokenBucketName)) {
      console.error('[ONLYOFFICE document] Rejecting request: bucket mismatch', {
        requestedBucketName,
        tokenBucketName,
      });
      return res.status(403).json({ error: 'Access denied: bucket mismatch' });
    }

    const { bucket } = await resolveViewerBucket(tokenBucketName);
    const fileObjectId = new mongoose.Types.ObjectId(paramFileId);
    const files = await bucket.find({ _id: fileObjectId }).toArray();

    if (files.length === 0) {
      console.error('[ONLYOFFICE document] Rejecting request: file not found', {
        fileId: paramFileId,
        bucketName: tokenBucketName,
      });
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];
    const downloadStream = bucket.openDownloadStream(fileObjectId);

    res.setHeader('Content-Type', file.contentType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    console.log('[ONLYOFFICE document] Streaming file response', {
      fileId: paramFileId,
      bucketName: tokenBucketName,
      filename: file.filename,
      contentType: file.contentType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      length: file.length,
    });

    downloadStream.pipe(res).on('error', (err) => {
      console.error('[ONLYOFFICE document] Stream error during file download:', err);
      res.status(500).json({ message: 'Error downloading file' });
    });

    downloadStream.on('end', () => {
      console.log('[ONLYOFFICE document] Stream completed', {
        fileId: paramFileId,
        bucketName: tokenBucketName,
      });
      res.end();
    });
  } catch (err) {
    console.error('[ONLYOFFICE document] JWT verification failed:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Fetch Documents Endpoint
router.get('/documents', async (req, res) => {
  try {
    const documents = await oldConnection.db.collection('fs.files').find({}).toArray();

    const filteredDocuments = documents.filter(doc => doc.metadata && doc.metadata.userId);

    res.json(filteredDocuments);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Error fetching documents', error: error.message });
  }
});

module.exports = router;
