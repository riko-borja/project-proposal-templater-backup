<template>
  <v-app>
    <!-- App Bar -->
    <v-app-bar color="white" dark>
      <v-toolbar-title>Customer Details</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Content -->
    <v-main>
      <v-container fluid>
        <v-row justify="center">
          <v-col cols="12" sm="8" md="6">
            <v-text-field 
              v-model="clientName" 
              clearable 
              label="Client Name" 
              color="cyan" 
              variant="solo" 
              placeholder="e.g., Acme Corp" 
            />
            <v-text-field 
              v-model="dataflowEndpoint" 
              clearable 
              label="Dataflow Endpoint" 
              color="cyan" 
              variant="solo" 
              placeholder="e.g., https://api.acme.com" 
            />
            <v-text-field 
              v-model="customerApplicationName" 
              clearable 
              label="Customer Application Name" 
              color="cyan" 
              variant="solo" 
              placeholder="e.g., CustomerApp" 
            />
            <v-date-picker 
              v-if="showDatePicker2" 
              v-model="selectedDate2" 
              color="orange" 
              elevation="24" 
              :rounded="'30px'" 
              style="width: 810px;" 
              picker-date-format="yyyy-MM-dd" 
            />
            <v-text-field 
              v-model="deliveryTimeline" 
              clearable 
              label="Delivery Timeline" 
              variant="solo" 
              @focus="showDatePicker2 = true" 
              readonly 
              placeholder="e.g., 2024-08-27" 
            />
            <v-text-field 
              v-model="productionClusterInitial" 
              clearable 
              label="Production Cluster Initial (e.g., PRD)" 
              color="cyan" 
              variant="solo" 
              placeholder="PRD" 
            />
            <v-text-field 
              v-model="productionClusterName" 
              clearable 
              label="Production Cluster Name (e.g., Z4-H-EPP)" 
              color="cyan" 
              variant="solo" 
              placeholder="Z4-H-EPP" 
            />
            <v-text-field 
              v-model="qualityAndAssuranceClusterInitial" 
              clearable 
              label="Quality and Assurance Cluster Initial (e.g., Sample value 3)" 
              color="cyan" 
              variant="solo" 
              placeholder="Sample value 3" 
            />
            <v-text-field 
              v-model="qualityAndAssuranceClusterName" 
              clearable 
              label="Quality and Assurance Cluster Name (e.g., Sample value 4)" 
              color="cyan" 
              variant="solo" 
              placeholder="Sample value 4" 
            />
            <v-text-field 
              v-model="customerSolutionName" 
              clearable 
              label="Customer Solution Name" 
              color="cyan" 
              variant="solo" 
              placeholder="e.g., Solution X" 
            />
            <v-text-field 
              v-model="maximumLatency" 
              clearable 
              label="Maximum Latency" 
              color="cyan" 
              variant="solo" 
              placeholder="e.g., 100ms" 
            />
            <v-text-field 
              v-model="artifactoryClusterInitial" 
              clearable 
              label="Artifactory Cluster Initial (e.g., Sample value 5)" 
              color="cyan" 
              variant="solo" 
              placeholder="Sample value 5" 
            />
            <v-text-field 
              v-model="artifactoryClusterName" 
              clearable 
              label="Artifactory Cluster Name (e.g., Zone 4 Artifactory server)" 
              color="cyan" 
              variant="solo" 
              placeholder="Zone 4 Artifactory server" 
            />
            <v-text-field 
              v-model="developmentClusterInitial" 
              clearable 
              label="Development Cluster Initial (e.g., DEV)" 
              color="cyan" 
              variant="solo" 
              placeholder="DEV" 
            />
            <v-text-field 
              v-model="developmentClusterName" 
              clearable 
              label="Development Cluster Name (e.g., Z4-H-MVP)" 
              color="cyan" 
              variant="solo" 
              placeholder="Z4-H-MVP" 
            />
            <v-text-field 
              v-model="descriptionOfDataflow" 
              clearable 
              label="Description of Dataflow" 
              color="cyan" 
              variant="solo" 
              placeholder="e.g., Describe dataflow here" 
            />
            <v-textarea 
              bg-color="white" 
              color="cyan" 
              label="Description of Connectivity between Cluster and Legacy Platform" 
              v-model="descriptionOfConnectivityBetweenClusterAndLegacyPlatform" 
              variant="solo" 
              placeholder="e.g., Detailed connectivity description" 
            />
            <v-btn @click="saveData">Next</v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { ref, watch } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { format } from 'date-fns';

