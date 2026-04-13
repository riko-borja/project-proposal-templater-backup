<template>
  <v-container fluid class="user-options-shell">
    <v-row justify="center" align="center" class="fill-height">
      <v-col cols="12" sm="9" md="7" lg="5">
        <v-card class="pa-4 pa-sm-6 user-options-card" rounded="xl">
          <v-card-title class="user-options-title">Choose a Template</v-card-title>
          <v-card-text>
            <p class="user-options-subtitle">
              Select a document template for the category path you chose.
            </p>

            <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4 user-options-alert">
              {{ errorMessage }}
            </v-alert>

            <v-select
              v-model="selectedTemplate"
              :items="templates"
              item-title="label"
              item-value="fileId"
              label="Select a Document Template"
              return-object
              :loading="isLoading"
              :disabled="isLoading || templates.length === 0"
              class="template-select"
              variant="outlined"
              density="comfortable"
            ></v-select>

            <p v-if="!isLoading && templates.length === 0 && !errorMessage" class="empty-state-text">
              No templates found for the selected category path.
            </p>

            <div class="actions-row">
              <v-btn
                color="primary"
                class="proceed-btn"
                @click="navigateToInputFieldsPage"
                :disabled="!selectedTemplate || isLoading || templates.length === 0"
                :loading="isLoading"
                size="large"
                block
              >
                Continue to Input Fields
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, onMounted, defineComponent, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useStore } from 'vuex';

export default defineComponent({
  setup() {
    const router = useRouter();
    const store = useStore();
    const templates = ref([]);
    const selectedTemplate = ref(null);
    const isLoading = ref(false);
    const errorMessage = ref('');

    onMounted(async () => {
      const hierarchyString = router.currentRoute.value.query.hierarchy;

      if (!hierarchyString) {
        errorMessage.value = 'No hierarchy provided. Please select a valid category.';
        router.push({ name: 'selectCategory' });
        return;
      }

      isLoading.value = true;
      errorMessage.value = '';

      try {
        const response = await axios.get('/api/files/fetch-template-files', {
          params: { hierarchy: hierarchyString },
        });

        if (Array.isArray(response.data)) {
          templates.value = response.data.map((file) => ({
            label: file.filename,
            filename: file.filename,
            fileId: file._id,
            bucketName: file.bucketName,
            contentType: file.contentType,
            path: file.path,
          }));
        } else {
          templates.value = [];
          errorMessage.value = 'Unexpected response format from the server.';
        }
      } catch (error) {
        templates.value = [];
        errorMessage.value = 'Failed to fetch templates. Please try again later.';
      } finally {
        isLoading.value = false;
      }
    });

    watch(selectedTemplate, (newValue) => {
      if (newValue && newValue.filename) {
        // Dispatch the filename as the dynamic title to Vuex
        store.dispatch('updateDynamicTitle', newValue.filename);
      }
      store.dispatch('updateDynamicInputs', []);
      store.dispatch('updateDropdownMenus', []);
      store.dispatch('setDynamicDateFields', []);
    });

    const navigateToInputFieldsPage = () => {
      if (!selectedTemplate.value) {
        alert('No template selected. Please select a template first.');
        return;
      }

      store.dispatch('updateSelectedTemplate', selectedTemplate.value);

      router.push({ name: 'inputFieldsPage' });
    };

    return {
      templates,
      selectedTemplate,
      isLoading,
      errorMessage,
      navigateToInputFieldsPage,
    };
  },
});
</script>

<style scoped>
.user-options-shell {
  min-height: 100vh;
  background: linear-gradient(180deg, #eef3f8 0%, #f8fafc 100%);
  padding-top: 24px;
  padding-bottom: 24px;
}

.user-options-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.09);
}

.user-options-title {
  padding: 0 0 8px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

.user-options-subtitle {
  margin: 0 0 12px;
  color: rgba(15, 23, 42, 0.75);
  font-size: 0.95rem;
}

.empty-state-text {
  margin: 10px 2px 0;
  color: rgba(15, 23, 42, 0.75);
  font-size: 0.95rem;
}

.actions-row {
  margin-top: 14px;
}

.proceed-btn {
  font-weight: 600;
  letter-spacing: 0.2px;
}
</style>
