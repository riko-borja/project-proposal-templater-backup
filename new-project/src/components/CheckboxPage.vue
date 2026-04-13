<template>
  <AppBarLayout>
  <!-- Assume that the header is already included via BaseLayout -->
  <v-container fluid>
    <v-row justify="center">
      <v-col cols="12" sm="10" md="8">
        <v-toolbar flat color="transparent" class="mb-4">
          <v-toolbar-title class="headline">{{ toolbarTitle || 'Choose Options' }}</v-toolbar-title>
        </v-toolbar>
        <!-- Collapse/Expand All Button -->
        <div class="d-flex justify-center mb-4">
          <v-btn 
            @click="toggleAllSections" 
            class="ma-2" 
            small 
            outlined
          >
            <v-icon left>{{ allCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-down' }}</v-icon>
            {{ allCollapsed ? 'Expand All' : 'Collapse All' }}
          </v-btn>
        </div>

        <!-- Sections List -->
        <v-list dense>
          <SectionCheckbox
            v-for="section in sections"
            :key="section.id"
            :section="section"
            :all-collapsed="allCollapsed"
            @update-checked="updateChecked"
          />
        </v-list>

        <!-- Submit Button -->
        <div class="d-flex justify-center mt-4">
          <v-btn 
            color="primary" 
            @click="submitData" 
            :disabled="!isAnySectionChecked"
            large
          >
            Start Processing
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</AppBarLayout>
</template>

<script>
import { ref, onMounted, computed, onUpdated, toRaw } from 'vue';
import axios from 'axios';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { useStore } from 'vuex';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import SectionCheckbox from './SectionCheckbox.vue';
import AppBarLayout from '@/components/AppBarLayout.vue';

const PYTHON_SERVICE_BASE_URL = (process.env.VUE_APP_PYTHON_SERVICE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');


// Define color options for parent sections
const colors = ['blue', 'green', 'purple', 'orange', 'teal'];

export default {
  components: {
    SectionCheckbox,
    AppBarLayout,
  },
  setup() {
    const router = useRouter();
    const store = useStore();

    // State Variables
    const sections = ref([]);
    const dynamicInputs = ref(store.state.dynamicInputs);
    const dropdownMenus = ref(store.state.dropdownMenus); // Retrieve dropdownMenus from Vuex
    const selectedSections = ref({});
    const selectedTemplate = computed(() => store.state.selectedTemplate);
    const dynamicDateFields = ref(store.state.dynamicDateFields); // Pull dynamic date fields from Vuex
    const tableData = ref(store.state.tableData); // Pull dynamic table data from Vuex
    let currentColorIndex = 0; // To track the current color index

    // Access toolbarTitle from Vuex
    const toolbarTitle = computed(() => store.state.toolbarTitle); // Reactive access to toolbarTitle

    const allCollapsed = ref(false);
    const isAnySectionChecked = computed(() => {
  // Enable button if there are no sections to check
  if (!sections.value || sections.value.length === 0) {
    return true;
  }

  // Otherwise, check if any section or its children are marked as checked
  return sections.value.some((section) => {
    return section.checked || (section.children && section.children.some((child) => child.checked));
  });
});


const toggleAllSections = () => {
  allCollapsed.value = !allCollapsed.value;
  sections.value.forEach((section) => {
    section.collapsed = allCollapsed.value;
    collapseChildren(section.children, allCollapsed.value);
  });
};

const collapseChildren = (children, collapsed) => {
  if (children && children.length > 0) {
    children.forEach((child) => {
      child.collapsed = collapsed;
      if (child.children.length > 0) {
        collapseChildren(child.children, collapsed);
      }
    });
  }
};

/**
 * Reusable Fetch Function
 * Fetches the modified template content using originalFileId and userId
 */
 const fetchTemplateContent = async (originalFileId, userId) => {
  try {
    if (!originalFileId || !userId) {
      throw new Error('Missing originalFileId or userId. Cannot fetch the modified template content.');
    }

    // Fetch the modified template data using the new endpoint
    const response = await axios.get('/api/files/fetch-modified-template', {
      params: {
        originalFileId, // Correct parameter name
        userId,         // Ensure we fetch the correct user's modified document
      },
      responseType: 'arraybuffer', // Handle binary data
    });

    console.log('Fetched modified template file successfully:', response);
    return response.data; // Return the binary data for further processing
  } catch (error) {
    console.error('Error fetching modified template content:', error);
    throw error; // Re-throw the error for the calling component to handle
  }
};

/**
 * Reusable Fetch Function for Original Template
 */
 const fetchOriginalTemplateContent = async (fileId, bucketName) => {
  try {
    if (!fileId || !bucketName) {
      throw new Error('Missing fileId or bucketName. Cannot fetch the original template content.');
    }

    // Fetch the original template data using the original endpoint
    const response = await axios.get('/api/files/fetch-template-content', {
      params: {
        fileId,
        bucketName,
      },
      responseType: 'arraybuffer', // Handle binary data
    });

    console.log('Fetched original template file successfully:', response);
    return response.data; // Return the binary data for further processing
  } catch (error) {
    console.error('Error fetching original template content:', error);
    throw error; // Re-throw the error for the calling component to handle
  }
};



/**
 * Function to set indeterminate state on checkboxes
 */
const setIndeterminate = () => {
  sections.value.forEach(section => {
    if (section.indeterminate) {
      const checkbox = document.getElementById(section.id);
      if (checkbox) {
        checkbox.indeterminate = true;
      }
    }
  });
};

onUpdated(() => {
  setIndeterminate();
});

/**
 * Fetch and parse sections when the component is mounted
 */
onMounted(async () => {
  if (store.state.isNavigatingBack && store.state.sections.length > 0) {
    console.log('Navigating back: Loading sections from Vuex.');
    sections.value = store.state.sections;
    ensureCheckedStatePropagation(sections.value); // Ensure state is propagated correctly
    console.log('Sections loaded from Vuex and checked state verified:', sections.value);
  } else {
    console.log('Initial load or refresh: Fetching and parsing sections.');
    await fetchTemplateAndParseSections();
    assignColorsToSections(sections.value);
  }

  store.commit('setNavigatingBack', false);
});

/**
 * Handle route leaving to set the navigating back flag
 */
onBeforeRouteLeave((to, from, next) => {
  store.commit('setNavigatingBack', true); // Set the flag to true when navigating away
  next(); // Proceed with the navigation
});

/**
 * Function to fetch and parse sections from the document template
 */
 const fetchTemplateAndParseSections = async () => {
  try {
    const originalFileId = store.state.selectedTemplate.fileId; // Original template's fileId
    const originalBucketName = store.state.selectedTemplate.bucketName; // Original bucket name
    const userId = store.state.user?._id; // User ID from Vuex

    // Validate the required data
    if (!originalFileId || !originalBucketName || !userId) {
      console.error('Missing original template details or user ID.');
      alert('Original template details are missing. Please try again.');
      return;
    }

    let content;
    let isModified = false;

    if (store.state.modifiedFileId && store.state.tempBucketName) {
      // Scenario 1: Fetch modified template
      console.log('Fetching the modified template content:', {
        originalFileId,
        userId,
      });
      content = await fetchTemplateContent(originalFileId, userId);
      isModified = true;
    } else {
      // Scenario 2: Fetch original template
      console.log('Fetching the original template content:', {
        fileId: originalFileId,
        bucketName: originalBucketName,
      });
      content = await fetchOriginalTemplateContent(originalFileId, originalBucketName);
      isModified = false;
    }

    // Load the document into Docxtemplater
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Extract full text from the document
    const text = doc.getFullText();

    // Parse sections and toggles
    const parsedSections = parseSections(doc);
    const parsedToggles = parseToggles(text);

    console.log('Parsed Sections:', parsedSections);
    console.log('Parsed Toggles:', parsedToggles);

    // Combine sections and toggles
    const combinedData = [...parsedSections, ...parsedToggles];

    // Filter out dropdown-related sections (if applicable)
    const filteredSections = combinedData.filter(item => !item.id.startsWith('Select_'));
    sections.value = filteredSections;

    // Assign colors to sections
    assignColorsToSections(sections.value, isModified);

    // Dispatch sections data to Vuex
    store.dispatch('updateSections', sections.value);

    console.log('Dispatched sections and toggles to Vuex:', sections.value); // Log to confirm data structure and content
  } catch (error) {
    console.error('Error fetching and parsing the template:', error);
    alert('Failed to load the document template. Please try again later.');
  }
};



    /**
     * Assign colors to parent sections and propagate to children
     */
    const assignColorsToSections = (sectionsList, isFromVuex = false) => {
      // Only assign colors if sections are freshly parsed, not loaded from Vuex
      if (isFromVuex) {
        console.log('Skipping color assignment as sections are loaded from Vuex.');
        return;
      }

      sectionsList.forEach((section) => {
        if (section.isParent) {
          section.color = colors[currentColorIndex % colors.length];
          console.log(`Assigned color '${section.color}' to parent section: ${section.label}`);
          currentColorIndex++;

          if (section.children.length > 0) {
            console.log(`Propagating color '${section.color}' to children of: ${section.label}`);
            assignColorToChildren(section.children, section.color);
          }
        }
      });
    };

    /**
     * Recursively assign colors to child sections
     */
    const assignColorToChildren = (children, color) => {
      children.forEach((child) => {
        child.color = color; // Inherit color from the parent
        console.log(`Assigned color '${color}' to child section: ${child.label}`);

        // Recursive call for nested children
        if (child.children.length > 0) {
          assignColorToChildren(child.children, color);
        }
      });
    };

    /**
     * Parse sections from the document
     */
    const parseSections = (doc) => {
      const text = doc.getFullText();
      const sectionRegex = /\{[#/](.*?)\}/g;
      const stack = [];
      let match;
      let root = { children: [] };
      let currentParent = root;

      while ((match = sectionRegex.exec(text)) !== null) {
        const tag = match[0];
        const name = match[1].trim();

        if (tag.startsWith('{#')) {
          const newSection = {
            id: name,
            label: name,
            checked: false,
            children: [],
            parent: currentParent,
            isParent: stack.length === 0, // Mark it as a main/parent section if stack is empty
            collapsed: false, // Initialize collapsed state
          };
          currentParent.children.push(newSection);
          stack.push(newSection);
          currentParent = newSection;
        } else if (tag.startsWith('{/')) {
          if (stack.length === 0 || stack[stack.length - 1].id !== name) {
            console.error('Mismatched closing tag:', tag);
          } else {
            stack.pop();
            currentParent = currentParent.parent;
          }
        }
      }

      return root.children;
    };


    const parseToggles = (text) => {
  const toggleRegex = /\{toggle:([\w\s()-]+)\}:\s*([\s\S]*?)(?=\{toggle:|$)/g;
  const toggles = [];
  let match;

  while ((match = toggleRegex.exec(text)) !== null) {
    toggles.push({
      id: match[1].trim(), // Capture the toggle label
      label: match[1].trim(), // Use the label for display
      content: match[2].trim(), // Capture the content after the toggle
      checked: false, // Default state is unchecked
      type: 'toggle', // Explicitly mark as a toggle
    });
  }

  return toggles;
};



    /**
     * Ensure children have valid checked states
     */
    const ensureCheckedStatePropagation = (sectionsList) => {
      const validateChildren = (section) => {
        if (section.children && section.children.length > 0) {
          section.children.forEach(child => validateChildren(child));
        }
      };

      sectionsList.forEach(section => validateChildren(section));
    };

    /**
     * Update the checked state of a section
     */
    const updateChecked = (payload) => {
      const { id, checked } = payload;

      const updateSectionChecked = (sectionsList) => {
        sectionsList.forEach((section) => {
          if (section.id === id) {
            section.checked = checked;
          } 
          if (section.children && section.children.length > 0) {
            updateSectionChecked(section.children);
          }
        });
      };

      updateSectionChecked(sections.value);
      console.log("Updated sections:", sections.value);
    };

    // Add this inside the setup function in CheckboxPage.vue
const prepareFinalOutput = () => {
  const output = {};

  const traverseSections = (sectionsList) => {
  sectionsList.forEach((section) => {
    console.log('Processing Section:', section);

    if (section.type === 'toggle') {
      console.log(
        `Toggle Detected: ${section.label}, Checked: ${section.checked}`
      );
      // For toggle tags, prepend ☑️ or ▢ based on the checked state
      output[`toggle:${section.label}`] = `${section.checked ? "🗹" : "☐"} ${section.label}`;
    } else {
      console.log(
        `Section Detected: ${section.label}, Checked: ${section.checked}`
      );
      // For section tags, keep true/false values
      output[section.label] = section.checked;
    }

    // Recursively process children (only for sections, as toggles have no children)
    if (section.children && section.children.length > 0) {
      console.log(
        `Section ${section.label} has children. Recursively traversing.`
      );
      traverseSections(section.children);
    }
  });
};

  traverseSections(sections.value);
  console.log('Final Output:', output);
  return output;
};
/**
 * Submit data to generate and upload the document
 */
 const submitData = async () => {
  try {
    // Fetch Vuex data
    const modifiedFileId = store.state.modifiedFileId; // File ID for the modified template
    const tempBucketName = store.state.tempBucketName; // Temporary bucket name
    const userId = store.state.user?._id; // User ID from Vuex

    // Validate Vuex data
    if (!modifiedFileId || !tempBucketName || !userId) {
      console.error('Missing Vuex data for fetching the modified template.');
      alert('Required data is missing. Please try again.');
      return;
    }

    console.log('Using Vuex data for modified template:', {
      modifiedFileId,
      tempBucketName,
      userId,
    });

    // Update sections in Vuex
    store.dispatch("updateSections", sections.value);
    console.log('Current Date:', store.state.currentDate);

    const finalOutput = prepareFinalOutput();
    console.log('Submitting Final Output:', finalOutput);

    // Traverse sections to build selectedSections
    const traverseSections = (sectionsList) => {
      sectionsList.forEach((section) => {
        selectedSections.value[section.label] = section.checked;
        if (section.children && section.children.length > 0) {
          traverseSections(section.children);
        }
      });
    };

    traverseSections(sections.value);

    // Exclude dropdownData from final data object
    // Removed dropdown data as per the latest requirement

    const emptyTableTags = toRaw(store.state.emptyTableTags);
    console.log('This is the contents of the empty table tags:', emptyTableTags);

    try {
      console.log('Table data before spreading:', tableData.value);

      // Pull hyperlinkTags and tooltipPlaceholders from Vuex getters
      const structuredTableData = toRaw(store.getters['getStructuredTableData'] || {});
      const hyperlinkTags = toRaw(store.getters['getHyperlinkTags'] || {});
      const tooltipPlaceholders = toRaw(store.getters['getTooltipPlaceholders'] || {});
      const collatedTags = toRaw(store.getters['getCollatedTags'] || {});
      const toolbarPlaceholders = toRaw(store.getters['getToolbarPlaceholders'] || {});

      console.log('This is the contents of hyperlink tags at checkbox page:', hyperlinkTags);
      console.log('This is the contents of tooltip placeholders:', tooltipPlaceholders);
      console.log('This is the contents of table tooltips and hyperlink:', structuredTableData);
      console.log('This is the contents of toolbar placeholders:', toolbarPlaceholders);

      // Flatten structuredTableData for docxtemplater
      let flattenedStructuredTableData = {};
      Object.keys(structuredTableData).forEach((tableName) => {
        flattenedStructuredTableData = {
          ...flattenedStructuredTableData,
          ...structuredTableData[tableName],
        };
      });

      console.log("Flattened structuredTableData:", flattenedStructuredTableData);

      // Prepare data for docxtemplater
      let data = {
        ...Object.fromEntries(
          dynamicInputs.value.map((input) => {
            if (input.type === 'range') {
              // Handle range inputs
              const rangeKey = `range_input:${input.min.label}|${input.max.label}|order:${input.order}`;
              const rangeValue = `${input.min.value} - ${input.max.value}`;
              console.log(`Preparing range input for ${rangeKey}: ${rangeValue}`);
              return [rangeKey, rangeValue];
            } else if (input.type === 'number') {
              // Handle number inputs
              const numberKey = input.order !== undefined
                ? `number_input:${input.label}|order:${input.order}`
                : `number_input:${input.label}`;
              console.log(`Preparing number input for ${numberKey}: ${input.value}`);
              return [numberKey, input.value];
            } else {
              // Handle other inputs
              const inputKey = input.order !== undefined
                ? `input:${input.id}|order:${input.order}`
                : `input:${input.id}`;
              console.log(`Preparing general input for ${inputKey}: ${input.value}`);
              return [inputKey, input.value];
            }
          })
        ),
      
        // Current Date
        currentDate: store.state.currentDate,

        // Selected Sections (Checkboxes)
        ...selectedSections.value,

        // Flattened empty table tags and tooltips
        ...flattenedStructuredTableData,

        // Dynamic Table Data
        ...tableData.value,

        // Empty Table Tags
        ...emptyTableTags,

        // Final Output for Sections and Toggles
        ...finalOutput,


        // Toolbar Placeholders
        ...toolbarPlaceholders,

        // Tooltip Placeholders
        ...tooltipPlaceholders,

        // Collated Tags
        ...collatedTags,
      };

        // Add Date Fields without "order"
      dynamicDateFields.value.forEach((dateField) => {
        // Use only the `id` for the keys, without the "order" part
        data[`date:${dateField.id}`] = dateField.value;
        data[`quarter:${dateField.id}`] = dateField.quarter;
        data[`year:${dateField.id}`] = dateField.year;
      });


      console.log('Final data before sending to docxtemplater:', data);

      // Fetch the original template's fileId and userId
      const originalFileId = store.state.selectedTemplate.fileId; // Original template's fileId
      const userIdFinal = store.state.user?._id; // User ID from Vuex

      if (!originalFileId || !userIdFinal) {
        console.error("Original file details missing in Vuex store.");
        alert("Original document details are missing. Please retry the process.");
        return;
      }

      console.log('Fetching the modified template content using originalFileId and userId:', {
        originalFileId,
        userId: userIdFinal,
      });

      // Fetch the modified template content using the original fileId and userId
      const content = await fetchTemplateContent(originalFileId, userIdFinal);

      // Use PizZip and Docxtemplater to process the document
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      try {
        console.log('Final data before setting to docxtemplater:', data);
        doc.setData(data);
        doc.render();
      } catch (error) {
        console.error('Error rendering document:', error);
        alert('Failed to generate the document. Please check the template and try again.');
        return;
      }

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      console.log('Document generated successfully.');

      const file = new File([out], 'GeneratedDocument_SOW.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Create FormData object to send to Flask backend
      const formData = new FormData();
      formData.append('file', file); // Append the generated document
      formData.append('folderPath', selectedTemplate.value.path); // Include folderPath
      console.log(file); // Should show a valid File object

      console.log('Sending the document to Flask backend for processing.');

      const token = localStorage.getItem('jwtToken');
      console.log('JWT token:', token);

      // Send the document to Flask for processing (removing empty rows)
      const response = await axios.post(`${PYTHON_SERVICE_BASE_URL}/api/remove-empty-rows`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob', // Make sure to expect the response as a blob
      });

      console.log('Processed document received:', response.data); // This should be a Blob

      // Assuming Flask sends back the modified document as a Blob, let's check response.data
      const processedFile = response.data;  // Assuming this is the modified document Blob

      // Check if processedFile is a Blob object
      console.log('Processed file received from Flask:', processedFile);

      // If processedFile is a valid Blob, you can proceed to upload it
      const uploadFormData = new FormData();
      uploadFormData.append('file', processedFile);  // Add processed file
      uploadFormData.append('folderPath', selectedTemplate.value.path); // Include folderPath again if needed

      console.log('Uploading the processed document to the server.');

      const uploadResponse = await axios.post('/api/files/upload-generated-document', uploadFormData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadedFileId = uploadResponse.data.fileId;
      console.log('Generated document uploaded, file ID:', uploadedFileId);

      // Store the uploaded file ID in your state/store
      await store.dispatch('setFileId', uploadedFileId);

      // Save the file for download
      saveAs(processedFile, 'GeneratedDocument_SOW.docx');

      // Redirect to the next page with the uploaded file ID
      router.push({ name: 'ProcessingPage', params: { fileId: uploadedFileId } });
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save the data. Please try again later.');
    }
  } catch (error) {
    console.error('Error saving data:', error);
    alert('Failed to save the data. Please try again later.');
  }
};

    return {
      sections,
      submitData,
      dynamicInputs,
      dropdownMenus,
      updateChecked,
      selectedSections,
      tableData,
      isAnySectionChecked,
      toggleAllSections, // Ensure this is returned
      allCollapsed,
      toolbarTitle,
    };
  },
};
</script>

<style scoped>
.headline {
  font-weight: bold;
  font-size: 1.5rem;
}

.v-btn {
  font-size: 0.9rem; /* Slightly larger for better readability */
}

.v-icon {
  font-size: 20px; /* Increased icon size for better visibility */
}

.v-list {
  max-height: 80vh; /* Utilize more vertical space */
  overflow-y: auto; /* Enable vertical scrolling */
  border-top: 1px solid #e0e0e0; /* Subtle top border */
  border-bottom: 1px solid #e0e0e0; /* Subtle bottom border */
  padding: 0; /* Remove default padding */
}

.v-list-item {
  border-bottom: 1px solid #f5f5f5; /* Light separator between items */
}

.v-list-item:last-child {
  border-bottom: none; /* Remove border for the last item */
}
</style>
