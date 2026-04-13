<template>
  <AppBarLayout>
    <v-main class="main-content">
      <v-container fluid>
        <v-row justify="center">
          <v-col cols="12" sm="8" md="6">
            <!-- Dynamic Form Fields Section -->

            <!-- Input Fields: Dynamically Generated Text Fields -->
            <div v-if="dynamicInputs.length > 0">
              <div
                v-for="(input, index) in dynamicInputs"
                :key="input.id || input.label"
                class="input-field-container"
              >
                <!-- Range Input -->
                <template v-if="input.type === 'range'">
                  <label :for="input.id" class="input-label">{{ input.label }}:</label>
                  <div class="range-inputs">
                    <v-text-field
                      v-model="input.min.value"
                      :label="input.min.label"
                      type="number"
                      clearable
                      variant="solo"
                      :error="inputErrors[index]"
                      :error-messages="inputErrors[index] ? 'This field is required.' : ''"
                      @focus="onInputFocus(input.min)"
                      @blur="onInputBlur"
                      @input="sanitizeInput(input.min)"
                      class="input-field"
                    />
                    <span class="range-separator">–</span>
                    <v-text-field
                      v-model="input.max.value"
                      :label="input.max.label"
                      type="number"
                      clearable
                      variant="solo"
                      :error="inputErrors[index]"
                      :error-messages="inputErrors[index] ? 'This field is required.' : ''"
                      @focus="onInputFocus(input.max)"
                      @blur="onInputBlur"
                      @input="sanitizeInput(input.max)"
                      class="input-field"
                    />
                    <!-- Hyperlink Button and Tooltip for Range Input -->
                    <v-tooltip bottom>
                      <template v-slot:activator="{ props }">
                        <v-btn
                          v-if="input.min.hyperlink || input.max.hyperlink"
                          icon
                          v-bind="props"
                          color="teal-darken-4"
                          @click="input.min.hyperlink ? navigateTo(input.min.hyperlink.url) : navigateTo(input.max.hyperlink.url)"
                          class="hyperlink-button"
                        >
                          <v-icon>mdi-link</v-icon>
                        </v-btn>
                      </template>
                      <span v-if="(tooltipTags[`button_tooltip:${input.label}`] || tooltipTags[`button_tooltip:${input.id}`])?.content">
                        {{
                          (tooltipTags[`button_tooltip:${input.label}`] || tooltipTags[`button_tooltip:${input.id}`])?.content
                        }}
                      </span>
                    </v-tooltip>
                  </div>
                </template>

                <!-- Default Input Field -->
                <template v-else>
                  <div class="input-field-container-vertical">
                    <!-- Render Input Label -->
                    <template v-if="tooltipTags[`input_label:${input.id}`] || tooltipTags[`input_label:${input.label}`]">
                      <label class="input-label">
                        {{
                          (tooltipTags[`input_label:${input.id}`] || tooltipTags[`input_label:${input.label}`])?.content
                        }}
                      </label>
                    </template>
                    <div class="input-with-button">
                      <v-text-field
                        v-model="input.value"
                        :label="input.label"
                        :type="input.type === 'number' ? 'text' : input.type || 'text'"
                        clearable
                        variant="solo"
                        :error="inputErrors[index]"
                        :error-messages="inputErrors[index] ? 'This field is required.' : ''"
                        @focus="onInputFocus(input)"
                        @blur="onInputBlur"
                        @input="sanitizeInput(input)"
                        class="input-field"
                      >
                        <!-- Tooltip for Input Field -->
                        <template
                          v-if="(tooltipTags[`input_tooltip:${input.label}`] || tooltipTags[`input_tooltip:${input.id}`])?.content"
                          v-slot:append-inner
                        >
                          <v-tooltip bottom :value="focusedInput === input.id">
                            <template v-slot:activator="{ props }">
                              <v-icon
                                v-bind="props"
                                color="teal-darken-4"
                                @mouseenter="focusedInput = input.id"
                                @mouseleave="focusedInput = null"
                              >
                                mdi-information-outline
                              </v-icon>
                            </template>
                            <!-- Text Tooltip -->
                            <span
                              v-if="(tooltipTags[`input_tooltip:${input.label}`] || tooltipTags[`input_tooltip:${input.id}`])?.type === 'text'"
                            >
                              {{
                                (tooltipTags[`input_tooltip:${input.label}`] || tooltipTags[`input_tooltip:${input.id}`])?.content
                              }}
                            </span>
                            <!-- URL Tooltip -->
                            <a
                              v-else-if="(tooltipTags[`input_tooltip:${input.label}`] || tooltipTags[`input_tooltip:${input.id}`])?.type === 'url'"
                              :href="(tooltipTags[`input_tooltip:${input.label}`] || tooltipTags[`input_tooltip:${input.id}`])?.content"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open Link
                            </a>
                            <!-- Image Tooltip -->
                            <img
                              v-else-if="(tooltipTags[`input_tooltip:${input.label}`] || tooltipTags[`input_tooltip:${input.id}`])?.type === 'image'"
                              :src="(tooltipTags[`input_tooltip:${input.label}`] || tooltipTags[`input_tooltip:${input.id}`])?.content"
                              alt="Tooltip Image"
                              class="tooltip-image"
                            />
                          </v-tooltip>
                        </template>
                      </v-text-field>
                      <!-- Hyperlink Button -->
                      <v-tooltip bottom>
                        <template v-slot:activator="{ props }">
                          <v-btn
                            v-if="input.hyperlink"
                            icon
                            v-bind="props"
                            color="teal-darken-4"
                            @click="navigateTo(input.hyperlink.url)"
                            class="hyperlink-button"
                          >
                            <v-icon>mdi-link</v-icon>
                          </v-btn>
                        </template>
                        <!-- Display text tooltips only -->
                        <span v-if="(tooltipTags[`button_tooltip:${input.id}`] || tooltipTags[`button_tooltip:${input.label}`])?.type === 'text'">
                          {{
                            (tooltipTags[`button_tooltip:${input.id}`] || tooltipTags[`button_tooltip:${input.label}`])?.content
                          }}
                        </span>
                      </v-tooltip>
                    </div>
                  </div>
                </template>
              </div>
            </div>
                          
            <!-- Dropdown Menus: Dynamically Generated Dropdown Selectors -->
            <div>
              <div v-if="dropdownMenus.length > 0">
                <!-- Loop through all active dropdown menus -->
                <div
                  v-for="(dropdown, index) in dropdownMenus"
                  :key="dropdown.id"
                  class="dropdown-field-container"
                >
                  <!-- Dynamic Dropdown -->
                  <v-select
                    v-model="dropdown.selectedOption"
                    :items="dropdown.options"
                    item-title="label"
                    item-value="label"
                    :label="dropdown.title"
                    variant="solo"
                    clearable
                    @update:modelValue="(value) => handleMainDropdownChange(value, dropdown, index)"
                  >
                    <!-- Custom Rendering of Dropdown Options -->
                    <template v-slot:default="{ props }">
                      <v-list>
                        <v-list-item
                          v-for="option in dropdown.options"
                          :key="option.id"
                          @click="props.select(option.label)"
                          class="dropdown-option-container"
                        >
                          <!-- Display the Label of the Option -->
                          <span>{{ option.label }}</span>
                          <!-- Tooltip for the Option -->
                          <v-tooltip bottom>
                            <template v-slot:activator="{ props }">
                              <v-icon
                                v-bind="props"
                                small
                                color="teal-darken-4"
                                class="inline-tooltip-icon"
                              >
                                mdi-information-outline
                              </v-icon>
                            </template>
                            <span>
                              {{ tooltipTags[`input_tooltip:${option.id}`]?.content || 'No description available.' }}
                            </span>
                          </v-tooltip>
                        </v-list-item>
                      </v-list>
                    </template>
                  </v-select>

                  <!-- Tooltip for Dropdown Field -->
                  <v-tooltip bottom>
                    <span v-if="tooltipTags[`button_tooltip:${dropdown.id}`]?.type === 'text'">
                      {{ tooltipTags[`button_tooltip:${dropdown.id}`]?.content }}
                    </span>
                    <a
                      v-else-if="tooltipTags[`button_tooltip:${dropdown.id}`]?.type === 'url'"
                      :href="tooltipTags[`button_tooltip:${dropdown.id}`]?.content"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Link
                    </a>
                    <img
                      v-else-if="tooltipTags[`button_tooltip:${dropdown.id}`]?.type === 'image'"
                      :src="tooltipTags[`button_tooltip:${dropdown.id}`]?.content"
                      alt="Tooltip Image"
                      class="tooltip-image"
                    />
                  </v-tooltip>

                  <!-- Hyperlink Button for Dropdown -->
                  <v-tooltip bottom>
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-if="dropdown.hyperlink"
                        icon
                        v-bind="props"
                        color="teal-darken-4"
                        @click="navigateTo(dropdown.hyperlink.url)"
                        class="hyperlink-button"
                      >
                        <v-icon>mdi-link</v-icon>
                      </v-btn>
                    </template>
                    <!-- Render Dropdown Button Tooltip -->
                    <span
                      v-if="(tooltipTags[`dropdown_button_tooltip:${dropdown.title.toLowerCase().replace(/[\s/]+/g, '_')}`])?.type === 'text'"
                    >
                      {{
                        tooltipTags[`dropdown_button_tooltip:${dropdown.title.toLowerCase().replace(/[\s/]+/g, '_')}`]?.content
                      }}
                    </span>
                  </v-tooltip>
                </div>
              </div>
            </div>

            <!-- Date Pickers: Dynamically Generated Date Selectors with Validation -->
            <div
              v-for="(dateField, index) in dynamicDateFields"
              :key="dateField.id"
              class="date-field-container"
              v-click-outside="() => closeDatePicker(dateField)"
            >
              <!-- Date Picker Field -->
              <v-text-field
                v-model="dateField.value"
                :label="formatDateLabel(dateField.id)"
                @focus="showDatePickerForField(dateField, index)"
                variant="solo"
                readonly
                :error="dateErrors[index]"
                :error-messages="dateErrors[index] ? 'Please select a date.' : ''"
              />

              <!-- Hyperlink Button with Tooltip -->
              <v-tooltip
                v-if="tooltipTags[`button_tooltip:${dateField.id}`]?.content"
                bottom
              >
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    v-if="dateField.hyperlink"
                    icon
                    color="teal-darken-4"
                    @click="navigateTo(dateField.hyperlink.url)"
                    class="hyperlink-button"
                  >
                    <v-icon>mdi-link</v-icon>
                  </v-btn>
                </template>
                <!-- Render Tooltip Content Based on Type -->
                <template v-if="tooltipTags[`button_tooltip:${dateField.id}`]?.type === 'text'">
                  {{ tooltipTags[`button_tooltip:${dateField.id}`]?.content }}
                </template>
                <a
                  v-else-if="tooltipTags[`button_tooltip:${dateField.id}`]?.type === 'url'"
                  :href="tooltipTags[`button_tooltip:${dateField.id}`]?.content"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Link
                </a>
                <img
                  v-else-if="tooltipTags[`button_tooltip:${dateField.id}`]?.type === 'image'"
                  :src="tooltipTags[`button_tooltip:${dateField.id}`]?.content"
                  alt="Tooltip Image"
                  class="tooltip-image"
                  style="max-width: 200px; max-height: 200px;"
                />
              </v-tooltip>

              <!-- Date Picker Component: Displays Calendar for Date Selection -->
              <v-date-picker
                v-if="dateField.showDatePicker"
                v-model="dateField.selectedDate"
                @update:model-value="(newDate) => updateDynamicDateField(dateField, index, newDate)"
                color="blue-grey-lighten-1"
                elevation="24"
                :rounded="'30px'"
                style="width: 810px;"
              />
            </div>

            <!-- Next Button with Tooltip: Proceeds to Next Step if All Fields Are Filled -->
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
              <span v-if="!allFieldsFilled">Please fill in all fields before proceeding.</span>
            </v-tooltip>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </AppBarLayout>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, computed, watch, defineComponent } from 'vue';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { useStore } from 'vuex';
