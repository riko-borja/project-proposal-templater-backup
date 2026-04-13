export const parseToolbarTitle = (text) => {
  const toolbarTitleRegex = /\{toolbar-title:([^}]+)\}/g;
  const toolbarTags = {}; // Holds the parsed toolbar-title tags
  const toolbarPlaceholders = {}; // Holds placeholders to avoid undefined outputs
  let match;

  while ((match = toolbarTitleRegex.exec(text)) !== null) {
    const fieldName = match[1]?.trim(); // Extract the title
    if (!fieldName) {
      console.warn(`Invalid toolbar-title tag: ${match}`);
      continue;
    }

    // Add the toolbar-title to the parsed tags
    toolbarTags[`toolbar-title`] = fieldName;

    // Set an empty placeholder to prevent undefined output
    toolbarPlaceholders[`toolbar-title:${fieldName}`] = '';
  }

  // Return both tags and placeholders
  return { toolbarTags, toolbarPlaceholders };
};
