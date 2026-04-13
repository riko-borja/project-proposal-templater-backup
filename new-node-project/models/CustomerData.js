const mongoose = require('mongoose');

const customerDataSchema = new mongoose.Schema({
  date: String,
  currentDate: String,
  dynamicInputs: [
    {
      id: String,
      value: String,
    },
  ],
  sections: Object, // Add sections to store the user's section selections
});

const CustomerData = mongoose.model('CustomerData', customerDataSchema);

module.exports = CustomerData;