// Import Docxtemplater and dependencies
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

// Remove axios.defaults.baseURL, we'll use relative URLs

export default {
  setup() {
    const router = useRouter();
    const store = useStore();
    const clientName = ref('');
    const dataflowEndpoint = ref('');
    const customerApplicationName = ref('');
    const selectedDate2 = ref(null);
    const deliveryTimeline = ref('');
    const productionClusterInitial = ref('');
    const productionClusterName = ref('');
    const qualityAndAssuranceClusterInitial = ref('');
    const showDatePicker2 = ref(false);
    const qualityAndAssuranceClusterName = ref('');
    const customerSolutionName = ref('');
    const maximumLatency = ref('');
    const artifactoryClusterInitial = ref('');
    const artifactoryClusterName = ref('');
    const developmentClusterInitial = ref('');
    const developmentClusterName = ref('');
    const descriptionOfDataflow = ref('');
    const descriptionOfConnectivityBetweenClusterAndLegacyPlatform = ref('');
    const currentDate = ref(format(new Date(), 'yyyy-MM-dd'));

    watch(selectedDate2, (newDate) => {
      if (newDate) {
        deliveryTimeline.value = format(newDate, 'yyyy-MM-dd');
      }
      showDatePicker2.value = false;
    });

    watch(
      () => store.state.currentDate,
      {
        immediate: true,
        handler(newValue) {
          if (!newValue) {
            console.error('Current date is not set in the Vuex store');
          } else {
            console.log('Current date updated:', newValue);
          }
        },
      }
    );

    const logout = () => {
      router.push({ name: 'login' });
    };

    const saveData = async () => {
      try {
        console.log('Starting to save data...');

        // Use relative URL for the backend API
        const saveResponse = await axios.post('/api/data', {
          clientName: clientName.value,
          dataflowEndpoint: dataflowEndpoint.value,
          customerApplicationName: customerApplicationName.value,
          deliveryTimeline: deliveryTimeline.value,
          productionClusterInitial: productionClusterInitial.value,
          productionClusterName: productionClusterName.value,
          qualityAndAssuranceClusterInitial: qualityAndAssuranceClusterInitial.value,
          qualityAndAssuranceClusterName: qualityAndAssuranceClusterName.value,
          customerSolutionName: customerSolutionName.value,
          maximumLatency: maximumLatency.value,
          artifactoryClusterInitial: artifactoryClusterInitial.value,
          artifactoryClusterName: artifactoryClusterName.value,
          developmentClusterInitial: developmentClusterInitial.value,
          developmentClusterName: developmentClusterName.value,
          descriptionOfDataflow: descriptionOfDataflow.value,
          descriptionOfConnectivityBetweenClusterAndLegacyPlatform:
            descriptionOfConnectivityBetweenClusterAndLegacyPlatform.value,
          currentDate: currentDate.value,
        });

        console.log('Data saved successfully:', saveResponse.data);

        // Fetch the Word template from the backend using relative URL
        const templateResponse = await axios.get('/api/template', {
          responseType: 'arraybuffer', // Important for binary data
        });

        console.log('Template fetched successfully.');

        const content = templateResponse.data;
        const getQuarter = (date) => {
          const month = new Date(date).getMonth() + 1; // Get month (0-indexed, so add 1)
          if (month >= 1 && month <= 3) return 'Q1';
          if (month >= 4 && month <= 6) return 'Q2';
          if (month >= 7 && month <= 9) return 'Q3';
          if (month >= 10 && month <= 12) return 'Q4';
          return '';
        };

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        // Prepare the data for placeholder replacement
        const data = {
          'Client_name': clientName.value,
          'Endpoint': dataflowEndpoint.value,
          'Customer_application_name': customerApplicationName.value,
          'Delivery_timeline': deliveryTimeline.value,
          'Quarterly_timeline': getQuarter(deliveryTimeline.value),
          'Production_cluster_initial': productionClusterInitial.value,
          'Production_cluster_name': productionClusterName.value,
          'Quality_and_assurance_cluster_initial': qualityAndAssuranceClusterInitial.value,
          'Quality_and_assurance_cluster_name': qualityAndAssuranceClusterName.value,
          'Customer_solution_name': customerSolutionName.value,
          'Maximum_latency': maximumLatency.value,
          'Artifactory_cluster_initial': artifactoryClusterInitial.value,
          'Artifactory_cluster_name': artifactoryClusterName.value,
          'Development_cluster_initial': developmentClusterInitial.value,
          'Development_cluster_name': developmentClusterName.value,
          'Description_of_dataflow': descriptionOfDataflow.value,
          'Description_of_connectivity_between_clusters_and_legacy_platform':
            descriptionOfConnectivityBetweenClusterAndLegacyPlatform.value,
          'Current_date': currentDate.value,
          'excel_placeholder': '{ExcelDataHere}',
        };

        // Set the data for placeholder replacement
        doc.setData(data);

        try {
          // Perform the placeholder replacement
          doc.render();
        } catch (error) {
          // Handle errors during rendering
          console.error('Error rendering document:', error);
          alert('Failed to generate the document. Please check the template and try again.');
          return;
        }

        // Generate the new Word document
        const out = doc.getZip().generate({
          type: 'blob',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        console.log('Document generated successfully.');

        // Convert the Blob to a File object
        const file = new File([out], 'GeneratedDocument.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        // Create FormData to send the file
        const formData = new FormData();
        formData.append('file', file);

        console.log('Uploading the generated document to the server.');

        // Use relative URL for uploading the document
        const uploadResponse = await axios.post(
          '/api/upload-generated-document',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        console.log('Generated document uploaded, file ID:', uploadResponse.data.fileId);

        // Optionally save the document locally
        saveAs(out, 'GeneratedDocument.docx');

        // Navigate to the Processing Page with the fileId as a parameter
        router.push({ name: 'ProcessingPage', params: { fileId: uploadResponse.data.fileId } });
      } catch (error) {
        if (error.response) {
          console.error('Server responded with an error:', error.response.data);
          alert(`Error: ${error.response.data.message || 'An error occurred.'}`);
        } else if (error.request) {
          console.error('No response received:', error.request);
          alert('No response from the server. Please try again later.');
        } else {
          console.error('Error during document generation:', error.message);
          alert(`Error: ${error.message}`);
        }
      }
    };

    return {
      clientName,
      dataflowEndpoint,
      customerApplicationName,
      selectedDate2,
      deliveryTimeline,
      productionClusterInitial,
      productionClusterName,
      qualityAndAssuranceClusterInitial,
      showDatePicker2,
      qualityAndAssuranceClusterName,
      customerSolutionName,
      maximumLatency,
      artifactoryClusterInitial,
      artifactoryClusterName,
      developmentClusterInitial,
      developmentClusterName,
      descriptionOfDataflow,
      descriptionOfConnectivityBetweenClusterAndLegacyPlatform,
      saveData,
      currentDate,
      logout,
    };
  },
};
</script>

<style scoped>
.header-title {
  font-size: 2em;
  color: #cde4eb;
  font-weight: bold;
}

button {
  padding: 10px 20px;
  border: none;
  background-color: #ffffff;
  color: rgb(0, 0, 0);
  cursor: pointer;
  border-radius: 5px;
}

.v-btn {
  margin: 10px 0;
}

.text-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
</style>