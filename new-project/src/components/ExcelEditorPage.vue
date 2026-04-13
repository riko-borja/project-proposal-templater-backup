<template>
  <div id="editor-container">
    <DocumentEditor
      v-if="config.document.url"
      ref="docEditor"
      id="docEditor"
      :documentServerUrl="'http://192.168.2.233:80/'"  
      :config="config"
      :events="editorEvents"
      :onLoadComponentError="onLoadComponentError"
    />
    <div v-show="!config.document.url" class="hidden">Loading document...</div>

    <!-- Button to trigger save and copy data -->
    <div class="button-container">
      <v-btn color="primary" @click="saveAndCopyData" :disabled="!isEditorReady">Save and Copy Data</v-btn>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { defineComponent } from 'vue';
import { DocumentEditor } from '@onlyoffice/document-editor-vue';

export default defineComponent({
  name: 'ExcelEditorPage',
  components: {
    DocumentEditor,
  },
  props: {
    fileId: {
      type: String,
      required: true,
    },
    wordFileId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      config: {
        document: {
          fileType: "xlsx",
          key: "",
          title: "",
          url: "",
          permissions: { edit: true, review: true },
        },
        documentType: "cell",
        editorConfig: {
          mode: "edit",
          user: {
            id: "user123",
            name: "User",
          },
        },
        callbackUrl: "/callback",
      },
      editorEvents: {}, // Will be set in mounted()
      token: "",
      isEditorReady: false,
    };
  },
  mounted() {
    // Bind the onDocumentReady event after component is mounted
    this.editorEvents = {
      onDocumentReady: this.onDocumentReady,
      onDocumentStateChange: (event) => {
        console.log('Document state has changed:', event);
      },
    };
    this.loadExcel();

    // Fallback: If onDocumentReady doesn't fire within 5 seconds, enable the button
    setTimeout(() => {
      if (!this.isEditorReady) {
        console.log('Fallback: Forcing editor to be ready.');
        this.isEditorReady = true;
      }
    }, 5000); // 5-second fallback
  },
  methods: {
    async loadExcel() {
      try {
        const fileId = this.fileId;
        const apiUrl = process.env.VUE_APP_API_URL || '/api';
        const response = await axios.post(`${apiUrl}/generate-editor-url-excel`, { fileId });

        if (response.data) {
          const documentUrlWithToken = `${response.data.document.url}?token=${response.data.token}`;
          this.config.document.url = documentUrlWithToken;
          this.config.document.title = response.data.document.title;
          this.config.document.key = response.data.document.key;
          this.config.token = response.data.token;

          console.log('Excel document loaded:', this.config.document);
        } else {
          console.error('Error: Response data is undefined');
        }
      } catch (error) {
        console.error('Error loading Excel file:', error);
      }
    },

    async saveDocument() {
      const editor = this.$refs.docEditor?.editor;
      return new Promise((resolve, reject) => {
        if (editor && editor.save) {
          editor.save((response) => {
            if (response.error) {
              console.error('Error saving document:', response.error);
              reject(response.error);
            } else {
              console.log('Document saved successfully.');
              resolve(response);
            }
          });
        } else {
          console.error('DocumentEditor instance not ready or save method unavailable');
          reject(new Error('DocumentEditor instance not ready'));
        }
      });
    },

    async saveAndCopyData() {
  try {
    // 1. Save the edited Excel file
    await this.saveDocument();
    console.log('Excel document saved.');

    // 2. Get the updated file content (base64)
    const editor = this.$refs.docEditor?.editor;
    const fileContent = await new Promise((resolve, reject) => {
      if (editor && editor.getFile) {
        editor.getFile((response) => {
          if (response.error) {
            reject(response.error);
          } else {
            resolve(response.data);
          }
        });
      } else {
        reject(new Error('DocumentEditor instance not ready or getFile method unavailable'));
      }
    });

    console.log('Retrieved updated Excel file content.');

    // 3. Save the updated Excel file to the backend with a new ID
    const newExcelFileId = `${this.fileId}_modified`;  // Example new file ID
    await axios.post('/api/save-excel', {
      fileId: newExcelFileId,
      fileData: fileContent,
    });

    console.log('Excel file saved to backend with new ID:', newExcelFileId);

    // 4. Call backend to paste data into Word
    const payload = {
      excelFileId: newExcelFileId,
      wordFileId: this.wordFileId,
      sheetName: 'Sheet1',
      sourceRange: 'A1:B10',
    };

    const apiUrl = process.env.VUE_APP_API_URL || '/api';
    const response = await axios.post(`${apiUrl}/paste-excel-into-word`, payload);

    if (response.data.success) {
      console.log('Data copied and pasted into Word document successfully.');

      // 5. Navigate back to EditorPage.vue to show the updated Word document
      this.$router.push({ name: 'EditorPage', params: { fileId: this.wordFileId } });
    } else {
      console.error('Failed to paste Excel data into Word document.');
    }
  } catch (error) {
    console.error('Error in save and copy operation:', error);
  }
},


    onDocumentReady() {
      console.log('Document editor is ready');
      this.isEditorReady = true;
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
