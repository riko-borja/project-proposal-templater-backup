const fs = require('fs');
const { Parser } = require('json2csv');

// Sample JSON data
const data = JSON.parse(fs.readFileSync('endpoints.json', 'utf-8'));


// Flatten the data
const flattenedData = [];
data.forEach((entry) => {
  // Add the path with its methods
  flattenedData.push({
    "path/middlewares": entry.path,
    methods: entry.methods.join(", ")
  });

  // Add each middleware with the same methods
  entry.middlewares.forEach((middleware) => {
    flattenedData.push({
      "path/middlewares": middleware,
      methods: entry.methods.join(", ")
    });
  });
});

// Convert to CSV
const json2csvParser = new Parser();
const csv = json2csvParser.parse(flattenedData);

// Save the CSV to a file
fs.writeFileSync('structured_data.csv', csv);

console.log('CSV file has been saved as structured_data.csv');
