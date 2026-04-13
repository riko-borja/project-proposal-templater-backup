<template>
  <AppBarLayout>
    <v-main class="main-content">
      <v-container fluid>
        <v-row justify="center">
          <v-col cols="12" sm="8" md="6">
            <!-- Dynamic Input Fields -->
            <DynamicInputField
              v-for="(input, index) in dynamicInputs"
              :key="input.id"
              :input="input"
              :index="index"
              :tooltipTags="tooltipTags"
              @inputFocus="onInputFocus"
              @inputBlur="onInputBlur"
            />

            <!-- Dynamic Dropdown Menus -->
            <DynamicDropdown
              v-for="dropdown in dropdownMenus"
              :key="dropdown.id"
              :dropdown="dropdown"
              :tooltipTags="tooltipTags"
            />

            <!-- Dynamic Date Pickers -->
            <DynamicDatePicker
              v-for="(dateField, index) in dynamicDateFields"
              :key="dateField.id"
              :dateField="dateField"
              :index="index"
              :tooltipTags="tooltipTags"
              @updateDate="updateDynamicDateField"
            />

            <!-- Next Button -->
            <v-tooltip bottom>
              <template v-slot:activator="{ props }">
                <v-btn
                  @click="navigateToDynamicTablePage"
                  :disabled="!allFieldsFilled"
                  v-bind="props"
                >
                  Next
                </v-btn>
              </template>
              <span v-if="!allFieldsFilled">
                Please fill in all fields before proceeding.
              </span>
            </v-tooltip>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </AppBarLayout>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import AppBarLayout from '@/components/AppBarLayout.vue';
import DynamicInputField from '@/components/InputFieldsPage/DynamicInputField.vue';
import DynamicDropdown from '@/components/InputFieldsPage/DynamicDropdown.vue';
import DynamicDatePicker from '@/components/InputFieldsPage/DynamicDatePicker.vue';
import TooltipRenderer from './TooltipRenderer.vue';
import { fetchTemplateAndParseData, fetchDateFields } from '@/utils/utility.js';
import axios from 'axios';

export default {
  name: 'InputFieldsPage',
  components: {
    AppBarLayout,
    DynamicInputField,
    DynamicDropdown,
    DynamicDatePicker,
    TooltipRenderer,
  },
  setup() {
    const router = useRouter();
    const store = useStore();

    // State
    const dynamicInputs = ref([]);
    const dropdownMenus = ref([]);
    const dynamicDateFields = ref([]);
    const tooltipTags = computed(() => store.getters['getTooltipTags'] || {});
    const allFieldsFilled = computed(() => {
      return (
        dynamicInputs.value.every(input => input.value?.trim()) &&
        dropdownMenus.value.every(dropdown => dropdown.selectedOption?.trim()) &&
        dynamicDateFields.value.every(dateField => dateField.value?.trim())
      );
    });

    // Methods
    const onInputFocus = (input) => {
      console.log(`Focused Input: ${input.id}`);
    };

    const onInputBlur = () => {
      console.log('Input blurred.');
    };

    const updateDynamicDateField = (dateField, index, newDate) => {
      const formattedDate = new Date(newDate).toISOString().split('T')[0];
      dateField.value = formattedDate;
    };

    const navigateToDynamicTablePage = () => {
      if (!allFieldsFilled.value) {
        alert('Please fill in all fields before proceeding.');
        return;
      }

      // Dispatch updates to Vuex store
      store.dispatch('updateDynamicInputs', dynamicInputs.value);
      store.dispatch('updateDropdownMenus', dropdownMenus.value);
      store.dispatch('updateDynamicDateFields', dynamicDateFields.value);

      router.push({ name: 'dynamicTablePage' });
    };

    // Template Loading
    const loadTemplateInputs = async () => {
      const { fileId, bucketName } = store.state.selectedTemplate;

      if (!fileId || !bucketName) {
        alert('Invalid template selection.');
        router.push({ name: 'userOptionsPage' });
        return;
      }

      try {
        const response = await axios.get('/api/files/fetch-template-content', {
          params: { fileId, bucketName },
          responseType: 'arraybuffer',
        });

        const parsedData = await fetchTemplateAndParseData(response.data);
        const parsedDateFields = await fetchDateFields(response.data);

        dynamicInputs.value = parsedData.inputs || [];
        dropdownMenus.value = parsedData.dropdowns || [];
        dynamicDateFields.value = parsedDateFields.dateFields || [];

        // Dispatch updates to Vuex store
        store.dispatch('saveTooltipTags', parsedData.tooltipTags || {});
      } catch (error) {
        console.error('Error loading template:', error);
      }
    };

    // Lifecycle Hooks
    onMounted(() => {
      loadTemplateInputs();
    });

    return {
      dynamicInputs,
      dropdownMenus,
      dynamicDateFields,
      tooltipTags,
      allFieldsFilled,
      onInputFocus,
      onInputBlur,
      updateDynamicDateField,
      navigateToDynamicTablePage,
    };
  },
};
</script>


