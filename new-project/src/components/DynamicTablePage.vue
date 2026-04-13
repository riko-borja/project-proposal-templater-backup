<template>
  <AppBarLayout>
    <v-container fluid>
      <v-row
        v-for="(table, tableIndex) in filteredTables"
        :key="tableIndex"
        class="table-section"
      >
        <v-col cols="12">
          <v-card class="elevated-card">
            <v-card-title class="card-header">
              {{ formatTableName(table.name) }}
              <v-spacer></v-spacer>

              <!-- Table Tooltip Button -->
              <v-btn
                icon
                class="custom-table-tooltip-btn"
                v-if="table.tooltip"
              >
                <v-tooltip activator="parent" location="start">
                  <template v-if="table.tooltip.startsWith('http')">
                    <img
                      :src="table.tooltip"
                      alt="Table Tooltip Image"
                      class="tooltip-image"
                    />
                  </template>
                  <template v-else>
                    <span>{{ table.tooltip || 'No tooltip available' }}</span>
                  </template>
                </v-tooltip>
                <v-icon class="custom-table-tooltip-icon">
                  mdi-information-outline
                </v-icon>
              </v-btn>

              <!-- Hyperlink Button with Vuetify Tooltip Inside v-btn -->
              <v-btn
                v-if="table.hyperlink"
                icon
                @click="navigateTo(table.hyperlink)"
                class="table-hyperlink-button"
              >
                <v-tooltip activator="parent" location="bottom">
                  <span>
                    {{ table.hyperlinkTooltip || 'No tooltip available' }}
                  </span>
                </v-tooltip>
                <v-icon class="hyperlink-icon">mdi-link</v-icon>
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>

            <!-- Table Data -->
            <v-simple-table class="styled-table">
              <thead>
                <tr>
                  <th v-for="header in table.headers" :key="header">
                    {{ header }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, rowIndex) in table.rows"
                  :key="rowIndex"
                  class="table-row"
                >
                  <td
                    v-for="(cell, colIndex) in row"
                    :key="colIndex"
                    :colspan="cell.colspan"
                    :rowspan="cell.rowspan"
                  >
                    <template v-if="cell.isPlaceholder">
                      <v-text-field
                        v-model="cell.value"
                        :label="cell.id"
                        variant="outlined"
                        dense
                        class="table-cell-input"
                        hide-details
                      />
                    </template>
                    <template v-else>
                      <span>{{ cell.content }}</span>
                    </template>
                  </td>
                </tr>
              </tbody>
            </v-simple-table>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="button-row">
        <v-btn
          @click="navigateToCheckboxPage"
          color="success"
          large
          class="action-button"
        >
          Next
        </v-btn>
      </v-row>
    </v-container>
  </AppBarLayout>
</template>




<script>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import axios from 'axios';
import AppBarLayout from './AppBarLayout.vue';

