const { MongoClient } = require('mongodb');

// MongoDB connection URI
const uri = "mongodb://192.168.50.57:27017/local";

// Database and collection names
const dbName = "local";
const collectionName = "fs.files";

async function updateFilenames() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    // Connect to the MongoDB client
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Mapping of old file names to new file names
    const renameMap = {
      "GeneratedDocument.docx": "Generated_Document.docx",
      "GeneratedDocument_SOW.docx": "Generated_Document_SOW.docx",
      "Modified_GeneratedDocument.docx": "Generated_Document_Modified.docx"
    };

    // Iterate through the renameMap to update filenames
    for (const [oldFilename, newFilename] of Object.entries(renameMap)) {
      const result = await collection.updateMany(
        { filename: oldFilename },
        { $set: { filename: newFilename } }
      );
      console.log(`Updated ${result.modifiedCount} documents from '${oldFilename}' to '${newFilename}'`);
    }
  } catch (err) {
    console.error('Error updating filenames:', err);
  } finally {
    // Close the connection
    await client.close();
  }
}

// Run the update function
updateFilenames();
