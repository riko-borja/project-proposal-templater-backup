import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { parseToolbarTitle } from './parseUtils'; // Ensure this import is correct

// Helper function to parse hierarchical tags
const parseTags = (text) => {
  const hierarchy = [];
  const stack = [];
  const tagRegex = /\{#Select_([^}]+)\}|\{\/Select_([^}]+)\}|\{#Nested_select_([^}]+)\}|\{\/Nested_select_([^}]+)\}/g;

  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    const [fullMatch, parentOpen, parentClose, nestedOpen, nestedClose] = match;
    const index = match.index;

    // Capture content between the last tag and the current tag
    if (lastIndex < index) {
      const content = text.substring(lastIndex, index).trim();
      if (content && stack.length > 0) {
        const current = stack[stack.length - 1];
        current.content = (current.content || '') + ` ${content}`.trim();
      }
    }

    if (parentOpen) {
      // Extract dropdown title and menu item
      const [titleRaw, ...menuParts] = parentOpen.split(' ');
      const title = titleRaw.replace(/_/g, ' ').trim();
      const menu = menuParts.join(' ').trim();
    
      // Check if a parent with the same title and menu already exists in the hierarchy
      let parent = hierarchy.find((item) => item.type === 'parent' && item.title === title && item.menu === menu);
    
      if (!parent) {
        // Create a new menu if it doesn't exist
        parent = {
          type: 'parent',
          title: title,
          menu: menu,
          children: [],
          content: '',
        };
    
        if (stack.length > 0) {
          // Attach to the current parent
          stack[stack.length - 1].children.push(parent);
        } else {
          // Top-level parent
          hierarchy.push(parent);
        }
      }
    
      stack.push(parent); // Push the parent to the stack for content association
    } else if (parentClose) {
      // Just split and skip the first element for the menu
      const parts = parentClose.split(' ');
      // The first element is the title equivalent, which we don't need for closing tags.
      const closeMenu = parts.slice(1).join(' ').trim();
    
      const last = stack.pop();
      if (!last || last.type !== 'parent' || last.menu !== closeMenu) {
        console.error(`Mismatched closing parent tag: ${fullMatch}`);
      }
    } else if (nestedOpen) {
      // Extract dropdown title and menu item
      const [titleRaw, ...menuParts] = nestedOpen.split(' ');
      const title = titleRaw.replace(/_/g, ' ').trim(); // Replace underscores for consistency
      const menu = menuParts.join(' ').trim();
    
      const nested = {
        type: 'child',
        title: title,
        menu: menu,
        content: '',
      };
    
      if (stack.length > 0) {
        // Attach to the current parent
        stack[stack.length - 1].children.push(nested);
        stack.push(nested);
      } else {
        console.error(`Nested tag without a parent: ${fullMatch}`);
      }
    } else if (nestedClose) {
      const last = stack.pop();
      if (!last || last.type !== 'parent' || last.menu !== parentClose.trim()) {
        console.error(`Mismatched closing parent tag: ${fullMatch}`);
      }
      
    }

    lastIndex = tagRegex.lastIndex;
  }

  // Capture any remaining content after the last tag
  if (lastIndex < text.length) {
    const content = text.substring(lastIndex).trim();
    if (content && stack.length > 0) {
      const current = stack[stack.length - 1];
      current.content = (current.content || '') + ` ${content}`.trim();
    }
  }

  return hierarchy;
};


