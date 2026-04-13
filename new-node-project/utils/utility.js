import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { XMLParser } from 'fast-xml-parser';

export const fetchTemplateAndParseData = async (docContent, metadata) => {
  const zip = new PizZip(docContent);
  const docxtemplater = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const text = docxtemplater.getFullText();

  // Regex patterns for inputs, checkboxes, dropdowns, and hyperlinks
  const inputRegex = /\{input:(.*?)\}/g;
  const sectionRegex = /\{[#/](.*?)\}/g;
  const hyperlinkRegex = /\{hyperlink:([^}|]+)\|([^}]+)\}/g; // Adjusted regex
  const tooltipRegex = /\{tooltip:(.*?)\|(.*?)\}/g;


  const inputsMap = {};
  const dropdowns = {}; // Store dropdown menus separately
  const hyperlinksMap = {}; // Store hyperlinks
  const tooltipTags = {}; // Initialize tooltipTags
  const tooltipPlaceholders = {}; // Initialize tooltipPlaceholders
  

  let match;

   // Parse tooltips
   while ((match = tooltipRegex.exec(text)) !== null) {
    const fieldName = match[1].trim(); // Extract field name
    const tooltipText = match[2].trim(); // Extract tooltip content

    tooltipTags[`tooltip:${fieldName}`] = tooltipText; // Map the tooltip to its field
    tooltipPlaceholders[`tooltip:${fieldName}|${tooltipText}`] = ''; // Create placeholder
  }



  while ((match = inputRegex.exec(text)) !== null) {
    const fieldName = match[1].trim();
    const metadataTag = metadata.tags.find((tag) => tag.tag === `{input:${fieldName}}`);
  
    inputs.push({
      id: `{input:${fieldName}}`,
      label: fieldName,
      summary: metadataTag ? metadataTag.summary : '', // Enrich with summary if metadata exists
    });
  }
  



  // Parse sections for checkboxes and dropdowns
  const stack = [];
  let root = { children: [] };
  let currentParent = root;



  while ((match = sectionRegex.exec(text)) !== null) {
    const tag = match[0];
    const content = match[1].trim();

    // Check if it's a dropdown menu by looking for the 'Select_' keyword
    if (tag.startsWith('{#Select_')) {
      const sectionId = content.trim();

      // Split the content by space to separate the descriptive part from the option (e.g., "Agile", "Waterfall")
      const parts = sectionId.split(' ');
      const dropdownId = parts[0]; // "Select_Testing_Type" or similar
      const optionValue = parts.slice(1).join(' '); // e.g., "Agile" or "Waterfall"

      if (!dropdowns[dropdownId]) {
        dropdowns[dropdownId] = {
          id: dropdownId,
          options: [],
          selectedOption: null,
          hyperlink: null, // Initialize hyperlink as null
        };
      }

      // Add the option to the dropdown menu
      dropdowns[dropdownId].options.push({
        sectionName: sectionId,
        label: optionValue, // Use the remaining parts as the label
      });

      // Push to stack to ensure matching closing tag
      stack.push({
        id: sectionId,
        startTag: tag,
        startIndex: match.index,
      });
      currentParent.children.push({
        id: sectionId,
        label: sectionId,
        checked: true,
        children: [],
      });
    } else if (tag.startsWith('{/Select_')) {
      // Handle closing tags for dropdown menus
      const sectionId = content.trim();
      const lastSection = stack.pop(); // Try to pop the corresponding opening tag

      if (!lastSection || lastSection.id !== sectionId) {
        console.error('Mismatched closing tag:', tag);
      }
    } else if (tag.startsWith('{#')) {
      // Handle regular sections (checkboxes)
      const sectionId = content.trim();

      stack.push({
        id: sectionId,
        startTag: tag,
        startIndex: match.index,
      });
      currentParent.children.push({
        id: sectionId,
        label: sectionId,
        checked: true,
        children: [],
      });
    } else if (tag.startsWith('{/')) {
      // Handle regular section closing tags
      const sectionId = content.trim();

      const lastSection = stack.pop();

      if (!lastSection || lastSection.id !== sectionId) {
        console.error('Mismatched closing tag:', tag);
      }
    }
  }


  const hyperlinkTags = {}; // New object to store hyperlink tags
  // Parse hyperlink tags
  while ((match = hyperlinkRegex.exec(text)) !== null) {
    const fieldName = match[1].trim(); // Extract fieldName
    const url = match[2].trim(); // Extract URL

  // Store the hyperlink tag with the exact format and set its value to an empty string
  hyperlinkTags[`hyperlink:${fieldName}|${url}`] = '';

    // Store for later use (if needed for custom processing/display)
    hyperlinksMap[fieldName] = {
      label: `Open ${fieldName.replace(/_/g, ' ')} Link`, // Generate a user-friendly label
      url: url,
    };

    // Ensure the field exists in inputsMap or dropdowns
    if (inputsMap[fieldName]) {
      inputsMap[fieldName].hyperlink = {
        label: `Open ${inputsMap[fieldName].label} Link`,
        url: url,
      };
    } else {
      // If the field is not an input, check if it's a dropdown
      if (dropdowns[fieldName]) {
        dropdowns[fieldName].hyperlink = {
          label: `Open ${dropdowns[fieldName].id} Link`,
          url: url,
        };
      } else {
        console.warn(`Hyperlink for unknown field: ${fieldName}`);
      }
    }

    // Optionally, store all hyperlinks in a separate map if needed elsewhere
    hyperlinksMap[fieldName] = {
      label: `Open ${fieldName} Link`,
      url: url,
    };
  }



  // Convert dropdowns to an array and ensure checkboxes don't include dropdown menus
  const dropdownsArray = Object.values(dropdowns);

  // Convert inputsMap to an array for dynamic inputs
  const inputs = Object.values(inputsMap);
  console.log('this is the new contents of inputs:', inputs)

  // Return inputs, sections (checkboxes), dropdowns, and hyperlinks
  return {
    inputs, // Dynamic input fields
    sections: root.children, // Only checkbox sections (not dropdowns)
    dropdowns: dropdownsArray, // Dropdown menus
    hyperlinks: hyperlinksMap, // Hyperlink metadata
    hyperlinkTags, // Include the collected hyperlink tags
    tooltipTags, // Include the collected tooltip tags
    tooltipPlaceholders,
  };
};