import { format } from 'date-fns';
import { fetchTemplateAndParseData, fetchDateFields } from '@/utils/utility.js';
import axios from 'axios';
import AppBarLayout from '@/components/AppBarLayout.vue';

// Initialize dropdownIdCounter outside the setup to maintain its state across re-renders
let dropdownIdCounter = 0;

export default defineComponent({
  name: 'InputFieldsPage',
  components: {
    AppBarLayout, // Register the layout component
  },

  directives: {
    clickOutside: {
      // Custom directive to detect clicks outside the bound element
      beforeMount(el, binding) {
        el.clickOutsideEvent = function (event) {
          // Use setTimeout to allow the click event that opened the date picker to complete
          setTimeout(() => {
            if (!(el === event.target || el.contains(event.target))) {
              binding.value(event);
            }
          }, 0);
        };
        document.addEventListener('click', el.clickOutsideEvent);
      },
      unmounted(el) {
        document.removeEventListener('click', el.clickOutsideEvent);
      },
    },
  },

  setup() {
    const router = useRouter();
    const store = useStore();

    // -------------------------
    // 1. State Variables
    // -------------------------
    const inputErrors = ref({});
    const dropdownErrors = ref({});
    const dateErrors = ref({});

    const dynamicInputs = ref([]);
    const dropdownMenus = ref([]);
    const dynamicDateFields = ref([]);

    const sectionsHierarchy = ref([]); // Holds the parsed hierarchy

    

    const focusedInput = ref(null); // Track the currently focused input field

    const onInputFocus = (input) => {
      focusedInput.value = input.id; // Set the focused input
      console.log(`Tooltip for ${input.id}: ${tooltipTags.value[`input_tooltip:${input.id}`]?.content || "No tooltip available"}`);
    };

    const onInputBlur = () => {
      focusedInput.value = null; // Clear the focused input when blur event occurs
    };

    // -------------------------
    // 2. Computed Properties
    // -------------------------
    const tooltipTags = computed(() => store.getters['getTooltipTags'] || {});

    const allFieldsFilled = computed(() => {
      const inputsFilled = dynamicInputs.value.every((input, index) => {
        let filled = true;

        if (input.type === 'range') {
          // Check both min and max values for range inputs
          const minFilled = input.min.value && input.min.value.trim() !== '';
          const maxFilled = input.max.value && input.max.value.trim() !== '';
          filled = minFilled && maxFilled;

          // Update error states for min and max
          input.min.error = !minFilled;
          input.max.error = !maxFilled;
        } else {
          // Check single value for other inputs
          filled = input.value && input.value.trim() !== '';
        }

        inputErrors.value[index] = !filled; // Update error state
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


    // -------------------------
    // 3. Utility Functions
    // -------------------------
    const formatDropdownLabel = (dropdownTitle) =>
      dropdownTitle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const formatDateLabel = (dateFieldId) =>
      dateFieldId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const getYear = (dateInput) => new Date(dateInput).getFullYear();

    const getQuarter = (dateInput) => {
      const month = new Date(dateInput).getMonth() + 1;
      if (month <= 3) return 'Q1';
      if (month <= 6) return 'Q2';
      if (month <= 9) return 'Q3';
      return 'Q4';
    };

    const navigateTo = (url) => window.open(url, '_blank'); // Handle hyperlink clicks
    const sanitizeInput = (input) => {
      if (!input || typeof input.value !== 'string') return;

      const isNumericInput =
        input.type === 'number' ||
        input.type === 'range_minimum' ||
        input.type === 'range_maximum';

      if (!isNumericInput) return;

      input.value = input.value.replace(/[^\d.-]/g, '');
    };
    console.log('This is the content of tooltipTags',tooltipTags)
    const checkInputTooltip = (inputId) => {
      const tooltip = tooltipTags.value[`input_tooltip:${inputId}`];
      console.log(`Tooltip for input "${inputId}":`, tooltip || 'No tooltip found');
      return tooltip;
    };

    const isValidDropdownOption = (option) => {
      return !!option && typeof option === 'object' && typeof option.label === 'string';
    };

    const normalizeDropdownMenus = (menus) => {
      if (!Array.isArray(menus)) return [];

      return menus
        .map((dropdown) => {
          if (!dropdown || typeof dropdown !== 'object') return null;
          if (typeof dropdown.id !== 'string' || typeof dropdown.title !== 'string') return null;
          if (!Array.isArray(dropdown.options)) return null;

          const options = dropdown.options
            .filter(isValidDropdownOption)
            .map((option) => ({
              ...option,
              children: Array.isArray(option.children) ? option.children : [],
            }));

          if (options.length !== dropdown.options.length) return null;

          const selectedOption =
            typeof dropdown.selectedOption === 'string' &&
            options.some((option) => option.label === dropdown.selectedOption)
              ? dropdown.selectedOption
              : '';

          return {
            ...dropdown,
            options,
            selectedOption,
            isNested: Boolean(dropdown.isNested),
          };
        })
        .filter(Boolean);
    };

    const dummyUseOfIndex = () => {
      // Placeholder function, implement as needed
    };

    // -------------------------
    // 4. Watchers
    // -------------------------
    watch(tooltipTags, () => {
      console.log('--- Tooltip Tags Updated ---');
      console.log(JSON.stringify(tooltipTags.value, null, 2));
      console.log('-----------------------------');

      dynamicInputs.value.forEach((input) => {
        const inputTooltip = tooltipTags.value[`input_tooltip:${input.id}`];
        console.log(`Tooltip for input "${input.id}":`, inputTooltip || 'No tooltip found');
        console.log(`Checking input tooltip for ID "${input.id}" and label "${input.label}"`);

      });

      dropdownMenus.value.forEach((dropdown) => {
        if (!dropdown || typeof dropdown.title !== 'string') return;

        // Transform "Scope Of Work" into "Scope_Of_Work"
        const normalizedTitle = dropdown.title
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('_');

        const buttonTooltipKey = `dropdown_button_tooltip:Select_${normalizedTitle}`;
        const buttonTooltip = tooltipTags.value[buttonTooltipKey];
        console.log(
          `Tooltip for dropdown "${dropdown.id}":`,
          buttonTooltip || 'No button tooltip found'
        );

        if (buttonTooltip) {
          dropdown.buttonTooltip = buttonTooltip;
        }

        const dropdownOptions = Array.isArray(dropdown.options) ? dropdown.options : [];
        dropdownOptions.forEach((option) => {
          const optionTooltip = tooltipTags.value[`input_tooltip:${option.id}`];
          console.log(
            `Tooltip for dropdown option "${option.id}":`,
            optionTooltip ? optionTooltip.content : 'No tooltip found'
          );

          if (optionTooltip) {
            option.tooltip = optionTooltip;
          }
        });
      });

      console.log('Updated Dropdown Menus with Tooltips:', JSON.stringify(dropdownMenus.value, null, 2));
    });



    // -------------------------
    // 5. Dynamic Data Handling
    // -------------------------
    const loadPersistedValues = () => {
      // Clear local states to force reactivity
      dynamicInputs.value = [];
      dropdownMenus.value = [];
      dynamicDateFields.value = [];

      // Populate dynamic input values from Vuex
      dynamicInputs.value = store.state.dynamicInputs.map((input) => ({
        ...input,
        value: store.state.dynamicInputs.find((stateInput) => stateInput.id === input.id)?.value || '',
      }));

      // Populate dropdown menus from Vuex, but only if schema-safe for this page
      const persistedDropdownMenus = Array.isArray(store.state.dropdownMenus)
        ? store.state.dropdownMenus
        : [];
      const normalizedDropdownMenus = normalizeDropdownMenus(persistedDropdownMenus);
      const hasMalformedDropdownState =
        persistedDropdownMenus.length > 0 &&
        normalizedDropdownMenus.length !== persistedDropdownMenus.length;

      if (hasMalformedDropdownState) {
        console.warn('Malformed persisted dropdown state detected. Falling back to template reload.');
      }

      dropdownMenus.value = normalizedDropdownMenus;

      // Populate dynamic date fields from Vuex
      dynamicDateFields.value = store.state.dynamicDateFields.map((dateField) => {
        const persistedField =
          store.state.dynamicDateFields.find((stateDate) => stateDate.id === dateField.id) || {};
        return {
          ...dateField,
          value: persistedField.value || '',
          year: persistedField.year || '',
          quarter: persistedField.quarter || '',
          showDatePicker: false,
          hyperlink: dateField.hyperlink || null, // Include hyperlink if exists
        };
      });

      return { hasMalformedDropdownState };
    };

    const handleMainDropdownChange = (value, changedDropdown, dropdownIndex) => {
  console.log(`--- Dropdown Change Triggered ---`);
  console.log(`Dropdown ID: ${changedDropdown?.id}`);
  console.log(`Dropdown Index: ${dropdownIndex}`);
  console.log(`Selected Value: ${value}`);
  console.log(`Current Dropdown State:`, JSON.stringify(changedDropdown, null, 2));

  if (typeof changedDropdown !== 'object' || changedDropdown === null) {
    console.error(`Invalid changedDropdown:`, changedDropdown);
    return;
  }

  // Update the selectedOption
  changedDropdown.selectedOption = value;

  const dropdownOptions = Array.isArray(changedDropdown.options) ? changedDropdown.options : [];
  if (!Array.isArray(changedDropdown.options)) {
    console.error(`Dropdown options are malformed for dropdown: ${changedDropdown.id}`);
    dropdownMenus.value.splice(dropdownIndex + 1);
    return;
  }

  const selectedOption = dropdownOptions.find(
    (option) => option.label === value
  );

  if (!selectedOption) {
    console.log(`No option selected for dropdown ${changedDropdown.id}`);
    dropdownMenus.value.splice(dropdownIndex + 1); // Clear child dropdowns
    return;
  }

  // Log the selected parent option
  const parentKey = `${changedDropdown.title.replace(/ /g, '_')}_${value}`;
  console.log(`Parent Option Set to True: ${parentKey}: true`);

  // Remove all dropdowns after the current dropdown
  console.log(`Clearing child dropdowns starting from index ${dropdownIndex + 1}`);
  dropdownMenus.value.splice(dropdownIndex + 1);

  // Handle nested dropdowns if children exist
  if (selectedOption.children && selectedOption.children.length > 0) {
    dropdownIdCounter += 1;

    const newDropdown = {
      id: `dropdown-${dropdownIdCounter}`, // Unique ID
      title: selectedOption.children[0].title || 'Select Option', // Title for the new dropdown
      options: selectedOption.children.map((child) => ({
        id: `option-${dropdownIdCounter}-${child.menu}`, // Unique option ID
        label: child.menu,
        children: child.children || [],
      })),
      selectedOption: null, // No option selected initially
      isNested: true, // Mark as nested dropdown
    };

    dropdownMenus.value.push(newDropdown);

    console.log(`Child Dropdown Added:`);
    console.log(`New Dropdown:`, JSON.stringify(newDropdown, null, 2));
    console.log(`Updated Dropdown Menus:`, JSON.stringify(dropdownMenus.value, null, 2));
  }

  const dataModel = dropdownMenus.value.reduce((model, dropdown) => {
  // Preserve underscores in dropdown title
  const dropdownTitle = dropdown.title.replace(/ /g, '_');

  const selectedOption = dropdown.selectedOption || null;

  if (selectedOption) {
    // Construct the key for selected option
    const selectedKey = dropdown.isNested
      ? `Nested_select_${dropdownTitle} ${selectedOption}` // Preserve spaces in option
      : `Select_${dropdownTitle} ${selectedOption}`; // Preserve spaces in option

    model[selectedKey] = true;
  }

  // Process all options for the dropdown
  const options = Array.isArray(dropdown.options) ? dropdown.options : [];
  options.forEach((option) => {
    const optionLabel = option.label; // Keep spaces in option labels
    const optionKey = dropdown.isNested
      ? `Nested_select_${dropdownTitle} ${optionLabel}` // Preserve spaces in option
      : `Select_${dropdownTitle} ${optionLabel}`; // Preserve spaces in option

    // Set to false for unselected options
    if (!selectedOption || optionLabel !== selectedOption) {
      model[optionKey] = false;
    }
  });

  return model;
}, {});




  console.log(`--- Current Data Model ---`);
  console.log(JSON.stringify(dataModel, null, 2));

  // Dispatch to Vuex
  console.log(`Dispatching Data Model to Vuex...`);
  store.dispatch('updateSelectedOptions', dataModel);
  console.log(`Data Model Dispatched Successfully`);

  console.log(`--- Dropdown Change Handling Complete ---`);
};


const loadTemplateInputs = async () => {
  console.log('Executing loadTemplateInputs function...');
  
  const { fileId, bucketName } = store.state.selectedTemplate;

  if (!fileId || !bucketName) {
    alert('Invalid template selection. Please select a valid template.');
    router.push({ name: 'userOptionsPage' });
    return;
  }

  // Retrieve the userId from Vuex
  const userId = store.state.user?._id;
  console.log('User id:', userId);
  if (!userId) {
    console.error('User ID not found in Vuex state.');
    alert('User not authenticated. Please log in again.');
    router.push({ name: 'loginPage' });
    return;
  }

  // Clear existing data
  dynamicInputs.value = [];
  dropdownMenus.value = [];
  dynamicDateFields.value = [];

  try {
    console.log('Fetching template content...');
    const response = await axios.get('/api/files/fetch-template-content', {
      params: { fileId, bucketName, userId },
      responseType: 'arraybuffer',
    });
    console.log('Fetched Template Content (Raw):', response.data);

    // Parse template data
    const parsedData = await fetchTemplateAndParseData(response.data, store);
    const parsedDateFields = await fetchDateFields(response.data);

    console.log('Parsed Template Data (Full):', parsedData);
    console.log('Parsed Date Fields:', parsedDateFields);

    // Assign parsed data to local state
    dynamicInputs.value = parsedData.inputs || [];
    console.log('Initial Dynamic Inputs:', JSON.stringify(dynamicInputs.value, null, 2));

    // Handle toggle tags
    const toggleTags = parsedData.toggles || [];
    console.log('Parsed Toggle Tags:', toggleTags);

    // Dispatch toggleTags to Vuex
    store.dispatch('saveToggleTags', toggleTags);
    console.log('Dispatched toggleTags to Vuex:', toggleTags);

    // Handle hierarchical sections
    const hierarchy = parsedData.sections || [];
    sectionsHierarchy.value = hierarchy;
    console.log('Parsed Hierarchy:', JSON.stringify(sectionsHierarchy.value, null, 2));

    // Initialize dropdownMenus with main dropdown(s)
    const groupedByTitle = {};
    hierarchy.forEach((item) => {
      if (!groupedByTitle[item.title]) {
        groupedByTitle[item.title] = [];
      }
      groupedByTitle[item.title].push(item);
    });

    dropdownMenus.value = Object.keys(groupedByTitle).map((title) => {
      dropdownIdCounter += 1; // Increment for unique ID
      return {
        id: `dropdown-${dropdownIdCounter}`, // Unique dropdown ID
        title: title,
        options: groupedByTitle[title].map((option) => ({
          id: `option-${dropdownIdCounter}-${option.menu}`, // Unique option ID
          label: option.menu,
          children: option.children || [],
          content: option.content || '',
        })),
        selectedOption: null,
        isNested: false, // Mark as parent dropdown
      };
    });

    console.log('--- Dropdown Menus Initialized ---');
    console.log(JSON.stringify(dropdownMenus.value, null, 2));

    // --- Add Hyperlinks to Dropdowns ---
    const hyperlinkTags = parsedData.hyperlinkTags || {};
    console.log('Hyperlink Tags:', hyperlinkTags);

    dynamicInputs.value.forEach((input) => {
      const hyperlinkKey = `hyperlink:${input.id || input.label.toLowerCase().replace(/\s+/g, '_')}`;
      if (hyperlinkTags[hyperlinkKey]) {
        input.hyperlink = hyperlinkTags[hyperlinkKey];
      } else {
        console.warn(`No hyperlink found for input: ${input.id || input.label}`);
      }
    });

        // Parse tooltip tags
        const tooltipTags = parsedData.tooltipTags || {};
    dynamicInputs.value.forEach((input) => {
      const inputTooltipKey = `input_tooltip:${input.id || input.label.toLowerCase().replace(/\s+/g, '_')}`;
      const buttonTooltipKey = `button_tooltip:${input.id || input.label.toLowerCase().replace(/\s+/g, '_')}`;

      // Attach input tooltip
      if (tooltipTags[inputTooltipKey]) {
        input.inputTooltip = tooltipTags[inputTooltipKey];
      } else {
        console.warn(`No input tooltip found for input: ${input.id || input.label}`);
      }

            // Attach button tooltip
            if (tooltipTags[buttonTooltipKey]) {
        input.buttonTooltip = tooltipTags[buttonTooltipKey];
      } else {
        console.warn(`No button tooltip found for input: ${input.id || input.label}`);
      }
    });

        // Parse range inputs for button tooltips
        dynamicInputs.value.filter((input) => input.type === 'range').forEach((rangeInput) => {
      const buttonTooltipKey = `button_tooltip:${rangeInput.label.toLowerCase().replace(/\s+/g, '_')}`;
      if (tooltipTags[buttonTooltipKey]) {
        rangeInput.buttonTooltip = tooltipTags[buttonTooltipKey];
      } else {
        console.warn(`No button tooltip found for range input: ${rangeInput.label}`);
      }
    });



    

    dropdownMenus.value.forEach((dropdown) => {
      // Adjust key construction to match the structure in hyperlinkTags
      const normalizedTitle = dropdown.title.toLowerCase().replace(/\s+/g, '_');
      const potentialKeys = [
        `hyperlink:${normalizedTitle}`,        // Match exact title normalization
        `hyperlink:select_${normalizedTitle}`, // Handle prefixes like "select_"
      ];

      // Find the first key that exists in hyperlinkTags
      const hyperlinkKey = potentialKeys.find((key) => hyperlinkTags[key]);

      if (hyperlinkKey) {
        dropdown.hyperlink = hyperlinkTags[hyperlinkKey];
      } else {
        console.warn(`No matching hyperlink found for dropdown: ${dropdown.title}`);
      }
    });

    console.log('Updated Dropdown Menus with Hyperlinks:', dropdownMenus.value);

    // Handle sections
    console.log('Section Tags:', parsedData.sectionTags);
    store.dispatch('updateSections', parsedData.sections || {});

    // Handle date fields
    dynamicDateFields.value = parsedDateFields.dateFields.map((dateField) => ({
      ...dateField,
      value: '',
      year: '',
      quarter: '',
      showDatePicker: false,
      hyperlink: dateField.hyperlink || null,
    }));

    console.log('--- Dynamic Inputs ---');
    console.log(JSON.stringify(dynamicInputs.value, null, 2));
    console.log('--- Dropdown Menus ---');
    console.log(JSON.stringify(dropdownMenus.value, null, 2));
    console.log('--- Dynamic Date Fields ---');
    console.log(JSON.stringify(dynamicDateFields.value, null, 2));

    // Dispatch updates to Vuex store
    console.log('Dispatching toolbarPlaceholders to Vuex:', parsedData.tooltipPlaceholders || {});
    store.dispatch('saveToolbarPlaceholders', parsedData.tooltipPlaceholders || {});
    store.dispatch('saveHyperlinkTags', parsedData.hyperlinkTags || {});
    store.dispatch('saveTooltipTags', parsedData.tooltipTags || {});
    store.dispatch('saveTooltipPlaceholders', parsedData.tooltipPlaceholders || {});
    store.dispatch('saveTableData', parsedData.tables || {});

    console.log('All parsed data dispatched to Vuex.');

    // --- Start of Grouping Range Inputs ---
    console.log('Starting Grouping Logic for Range Inputs...');
    const groupedInputs = [];
    const rangeGroups = {};

    console.log('Dynamic Inputs Before Grouping:', JSON.stringify(dynamicInputs.value, null, 2));

    dynamicInputs.value.forEach((input) => {
      if (input.type === 'range_minimum' || input.type === 'range_maximum') {
        console.log('Processing Range Input:', input);
        const baseLabel = input.label.replace(/Minimum |Maximum /, '').toLowerCase();
        if (!rangeGroups[baseLabel]) {
          rangeGroups[baseLabel] = { min: null, max: null, order: input.order };
        }
        if (input.type === 'range_minimum') {
          rangeGroups[baseLabel].min = input;
        } else {
          rangeGroups[baseLabel].max = input;
        }
      } else {
        groupedInputs.push(input); // Keep other inputs as-is
      }
    });
    console.log('Range Groups:', JSON.stringify(rangeGroups, null, 2));

    // Convert grouped range inputs into a unified structure
    Object.values(rangeGroups).forEach((group) => {
      if (group.min && group.max) {
        groupedInputs.push({
          type: 'range',
          label: group.min.label.replace('Minimum ', ''), // Use a base label for the range
          min: group.min,
          max: group.max,
          order: group.order,
        });
      }
    });
    console.log('Unified Range Inputs:', JSON.stringify(groupedInputs, null, 2));

    // Assign grouped inputs back to dynamicInputs
    dynamicInputs.value = groupedInputs.sort((a, b) => a.order - b.order);
    console.log('Final Transformed Dynamic Inputs:', JSON.stringify(dynamicInputs.value, null, 2));
    // --- End of Grouping Range Inputs ---

  } catch (error) {
    console.error('Error during template loading:', error);
    alert('Failed to load dynamic input fields. Please try again later.');
  }
};


      // -------------------------
      // 6. Event Handlers
      // -------------------------
      const updateDynamicDateField = (dateField, index, newDate) => {
        if (!dateField || !(newDate instanceof Date)) return;

        const formattedDate = format(newDate, 'yyyy-MM-dd');
        dateField.value = formattedDate;
        dateField.year = getYear(formattedDate);
        dateField.quarter = getQuarter(formattedDate);
        dateField.showDatePicker = false;

        store.dispatch('updateDynamicDateField', dateField);
        console.log(`Date Field Updated: ${dateField.id}`, dateField);
      };

      const showDatePickerForField = (dateField) => {
        if (!dateField) return;
        if (!dateField.selectedDate) dateField.selectedDate = new Date();
        dateField.showDatePicker = true;
        console.log(`Showing date picker for: ${dateField.id}`);
      };

      const closeDatePicker = (dateField) => {
        if (dateField.showDatePicker) {
          dateField.showDatePicker = false;
          console.log(`Closing date picker for: ${dateField.id}`);
        }
      };

  const navigateToDynamicTablePage = async () => {
    if (!allFieldsFilled.value) {
      alert('Please fill in all fields before proceeding.');
      return;
    }

  // Prepare dynamic data
  const dynamicData = dynamicInputs.value.map((input) => {
    const { order, ...rest } = input;

    // Log individual input values for debugging
    if (input.type === 'range') {
      console.log(`Range Input Field - ${input.label}: Min Value = ${input.min.value}, Max Value = ${input.max.value}`);
    } else {
      console.log(`Input Field - ${input.label}: Value = ${input.value}`);
    }

    return order !== undefined ? { ...rest, order } : rest;
  });

  console.log('Prepared Dynamic Data:', JSON.stringify(dynamicData, null, 2));

  const dropdownData = normalizeDropdownMenus(dropdownMenus.value);

  console.log('Prepared Dropdown Data:', JSON.stringify(dropdownData, null, 2));

  const dateData = dynamicDateFields.value.map((dateField) => ({
    id: dateField.id,
    value: dateField.value,
    year: dateField.year,
    quarter: dateField.quarter,
  }));

  console.log('Prepared Date Data:', JSON.stringify(dateData, null, 2));


  const dataModel = dropdownMenus.value.reduce((model, dropdown) => {
    const dropdownTitle = dropdown.title.replace(/ /g, '_');
    const selectedOption = dropdown.selectedOption || null;

    if (selectedOption) {
      const selectedKey = dropdown.isNested
        ? `Nested_select_${dropdownTitle} ${selectedOption}`
        : `Select_${dropdownTitle} ${selectedOption}`;
      model[selectedKey] = true;
    }

    const dropdownOptions = Array.isArray(dropdown.options) ? dropdown.options : [];
    dropdownOptions.forEach((option) => {
      const optionLabel = option.label;
      const optionKey = dropdown.isNested
        ? `Nested_select_${dropdownTitle} ${optionLabel}`
        : `Select_${dropdownTitle} ${optionLabel}`;

      if (!selectedOption || optionLabel !== selectedOption) {
        model[optionKey] = false;
      }
    });

    return model;
  }, {});

  console.log('Final Data Model:', JSON.stringify(dataModel, null, 2));

  // Dispatch to Vuex
  store.dispatch('updateSelectedOptions', dataModel);
  console.log('Data Model Dispatched Successfully.');

  store.dispatch('updateDynamicInputs', dynamicData);
  store.dispatch('updateDropdownMenus', dropdownData);
  store.dispatch('setDynamicDateFields', dateData);

  try {
    const { fileId, bucketName } = store.state.selectedTemplate;
    const userId = store.state.user?._id;

    if (!userId) {
      throw new Error('User ID is missing in Vuex state. Ensure login is successful.');
    }

    // Send dataModel to backend for processing
    console.log('Sending dataModel to backend...');
    const token = localStorage.getItem('jwtToken');
    const response = await axios.post('/api/files/process-dropdown-logic', {
      dataModel, 
      fileId,
      bucketName,
      userId,
      allTags: store.state.allTags,
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 200) {
      console.log('Dropdown logic applied, and document saved to GridFS.');
      store.commit('setModifiedFileId', response.data.modifiedFileId);
      store.commit('setTempBucketName', response.data.tempBucketName);
      store.commit('setModifiedFilename', response.data.modifiedFilename);
      // Phase 1 stabilization: canonical post-dropdown working artifact identity
      store.dispatch('setWorkingDocumentArtifact', {
        fileId: response.data.modifiedFileId,
        bucketName: response.data.tempBucketName,
        source: fileId,
      });
      router.push({ name: 'dynamicTablePage' });
    } else {
      throw new Error('Failed to process the document.');
    }
  } catch (error) {
    console.error('Error processing dropdown logic:', error);
    alert('An error occurred while preparing the document. Please try again.');
  }
};



    // -------------------------
    // 7. Lifecycle Hooks
    // -------------------------
    onMounted(async () => {
      const { hasMalformedDropdownState } = loadPersistedValues();
      const selectedTemplate = store.state.selectedTemplate;

      // Redirect to UserOptionsPage if no template is selected
      if (!selectedTemplate) {
        router.push({ name: 'userOptionsPage' });
        return;
      }

      // Check if navigating back and Vuex already holds values
      const hasPersistedValues =
        store.state.dynamicInputs.length > 0 ||
        store.state.dropdownMenus.length > 0 ||
        store.state.dynamicDateFields.length > 0;

      if (!store.state.isNavigatingBack || !hasPersistedValues || hasMalformedDropdownState) {
        await loadTemplateInputs();
      } else {
        loadPersistedValues(); // Populate fields with values from Vuex
      }

      store.commit('setNavigatingBack', false);
    });

    onBeforeUnmount(() => {
      // No need to remove global listener since we use a directive
      // If you still have it, remove it here
    });

    onBeforeRouteLeave((to, from, next) => {
      store.commit('setNavigatingBack', true);
      next();
    });

    // -------------------------
    // 8. Return Statement
    // -------------------------
    return {
      router,
      store,
      dynamicInputs,
      dropdownMenus,
      dynamicDateFields,
      inputErrors,
      dropdownErrors,
      dateErrors,
      tooltipTags, // Make it available in the template
      navigateToDynamicTablePage,
      formatDropdownLabel,
      checkInputTooltip,
      // For dynamic date pickers
      updateDynamicDateField,
      showDatePickerForField,
      closeDatePicker,
      dummyUseOfIndex,
      formatDateLabel,
      allFieldsFilled,
      onInputFocus, // Make available in the template
      navigateTo,
      sanitizeInput,
      onInputBlur,

      handleMainDropdownChange, // Make available in the template
      
    };
  },
});
</script>

<style scoped>
.main-content {
  padding-top: 64px; /* Adjusted based on the actual height of the v-app-bar */
  margin: 0; /* Remove any margin to avoid extra spacing */
}

.v-container {
  padding-top: 16px; /* Adjust the padding inside the container */
}

/* Container for input fields with hyperlinks */
.input-field-container,
.dropdown-field-container,
.date-field-container {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap; /* Allow wrapping on smaller screens */
}

/* Specific styling for range inputs */
.input-field-range {
  width: 100%;
}

.input-field-range label {
  flex: 0 0 100%;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

/* Styling for labels */
.input-label {
  margin-bottom: 8px; /* Add spacing between label and input field */
  font-size: 0.9rem; /* Adjust the font size */
  font-weight: 500; /* Make the label more prominent */
  color: #333; /* Set a default color */
  width: 100%; /* Ensure the label takes the full width */
}

/* Styling for input fields */
.input-field {
  flex: 1 1 auto; /* Allow the input to grow and take available space */
  max-width: 100%; /* Prevent overflow */
  margin-right: 0; /* Reset margin */
}

/* Range separator styling */
.range-separator {
  margin: 0 8px;
  align-self: center;
}

/* Hyperlink Button */
.hyperlink-button {
  margin-left: 8px;
  display: flex; /* Ensure the button respects alignment */
  align-items: center; /* Vertically center the icon inside the button */
  justify-content: center; /* Center the icon horizontally */
  height: 36px; /* Match the height of the text field */
  width: 36px; /* Ensure square button for alignment */
}

/* Tooltip Image Styling */
.tooltip-image {
  max-width: 600px;
  max-height: 1000px;
  width: auto;
  height: auto;
  display: block; /* Ensures proper spacing */
  margin: 10px auto; /* Centers the image */
}

/* Vertical Container for Default Input Fields */
.input-field-container-vertical {
  display: flex;
  flex-direction: column; /* Align items vertically */
  align-items: flex-start; /* Align label to the left */
  margin-bottom: 20px; /* Keep spacing consistent */
  width: 100%; /* Ensure the container takes full width */
}

/* Container that holds input field and hyperlink button */
.input-with-button {
  display: flex;
  align-items: center; /* Vertically center the input and button */
  width: 100%; /* Ensure full width */
}

.input-with-button .input-field {
  flex: 1; /* Input takes available space */
  margin-right: 8px; /* Space between input and button */
}

.input-with-button .hyperlink-button {
  flex: 0 0 auto; /* Prevent the button from growing */
  /* The height and width are already set in .hyperlink-button */
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .input-field-container,
  .dropdown-field-container,
  .date-field-container {
    flex-direction: column; /* Stack inputs vertically on smaller screens */
  }

  .hyperlink-button {
    margin-left: 0;
    margin-top: 8px; /* Space above button when stacked */
    align-self: flex-start; /* Align button to the start */
  }

  .input-with-button {
    flex-direction: column;
    align-items: flex-start;
  }

  .input-with-button .input-field {
    margin-right: 0;
    margin-bottom: 8px;
    width: 100%; /* Ensure full width on small screens */
  }

  .input-with-button .hyperlink-button {
    margin-top: 0; /* Remove top margin */
  }
}

/* Deep Selectors to Override Vuetify's Scoped Styles */
.input-field-container-vertical >>> .v-text-field,
.input-field-container >>> .v-text-field,
.input-with-button >>> .v-text-field {
  width: 100%;
}

.input-field-container-vertical >>> .v-label,
.input-field-container >>> .v-label {
  width: 100%;
}

/* Optional: Style for debugging tooltip missing */
p {
  color: red;
  font-size: 0.8em;
}
</style>
