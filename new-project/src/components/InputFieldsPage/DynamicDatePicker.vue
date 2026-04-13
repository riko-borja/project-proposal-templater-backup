<template>
  <div class="date-field-container">
    <v-text-field
      v-model="localValue"
      :label="formatLabel(dateField.id)"
      @focus="showDatePicker"
      variant="solo"
      readonly
      :error="dateField.error"
      :error-messages="dateField.error ? 'Please select a date.' : ''"
    />

    <v-tooltip bottom>
      <template v-slot:activator="{ props }">
        <v-btn
          v-if="dateField.hyperlink"
          icon
          v-bind="props"
          color="teal-darken-4"
          @click="navigateTo(dateField.hyperlink.url)"
          class="hyperlink-button"
        >
          <v-icon>mdi-link</v-icon>
        </v-btn>
      </template>
      <!-- Tooltip Renderer for Hyperlink Button -->
      <TooltipRenderer
        v-if="tooltipTags[`button_tooltip:${dateField.id}`]"
        :content="tooltipTags[`button_tooltip:${dateField.id}`]?.content || 'No tooltip available.'"
        :type="tooltipTags[`button_tooltip:${dateField.id}`]?.type || 'text'"
      />
    </v-tooltip>

    <v-date-picker
      v-if="showPicker"
      v-model="localDate"
      @update:model-value="onDateSelected"
      color="blue-grey-lighten-1"
      elevation="24"
      style="width: 810px;"
    />
  </div>
</template>

<script>
import TooltipRenderer from './TooltipRenderer.vue';

export default {
  props: {
    dateField: {
      type: Object,
      required: true,
    },
    index: {
      type: Number,
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
      localValue: this.dateField.value || '',
      localDate: this.dateField.selectedDate || null,
      showPicker: false,
    };
  },
  methods: {
    formatLabel(id) {
      return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    },
    showDatePicker() {
      this.showPicker = true;
    },
    onDateSelected(newDate) {
      const formattedDate = new Date(newDate).toISOString().split('T')[0];
      this.localValue = formattedDate;
      this.$emit('updateDate', {
        id: this.dateField.id,
        value: formattedDate,
        year: new Date(formattedDate).getFullYear(),
        quarter: Math.ceil((new Date(formattedDate).getMonth() + 1) / 3),
      });
      this.showPicker = false;
    },
    navigateTo(url) {
      window.open(url, '_blank'); // Opens the link in a new tab
    },
  },
  watch: {
    dateField: {
      immediate: true,
      handler(newVal) {
        this.localValue = newVal.value || '';
        this.localDate = newVal.selectedDate || null;
      },
    },
  },
  mounted() {
    console.log('DynamicDatePicker Tooltip Tags:', this.tooltipTags);
    console.log(`Resolved Button Tooltip for ${this.dateField.id}:`, this.tooltipTags[`button_tooltip:${this.dateField.id}`]);
  },
};
</script>

<style scoped>
.date-field-container {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}
</style>