export const fetchDateFields = async (docContent) => {
  const zip = new PizZip(docContent);
  const docxtemplater = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const text = docxtemplater.getFullText();

  // Regex patterns for date fields and hyperlinks
  const dateRegex = /\{date:(.*?)\}/g;
  const hyperlinkRegex = /\{hyperlink:(.*?)\|(.*?)\}/g;
  const tooltipRegex = /\{tooltip:(.*?)\|(.*?)\}/g;


  const dateFields = new Map(); // Use a Map to ensure uniqueness
  const hyperlinksMap = {}; // Map hyperlinks for quick access
  const hyperlinkTags = {}; // Store hyperlink tags with empty values
  const tooltipTags = {}; // Initialize tooltipTags
  const tooltipPlaceholders = {}; // Initialize tooltipPlaceholders

  // Parse hyperlinks first to map them by field name
  let match;
  while ((match = hyperlinkRegex.exec(text)) !== null) {
    const fieldName = match[1].trim(); // Extract field name
    const url = match[2].trim(); // Extract URL

    // Add the exact hyperlink tag to `hyperlinkTags`
    hyperlinkTags[`hyperlink:${fieldName}|${url}`] = ''; // Match exact format for Docxtemplater

    // Add to `hyperlinksMap` for additional processing (if needed)
    hyperlinksMap[fieldName] = {
      label: `Open ${fieldName.replace(/_/g, ' ')} Link`, // Generate a user-friendly label
      url: url,
    };
  }

  // Parse tooltips
  while ((match = tooltipRegex.exec(text)) !== null) {
    const fieldName = match[1].trim(); // Extract field name
    const tooltipText = match[2].trim(); // Extract tooltip content

    tooltipTags[`tooltip:${fieldName}`] = tooltipText; // Map the tooltip to its field
    tooltipPlaceholders[`tooltip:${fieldName}|${tooltipText}`] = ''; // Create placeholder
  }


  // Parse date fields
  while ((match = dateRegex.exec(text)) !== null) {
    const fieldName = match[1].trim();

    // Only add the date field if it hasn't been added before
    if (!dateFields.has(fieldName)) {
      dateFields.set(fieldName, {
        id: fieldName,
        label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), // Format the label
        value: '',         // Initial value is empty
        showDatePicker: false,  // Ensure showDatePicker is initialized
        hyperlink: hyperlinksMap[fieldName] || null, // Add hyperlink if available
      });
    }
  }

  const uniqueDateFields = Array.from(dateFields.values());
 

  return {
    dateFields: uniqueDateFields,
    hyperlinkTags, // Include updated hyperlink tags
    tooltipTags, // Include updated tooltip tags
    tooltipPlaceholders,
  };
};




/**
 * Fetches and parses tables from a .docx document.
 * @param {ArrayBuffer} docContent - The binary content of the .docx file.
 * @returns {Object} - An object containing parsed tables and related tags.
 */