export const fetchTemplateAndParseData = async (docContent, store) => {
  try {
    const zip = new PizZip(docContent);
    const docxtemplater = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: (part) => `{${part.value}}`, // Handle undefined tags gracefully
    });

    const text = docxtemplater.getFullText();

    // Existing regex patterns
    const inputRegex = /\{input:([\w\s/&-]+?)(?:\|order:(\d+))?\}/g;
    const tableCellTagRegex = /\{[Cc][Ee][Ll][Ll]:([^{}]+)\}/g;
    const numberInputRegex = /\{number_input:\s*([\w\s/_&-]+?)\s*(?:\|order:\s*(\d+))?\}/gi;
    const hyperlinkRegex = /\{hyperlink:([^}|]+)\|([^}]+)\}/g; // Adjusted regex
    const button_tooltipRegex = /\{button_tooltip:([^|}]+)\|(?:(text|image|url)\|)?([^}]+)\}/gi;
    const input_tooltipRegex = /\{input_tooltip:([^|}]+)\|(?:(text|image|url)\|)?([^}]+)\}/gi;
    const dropdown_input_tooltipRegex = /\{dropdown_input_tooltip:([^|}]+)\|(?:(image|url)\|)?([^}]+)\}/g;
    const dropdown_button_tooltipRegex = /\{dropdown_button_tooltip:([^|}]+)\|(?:(text|image|url)\|)?([^}]+)\}/g;
    const checkboxBlockRegex = /\{section_start:([\w\s()-]+)\}([\s\S]*?)\{section_end:\1\}/g;
    const rangeInputRegex = /\{range_input:([\w\s/&-]+?)\|([\w\s/&-]+?)(?:\|order:(\d+))?\}/g;
    const inputLabelRegex = /\{input_label:([\w\s/&()-]+?)\|([^}]+)\}/g;



    const tablePatterns = {
      table_hyperlink: /\{table_hyperlink:([^|]+)\|([^}]+)\}/g,
      table_tooltip: /\{table_tooltip:([^|]+)\|([^}]+)\}/g,
      table_hyperlink_tooltip: /\{table_hyperlink_tooltip:([^|]+)\|([^}]+)\}/g,
      table_start: /\{TABLE_START:([^}]+)\}/g,
      table_end: /\{TABLE_END:([^}]+)\}/g,
    };

    const inputsMap = {};
    const inputsTagMap = {};
    const dropdowns = {}; // Store dropdown menus separately
    const hyperlinksMap = {}; // Store hyperlinks
    const tooltipTags = {}; // Initialize tooltipTags for all tooltips
    const tooltipPlaceholders = {}; // Initialize tooltipPlaceholders
    const hyperlinkTags = {}; // Store hyperlink tags in Docxtemplater format
    const tablesMap = {};
    const tableTags = []; // Collect all table-related tags for processing
    const numberInputs = [];
    const rangeInputs = []; // Store parsed range inputs
    const inputLabels = {}; // Store parsed input labels
    

    // Fetch date fields
    let dateFields = [];
    try {
      const result = await fetchDateFields(docContent);
      dateFields = result.dateFields || [];
      console.log('Date Fields from fetchDateFields:', dateFields);
    } catch (error) {
      console.error('Error while fetching date fields:', error);
    }

    // Reintroduce `date:` prefix to IDs for `allTags` payload
    const dateFieldsForTags = dateFields.reduce((acc, dateField) => {
      const key = `date:${dateField.id}`; // Add `date:` prefix
      acc[key] = dateField.value; // Use the value as is
      return acc;
    }, {});
    console.log('Date Fields for All Tags Payload:', dateFieldsForTags);


    let match;

  

    while ((match = inputLabelRegex.exec(text)) !== null) {
      const rawFieldName = match[1]?.trim(); // Field name
      const contextText = match[2]?.trim(); // Context text
      const normalizedFieldName = rawFieldName.toLowerCase().replace(/[\s/]+/g, '_'); // Normalize field name
      const tagKey = `input_label:${normalizedFieldName}`; // Construct the tag key
      const tagValue = `{input_label:${rawFieldName}|${contextText}}`; // Original tag
    
      // Add to inputLabels map
      inputLabels[tagKey] = tagValue;
    
      // Add to tooltipPlaceholders with an empty value
      tooltipPlaceholders[tagKey] = ''; // Placeholder for Docxtemplater
    
      // Add to tooltipTags with context text
      tooltipTags[tagKey] = { type: 'text', content: contextText };
    
      // Attach label to inputsMap if the corresponding input exists
      if (inputsMap[normalizedFieldName]) {
        inputsMap[normalizedFieldName].label = contextText; // Add context as the label
      } else {
        console.warn(`Input label for unknown field: ${rawFieldName}`);
      }
    }
    
    


    const parseTogglesWithType = (text) => {
      const toggleRegex = /\{toggle:([\w\s()-]+)\}:\s*([\s\S]*?)(?=\{toggle:|$)/g;
      const toggles = [];
      let match;
    
      while ((match = toggleRegex.exec(text)) !== null) {
        const toggleName = match[1].trim(); // Extract label
        const toggleContent = match[2].trim(); // Extract content
    
        console.log("Matched Toggle Tag:", match[0]); // Full match
        console.log("Captured Toggle Label:", toggleName); // Captured label
        console.log("Captured Toggle Content:", toggleContent); // Captured content
    
        toggles.push({
          id: toggleName,           // The unique identifier for the toggle
          label: toggleName,        // Human-readable label
          content: toggleContent,   // Associated content
          type: "toggle",           // Explicitly mark as a toggle
          checked: false,           // Default checked state
        });
      }
    
      return toggles;
    };    
    

    const toggleTags = parseTogglesWithType(text);
    console.log("Extracted Toggles with Type and Content:", toggleTags);

        
    while ((match = rangeInputRegex.exec(text)) !== null) {
      const minLabel = match[1]?.trim(); // Minimum label
      const maxLabel = match[2]?.trim(); // Maximum label
      const order = match[3] ? parseInt(match[3], 10) : null; // Order, if provided

      // Construct tag keys
      const minTagKey = `range_input:${minLabel}|order:${order}`;
      const maxTagKey = `range_input:${maxLabel}|order:${order}`;

      // Add to inputsTagMap
      inputsTagMap[minTagKey] = `{${minTagKey}}`;
      inputsTagMap[maxTagKey] = `{${maxTagKey}}`;

      // Construct full range tag key and value
      const rangeTagKey = `range_input:${minLabel}|${maxLabel}|order:${order}`;
      const rangeTagValue = `{${rangeTagKey}}`;

      // Add the range tag to inputsTagMap
      inputsTagMap[rangeTagKey] = rangeTagValue;

      // Add to rangeInputs array for further processing
      rangeInputs.push({
        minLabel,
        maxLabel,
        order,
        type: 'range',
      });
    }

    console.log('Updated Inputs Tag Map with Range Tags:', JSON.stringify(inputsTagMap, null, 2));

    // Process range inputs into inputsMap
    rangeInputs.forEach((range) => {
      // Add minimum input
      inputsMap[range.minLabel.toLowerCase().replace(/\s+/g, '_')] = {
        id: range.minLabel.toLowerCase().replace(/\s+/g, '_'),
        label: range.minLabel,
        order: range.order,
        type: 'range_minimum',
        value: '', // Initialize value
      };

      // Add maximum input
      inputsMap[range.maxLabel.toLowerCase().replace(/\s+/g, '_')] = {
        id: range.maxLabel.toLowerCase().replace(/\s+/g, '_'),
        label: range.maxLabel,
        order: range.order,
        type: 'range_maximum',
        value: '', // Initialize value
      };
    });

    console.log('Parsed Range Inputs:', JSON.stringify(rangeInputs, null, 2));
    console.log('Updated Inputs Map with Range Tags:', JSON.stringify(inputsMap, null, 2));
    console.log('Updated Inputs Tag Map with Range Tags:', JSON.stringify(inputsTagMap, null, 2));

    // Parse numerical input tags
    while ((match = numberInputRegex.exec(text)) !== null) {
      const rawLabel = match[1]?.trim();
      const normalizedLabel = rawLabel.toLowerCase().replace(/[\s/]+/g, '_');
      const processedLabel = rawLabel.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const order = match[2] ? parseInt(match[2].trim(), 10) : null;
    
      // Construct tag key and value
      const tagKey = `number_input:${normalizedLabel}${order !== null ? `|order:${order}` : ''}`;
      const tagValue = `{${tagKey}}`;
    
      // Log matched tag details
      console.log('Matched Number Input Tag:', match[0]);
      console.log('Raw Label:', rawLabel, 'Normalized Label:', normalizedLabel, 'Processed Label:', processedLabel);
      console.log('Order:', order, 'Tag Key:', tagKey, 'Tag Value:', tagValue);
    
      // Add to inputsTagMap
      inputsTagMap[tagKey] = tagValue;
    
      // Add to numberInputs array
      numberInputs.push({
        rawLabel, // Original label
        normalizedLabel, // For consistent backend mapping
        label: processedLabel, // Standardized label for display
        order,
        type: 'number',
      });
    }
    
    // Update inputsMap with processed inputs
    numberInputs.forEach((input) => {
      inputsMap[input.normalizedLabel] = {
        id: input.normalizedLabel,
        label: input.label,
        order: input.order,
        type: input.type,
        value: '', // Initialize value
      };
    });
    
    
    // Log final results
    console.log('Updated inputsTagMap:', JSON.stringify(inputsTagMap, null, 2));
    console.log('Final numberInputs Array:', JSON.stringify(numberInputs, null, 2));
    console.log('Final inputsMap:', JSON.stringify(inputsMap, null, 2));
    
    

    const parseSections = (text) => {
      // Create a new regex instance for each call, to avoid shared state issues.
      const localRegex = new RegExp(checkboxBlockRegex.source, checkboxBlockRegex.flags);
    
      const sections = [];
      let match;
    
      while ((match = localRegex.exec(text)) !== null) {
        const checkboxName = match[1]?.trim();
        const checkboxContent = match[2]?.trim();
        const fullMatch = match[0]?.trim();
    
        console.log("---- Detected Section ----");
        console.log("Name:", checkboxName);
        console.log("Content:", checkboxContent);
    
        if (!checkboxName) {
          console.warn(`Invalid section detected: ${fullMatch}`);
          continue;
        }
    
        // Recursively parse child sections using a fresh localRegex in the child call
        const children = parseSections(checkboxContent);
    
        sections.push({
          id: checkboxName,
          label: checkboxName,
          content: checkboxContent,
          checked: true,
          children: children,
        });
    
        // localRegex automatically advances `lastIndex` after each match
        // No manual increment needed here, as each recursive call
        // starts with a fresh regex instance.
      }
    
      return sections;
    };
    
    
    
    // Parse the entire document's text to get the root hierarchy
    const root = { children: parseSections(text) };
    console.log('Parsed Section Hierarchy:', JSON.stringify(root.children, null, 2));
    

    // ---- Table Cell Tags Parsing ----
    const tableCells = [];
    while ((match = tableCellTagRegex.exec(text)) !== null) {
      const fieldName = match[1]?.trim();
      if (fieldName) {
        tableCells.push({ rawTag: match[0], fieldName });
      }
    }
    console.log('--- Parsed Table Cells ---');
    console.log(JSON.stringify(tableCells, null, 2));
    console.log('--------------------------');

    // ---- Table Tag Parsing ----
    for (const [patternName, regex] of Object.entries(tablePatterns)) {
      while ((match = regex.exec(text)) !== null) {
        const fieldName = match[1]?.trim();
        const additionalContent = match[2]?.trim();

        if (!fieldName) {
          console.warn(`Invalid table tag match for pattern "${patternName}":`, match);
          continue;
        }

        switch (patternName) {
          case 'table_start': {
            tablesMap[fieldName] = tablesMap[fieldName] || { name: fieldName, rows: [], tags: [] };
            tablesMap[fieldName].startTag = match[0];
            break;
          }
          case 'table_end': {
            if (!tablesMap[fieldName]) {
              console.warn(`TABLE_END found without a corresponding TABLE_START: "${fieldName}"`);
              continue;
            }
            tablesMap[fieldName].endTag = match[0];
            break;
          }
          case 'table_hyperlink': {
            if (!tablesMap[fieldName]) {
              tablesMap[fieldName] = { name: fieldName, rows: [], tags: [] };
            }
            tablesMap[fieldName].hyperlink = additionalContent;

            // Add to hyperlinkTags
            hyperlinkTags[`table_hyperlink:${fieldName}`] = { url: additionalContent };
            break;
          }
          case 'table_tooltip': {
            if (!tablesMap[fieldName]) {
              tablesMap[fieldName] = { name: fieldName, rows: [], tags: [] };
            }
            tablesMap[fieldName].tooltip = additionalContent;

            // Add to tooltipTags
            tooltipTags[`table_tooltip:${fieldName}`] = { type: 'text', content: additionalContent };
            tooltipPlaceholders[`table_tooltip:${fieldName}|text|${additionalContent}`] = '';
            break;
          }
          case 'table_hyperlink_tooltip': {
            if (!tablesMap[fieldName]) {
              tablesMap[fieldName] = { name: fieldName, rows: [], tags: [] };
            }
            const [url, tooltip] = additionalContent.split('|');
            tablesMap[fieldName].hyperlinkTooltip = { url: url?.trim(), tooltip: tooltip?.trim() };

            // Add to hyperlinkTags
            hyperlinkTags[`table_hyperlink:${fieldName}`] = { url: url?.trim() };
            // Add tooltip to tooltipTags
            tooltipTags[`table_hyperlink_tooltip:${fieldName}`] = { type: 'text', content: tooltip?.trim() };
            tooltipPlaceholders[`table_hyperlink_tooltip:${fieldName}|text|${tooltip?.trim()}`] = '';
            break;
          }
          default: {
            console.warn(`Unhandled table pattern: "${patternName}"`);
          }
        }

        // Collect the tag for the table
        tableTags.push(match[0]);
      }
    }

    // Prepare final table data
    const tables = Object.values(tablesMap);

    console.log('--- Parsed Tables ---');
    console.log(JSON.stringify(tables, null, 2));
    console.log('---------------------\n');

// ---- Button Tooltips Parsing ----
while ((match = button_tooltipRegex.exec(text)) !== null) {
  console.log("Detected Button Tooltip Match:", match);

  const rawFieldName = match[1]?.trim();
  const strippedFieldName = rawFieldName.startsWith('number_input:')
    ? rawFieldName.replace(/^number_input:/, '').trim()
    : rawFieldName.trim();

  const type = match[2]?.trim() || 'text'; // Default to "text" if type is missing
  const content = match[3]?.trim();

  if (!rawFieldName || !content) {
    console.warn(`Invalid or unmatched button tooltip: ${match}`);
    continue;
  }

  // Normalize field name for consistent mapping
  const fieldKey = strippedFieldName.toLowerCase().replace(/[\s/]+/g, '_');

  // Store tooltip content in tooltipTags
  tooltipTags[`button_tooltip:${rawFieldName}`] = { type, content };
  tooltipPlaceholders[`button_tooltip:${rawFieldName}|${type}|${content}`] = '';

  // Attach tooltip to inputsMap
  if (inputsMap[fieldKey]) {
    console.log(`Attaching button tooltip to input: ${fieldKey}`);
    inputsMap[fieldKey].buttonTooltip = { type, content };
  } else if (inputsMap[`${fieldKey}_min`] && inputsMap[`${fieldKey}_max`]) {
    // Handle range inputs
    console.log(`Attaching button tooltip to range input: ${fieldKey}`);
    inputsMap[`${fieldKey}_min`].buttonTooltip = { type, content };
    inputsMap[`${fieldKey}_max`].buttonTooltip = { type, content };
  } else {
    console.warn(`Button tooltip for unknown field: ${rawFieldName}`);
  }
}



  // ---- Input Tooltips Parsing ----
  while ((match = input_tooltipRegex.exec(text)) !== null) {
    console.log("Detected Input Tooltip Match:", match);
  
    const rawFieldName = match[1]?.trim();
    const strippedFieldName = rawFieldName.startsWith('number_input:')
      ? rawFieldName.replace(/^number_input:/, '').trim()
      : rawFieldName.trim();
  
    const type = match[2]?.trim() || 'text'; // Default to "text" if type is missing
    const content = match[3]?.trim();
  
    if (!rawFieldName || !content) {
      console.warn(`Invalid or unmatched input tooltip: ${match}`);
      continue;
    }
  
    // Normalize field name for mapping
    const fieldKey = strippedFieldName.toLowerCase().replace(/[\s/]+/g, '_');
  
    // Store tooltip content in tooltipTags
    tooltipTags[`input_tooltip:${rawFieldName}`] = { type, content };
    tooltipPlaceholders[`input_tooltip:${rawFieldName}|${type}|${content}`] = '';
  
    // Attach tooltip to inputsMap
    if (inputsMap[fieldKey]) {
      console.log(`Attaching tooltip to input: ${fieldKey}`);
      inputsMap[fieldKey].inputTooltip = { type, content };
    } else {
      console.warn(`Input tooltip for unknown field: ${rawFieldName}`);
    }
  }
  


    // ---- Inputs Parsing ----
    while ((match = inputRegex.exec(text)) !== null) {
      console.log("Detected input field:", match);
    
      const rawFieldName = match[1].trim(); // Extract raw field name
      const normalizedFieldName = rawFieldName.toLowerCase().replace(/\s+/g, '_'); // Normalize to snake_case
      const order = match[2] ? parseInt(match[2].trim(), 10) : 999; // Assign `999` if no order is provided
    
      if (!inputsMap[normalizedFieldName]) {
        inputsMap[normalizedFieldName] = {
          id: normalizedFieldName,
          label: rawFieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          value: '', // Initial value can be empty
          order, // Include parsed order
        };
      }
    
      const tagKey = `input:${normalizedFieldName}|order:${order}`;
      const fullTag = `{${tagKey}}`;
      inputsTagMap[tagKey] = fullTag;
    }
    

    console.log('--- Final Inputs Map (Frontend) ---');
    console.log(JSON.stringify(inputsMap, null, 2));
    console.log('------------------------');

    console.log('--- Final Inputs Tag Map (Backend) ---');
    console.log(JSON.stringify(inputsTagMap, null, 2));
    console.log('------------------------');


    // ---- Sections Parsing (Parent and Nested Dropdowns) ----
    const hierarchy = parseTags(text);
    console.log('Parsed Hierarchical Sections:', JSON.stringify(hierarchy, null, 2));

    // ---- Dropdown Input Tooltips Parsing ----
    while ((match = dropdown_input_tooltipRegex.exec(text)) !== null) {
      const fieldName = match[1]?.trim();
      const type = match[2]?.trim() || 'text';
      const content = match[3]?.trim();

      if (!fieldName || !content) {
        console.warn(`Invalid dropdown input tooltip: ${match}`);
        continue;
      }

      tooltipTags[`dropdown_input_tooltip:${fieldName}`] = { type, content };
      tooltipPlaceholders[`dropdown_input_tooltip:${fieldName}|${type}|${content}`] = '';
    }

// ---- Dropdown Button Tooltips Parsing ----
while ((match = dropdown_button_tooltipRegex.exec(text)) !== null) {
  const rawFieldName = match[1]?.trim();
  const type = match[2]?.trim() || 'text'; // Default to "text" if type is missing
  const content = match[3]?.trim();

  if (!rawFieldName || !content) {
    console.warn(`Invalid dropdown button tooltip: ${match}`);
    continue;
  }

  // Normalize the field name for consistent matching
  const fieldKey = rawFieldName.toLowerCase().replace(/[\s/]+/g, '_');

  // Store tooltip in tooltipTags
  tooltipTags[`dropdown_button_tooltip:${rawFieldName}`] = { type, content };
  tooltipPlaceholders[`dropdown_button_tooltip:${rawFieldName}|${type}|${content}`] = '';

  // Attach the tooltip to the corresponding dropdown
  if (dropdowns[fieldKey]) {
    console.log(`Attaching button tooltip to dropdown: ${fieldKey}`);
    dropdowns[fieldKey].buttonTooltip = { type, content };
  } else {
    console.warn(`Dropdown button tooltip for unknown field: ${rawFieldName}`);
  }
}

while ((match = hyperlinkRegex.exec(text)) !== null) {
  const rawFieldName = match[1]?.trim();
  const url = match[2]?.trim();

  if (!rawFieldName || !url) {
    console.warn(`Invalid hyperlink: ${match}`);
    continue;
  }

  let strippedFieldName;
  if (rawFieldName.startsWith('range_input:')) {
    strippedFieldName = rawFieldName.replace(/^range_input:/, '').trim();
  } else if (rawFieldName.startsWith('number_input:')) {
    strippedFieldName = rawFieldName.replace(/^number_input:/, '').trim();
  } else {
    strippedFieldName = rawFieldName.trim();
  }

  const fieldKey = strippedFieldName.toLowerCase().replace(/[\s/-]+/g, '_');

  const attachHyperlink = (dropdowns) => {
    console.log('Processing dropdown structure:', dropdowns);
  
    if (!Array.isArray(dropdowns)) {
      console.error('Invalid dropdown structure detected:', dropdowns);
      return;
    }
  
    dropdowns.forEach((dropdown) => {
      console.log('Processing dropdown:', dropdown);
  
      // Match the current dropdown title to the fieldKey
      if (dropdown.title?.toLowerCase().replace(/[\s/]+/g, '_') === fieldKey) {
        dropdown.hyperlink = { label: `Open ${dropdown.title} Link`, url };
        console.log(`Attached hyperlink to dropdown: ${dropdown.title}`);
      }
  
      // Recursively process children for nested dropdowns
      if (Array.isArray(dropdown.children)) {
        attachHyperlink(dropdown.children);
      } else if (dropdown.children) {
        console.error('Invalid children structure detected in dropdown:', dropdown);
      }
    });
  };
  

  if (dropdowns[fieldKey]) {
    console.log(`Attaching hyperlink to parent dropdown: ${fieldKey}`);
    dropdowns[fieldKey].hyperlink = { label: `Open ${dropdowns[fieldKey].title} Link`, url };
  } else if (inputsMap[fieldKey]) {
    console.log(`Attaching hyperlink to input: ${fieldKey}`);
    inputsMap[fieldKey].hyperlink = { label: `Open ${inputsMap[fieldKey].label} Link`, url };
  } else if (rawFieldName.startsWith('range_input:')) {
    console.log(`Attaching hyperlink to range input: ${fieldKey}`);
    inputsMap[fieldKey].hyperlink = { label: `Open ${inputsMap[fieldKey].label} Link`, url };
  } else {
    console.log(`Handling nested dropdown hyperlinks for field: ${fieldKey}`);
    attachHyperlink(hierarchy);
  }

  hyperlinkTags[`hyperlink:${fieldKey}`] = { url };
  tooltipPlaceholders[`hyperlink:${fieldKey}|${url}`] = '';
  hyperlinksMap[rawFieldName] = { label: `Open ${rawFieldName} Link`, url };
}

    

// Additional logic to prepare hyperlinks for allTagsPayload
const hyperlinksForTags = Object.entries(hyperlinkTags).reduce((acc, [key, value]) => {
  const fieldName = key.split(':')[1]; // Extract field name from the key
  const fullTag = `{hyperlink:${fieldName}|${value.url}}`; // Reconstruct the full tag
  acc[`hyperlink:${fieldName}|${value.url}`] = fullTag; // Add both the key and the full tag as the value
  return acc;
}, {});

console.log('Hyperlinks for All Tags Payload:', hyperlinksForTags);


    // ---- Sorting Inputs ----
    const sortedInputs = Object.values(inputsMap).sort((a, b) => {
      // Place inputs with undefined order at the end
      if (a.order === undefined) return 1;
      if (b.order === undefined) return -1;
      return a.order - b.order;
    });

    console.log('--- Sorted Inputs ---');
    console.log(JSON.stringify(sortedInputs, null, 2));
    console.log('---------------------\n');

    // ---- Toolbar Titles Parsing ----
    const { toolbarTags, toolbarPlaceholders } = parseToolbarTitle(text);
    console.log('--- Parsed Toolbar Title Tags ---');
    console.log(JSON.stringify(toolbarTags, null, 2));
    console.log('--- Toolbar Title Placeholders ---');
    console.log(JSON.stringify(toolbarPlaceholders, null, 2));
    console.log('----------------------------------\n');

    // ---- Final Logging of All Parsed Data ----
    console.log("Tooltip Tags:", tooltipTags);
    console.log("Hyperlink Tags:", hyperlinkTags);
    console.log("Table Tags:", tableTags);
    console.log("Table Cells:", tableCells);
    console.log("Inputs Map:", inputsMap);
    console.log("Sections:", hierarchy);
    console.log("Date Fields:", dateFields);
    console.log("Toolbar Tags:", toolbarTags);
    console.log("Tooltip Placeholders:", tooltipPlaceholders);
    console.log("Toolbar Placeholders:", toolbarPlaceholders);

    // Prepare section tags for Docxtemplater
    const sectionTags = {};

    const traverseHierarchy = (sections, level = 0) => {
      sections.forEach((section) => {
        console.log(`${'  '.repeat(level)}Processing Section: "${section.id}" at level ${level}`);

        sectionTags[`section_start:${section.id}`] = `{#${section.id}}`;
        sectionTags[`section_end:${section.id}`] = `{/${section.id}}`;

        if (section.children && section.children.length > 0) {
          console.log(`${'  '.repeat(level)}"${section.id}" has children:`, section.children.map((c) => c.id));
          traverseHierarchy(section.children, level + 1);
        } else {
          console.log(`${'  '.repeat(level)}"${section.id}" has no children`);
        }
      });
    };

    // Traverse the hierarchy
    traverseHierarchy(root.children);
    console.log('Parsed Section Tags:', sectionTags);

    // Reintroduce original tags for Docxtemplater
    const checkboxData = {};

    const traverseSection = (node, level = 0) => {
      console.log(`${'  '.repeat(level)}Adding to checkboxData: ${node.id}`);
      checkboxData[`section_start:${node.id}`] = `{#${node.id}}`;
      checkboxData[`section_end:${node.id}`] = `{/${node.id}}`;

      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => traverseSection(child, level + 1));
      }
    };

    root.children.forEach((section) => traverseSection(section));
    console.log('Parsed Checkbox Data:', checkboxData);


    // ---- Proceed with preparing allTagsPayload ----
    try {
      // Transform tableTags and tableCells into objects
      const tableTagsObject = tableTags.reduce((acc, tag) => {
        // Currently: acc[`tableTag_${index}`] = tag;
        // We need to extract the actual tag name without braces:
        const strippedTag = tag.replace(/^\{/, '').replace(/\}$/, ''); 
        // strippedTag now is "TABLE_END:Test" or "TABLE_START:Test1", etc.
      
        acc[strippedTag] = tag; // key = stripped tag, value = original tag with braces
        return acc;
      }, {});
      

      const tableCellsObject = tableCells.reduce((acc, cell) => {
        // cell.rawTag might be "{cell:xx_9}"
        const strippedTag = cell.rawTag.replace(/^\{/, '').replace(/\}$/, ''); 
        // strippedTag = "cell:xx_9"
      
        acc[strippedTag] = cell.rawTag; // key = "cell:xx_9", value = "{cell:xx_9}"
        return acc;
      }, {});

    // Function to process toggle tags and prepare their values
    const processToggleTags = (toggleList) => {
      const toggleTagsObject = {};

      toggleList.forEach((toggle) => {
        toggleTagsObject[`toggle:${toggle.id}`] = `{toggle:${toggle.id}}`; // Assign the tag value as per the requirement
      });

      console.log("Processed Toggle Tags Object:", toggleTagsObject);
      return toggleTagsObject;
    };

    // Prepare the combined tags object
    const toggleTagsObject = processToggleTags(toggleTags); // Pass the parsed toggle tags



    // Prepare the combined tags object
    const allTagsPayload = {
      ...tooltipTags, // Keep tooltip metadata for internal processing
      ...hyperlinkTags, // Keep hyperlink metadata
      ...tableTagsObject, // Raw table tags
      ...tableCellsObject, // Raw table cells
      ...inputsTagMap, // Input fields
      ...sectionTags, // Section tags
      ...dateFieldsForTags,
      ...(toolbarTags || {}),
      ...hyperlinksForTags, // Add transformed hyperlinks
      ...checkboxData,
      currentDate: `{currentDate}`,
      ...toggleTagsObject,
      ...inputLabels, // Add input label tags
    };


    // Convert tags with objects to raw strings for Docxtemplater
    Object.keys(allTagsPayload).forEach((key) => {
      const value = allTagsPayload[key];

      // If value is an object with a `content` property, use the content
      if (value && typeof value === 'object' && value.content) {
        allTagsPayload[key] = `{${key}|${value.content}}`; // Include the tag and its content
      } else if (value === undefined || value === null) {
        allTagsPayload[key] = `{${key}}`; // Fallback for undefined or null
      }
    });

    // Log the final payload before dispatching
    console.log('Final allTagsPayload:', allTagsPayload);


 

      // Dispatch to Vuex
      store.dispatch('updateAllTags', allTagsPayload);
    } catch (error) {
      console.error('Error while transforming table tags and cells:', error);
    }

    // Return inputs, sections (checkboxes), dropdowns, hyperlinks, tooltips, toolbar, and tables
    return {
      inputs: sortedInputs, // Sorted by order
      sections: hierarchy, // Hierarchical sections
      dropdowns: Object.values(dropdowns), // No sorting
      tables, // Include parsed table data
      tableTags, // Include raw table tags if needed for debugging
      hyperlinks: hyperlinksMap, // Hyperlink metadata
      hyperlinkTags, // Include the collected hyperlink tags
      tooltipTags, // Now includes table tooltips
      tooltipPlaceholders,
      toolbarTags,
      toolbarPlaceholders,
      tableCells,
      toggles: toggleTags, // Add toggles to the return object
  
    };
  } catch (error) {
    console.error('Error in fetchTemplateAndParseData:', error);
    throw error; // Re-throw to handle in frontend
  }
};


