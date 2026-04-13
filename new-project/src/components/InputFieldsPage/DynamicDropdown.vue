<template>
  <div class="dropdown-field-container">
    <v-select
      v-model="localSelectedOption"
      :items="dropdown.options"
      item-title="label"
      item-value="label"
      :label="dropdown.label"
      variant="solo"
      clearable
      @change="onOptionChange"
    >
      <template v-slot:default="{ props }">
        <v-list>
          <v-list-item
            v-for="option in dropdown.options"
            :key="option.label"
            @click="props.select(option.label)"
            class="dropdown-option-container"
          >
            <span>{{ option.label }}</span>
            <!-- Tooltip Renderer for Dropdown Options -->
            <TooltipRenderer
              v-if="tooltipTags[`input_tooltip:${option.label}`]"
              :content="tooltipTags[`input_tooltip:${option.label}`]?.content || 'No description available.'"
              :type="tooltipTags[`input_tooltip:${option.label}`]?.type || 'text'"
            />
          </v-list-item>
        </v-list>
      </template>
    </v-select>
  </div>
</template>

<script>
import TooltipRenderer from './TooltipRenderer.vue';

export default {
  props: {
    dropdown: {
      type: Object,
      required: true,
    },
    tooltipTags: { // New prop for tooltipTags
      type: Object,
      default: () => ({}), // Default to an empty object
    },
  },
  components: {
    TooltipRenderer,
  },
  data() {
    return {
      localSelectedOption: this.dropdown.selectedOption || '',
    };
  },
  methods: {
    onOptionChange() {
      this.$emit('updateDropdown', {
        id: this.dropdown.id,
        selectedOption: this.localSelectedOption,
      });
    },
  },
  watch: {
    dropdown: {
      immediate: true,
      handler(newVal) {
        this.localSelectedOption = newVal.selectedOption || '';
      },
    },
  },
  mounted() {
    console.log('DynamicDropdown Tooltip Tags:', this.tooltipTags);
    this.dropdown.options.forEach(option => {
      console.log(`Resolved Tooltip for Dropdown Option "${option.label}":`, this.tooltipTags[`input_tooltip:${option.label}`]);
    });
  },
};
</script>

<style scoped>
.dropdown-field-container {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}
</style>
