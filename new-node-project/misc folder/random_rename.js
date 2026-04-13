const { MongoClient } = require('mongodb');

// Database configuration
const url = 'mongodb://192.168.50.57:27017/local';
const dbName = 'local';
const collectionName = 'fs.files';

// Filenames to randomly assign
const filenames = [
  'GeneratedDocument_SOW.docx',
  'GeneratedDocument.docx',
  'Modified_GeneratedDocument.docx'
];

// Function to get a random filename
function getRandomFilename() {
  const randomIndex = Math.floor(Math.random() * filenames.length);
  return filenames[randomIndex];
}

async function randomRenameDocuments() {
  // Connect to MongoDB
  const client = new MongoClient(url, { useUnifiedTopology: true });

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Fetch all documents in the collection
    const documents = await collection.find({}).toArray();

    for (const doc of documents) {
      // Generate a new random filename
      const newFilename = getRandomFilename();

      // Update the document's filename
      await collection.updateOne(
        { _id: doc._id },
        { $set: { filename: newFilename } }
      );

      console.log(`Document with _id: ${doc._id} renamed to: ${newFilename}`);
    }

    console.log('All documents have been renamed successfully!');
  } catch (error) {
    console.error('Error renaming documents:', error);
  } finally {
    // Close the connection
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
randomRenameDocuments();
