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
            fileType: "docx",
            key: "", // Dynamically set key from server
            title: "", // Dynamically set title from server
            url: "", // Document URL to be fetched from the server
            permissions: { edit: true, review: true }, // Ensure correct permissions
            token: "" // JWT token to be set dynamically
          },
          documentType: "word",
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
          callbackUrl: "/callback" // Use relative URL for the callback
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
        const response = await axios.post(`${apiUrl}/generate-editor-url1`);
  
          if (response.data) {
            // Append the token to the document URL
            const documentUrlWithToken = `${response.data.document.url}?token=${response.data.token}`;
  
            // Update the document configuration
            this.config.document.url = documentUrlWithToken;
            this.config.document.title = response.data.document.title;
            this.config.document.key = response.data.document.key;
            this.config.token = response.data.token; // Place the token at the root level
  
            console.log('Document loaded:', this.config.document);
          } else {
            console.error('Error: Response data is undefined');
          }
        } catch (error) {
          console.error('Error fetching editor URL:', error);
        }
      },
  
      onDocumentReady() {
        console.log("Document is loaded and ready for editing.");
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
  