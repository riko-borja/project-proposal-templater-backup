// routes/folders.js
const express = require('express');
const router = express.Router();
const { Folder } = require('../models/newConnection');
const { GridFSBucket } = require('mongodb'); // Ensure you have the correct connection
const { newConnection } = require('../models/newConnection'); // For GridFS

// Create Folder Endpoint
router.post('/create-folder', async (req, res) => {
  const { path, type, storageType } = req.body;

  // Input Validation
  if (!path || !type) {
    return res.status(400).json({ message: 'Path and type are required' });
  }

  try {
    // Check if the folder already exists
    const existingFolder = await Folder.findOne({ path });
    if (existingFolder) {
      return res.status(400).json({ message: 'Folder already exists' });
    }

    // Determine folder name and parent
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

    // Handle Storage Folder Specifics
    let bucketName = null;
    if (type === 'storage') {
      console.log(`Creating storage folder: Name=${name}, Path=${path}, StorageType=${storageType}`);
      bucketName = path.replace(/\//g, '_');
      const gridFsBucket = new GridFSBucket(newConnection.db, { bucketName });
      const writableStream = gridFsBucket.openUploadStream('placeholder');
      writableStream.end(); // Optional: Upload a placeholder to initialize the bucket
      console.log(`GridFS bucket created for storage folder: ${bucketName}`);
    }

    // Create the Primary Folder in local_disk
    const newFolder = new Folder({
      path,
      name,
      parent,
      type,
      storageType: type === 'storage' ? storageType : null,
      createdAt: new Date(),
      bucketName,
    });

    await newFolder.save();
    console.log('New folder created:', newFolder);

    // Determine if Mirroring is Needed
    const parentFolderForMirror = pathSegments.length > 1 ? await Folder.findOne({ path: pathSegments.slice(0, -1).join('/') }) : null;
    const parentType = parentFolderForMirror ? parentFolderForMirror.type : null;
    const shouldMirror = type === 'storage' && parentFolderForMirror && (parentType === 'category' || parentType === 'subcategory');

    console.log(`Should mirror: ${shouldMirror}`);

    if (shouldMirror) {
      try {
        // Define Mirrored Paths
        const mirroredPath = path.replace(/^local_disk/, 'generated_documents');
        const mirroredParentPath = parentFolderForMirror.path.replace(/^local_disk/, 'generated_documents');

        // Find or Create Mirrored Parent
        let mirroredParent = await Folder.findOne({ path: mirroredParentPath });

        if (!mirroredParent && parentFolderForMirror) {
          console.log(`Mirrored parent folder does not exist. Creating mirrored parent: ${mirroredParentPath}`);
          
          // Create the mirrored parent folder
          mirroredParent = new Folder({
            name: parentFolderForMirror.name,
            path: mirroredParentPath,
            parent: 'generated_documents' === mirroredParentPath ? null : (await Folder.findOne({ path: 'generated_documents' }))._id,
            type: parentFolderForMirror.type, // Same type as the original parent
            isMirrored: true,
            createdAt: new Date(),
          });
          await mirroredParent.save();
          console.log('Mirrored parent folder created:', mirroredParent);
        }

        // Define Mirrored Folder Path and Name
        const mirroredFolderName = `Generated Folder ${name}`;
        const mirroredFolderPath = `${mirroredParentPath}/${mirroredFolderName}`;

        // Check if Mirrored Folder Already Exists
        const existingMirror = await Folder.findOne({ path: mirroredFolderPath });
        if (!existingMirror) {
          console.log(`Creating mirrored storage folder: Name=${mirroredFolderName}, Path=${mirroredFolderPath}`);

                // Set the type to 'storage' for the mirrored folder
          const mirroredType = 'storage';

          // Set the storageType to match the original folder
          const mirroredStorageType = storageType;

          // Generate a unique bucketName for the mirrored folder
          const mirroredBucketName = mirroredFolderPath.replace(/\//g, '_');

          // Initialize a GridFS bucket for the mirrored folder
          const gridFsBucket = new GridFSBucket(newConnection.db, { bucketName: mirroredBucketName });
          const writableStream = gridFsBucket.openUploadStream('placeholder');
          writableStream.end(); // Optional: Upload a placeholder to initialize the bucket
        console.log(`GridFS bucket created for mirrored storage folder: ${mirroredBucketName}`);

          const mirroredFolder = new Folder({
            path: mirroredFolderPath,
            name: mirroredFolderName,
            parent: mirroredParent ? mirroredParent._id : null,
            type: mirroredType, // Ensure 'generated' is in the enum
            storageType: mirroredStorageType,
            isMirrored: true, // Optional flag
            createdAt: new Date(),
            bucketName: mirroredBucketName,
          });
          await mirroredFolder.save();
          console.log('Mirrored storage folder successfully created:', mirroredFolder);
        } else {
          console.log('Mirrored storage folder already exists:', mirroredFolderPath);
        }
      } catch (mirrorError) {
        console.error('Error during mirroring:', mirrorError.message, mirrorError.stack);
        // Optionally, notify the user or admin about the mirroring failure
        // Do not prevent the primary folder creation
      }
    }

    // Respond with Success
    res.status(201).json({ message: 'Folder created successfully', folder: newFolder });
  } catch (error) {
    console.error('Error creating folder:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});




// Get Folder Structure Endpoint
router.get('/folder-structure', async (req, res) => {
  try {
    const folders = await Folder.find({}).lean(); // Fetch all folder documents

    const formattedFolders = folders.map(folder => ({
      _id: folder._id.toString(),
      name: folder.name,
      parent: folder.parent ? folder.parent.toString() : null,
      path: folder.path,
      type: folder.type,
      storageType: folder.storageType || null,
      children: [],
    }));

    const folderMap = {};
    formattedFolders.forEach(folder => {
      folderMap[folder._id] = folder;
    });

    const rootFolders = [];
    formattedFolders.forEach(folder => {
      if (!folder.parent) {
        rootFolders.push(folder);
      } else {
        const parentFolder = folderMap[folder.parent];
        if (parentFolder) {
          parentFolder.children.push(folder);
        } else {
          console.warn(`Parent folder with ID ${folder.parent} not found for folder ${folder.name}`);
        }
      }
    });

    console.log('Constructed folder hierarchy:', rootFolders);

    res.status(200).json(rootFolders);
  } catch (error) {
    console.error('Error fetching folder structure:', error);
    res.status(500).json({ message: 'Error fetching folder structure' });
  }
});

router.delete('/delete-folder', async (req, res) => {
  const { path } = req.body;

  if (!path) {
    return res.status(400).json({ message: 'Path is required' });
  }

  if (path === 'local_disk' || path === 'generated_documents') {
    return res.status(403).json({ message: 'Deleting the root folder is not allowed' });
  }

  try {
    // Find the folder to delete
    const folderToDelete = await Folder.findOne({ path });
    if (!folderToDelete) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Check if the folder has subfolders
    const hasChildren = await Folder.exists({ parent: folderToDelete._id });
    if (hasChildren) {
      return res.status(400).json({ message: 'Folder contains subfolders. Please delete them first.' });
    }

    // Check if the folder contains files (for storage folders)
    if (folderToDelete.type === 'storage' && folderToDelete.bucketName) {
      const bucket = new GridFSBucket(newConnection.db, { bucketName: folderToDelete.bucketName });
      const files = await bucket.find().toArray();
      if (files.length > 0) {
        return res.status(400).json({ message: `Folder contains ${files.length} files. Please delete the files first.` });
      }
    }

    // Delete the mirrored folder if it exists
    const mirroredPath = path.replace(/^local_disk/, 'generated_documents');
    const mirroredFolder = await Folder.findOne({ path: mirroredPath });
    if (mirroredFolder) {
      if (mirroredFolder.type === 'storage' && mirroredFolder.bucketName) {
        const mirroredBucket = new GridFSBucket(newConnection.db, { bucketName: mirroredFolder.bucketName });
        const mirroredFiles = await mirroredBucket.find().toArray();
        if (mirroredFiles.length > 0) {
          return res.status(400).json({
            message: `Mirrored folder contains ${mirroredFiles.length} files. Please delete the files first.`,
          });
        }
      }

      await Folder.deleteOne({ _id: mirroredFolder._id });
      console.log('Mirrored folder deleted successfully:', mirroredPath);
    }

    // Delete the primary folder
    await Folder.deleteOne({ _id: folderToDelete._id });
    res.status(200).json({ message: 'Folder deleted successfully.' });
  } catch (error) {
    console.error('Error deleting folder:', error.message, error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


// Check Folder Endpoint
router.post('/check-folder', async (req, res) => {
  const { path } = req.body;

  if (!path) {
    return res.status(400).json({ message: 'Path is required' });
  }

  try {
    const folder = await Folder.findOne({ path });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const hasSubfolders = await Folder.exists({ parent: folder._id });

    let containsFiles = false;
    let fileCount = 0;

    if (folder.type === 'storage' && folder.bucketName) {
      const bucket = new GridFSBucket(newConnection.db, { bucketName: folder.bucketName });
      const files = await bucket.find().toArray();
      fileCount = files.length;
      containsFiles = fileCount > 0;
    }

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



router.get('/query-folders', async (req, res) => {
  const { type, parent } = req.query;

  try {
    const query = {
      path: { $regex: /^local_disk/ }, // Only include folders under 'local_disk'
    };

    if (type) query.type = type;
    if (parent) query.parent = parent;

    // Fetch folders and include the 'path' field
    const folders = await Folder.find(query, 'name path parent type'); // Select only necessary fields

    console.log('Fetched folders under local_disk:', folders); // Debug log

    res.status(200).json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});



// Rename Folder Endpoint
router.put('/rename-folder', async (req, res) => {
  const { oldPath, newName } = req.body;

  if (!oldPath || !newName) {
    return res.status(400).json({ message: 'Old path and new name are required' });
  }

  try {
    // Step 1: Find the folder to rename
    const folder = await Folder.findOne({ path: oldPath });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    // Step 2: Check if a folder with the new path already exists
    const existingFolder = await Folder.findOne({ path: newPath });
    if (existingFolder) {
      return res.status(400).json({ message: 'A folder with the new name already exists in this location.' });
    }

    // Step 3: Update the folder's name and path
    const oldBucketName = folder.bucketName;
    folder.name = newName;
    folder.path = newPath;

    if (folder.type === 'storage' && folder.bucketName) {
      folder.bucketName = newPath.replace(/\//g, '_'); // Update bucket name
    }

    await folder.save();

    // Step 4: Handle GridFS bucket renaming for storage folders
    if (folder.type === 'storage' && oldBucketName) {
      const newBucketName = folder.bucketName;
      const db = newConnection.db;

      const oldBucket = new GridFSBucket(db, { bucketName: oldBucketName });
      const newBucket = new GridFSBucket(db, { bucketName: newBucketName });

      // Copy files from old bucket to new bucket
      const cursor = oldBucket.find();
      const files = await cursor.toArray();

      for (const file of files) {
        const downloadStream = oldBucket.openDownloadStream(file._id);
        const uploadStream = newBucket.openUploadStream(file.filename, {
          metadata: file.metadata,
        });
        await new Promise((resolve, reject) => {
          downloadStream.pipe(uploadStream).on('finish', resolve).on('error', reject);
        });
      }

      // Remove old bucket
      await oldBucket.drop();

      console.log(`GridFS bucket renamed from ${oldBucketName} to ${newBucketName}`);
    }

// Step 5: Handle Mirrored Folder Renaming
if (oldPath.startsWith('local_disk')) {
  // Compute mirrored paths and names
  const oldFolderName = oldPath.substring(oldPath.lastIndexOf('/') + 1);
  const mirroredOldName = folder.type === 'storage' ? `Generated Folder ${oldFolderName}` : oldFolderName;
  const mirroredParentPath = parentPath.replace('local_disk', 'generated_documents');
  const mirroredOldPath = `${mirroredParentPath}/${mirroredOldName}`;
  console.log('Attempting to find mirrored folder at path:', mirroredOldPath);

  const mirroredFolder = await Folder.findOne({ path: mirroredOldPath });
  if (mirroredFolder) {
    console.log('Mirrored folder found:', mirroredFolder);
    const mirroredNewName = folder.type === 'storage' ? `Generated Folder ${newName}` : newName;
    const mirroredNewPath = `${mirroredParentPath}/${mirroredNewName}`;

    // Update mirrored folder's name and path
    mirroredFolder.name = mirroredNewName;
    mirroredFolder.path = mirroredNewPath;

    if (folder.type === 'storage') {
      // Update mirrored folder's bucketName for storage type
      const mirroredOldBucketName = mirroredFolder.bucketName;
      const mirroredNewBucketName = mirroredNewPath.replace(/\//g, '_');
      mirroredFolder.bucketName = mirroredNewBucketName; // Update the bucketName first in memory

      if (mirroredOldBucketName) {
        try {
          const mirroredOldBucket = new GridFSBucket(newConnection.db, {
            bucketName: mirroredOldBucketName,
          });
          const mirroredNewBucket = new GridFSBucket(newConnection.db, {
            bucketName: mirroredNewBucketName,
          });

          // Copy files from old mirrored bucket to new mirrored bucket
          const mirroredCursor = mirroredOldBucket.find();
          const mirroredFiles = await mirroredCursor.toArray();

          for (const file of mirroredFiles) {
            const downloadStream = mirroredOldBucket.openDownloadStream(file._id);
            const uploadStream = mirroredNewBucket.openUploadStream(file.filename, {
              metadata: file.metadata,
            });
            await new Promise((resolve, reject) => {
              downloadStream.pipe(uploadStream).on('finish', resolve).on('error', reject);
            });
          }

          // Remove old mirrored bucket
          await mirroredOldBucket.drop();

          console.log(
            `Mirrored GridFS bucket renamed from ${mirroredOldBucketName} to ${mirroredNewBucketName}`
          );
        } catch (err) {
          console.error(`Error renaming mirrored GridFS bucket: ${err}`);
          throw new Error('Failed to rename mirrored GridFS bucket.');
        }
      }
    }

    await mirroredFolder.save();
    console.log('Mirrored folder updated successfully:', mirroredFolder);

    // **New Code Starts Here**

    // Step 6b: Update child folders under the mirrored folder recursively
    const mirroredChildFolders = await Folder.find({ path: { $regex: `^${mirroredOldPath}/` } });
    for (const mirroredChildFolder of mirroredChildFolders) {
      const oldMirroredChildPath = mirroredChildFolder.path;
      const newMirroredChildPath = oldMirroredChildPath.replace(mirroredOldPath, mirroredNewPath);
      mirroredChildFolder.path = newMirroredChildPath;

      if (mirroredChildFolder.type === 'storage') {
        const oldBucketName = mirroredChildFolder.bucketName;
        const newBucketName = newMirroredChildPath.replace(/\//g, '_');

        // Update the bucketName in the folder document
        mirroredChildFolder.bucketName = newBucketName;

        if (oldBucketName) {
          try {
            // Handle GridFS bucket renaming
            const oldBucket = new GridFSBucket(newConnection.db, { bucketName: oldBucketName });
            const newBucket = new GridFSBucket(newConnection.db, { bucketName: newBucketName });

            // Copy files from old bucket to new bucket
            const cursor = oldBucket.find();
            const files = await cursor.toArray();

            for (const file of files) {
              const downloadStream = oldBucket.openDownloadStream(file._id);
              const uploadStream = newBucket.openUploadStream(file.filename, {
                metadata: file.metadata,
              });
              await new Promise((resolve, reject) => {
                downloadStream.pipe(uploadStream).on('finish', resolve).on('error', reject);
              });
            }

            // Remove old bucket
            await oldBucket.drop();
            console.log(`[Mirrored] GridFS bucket renamed from ${oldBucketName} to ${newBucketName}`);
          } catch (err) {
            console.error(`[Mirrored] Error renaming GridFS bucket: ${err}`);
            throw new Error('Failed to rename mirrored child GridFS bucket.');
          }
        }
      }

      await mirroredChildFolder.save();
      console.log(`[Mirrored] Updated folder ${mirroredChildFolder.name} path to ${newMirroredChildPath}`);
    }
    // **New Code Ends Here**

  } else {
    console.warn('Mirrored folder not found:', mirroredOldPath);
  }
}


    // Step 6: Update child folders recursively
    const childFolders = await Folder.find({ path: { $regex: `^${oldPath}/` } });
    for (const childFolder of childFolders) {
      const oldPathPart = childFolder.path;
      const newPathPart = oldPathPart.replace(oldPath, newPath);
      childFolder.path = newPathPart;

      if (childFolder.type === 'storage') {
        const oldBucketName = childFolder.bucketName;
        const newBucketName = newPathPart.replace(/\//g, '_');

        // Rename GridFS bucket
        if (oldBucketName) {
          const oldBucket = new GridFSBucket(newConnection.db, { bucketName: oldBucketName });
          const newBucket = new GridFSBucket(newConnection.db, { bucketName: newBucketName });

          const cursor = oldBucket.find();
          const files = await cursor.toArray();

          for (const file of files) {
            const downloadStream = oldBucket.openDownloadStream(file._id);
            const uploadStream = newBucket.openUploadStream(file.filename, {
              metadata: file.metadata,
            });
            await new Promise((resolve, reject) => {
              downloadStream.pipe(uploadStream).on('finish', resolve).on('error', reject);
            });
          }

          await oldBucket.drop();
          console.log(`GridFS bucket renamed from ${oldBucketName} to ${newBucketName}`);
        }

        childFolder.bucketName = newBucketName;
      }

      await childFolder.save();
    }
    res.status(200).json({ message: 'Folder and associated GridFS bucket renamed successfully.', folder });
  } catch (error) {
    console.error('Error renaming folder:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});




// Category Folder Creation Endpoint
router.post('/create-category-folder', async (req, res) => {
  const { name, type, parentId } = req.body;

  if (!name || !type || (type === 'subcategory' && !parentId)) {
    return res.status(400).json({ message: 'Invalid request parameters.' });
  }

  try {
    if (type !== 'category' && type !== 'subcategory') {
      return res.status(400).json({ message: 'Invalid folder type.' });
    }

    // Step 1: Fetch the parent folder (if any)
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

    // Step 2: Construct the path for the primary folder under `local_disk`
    const path = parentFolder ? `${parentFolder.path}/${name}` : `local_disk/${name}`;

    // Step 3: Check if the folder already exists
    const existingFolder = await Folder.findOne({ path });
    if (existingFolder) {
      return res.status(400).json({ message: 'Folder already exists.' });
    }

    // Step 4: Create the primary folder
    const newFolder = new Folder({
      name,
      parent: parentFolder ? parentFolder._id : null,
      path,
      type,
    });
    await newFolder.save();
    console.log('Primary folder created:', newFolder);

    // Step 5: Create the mirrored folder under `generated_documents`
    const mirroredPath = path.replace(/^local_disk/, 'generated_documents');

    // Determine the mirrored parent
    let mirroredParent = null;
    if (parentFolder) {
      const mirroredParentPath = parentFolder.path.replace(/^local_disk/, 'generated_documents');
      mirroredParent = await Folder.findOne({ path: mirroredParentPath });
      if (!mirroredParent) {
        console.warn('Mirrored parent folder does not exist:', mirroredParentPath);
        // Optionally, create the mirrored parent first or skip mirroring
        // Example: Auto-create mirrored parent
        mirroredParent = new Folder({
          name: parentFolder.name,
          path: mirroredParentPath,
          parent: 'generated_documents' === mirroredParentPath ? null : (await Folder.findOne({ path: 'generated_documents' }))._id,
          type: parentFolder.type, // Same type as original
          isMirrored: true,
          createdAt: new Date(),
        });
        await mirroredParent.save();
        console.log('Mirrored parent folder created:', mirroredParent);
      }
    }

    // Check if the mirrored folder already exists
    const existingMirror = await Folder.findOne({ path: mirroredPath });

    if (!existingMirror) {
      const mirroredFolderName = type === 'category' ? name : `Generated Folder ${name}`;
      const mirroredFolder = new Folder({
        path: mirroredPath,
        name: mirroredFolderName,
        parent: mirroredParent ? mirroredParent._id : null,
        type: type === 'category' ? 'category' : 'subcategory', // Maintain same type
        isMirrored: true, // Optional flag
        createdAt: new Date(),
      });
      await mirroredFolder.save();
      console.log('Mirrored folder created:', mirroredFolder);
    } else {
      console.log('Mirrored folder already exists:', mirroredPath);
    }

    res.status(201).json({ message: 'Category folder created successfully.', folder: newFolder });
  } catch (error) {
    console.error('Error creating category folder:', error.message, error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});




// Document Storage Folders Endpoint
router.get('/document-storage-folders', async (req, res) => {
  try {
    const folders = await Folder.find({ type: 'storage', storageType: 'Document' }).lean();
    res.status(200).json(folders);
  } catch (error) {
    console.error('Error fetching document storage folders:', error);
    res.status(500).json({ message: 'Error fetching document storage folders' });
  }
});

module.exports = router;
