<template>
    <div id="editor-container">
      <DocumentEditor
        v-if="config.document.url"
        id="docEditor"
        :documentServerUrl="'http://192.168.2.233:80/'"
        :config="config"
        :events_onDocumentReady="onDocumentReady"
        :onLoadComponentError="onLoadComponentError"
      />
      <div v-show="!config.document.url" class="hidden">Loading document...</div>
    </div>
  </template>
  
  <script>
  import axios from 'axios';
  import { defineComponent } from 'vue';
  import { DocumentEditor } from '@onlyoffice/document-editor-vue';
  
  export default defineComponent({
    components: {
      DocumentEditor
    },
    data() {
      return {
        config: {
          document: {
            fileType: "xlsx",  // Excel file type
            key: "", // Dynamically set key from server
            title: "", // Dynamically set title from server
            url: "", // Document URL to be fetched from the server
            permissions: { edit: true, review: true }, // Ensure correct permissions
            token: "" // JWT token to be set dynamically
          },
          documentType: "cell", // ONLYOFFICE document type for Excel is 'cell'
          editorConfig: {
            mode: "edit", // Can be "view" or "edit"
            user: {
              id: "user123", // Example user ID
              name: "User" // Example user name
            }
          },
          events: {
            onDocumentStateChange: (event) => {
              console.log('Document state has changed: ', event);
            }
          },
          callbackUrl: "/callback" // Optional, use if you need server callbacks
        }
      };
    },
  
    mounted() {
      this.loadDocument(); // Load document on component mount
    },
  
    methods: {
        async loadDocument() {
  try {
    
    const apiUrl = process.env.VUE_APP_API_URL || '/api';
        const response = await axios.post(`${apiUrl}/generate-excel-editor-url1`);

    if (response.data) {
      const { document, token, documentType, editorConfig } = response.data;

      // Update the ONLYOFFICE configuration
      this.config.document = {
        ...document,
        token
      };
      this.config.documentType = documentType;
      this.config.editorConfig = editorConfig;
      this.config.token = token;

      console.log('Excel document loaded:', this.config);
    } else {
      console.error('Error: Response data is undefined');
    }
  } catch (error) {
    console.error('Error fetching editor URL:', error);
  }
},

  
  
      onDocumentReady() {
        console.log("Excel document is loaded and ready for editing.");
      },
  
      onLoadComponentError(errorCode, errorDescription) {
        console.error(`Error loading component (${errorCode}):`, errorDescription);
      }
    }
  });
  </script>
  
  <style scoped>
  #docEditor {
    width: 100%;
    height: 100%; /* Adjust height here */
  }
  
  #editor-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh; /* Full height */
  }
  
  .hidden {
    display: none;
  }
  
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
  }
  </style>
  