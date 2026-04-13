<template>
  <div
    class="simple-node"
    :class="{ selected: isSelected }"
    :style="{ '--indentation': `${level * 15}px` }"
  >
    <div
      class="folder-header"
      @contextmenu.prevent.stop="openContextMenu($event, 'node')"
      @dblclick="emitToggle"
      tabindex="0"
      role="button"
      :aria-expanded="isExpanded"
      :aria-label="`Folder ${folder.name}`"
      @keydown.enter="emitSelect"
      @keydown.space="emitToggle"
    >
      <!-- Toggle Icon -->
      <v-icon
        small
        class="toggle-icon"
        @click.stop="emitToggle"
      >
        {{ isExpanded ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
      </v-icon>

      <!-- Folder Icon -->
      <v-icon class="folder-icon">
        {{ isExpanded ? 'mdi-folder-open' : 'mdi-folder' }}
      </v-icon>

      <!-- Folder Name -->
      <span
        class="folder-name"
        @click="emitSelect"
      >
        {{ folder.name }}
      </span>
    </div>

    <!-- Context Menu -->
    <ContextMenu
      v-model:show="isMenuVisible"
      :options="optionsComponent"
    >
      <ContextMenuItem label="Create Subfolder" @click="handleMenuAction('create')" />
      <ContextMenuItem label="Rename Folder" @click="handleMenuAction('rename')" />
      <ContextMenuItem label="Delete Folder" @click="handleMenuAction('delete')" />
    </ContextMenu>

    <transition name="expand">
      <div v-if="isExpanded && folder.children.length" class="children">
        <SimpleNode
          v-for="(child) in folder.children"
          :key="child._id"
          :folder="child"
          :selected-folder-path="selectedFolderPath"
          :level="level + 1"
          @fetch-files="(...args) => $emit('fetch-files', ...args)"
          @select-folder="(...args) => $emit('select-folder', ...args)"
          @toggle-folder="(...args) => $emit('toggle-folder', ...args)"
          @create-folder="(...args) => $emit('create-folder', ...args)"
          @rename-folder="(...args) => $emit('rename-folder', ...args)"
          @delete-folder="(...args) => $emit('delete-folder', ...args)"
        />
      </div>
    </transition>
  </div>
</template>

<script>
import SimpleNode from './SimpleNode.vue';
import { ContextMenu, ContextMenuItem } from '@imengyu/vue3-context-menu';
import { debounce } from 'lodash';

export default {
  name: 'SimpleNode',
  components: {
    SimpleNode,
    ContextMenu,
    ContextMenuItem,
  },
  props: {
    folder: {
      type: Object,
      required: true,
    },
    selectedFolderPath: {
      type: String,
      required: true,
    },
    level: {
      type: Number,
      default: 0, // Default to root level
    },
  },
  data() {
    return {
      isMenuVisible: false,
      optionsComponent: {
        zIndex: 3,
        minWidth: 230,
        x: 0,
        y: 0
      },
    };
  },
  computed: {
    isSelected() {
      return this.folder.path === this.selectedFolderPath;
    },
    isExpanded() {
      return this.folder.isExpanded;
    },
  },
  methods: {
    /**
     * Emits the toggle-folder event with debounce to prevent rapid toggling.
     */
    emitToggle: debounce(function () {
      this.$emit('toggle-folder', this.folder.path);
    }, 300),

    /**
     * Emits the select-folder event to notify the parent component.
     */
    emitSelect() {
      this.$emit('select-folder', this.folder);
    },

    /**
     * Opens the context menu at the cursor's position.
     * @param {Event} event - The contextmenu event.
     * @param {String} type - The type of context menu to show ('node').
     */
    openContextMenu(event, type) {
      event.preventDefault();
      event.stopPropagation();

      console.log('Context menu triggered for folder:', this.folder);

      const position = { x: event.clientX, y: event.clientY };

      if (type === 'node') {
        this.optionsComponent = {
          zIndex: 3,
          minWidth: 230,
          x: position.x,
          y: position.y
        };
        this.isMenuVisible = true;
        console.log('Context menu options:', this.optionsComponent);
      }

      // Hide other context menus if any
      // Assuming parent component manages other context menus
    },

    /**
     * Handles actions from the context menu.
     * @param {String} action - The action to perform ('create', 'rename', 'delete').
     */
    handleMenuAction(action) {
      const folderPath = this.folder.path;
      switch (action) {
        case 'rename':
          this.renameFolder();
          break;
        case 'delete':
          this.deleteFolder();
          break;
        case 'create':
          this.$emit('create-folder', folderPath);
          break;
        default:
          break;
      }
      this.isMenuVisible = false;
    },

    /**
     * Prompts the user to rename the folder and emits the rename event.
     */
    renameFolder() {
      const newName = prompt('Enter the new name for the folder:', this.folder.name);
      if (newName && newName.trim() !== '') {
        this.$emit('rename-folder', this.folder.path, newName.trim());
      }
    },

    /**
     * Emits the delete-folder event to notify the parent component.
     */
    deleteFolder() {
      this.$emit('delete-folder', this.folder.path);
    },
  },
};
</script>

<style scoped>
.simple-node {
  margin-left: calc(var(--indentation) * 1px);
  padding: 5px 10px;
  transition: background-color 0.3s ease;
}

.simple-node.selected .folder-header {
  background-color: #1d593f; /* Highlight selected folder */
}

.folder-header {
  display: flex;
  align-items: center;
  padding: 5px;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.folder-header:hover {
  background-color: #1d593f; /* Slightly lighter shade on hover */
}

.folder-icon {
  margin-right: 8px;
  color: #f0d500; /* Bright yellow for folder icons */
}

.folder-name {
  flex-grow: 1;
  color: #000000;
  font-weight: 500;
}

.folder-name:hover {
  color: #1d593f;
}

.children {
  margin-left: calc(var(--indentation) * 1px);
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
