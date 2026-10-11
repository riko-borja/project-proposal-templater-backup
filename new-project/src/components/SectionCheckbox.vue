<template>
  <v-list-item
    class="section-node"
    :class="{
      'nested-node': level > 0,
      'toggle-node': isToggle,
      'top-node': level === 0 && !isToggle
    }"
    :style="{ marginLeft: `${indent}px` }"
  >
    <v-list-item-content>
      <v-list-item-title>
        <div class="d-flex align-center">
          <!-- Render regular checkbox for sections -->
          <v-checkbox
            v-if="!isToggle"
            v-model="isChecked"
            :label="localSection.label"
            :color="localSection.color || 'primary'"
            :disabled="!parentChecked"
            @change="onCheckboxChange"
          />
          <!-- Render prepended label for toggles -->
          <v-checkbox
            v-else
            v-model="isChecked"
            :label="renderedLabel"
            :color="localSection.color || 'primary'"
            @change="onCheckboxChange"
          />
          <v-btn
            v-if="localSection.children && localSection.children.length > 0"
            @click="toggleCollapse"
            icon
            small
            class="ml-2"
          >
              <v-icon small>{{ localSection.collapsed ? 'mdi-chevron-right' : 'mdi-chevron-down' }}</v-icon>
            </v-btn>
        </div>
        <div v-if="!isToggle && level > 0 && parentLabelPath" class="context-hint">
          Under: {{ parentLabelPath }}
        </div>
        <div v-if="!isToggle" class="node-kind">
          {{ level === 0 ? 'Main section' : 'Subsection' }}
        </div>
      </v-list-item-title>

      <!-- Render children if any -->
      <v-list dense>
        <div v-if="localSection.children && !localSection.collapsed">
          <SectionCheckbox
            v-for="child in localSection.children"
            :key="child.id"
            :section="child"
            :indent="indent + 20"
            :level="level + 1"
            :parent-label-path="nodePath"
            :parent-checked="isChecked"
            :all-collapsed="allCollapsed"
            @update-checked="emitUpdateChecked"
          />
        </div>
      </v-list>
    </v-list-item-content>
  </v-list-item>
</template>


<script>
export default {
  name: 'SectionCheckbox',
  props: {
    section: Object,
    indent: {
      type: Number,
      default: 0,
    },
    parentChecked: {
      type: Boolean,
      default: true,
    },
    allCollapsed: {
      type: Boolean,
      default: false,
    },
    level: {
      type: Number,
      default: 0,
    },
    parentLabelPath: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      isChecked: this.section.checked,
      localSection: { ...this.section },
    };
  },
  computed: {
  // Determine if the item is a toggle
  isToggle() {
    const isToggle = this.localSection.type === 'toggle';
    console.log(
      `Computed isToggle for Section: ${this.localSection.label}, isToggle: ${isToggle}`
    );
    return isToggle;
  },
  // Render label based on section type
  renderedLabel() {
    if (this.isToggle) {
      // Just return the label for toggles without rendering additional checkboxes
      console.log(
        `Rendered Label for Toggle: ${this.localSection.label}, Label: ${this.localSection.label}`
      );
      return this.localSection.label;
    }
    console.log(
      `Rendered Label for Section: ${this.localSection.label}, Label: ${this.localSection.label}`
    );
    return this.localSection.label; // For non-toggles, return label as-is
  },
  nodePath() {
    return this.parentLabelPath
      ? `${this.parentLabelPath} > ${this.localSection.label}`
      : this.localSection.label;
  },
},


  watch: {
    isChecked(newVal) {
      this.$emit('update-checked', { id: this.localSection.id, checked: newVal });
    },
  },
  emits: ['update-checked'],
  methods: {
    onCheckboxChange() {
      this.localSection.checked = this.isChecked;
      this.$emit('update-checked', { id: this.localSection.id, checked: this.isChecked });
    },
    toggleCollapse() {
      this.localSection.collapsed = !this.localSection.collapsed;
    },
    emitUpdateChecked(payload) {
      this.$emit('update-checked', payload);
    },
  },
};

</script>

<style scoped>
.ml-2 {
  margin-left: 8px; /* Adjust spacing between checkbox and collapse button */
}

.v-list-item {
  padding-left: 0; /* Remove default padding */
}

.section-node {
  border-radius: 8px;
  margin-bottom: 4px;
}

.top-node {
  background: #fafafa;
}

.nested-node {
  border-left: 2px solid #cfd8dc;
  padding-left: 8px;
}

.toggle-node {
  background: transparent;
  border-left: none;
}

.v-checkbox {
  margin-left: 0; /* Align checkbox to the left */
}

.v-icon {
  font-size: 18px; /* Adjust the icon size */
}

.context-hint {
  font-size: 0.78rem;
  color: #607d8b;
  margin: -2px 0 2px 40px;
}

.node-kind {
  font-size: 0.75rem;
  color: #78909c;
  margin: -2px 0 2px 40px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
</style>