export const fetchDateFields = async (docContent) => {
  try {
    const zip = new PizZip(docContent);
    const docxtemplater = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const text = docxtemplater.getFullText();

    const dateRegex = /\{date:([^|}]+)(?:\|order:(\d+))?\}/g;

    const dateFields = new Map(); // Ensure uniqueness of date fields

    let match;

    // ---- Date Fields Parsing ----
    while ((match = dateRegex.exec(text)) !== null) {
      const fieldName = match[1].trim();
      const hasOrder = Boolean(match[2]); // Check if the order number is present
      const order = hasOrder ? parseInt(match[2].trim(), 10) : 999; // Default to 999 if no order is provided

      // Create tag based on the presence of order
      const fullTag = hasOrder
        ? `{date:${fieldName}|order:${order}}`
        : `{date:${fieldName}}`;

      // Ensure `date:` prefix in the key
      const tagKey = hasOrder
        ? `date:${fieldName}|order:${order}`
        : `date:${fieldName}`;

      // Add to map only if it hasn't been added already
      if (!dateFields.has(tagKey)) {
        dateFields.set(tagKey, {
          id: fieldName,
          label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), // Format label
          value: fullTag, // Include tag as value for Vuex compatibility
          showDatePicker: false, // Default picker visibility
          ...(hasOrder && { order }), // Add `order` only if it exists
        });
      }
    }

    const sortedDateFields = Array.from(dateFields.values()).sort((a, b) => {
      if (a.order === undefined) return 1; // Fields without order go last
      if (b.order === undefined) return -1;
      return a.order - b.order; // Sort by order
    });

    console.log('--- Parsed Date Fields ---');
    console.log(JSON.stringify(sortedDateFields, null, 2));
    console.log('--------------------------\n');

    return {
      dateFields: sortedDateFields, // Return parsed date fields
    };
  } catch (error) {
    console.error('Error in fetchDateFields:', error);
    throw error; // Re-throw to handle in frontend
  }
};