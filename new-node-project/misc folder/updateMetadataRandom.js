const { MongoClient } = require('mongodb');

async function updateMetadataWithRandomUserId() {
  const uri = 'mongodb://192.168.50.57:27017'; // Replace with your MongoDB URI
  const client = new MongoClient(uri);

  // List of predefined user IDs to randomly assign
  const userIds = [
    "66d5472e49e082c0058f5d28", // Example userId 1
    "6713a4b579a968b3f171772f", // Example userId 2
    "670fd72315f8b2deb5f280b2",
    "6713a48a79a968b3f1717726" // Example userId 3
    // Add more user IDs as needed
  ];

  try {
    await client.connect();
    const db = client.db('local'); // Replace with your database name
    const collection = db.collection('fs.files');

    // Find documents without userId in metadata
    const docsToUpdate = await collection.find({ "metadata.userId": { $exists: false } }).toArray();

    if (docsToUpdate.length === 0) {
      console.log('No documents found without userId metadata.');
      return;
    }

    // Update each document with a random userId
    for (let doc of docsToUpdate) {
      const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];

      await collection.updateOne(
        { _id: doc._id },
        { $set: { "metadata.userId": randomUserId } }
      );

      console.log(`Document with _id ${doc._id} updated with userId ${randomUserId}.`);
    }

    console.log(`${docsToUpdate.length} documents updated with random userId.`);
  } catch (error) {
    console.error('Error updating metadata:', error);
  } finally {
    await client.close();
  }
}

updateMetadataWithRandomUserId();
