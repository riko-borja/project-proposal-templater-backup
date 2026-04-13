const { oldConnection } = require('./oldConnection'); // Import oldConnection
const mongoose = require('mongoose');

// Define the schema for the Data model
const dataSchema = new mongoose.Schema({
  clientName: String,
  dataflowEndpoint: String,
  customerApplicationName: String,
  deliveryTimeline: String,
  productionClusterInitial: String,
  productionClusterName: String,
  qualityAndAssuranceClusterInitial: String,
  qualityAndAssuranceClusterName: String,
  customerSolutionName: String,
  maximumLatency: String,
  artifactoryClusterInitial: String,
  artifactoryClusterName: String,
  developmentClusterInitial: String,
  developmentClusterName: String,
  descriptionOfDataflow: String,
  descriptionOfConnectivityBetweenClusterAndLegacyPlatform: String,
  // Additional fields...
}, { collection: 'data' }); // Explicitly map to the 'data' collection

// Create the Data model using oldConnection
const Data = oldConnection.model('Data', dataSchema);

module.exports = Data;
