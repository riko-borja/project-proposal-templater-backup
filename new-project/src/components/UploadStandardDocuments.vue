<template>
  <v-container>
    <v-card>
      <v-card-title>Upload Document Template</v-card-title>
      <v-card-text>
        <!-- Dropdown for selecting the collection -->
        <v-select
          v-model="selectedCollection"
          :items="collections"
          item-title="displayName"
          item-value="name"
          label="Select Collection"
          placeholder="Select a Category"
          dense
        ></v-select>

        <v-file-input
          v-model="selectedFile"
          label="Select Document Template"
          accept=".docx"
          prepend-icon="mdi-file-document"
        ></v-file-input>

        <v-text-field
          v-model="version"
          label="Enter Version"
          placeholder="e.g., 1.0"
        ></v-text-field>

        <v-btn
          :disabled="!selectedFile || !version || !selectedCollection"
          color="blue-grey-darken-2"
          @click="uploadFile"
        >
          Upload
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Snackbar for status messages -->
    <v-snackbar
      v-model="snackbar.show"
      :timeout="snackbar.timeout"
      :color="snackbar.color"
      top
      right
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      selectedFile: null,
      version: '',
      selectedCollection: '',
      collections: [], // List of collections
      snackbar: {
        show: false,
        message: '',
        color: '',
        timeout: 3000,
      },
    };
  },
  async mounted() {
  try {
    // Fetch folders with storageType: 'Document'
    const response = await axios.get('/api/document-storage-folders');

    console.log('API response:', response.data); // Check what the API is returning

    this.collections = response.data.map(folder => ({
      name: folder.bucketName, // Use bucketName for sending to backend
      displayName: folder.name, // Friendly name for dropdown
    }));

    console.log('Document storage folders:', this.collections); // Debugging output
  } catch (error) {
    console.error('Error fetching document storage folders:', error);
  }
},

  methods: {
    async uploadFile() {
      if (!this.selectedFile || !this.version || !this.selectedCollection) {
        this.showSnackbar('Please select a file, version, and collection', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('file', this.selectedFile);
      formData.append('version', this.version);
      formData.append('collectionName', this.selectedCollection);

      try {
        const response = await axios.post('/api/upload-template', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        // Use the response for debugging or confirmation
        console.log('Upload response:', response.data);

        this.showSnackbar(`File uploaded successfully to ${this.selectedCollection}.`, 'success');
      } catch (error) {
        console.error('Error uploading file:', error);
        this.showSnackbar(error.response?.data?.message || 'Failed to upload file', 'error');
      }
    },
    showSnackbar(message, color) {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },
  },
};
</script>
