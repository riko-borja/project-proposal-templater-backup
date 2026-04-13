<template>
  <div class="input-field-container">
    <v-text-field
      v-model="localValue"
      :label="input.label"
      clearable
      variant="solo"
      :error="!!inputErrors[index]"
      :error-messages="inputErrors[index] ? 'This field is required.' : ''"
      @focus="emitInputFocus"
      @blur="emitInputBlur"
    >
      <!-- Tooltip Renderer for Input Fields -->
      <template v-if="tooltipTags && tooltipTags[`input_tooltip:${input.id}`]" v-slot:append-inner>
        <TooltipRenderer
          :content="tooltipTags[`input_tooltip:${input.id}`]?.content || 'No tooltip available.'"
          :type="tooltipTags[`input_tooltip:${input.id}`]?.type || 'text'"
        />
      </template>
    </v-text-field>

    <!-- Hyperlink Button/Icon with Tooltip for Input Field -->
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
      <!-- Tooltip Content -->
      <template v-if="tooltipTags[`button_tooltip:${input.id}`]?.type === 'text'">
        <span>{{ tooltipTags[`button_tooltip:${input.id}`]?.content }}</span>
      </template>
      <template v-else-if="tooltipTags[`button_tooltip:${input.id}`]?.type === 'url'">
        <a
          :href="tooltipTags[`button_tooltip:${input.id}`]?.content"
          target="_blank"
          rel="noopener noreferrer"
          class="tooltip-link"
        >
          Open Link
        </a>
      </template>
      <template v-else-if="tooltipTags[`button_tooltip:${input.id}`]?.type === 'image'">
        <img
          :src="tooltipTags[`button_tooltip:${input.id}`]?.content"
          alt="Tooltip Image"
          class="tooltip-image"
        />
      </template>
      <template v-else>
        <span>No tooltip available.</span>
      </template>
    </v-tooltip>
  </div>
</template>

<script>
import TooltipRenderer from './TooltipRenderer.vue';

export default {
  props: {
    input: {
      type: Object,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    inputErrors: {
      type: Array,
      default: () => [],
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
      localValue: this.input.value || '',
    };
  },
  methods: {
    emitInputFocus() {
      this.$emit('inputFocus', this.input.id);
    },
    emitInputBlur() {
      this.$emit('inputBlur', this.input.id);
    },
    navigateTo(url) {
      window.open(url, '_blank'); // Opens the link in a new tab
    },
  },
  watch: {
    input: {
      immediate: true,
      handler(newVal) {
        this.localValue = newVal.value || '';
      },
    },
  },
  mounted() {
    console.log('DynamicInputField Tooltip Tags:', this.tooltipTags);
    console.log(`Resolved Input Tooltip for ${this.input.id}:`, this.tooltipTags[`input_tooltip:${this.input.id}`]);
    console.log(`Resolved Button Tooltip for ${this.input.id}:`, this.tooltipTags[`button_tooltip:${this.input.id}`]);
  },
};
</script>

<style scoped>
.input-field-container {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.hyperlink-button {
  margin-left: 8px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  height: 36px;
  width: 36px;
}
</style>
