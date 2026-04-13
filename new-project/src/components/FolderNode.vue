<template>
  <div>
    <div
      :class="{'folder-item': true, 'open': isOpen}"
      @click="toggleFolder"
    >
      <!-- Add folder icon here -->
      <v-icon class="folder-icon">mdi-folder</v-icon>
      {{ folder.name }}
    </div>
    <div v-if="isOpen" class="folder-children">
      <FolderNode
        v-for="child in folder.children"
        :key="child.name"
        :folder="child"
        :fullPath="computeFullPath(child)"
        @fetch-files="$emit('fetch-files', $event)"
      />
    </div>
  </div>
</template>
  
  <script>
  export default {
    name: 'FolderNode',
    props: {
      folder: Object,
      fullPath: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        isOpen: false,
      };
    },
    methods: {
      toggleFolder() {
      this.isOpen = !this.isOpen;
      console.log(`Toggled folder: ${this.folder.name}, Is open: ${this.isOpen}`);
      if (!this.folder.children || this.folder.children.length === 0) {
        console.log(`Emitting fetch-files for: ${this.folder.name}`);
        this.$emit('fetch-files', this.folder.name);
      }
    },
      computeFullPath(child) {
        const fullPath = this.fullPath ? `${this.fullPath}_${child.name}` : child.name;
        console.log(`Computed full path for ${child.name}: ${fullPath}`);
        return fullPath;
      },
      cleanFullPath(path) {
        // Helper function to remove parent categories like "ARTIFACTS"
        if (path && path.startsWith('ARTIFACTS')) {
          // Remove "ARTIFACTS_" prefix from the path
          return path.replace(/^ARTIFACTS_/, '');
        }
        return path;
      },
      mounted() {
        console.log(`Mounted FolderNode: ${this.folder.name}`, this.folder);
      },
    }
  };
  </script>
  
  
  <style scoped>
  .folder-node {
    margin-left: 10px;
    padding: 2px 0;
  }
  
  .folder-item {
    display: flex;
    align-items: center;
    padding: 5px 10px;
    cursor: pointer;
  }

  .folder-icon {
    margin-right: 5px;
  }
  
  .nested-folders {
    margin-right: 15px;
  }

  .folder-children {
    padding-left: 20px; /* Adjust this value for more indentation */
  }

  </style>
  