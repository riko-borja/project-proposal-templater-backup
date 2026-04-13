<template>
  <div id="editor-container">
    <DocumentEditor
      v-if="config.document.url"
      id="docEditor"
      ref="docEditor"
      :documentServerUrl="'http://192.168.2.233:80/'"
      :config="config"
      :events_onDocumentReady="onDocumentReady"
      :onLoadComponentError="onLoadComponentError"
    />
    <div v-show="!config.document.url" class="hidden">Loading document...</div>

    <!-- Add buttons to open specific Excel editors -->
    <div class="button-container">
      <v-btn
        @click="goBackToTemplateSelection"
        color="primary"
      >Go Back to Select Category Page</v-btn>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { defineComponent } from 'vue';
import { DocumentEditor } from '@onlyoffice/document-editor-vue';
import { mapState } from 'vuex';
import { mapActions } from 'vuex';

export default defineComponent({
  name: 'EditorPage',
  components: {
    DocumentEditor,
  },
  computed: {
    ...mapState(['fileId']), // Access fileId from Vuex
  },
  data() {
    return {
      config: {
        document: {
          fileType: "docx",
          key: "",
          title: "",
          url: "",
          permissions: { edit: true, review: true },
        },
        documentType: "word",
        editorConfig: {
          mode: "edit",
          user: {
            id: "user123",
            name: "User",
          },
        },
        events: {
          onDocumentStateChange: (event) => {
            console.log('Document state has changed:', event);
          },
        },
        callbackUrl: "/callback",
      },
      token: "",
    };
  },
  mounted() {
    this.loadDocument(this.fileId);
  },
  watch: {
    fileId(newFileId) {
      // Watch for fileId updates and log them
      console.log('fileId updated in watch:', newFileId);
      if (newFileId) {
        this.loadDocument(newFileId); // Load the Word document using fileId from Vuex
      }
    },
  },
  methods: {
    async loadDocument(fileId) { 
      try {
        console.log('Attempting to load document with fileId:', fileId); // Log fileId for visibility
        const apiUrl = process.env.VUE_APP_API_URL || '/api';
        const response = await axios.post(`${apiUrl}/generate-editor-url`, { fileId });

        if (response.data) {
          const documentUrlWithToken = `${response.data.document.url}?token=${response.data.token}`;
          this.config.document.url = documentUrlWithToken;
          this.config.document.title = response.data.document.title;
          this.config.document.key = response.data.document.key;
          this.config.token = response.data.token;
          console.log('Document loaded:', this.config.document);
        } else {
          console.error('Error: Response data is undefined');
        }
      } catch (error) {
        console.error('Error fetching editor URL:', error);
      }
    },

    ...mapActions(['resetStore']),
    goBackToTemplateSelection() {
      this.resetStore(); // Clear all Vuex states
      this.$router.push({ name: 'selectCategory' }); // Navigate to template selection
    },

    onDocumentReady() {
      console.log('Word document is ready for editing.');
    },
    onLoadComponentError(errorCode, errorDescription) {
      console.error(`Error loading component (${errorCode}):`, errorDescription);
    },
  },
});
</script>

<style scoped>
#docEditor {
  width: 100%;
  height: 100%;
}

#editor-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
}

.button-container {
  margin-top: 20px;
  text-align: center;
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