export const fetchAndParseTables = async (docContent) => {
  try {
    // Initialize PizZip with the document content
    const zip = new PizZip(docContent);

    // Extract the 'word/document.xml' file which contains the main content
    const contentXml = zip.file('word/document.xml').asText();
    console.log('This is the content of the document in jason object', contentXml)
    

    // Initialize the XML parser with preserved order to maintain sequence of elements
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      preserveOrder: true,
      textNodeName: '#text',
      ignoreDeclaration: false,
      processEntities: false,
    });
    

    // Parse the XML content
    const jsonObj = parser.parse(contentXml);
    console.log('This is the content of the document in jason object', jsonObj)

    // Extract tables based on custom tags
    const parsedTables = extractTables(jsonObj);
    console.log('This is the content of the document in parsed table', parsedTables)

    return {
      parsedTables,
      // Include other returned data if necessary (e.g., emptyTableTags, hyperlinksMap)
    };
  } catch (error) {
    console.error('Error parsing tables from document:', error);
    return {
      parsedTables: [],
      // Return other empty objects if necessary
    };
  }
};

/**
 * Extracts tables from the parsed JSON object based on custom table start/end tags.
 * @param {Array} jsonObj - The parsed JSON object from the XML parser.
 * @returns {Array} - An array of parsed table objects.
 */
function extractTables(jsonObj) {
  const tables = [];

  // Find the 'w:document' object
  const documentObj = jsonObj.find((obj) => obj['w:document']);
  if (!documentObj) return tables;

  // Find the 'w:body' within 'w:document'
  const bodyObj = documentObj['w:document'].find((obj) => obj['w:body']);
  if (!bodyObj) return tables;

  const bodyContent = bodyObj['w:body'];

  let currentTableName = null;
  let collectingTable = false;

  bodyContent.forEach((elemObj) => {
    const elemType = Object.keys(elemObj)[0];
    const elem = elemObj[elemType];

    if (elemType === 'w:p') {
      // Extract paragraph text
      const paragraphText = getTextFromParagraphPreserveOrder(elem);
      console.log('Paragraph text:', paragraphText);

      // Normalize text by removing extra spaces
      const normalizedText = paragraphText.replace(/\s+/g, ' ').trim();

      // Match simplified tags
      if (normalizedText.startsWith('{TABLE_START:') && normalizedText.endsWith('}')) {
        const match = normalizedText.match(/^\{TABLE_START:(.*)\}$/);
        if (match) {
          currentTableName = match[1].trim();
          collectingTable = true;
          console.log('Detected start table tag:', currentTableName);
        }
      } else if (normalizedText.startsWith('{TABLE_END:') && normalizedText.endsWith('}')) {
        const match = normalizedText.match(/^\{TABLE_END:(.*)\}$/);
        if (match && match[1].trim() === currentTableName) {
          console.log('Detected end table tag:', currentTableName);
          currentTableName = null;
          collectingTable = false;
        }
      }
    }

    if (collectingTable && elemType === 'w:tbl') {
      // It's a table; parse it
      const table = parseTablePreserveOrder(elem);
      if (table) {
        table.name = currentTableName;
        tables.push(table);
        console.log('Added table:', currentTableName);
      }
    }
  });

  return tables;
}



/**
 * Parses a table element from the JSON structure.
 * @param {Array} tbl - The table element as an array from the parsed JSON.
 * @returns {Object} - A parsed table object with rows and cells.
 */
function parseTablePreserveOrder(tbl) {
  const rows = [];
  const mergeMap = {}; // To track merged cells (rowspan)

  tbl.forEach((elem) => {
    const elemType = Object.keys(elem)[0];
    const elemContent = elem[elemType];

    if (elemType === 'w:tr') {
      const row = [];
      let colIndex = 0;

      elemContent.forEach((tcElem) => {
        const tcType = Object.keys(tcElem)[0];
        const tcContent = tcElem[tcType];

        if (tcType === 'w:tc') {
          // Handle merged cells using mergeMap
          while (mergeMap[`${rows.length},${colIndex}`]) {
            row.push(null); // Placeholder for merged cell
            colIndex++;
          }

          const cellContent = getTextFromParagraphPreserveOrder(tcContent['w:p']);
          const cellProps = tcContent['w:tcPr'] || {};

          // Determine colspan
          const gridSpanElement = cellProps.find((item) => item['w:gridSpan']);
          const colspan = gridSpanElement ? parseInt(gridSpanElement['w:gridSpan']['@_w:val'], 10) : 1;

          // Determine rowspan
          const vMergeElement = cellProps.find((item) => item['w:vMerge']);
          let rowspan = 1;
          if (vMergeElement) {
            const vMergeVal = vMergeElement['w:vMerge']['@_w:val'];
            if (vMergeVal === 'restart') {
              // Start of vertical merge
              rowspan = calculateRowspanPreserveOrder(tbl, rows.length, colIndex);
              if (rowspan > 1) {
                for (let i = 1; i < rowspan; i++) {
                  mergeMap[`${rows.length + i},${colIndex}`] = true;
                }
              }
            }
          }

          // Detect if the cell content is a placeholder
          const isPlaceholder = isPlaceholderContent(cellContent);
          const cellId = isPlaceholder ? getPlaceholderName(cellContent) : '';

          // Push the cell data
          row.push({
            content: cellContent,
            colspan: colspan,
            rowspan: rowspan,
            isPlaceholder: isPlaceholder,
            id: cellId,
            value: isPlaceholder ? '' : cellContent,
          });

          // Add placeholders for colspan
          for (let i = 1; i < colspan; i++) {
            row.push(null); // Placeholder for merged cell
          }

          colIndex += colspan;
        }
      });

      rows.push(row);
    }
  });

  return { rows };
}

