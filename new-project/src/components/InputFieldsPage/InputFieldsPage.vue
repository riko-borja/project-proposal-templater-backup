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
              :inputErrors="inputErrors"
              @inputFocus="onInputFocus"
              @inputBlur="onInputBlur"
              @updateInput="updateDynamicInput"
            />

            <!-- Dynamic Dropdown Menus -->
            <DynamicDropdown
              v-for="dropdown in dropdownMenus"
              :key="dropdown.id"
              :dropdown="dropdown"
              :tooltipTags="tooltipTags" 
              @updateDropdown="updateDynamicDropdown"
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
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import AppBarLayout from '@/components/AppBarLayout.vue';
import DynamicInputField from '@/components/InputFieldsPage/DynamicInputField.vue';
import DynamicDropdown from '@/components/InputFieldsPage/DynamicDropdown.vue';
import DynamicDatePicker from '@/components/InputFieldsPage/DynamicDatePicker.vue';
import { fetchTemplateAndParseData, fetchDateFields } from '@/utils/utility.js';
import axios from 'axios';

export default {
  name: 'InputFieldsPage',
  components: {
    AppBarLayout,
    DynamicInputField,
    DynamicDropdown,
    DynamicDatePicker,
  },
  setup() {
    const router = useRouter();
    const store = useStore();

    // State
    const dynamicInputs = ref([]);
    const dropdownMenus = ref([]);
    const dynamicDateFields = ref([]);
    const tooltipTags = computed(() => store.getters['getTooltipTags'] || {});


    // Computed Property for Validation
    const allFieldsFilled = computed(() => {
      const inputsFilled = dynamicInputs.value.every((input, index) => {
        const filled = input.value && input.value.trim() !== '';
        inputErrors.value[index] = !filled;
        return filled;
      });

      const dropdownsFilled = dropdownMenus.value.every((dropdown, index) => {
        const filled = dropdown.selectedOption && dropdown.selectedOption.trim() !== '';
        dropdownErrors.value[index] = !filled;
        return filled;
      });

      const datesFilled = dynamicDateFields.value.every((dateField, index) => {
        const filled = dateField.value && dateField.value.trim() !== '';
        dateErrors.value[index] = !filled;
        return filled;
      });

      return inputsFilled && dropdownsFilled && datesFilled;
    });


    // Methods
    const onInputFocus = (inputId) => {
      console.log(`Focused Input: ${inputId}`);
    };

    const onInputBlur = (inputId) => {
      console.log(`Blurred Input: ${inputId}`);
    };

    const updateDynamicInput = ({ id, value }) => {
      const input = dynamicInputs.value.find(input => input.id === id);
      if (input) {
        input.value = value;
      }
    };

    const updateDynamicDropdown = ({ id, selectedOption }) => {
      const dropdown = dropdownMenus.value.find(dropdown => dropdown.id === id);
      if (dropdown) {
        dropdown.selectedOption = selectedOption;
      }
    };

    const updateDynamicDateField = ({ id, value, year, quarter }) => {
      const dateField = dynamicDateFields.value.find(field => field.id === id);
      if (dateField) {
        dateField.value = value;
        dateField.year = year;
        dateField.quarter = quarter;
      }
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

    watch(allFieldsFilled, (newVal) => {
      console.log('All fields filled:', newVal);
    });


    watch([dynamicInputs, dropdownMenus, dynamicDateFields], () => {
      console.log('Inputs:', dynamicInputs.value);
      console.log('Dropdowns:', dropdownMenus.value);
      console.log('Date Fields:', dynamicDateFields.value);
    });


    watch(tooltipTags, (newVal) => {
      console.log('Updated Tooltip Tags:', newVal);
      console.log('Resolved Button Tooltip:', newVal[`button_tooltip:${dynamicInputs.value[0]?.id}`]);
   
    });

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
      updateDynamicInput,
      updateDynamicDropdown,
      updateDynamicDateField,
      navigateToDynamicTablePage,
    };
  },
};
</script>

<style scoped>
.main-content {
  padding-top: 64px; /* Adjusted based on the actual height of the v-app-bar */
  margin: 0; /* Remove any margin to avoid extra spacing */
}

.v-container {
  padding-top: 16px; /* Adjust the padding inside the container */
}
</style>