const PYTHON_SERVICE_BASE_URL = (process.env.VUE_APP_PYTHON_SERVICE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

export default {
  components: {
    AppBarLayout, // Register AppBarLayout
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const tables = ref([]);

    /**
     * Load persisted table values from Vuex store
     */
    const loadPersistedTableValues = () => {
      console.log("Loading persisted structured table from Vuex...");
      const persistedStructuredTableData = store.state.structuredTableData;
      tables.value = Array.isArray(persistedStructuredTableData) ? persistedStructuredTableData : [];
    };

    const filteredTables = computed(() => {
      return tables.value.map((table) => {
        const filteredRows = table.rows.map((row) => {
          const seenMergedCells = new Set(); // Track unique merged cells
          return row
            .filter((cell) => cell) // Remove null cells
            .filter((cell) => {
              // Skip duplicate merged cells (colspan > 1)
              if (cell.colspan > 1 && seenMergedCells.has(cell.content)) {
                return false;
              }

              if (cell.colspan > 1) {
                seenMergedCells.add(cell.content);
              }

              return true; // Keep the cell
            });
        });

        return {
          ...table,
          rows: filteredRows,
        };
      });
    });

/**
 * Fetch and parse tables and tags from the document template
 */
 const loadDynamicTables = async () => {
  // Phase 1 stabilization: prefer canonical working artifact, fallback to legacy fields
  const workingArtifact = store.state.workingDocumentArtifact;
  const modifiedFileId = workingArtifact?.fileId || store.state.modifiedFileId;
  const tempBucketName = workingArtifact?.bucketName || store.state.tempBucketName;
  const userId = store.state.user?._id; // Retrieve userId from Vuex

  // Ensure modified document details exist
  if (!modifiedFileId || !tempBucketName || !userId) {
    alert("No valid modified document available. Please go back and complete the dropdown logic.");
    router.push({ name: "userOptionsPage" });
    return;
  }

  const persistedStructuredTableData = store.state.structuredTableData;
  const isStructuredTableArray = Array.isArray(persistedStructuredTableData);
  const hasPersistedData = isStructuredTableArray
    ? persistedStructuredTableData.length > 0
    : !!persistedStructuredTableData &&
      typeof persistedStructuredTableData === "object" &&
      Object.keys(persistedStructuredTableData).length > 0;

  if (!store.state.isNavigatingBack || !hasPersistedData || !isStructuredTableArray) {
    console.log("Fetching modified document data for tables and tags...");
    try {
      // Use the modified document's details for the request
      const response = await axios.get(`${PYTHON_SERVICE_BASE_URL}/api/parse-document`, {
        params: {
          fileId: modifiedFileId,
          bucketName: tempBucketName,
          userId, // Include userId in the request
        },
      });

      console.log("Response from Flask:", response.data);

      const { tables: parsedTables, tags } = response.data;
      
       // Dispatch the collated tags to Vuex
      store.dispatch("saveCollatedTags", tags); // Add this line

      // Prepare Vuex-dispatchable data structures
      const vuexData = {};
      const enhancedData = [];

      parsedTables.forEach((table) => {
        const tableName = table.name;

        const enhancedTable = {
          ...table,
          hyperlink: tags[`table_hyperlink:${tableName}`] || null,
          tooltip: tags[`table_tooltip:${tableName}`] || null,
          hyperlinkTooltip: tags[`table_hyperlink_tooltip:${tableName}`] || null,
        };

        const tableData = {
          [`TABLE_START:${tableName}`]: tags[`TABLE_START:${tableName}`] || '',
          [`TABLE_END:${tableName}`]: tags[`TABLE_END:${tableName}`] || '',
        };

        vuexData[tableName] = tableData;
        enhancedData.push(enhancedTable);
      });

      // Dispatch data to Vuex
      store.dispatch("saveStructuredTableData", vuexData);

      console.log("Vuex data dispatched:", vuexData);
      console.log("Enhanced table data:", enhancedData);

      // Set tables to the component state for rendering
      tables.value = enhancedData;

      console.log("Template tables loaded:", tables.value);
    } catch (error) {
      console.error("Error fetching or parsing template data:", error);
      alert("Failed to load dynamic table data. Please try again later.");
    }
  } else {
    console.log("Navigating back: Loading persisted structured table data...");
    loadPersistedTableValues();
  }

  store.commit("setNavigatingBack", false);
};




    /**
     * Build the final data object for Docxtemplater
     * @returns {Object} - The data object mapping placeholder IDs to user inputs
     */
    const buildDocxtemplaterData = () => {
      console.log('Starting to build data object from table:', tables.value);
      const dataForDocxtemplater = {};

      // Loop through each table to gather data
      tables.value.forEach((table) => {
        table.rows.forEach((row) => {
          row.forEach((cell) => {
            if (cell && cell.isPlaceholder && cell.id) {
              // Map the placeholder ID to the user-entered value
              dataForDocxtemplater[cell.id] = cell.value;
            }
          });
        });
      });

      console.log('Data for Docxtemplater:', dataForDocxtemplater);
      return dataForDocxtemplater;
    };

    const exportTablesData = () => {
      const dataStr = JSON.stringify(tables.value, null, 2); // Convert tables to JSON string
      const blob = new Blob([dataStr], { type: 'application/json' }); // Create a Blob object
      const url = URL.createObjectURL(blob); // Create a URL for the Blob

      const a = document.createElement('a'); // Create an anchor element
      a.href = url;
      a.download = 'tables_debug.json'; // File name for download
      a.click(); // Trigger the download

      URL.revokeObjectURL(url); // Clean up the URL object
    };

    /**
     * Navigate to CheckboxPage.vue after collecting data
     */
    const navigateToCheckboxPage = () => {
      const docxtemplaterData = buildDocxtemplaterData();

      console.log('Vuex state for user:', store.state.user);
      console.log('User ID retrieved:', store.state.user?._id);


      store.dispatch("saveTableData", docxtemplaterData); // Flattened data for Docxtemplater
      // Optionally, if you need to save structured data separately:
      // store.dispatch("saveStructuredTableData", tables.value);

      console.log("Saved table data to Vuex:", docxtemplaterData);
      router.push({ name: "checkboxPage" });
    };

    /**
     * Format the table name for display (e.g., "table_name" to "Table Name")
     * @param {String} name - The original table name
     * @returns {String} - The formatted table name
     */
    const formatTableName = (name) => {
      return name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    /**
     * Open a hyperlink in a new browser tab
     * @param {String} url - The URL to navigate to
     */
    const navigateTo = (url) => {
      window.open(url, '_blank'); // Opens the link in a new tab
    };

    onMounted(() => {
      loadDynamicTables();
    });

    onBeforeRouteLeave((to, from, next) => {
      store.commit('setNavigatingBack', true); // Set isNavigatingBack to true when navigating away
      next(); // Allow the navigation to proceed
    });

    return {
      tables,
      filteredTables,
      navigateTo,
      navigateToCheckboxPage,
      formatTableName,
      exportTablesData,
      // Remove local snackbar refs if using global
      // showSnackbar,
      // snackbarMessage,
    };
  },
};
</script>


<style scoped>
/* General Styling */
.v-app-bar {
  font-weight: bold;
}

.table-section {
  margin-bottom: 24px;
}

/* Elevated Cards with Shadows */
.elevated-card {
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Card Header Styling */
.card-header {
  background-color: #00796b; /* Desired background color */
  color: white; /* White text for titles */
  font-weight: bold;
  display: flex;
  align-items: center;
}

/* Styled Table */
.styled-table {
  margin-top: 16px;
}

.styled-table th {
  background-color: #00796b; /* Muted teal */
  color: white;
  font-size: 14px;
  font-weight: bold;
  text-align: center;
  padding: 12px;
  border-bottom: 2px solid #004d40;
}

.styled-table td {
  padding: 12px;
  border: 1px solid #ddd;
}

.styled-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.styled-table tr:hover {
  background-color: #e0f7fa;
}

/* Input Field in Table Cells */
.table-cell-input {
  margin: 0;
  font-size: 14px;
  width: 100%;
}

/* Button Row */
.button-row {
  margin-top: 32px;
  justify-content: center;
}

.action-button {
  margin: 0 8px;
  border-radius: 24px;
}

.tooltip-image {
  max-width: 200px; /* Limit the width */
  max-height: 200px; /* Limit the height */
  border-radius: 8px; /* Optional: rounded corners */
  object-fit: cover; /* Ensure the image fits nicely */
}

/* Styling for Table Tooltip Button */
.table-tooltip-button {
  width: 40px;
  height: 40px;
  background-color: #00796b; /* Desired background color */
  border-radius: 50%; /* Make it circular */
  display: flex;
  align-items: center;
  justify-content: center;
  color: white; /* Ensure icon is white */
  /* Optional: Add hover effect */
  transition: background-color 0.3s ease;
}

.table-tooltip-button:hover {
  background-color: #005c53; /* Darker shade on hover */
}

/* Styling for Hyperlink Button */
.table-hyperlink-button {
  width: 32px;
  height: 32px;
  background-color: #00796b; /* Desired background color */
  border-radius: 50%; /* Make it circular */
  display: flex;
  align-items: center;
  justify-content: center;
  color: white; /* Ensure icon is white */
  /* Optional: Add hover effect */
  transition: background-color 0.3s ease;
}

.table-hyperlink-button:hover {
  background-color: #005c53; /* Darker shade on hover */
}

/* Icon Styling within Buttons */
.table-tooltip-button .v-icon,
.table-hyperlink-button .v-icon {
  color: white; /* Ensure icons are white */
  font-size: 24px; /* Adjust the size as needed */
}

/* Ensure tooltip has high z-index */
.v-tooltip__content {
  z-index: 2000 !important; /* Adjust as necessary */
}
.custom-table-tooltip-btn {
  width: 32px; /* Set width */
  height: 32px; /* Set height */
  background-color: #00796b; /* Set background color */
  border-radius: 50%; /* Make the button circular */
  display: flex; /* Center the icon */
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s ease; /* Smooth hover transition */
}

/* Hover effect for the button */
.custom-table-tooltip-btn:hover {
  background-color: #005c53; /* Darker teal on hover */
}

/* Styling for the Table Tooltip Icon */
.custom-table-tooltip-icon {
  color: white; /* Set icon color */
  font-size: 24px; /* Adjust icon size */
  transition: color 0.3s ease; /* Smooth transition for icon color */
}

/* Optional hover effect for the icon (if needed) */
.custom-table-tooltip-btn:hover .custom-table-tooltip-icon {
  color: #e0f7fa; /* Slightly lighter icon color on hover */
}
</style>
