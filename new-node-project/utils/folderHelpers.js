// utils/folderHelpers.js
const { Folder } = require('../models/newConnection');

// Helper to construct the full path dynamically
const constructFullPath = async (folder) => {
  if (!folder.parent) {
    return folder.name; // Root folder case
  }

  const parentFolder = await Folder.findById(folder.parent);
  if (!parentFolder) {
    throw new Error(`Parent folder with ID ${folder.parent} not found.`);
  }

  const parentPath = await constructFullPath(parentFolder);
  return `${parentPath}/${folder.name}`; // Combine parent's path with current folder's name
};

module.exports = { constructFullPath };
