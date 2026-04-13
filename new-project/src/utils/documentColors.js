// src/utils/documentColors.js

// Predefined array of colors
const colorPalette = [
    '#4CAF50', '#FF9800', '#2196F3', '#9C27B0', '#E91E63',
    '#00BCD4', '#8BC34A', '#FFC107', '#FF5722', '#607D8B',
    '#795548', '#3F51B5', '#673AB7', '#009688', '#CDDC39',
    '#F44336', '#03A9F4', '#FFEB3B', '#00E676', '#8E24AA'
  ];
  
  // Initialize an empty color map to store consistent colors per document type
  const documentTypeColors = {};
  
  // Function to assign colors consistently
  export const getColorForDocumentType = (documentType) => {
    // If the document type already has a color, return it
    if (documentTypeColors[documentType]) {
      return documentTypeColors[documentType];
    }
    
    // Otherwise, assign the next available color in the palette
    const colorIndex = Object.keys(documentTypeColors).length % colorPalette.length;
    documentTypeColors[documentType] = colorPalette[colorIndex];
    
    return documentTypeColors[documentType];
  };
  
  // Export the color map for any chart reference
  export default documentTypeColors;
  