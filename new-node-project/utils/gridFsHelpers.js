const mongoose = require('mongoose');
const { Readable } = require('stream');

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

// Helper function to save a buffer back to GridFS
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

module.exports = {
  getFileBufferFromGridFS,
  saveFileBufferToGridFS,
};