/**
 * Calculates the rowspan by checking subsequent rows for 'continue' vMerge.
 * @param {Array} tblRows - The array of table rows.
 * @param {Number} currentRowIndex - The index of the current row.
 * @param {Number} currentColIndex - The index of the current column.
 * @returns {Number} - The calculated rowspan.
 */
function calculateRowspanPreserveOrder(tblRows, currentRowIndex, currentColIndex) {
  let rowspan = 1;

  for (let i = currentRowIndex + 1; i < tblRows.length; i++) {
    const row = tblRows[i]['w:tr'];
    if (!row) break;

    const tblCells = row['w:tc'];
    if (!tblCells) break;

    const cellsArray = Array.isArray(tblCells) ? tblCells : [tblCells];

    // Adjust for colspan: find the cell at currentColIndex considering colspan
    let tempColIndex = 0;
    let targetCell = null;

    for (let cell of cellsArray) {
      const cellProps = cell['w:tcPr'] || {};
      const gridSpanElement = cellProps.find((item) => item['w:gridSpan']);
      const colspan = gridSpanElement ? parseInt(gridSpanElement['w:gridSpan']['@_w:val'], 10) : 1;

      if (tempColIndex === currentColIndex) {
        targetCell = cell;
        break;
      }

      tempColIndex += colspan;
    }

    if (targetCell) {
      const vMergeElement = targetCell['w:tcPr']?.find((item) => item['w:vMerge']);
      if (vMergeElement && vMergeElement['w:vMerge']['@_w:val'] === 'continue') {
        rowspan++;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return rowspan;
}

/**
 * Extracts text content from a paragraph element, preserving order.
 * @param {Array} paragraph - The paragraph element as an array from the parsed JSON.
 * @returns {String} - The extracted text content.
 */
function getTextFromParagraphPreserveOrder(paragraph) {
  let text = '';

  function extractText(elements) {
    elements.forEach((elem) => {
      const elemType = Object.keys(elem)[0];
      const elemContent = elem[elemType];

      if (!elemContent) return;

      if (elemType === 'w:r' || elemType === 'w:hyperlink' || elemType === 'w:proofErr') {
        // It's a run, hyperlink, or proof error; process recursively
        const runs = Array.isArray(elemContent) ? elemContent : [elemContent];

        runs.forEach((run) => {
          if (run['w:t']) {
            const tContent = run['w:t'];
            text += typeof tContent === 'string' ? tContent : tContent['#text'] || '';
          } else {
            // Recursively extract text from nested elements
            extractText([run]);
          }
        });
      } else if (Array.isArray(elemContent)) {
        // Process child elements
        extractText(elemContent);
      } else if (typeof elemContent === 'object') {
        // Process nested object
        extractText([elemContent]);
      }
    });
  }

  extractText(paragraph);

  return text.trim();
}


/**
 * Checks if a cell's content is a placeholder.
 * @param {String} content - The content of the cell.
 * @returns {Boolean} - True if it's a placeholder, else false.
 */
function isPlaceholderContent(content) {
  return typeof content === 'string' && /^(\{[^}]+\})|(\$\{[^}]+\})$/.test(content);
}

/**
 * Extracts the placeholder name from the cell's content.
 * @param {String} content - The content of the cell.
 * @returns {String} - The placeholder name.
 */
function getPlaceholderName(content) {
  const match = content.match(/^\{([^}]+)\}$/) || content.match(/^\$\{([^}]+)\}$/);
  return match ? match[1].trim() : '';
}