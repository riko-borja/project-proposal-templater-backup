<template>
  <v-container>
    <v-card outlined>
      <v-card-title>Upload Document for Approval</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="handleUpload">
          <v-file-input
            v-model="file"
            label="Select Modified Document"
            required
            accept=".docx"
          />
          <v-btn type="submit" color="primary">Upload</v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      file: null,
    };
  },
  methods: {
    async handleUpload() {
      if (!this.file) {
        alert('Please select a file to upload.');
        return;
      }

      const token = localStorage.getItem('jwtToken');
      const formData = new FormData();
      formData.append('file', this.file);

      try {
        const response = await fetch('/api/upload-modified-document', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          const documentName = data.filename;

          alert(`Document "${documentName}" uploaded successfully!`);
        } else {
          alert('Failed to upload document.');
        }
      } catch (error) {
        console.error('Error uploading document:', error);
        alert('An error occurred while uploading the document.');
      }
    },
  },
};
</script>
  
