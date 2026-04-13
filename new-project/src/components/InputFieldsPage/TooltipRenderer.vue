<template>
  <v-tooltip bottom>
    <template v-slot:activator="{ props }">
      <v-icon
        v-bind="props"
        color="teal-darken-4"
        class="tooltip-icon"
        v-if="content" 
      >
        mdi-information-outline
      </v-icon>
    </template>
    <!-- Render Tooltip Content Based on Type -->
    <template v-if="type === 'text'">
      <span class="tooltip-text">{{ content }}</span>
    </template>
    <template v-else-if="type === 'url'">
      <a
        :href="content"
        target="_blank"
        rel="noopener noreferrer"
        class="tooltip-link"
      >
        Open Link
      </a>
    </template>
    <template v-else-if="type === 'image'">
      <img
        :src="content"
        alt="Tooltip Image"
        class="tooltip-image"
      />
    </template>
    <template v-else>
      <span class="tooltip-text">No tooltip available.</span>
    </template>
  </v-tooltip>
</template>

<script>
export default {
  name: 'TooltipRenderer',
  props: {
    content: {
      type: String,
      required: false,
      default: null,
    },
    type: {
      type: String,
      default: 'text',
      validator: (value) => ['text', 'url', 'image'].includes(value),
    },
  },
  mounted() {
    console.log('TooltipRenderer Content:', this.content);
    console.log('TooltipRenderer Type:', this.type);
    
  },
};
</script>

<style scoped>
.tooltip-icon {
  cursor: pointer;
  font-size: 18px;
}
.tooltip-text {
  color: #000000; /* Ensure text is visible */
  font-size: 14px;
  padding: 4px 8px; /* Add padding for better spacing */
}
.tooltip-link {
  color: #0066cc; /* Blue link color */
  text-decoration: underline;
}
.tooltip-image {
  max-width: 200px;
  max-height: 200px;
  display: block;
  margin: 10px auto;
}
.v-tooltip__content {
  visibility: visible !important; /* Ensure tooltip is always visible */
  opacity: 1 !important; /* Ensure tooltip is not hidden */
}
</style>
