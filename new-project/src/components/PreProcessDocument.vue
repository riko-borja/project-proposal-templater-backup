<template>
  <!-- This component runs in the background and does not need a UI -->
  <div style="display: none;"></div> <!-- Add a hidden div as a valid child element -->
</template>
  
<script>
import axios from 'axios';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

export default {
  name: 'PreProcessDocument',
  props: ['selectedTemplate'],
  methods: {
    async preprocessAndSendToServer(templateFile) {
      try {
        // Load the template from the server
        const response = await axios.get(`/api/sow-template?filename=${encodeURIComponent(templateFile)}`, {
          responseType: 'arraybuffer',
        });

        const content = response.data;
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        // Replace the table tags with empty values
        doc.setData({
          'table_start': '',
          'table_end': ''
        });
        doc.render();

        // Generate the processed document as a Blob
        const processedDoc = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        // Prepare the form data for upload
        const formData = new FormData();
        formData.append('file', processedDoc, 'ProcessedTemplate.docx');

        // Include JWT token in the request headers
        const token = localStorage.getItem('jwtToken');
        if (!token) {
          console.error('JWT token not found');
          throw new Error('User not authenticated');
        }

        console.log('JWT token:', token); // Log token for debugging purposes

        // Send the processed document to the Node.js server for storage
        await axios.post('/api/upload-processed-template', formData, {
          headers: {
            'Authorization': `Bearer ${token}`, // Include JWT token
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('Processed document uploaded successfully');
      } catch (error) {
        console.error('Error processing and sending the document:', error);
      }
    },
  },
  mounted() {
    if (this.selectedTemplate) {
      this.preprocessAndSendToServer(this.selectedTemplate);
    } else {
      console.error('No template selected for preprocessing');
    }
  },
};
</script>

  