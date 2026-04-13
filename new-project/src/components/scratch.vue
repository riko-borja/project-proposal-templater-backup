<template>
  <v-app>
    <v-app-bar color="white" dark>
      <v-toolbar-title>Checkbox Page</v-toolbar-title>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <v-row justify="center">
          <v-col cols="12" sm="8" md="6">
            <v-subheader>Select sections to include:</v-subheader>
            <div v-if="sections.length > 0">
              <NestedCheckbox
                v-for="section in sections"
                :key="section.id"
                :section="section"
              />
            </div>

            <v-btn @click="submitData">Submit</v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import NestedCheckbox from './NestedCheckbox.vue';

export default {
  components: {
    NestedCheckbox,
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    const sections = ref([]);

    onMounted(async () => {
      await fetchTemplateAndParseSections();
    });

    const fetchTemplateAndParseSections = async () => {
      try {
        const response = await axios.get('/api/sow-template', {
          responseType: 'arraybuffer',
        });

        const content = response.data;
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        sections.value = parseSections(doc);
      } catch (error) {
        console.error('Error fetching and parsing template:', error);
        alert('Failed to load the document template. Please try again later.');
      }
    };

    const submitData = async () => {
      const selected = sections.value.reduce((acc, section) => {
        acc[section.label] = section.checked;
        return acc;
      }, {});

      try {
        const saveResponse = await axios.post('/api/new-customer-data', {
          customerName: store.state.customerName,
          projectName: store.state.projectName,
          contractorName: store.state.contractorName,
          documentType1: store.state.documentType1,
          date: store.state.date,
          fuelSfdcReference: store.state.fuelSfdcReference,
          geLegalEntity: store.state.geLegalEntity,
          documentTypeShortName: store.state.documentTypeShortName,
          customerReferenceName: store.state.customerReferenceName,
          gridSwReferenceName: store.state.gridSwReferenceName,
          sections: selected,
        });

        console.log('Data saved successfully:', saveResponse.data);
        router.push({ name: 'ProcessingPage', params: { fileId: saveResponse.data.savedDataId } });
      } catch (error) {
        console.error('Error saving data:', error);
        alert('Failed to save the data. Please try again later.');
      }
    };

    return {
      sections,
      submitData,
    };
  },
};
</script>
