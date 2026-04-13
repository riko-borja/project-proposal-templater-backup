<template>
  <div class="explorer-container">
    <!-- Header: Navigation Buttons and Path -->
    <div class="header">
      <div class="button-container">
        <!-- Navigation Buttons -->
        <v-btn icon @click="goBack" :disabled="!canGoBack">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <v-btn icon @click="goForward" :disabled="!canGoForward">
          <v-icon>mdi-arrow-right</v-icon>
        </v-btn>
        <v-btn icon @click="goUp" :disabled="!canGoUp">
          <v-icon>mdi-arrow-up</v-icon>
        </v-btn>

        <!-- Dynamically Resizing Path Input -->
        <div class="path-input-container">
          <v-text-field
            v-if="currentFolderPath"
            v-model="editableFolderPath"
            variant="outlined" 
            density="compact" 
            hide-details
            placeholder="Enter folder path"
            @keyup.enter="navigateToPath"
            :style="{ width: `${inputWidth}px` }"
          />
        </div>
      </div>
    </div>

    <!-- Main Layout -->
    <div class="layout">
      <!-- Resizable Left Pane: Folder Structure -->
      <div
        class="left-pane"
        :style="{ width: `${leftPaneWidth}px` }"
        @contextmenu.prevent="showGlobalContextMenu($event)"
      >
        <h3>Folder Structure</h3>
        <SimpleNode
          v-for="folder in folderStructure"
          :key="folder._id"
          :folder="folder"
          :selected-folder-path="currentFolderPath"
          :level="0"
          @fetch-files="fetchFiles"
          @select-folder="handleSelectFolder"
          @toggle-folder="toggleFolder"
          @create-folder="createSubFolder"
          @rename-folder="renameFolder"
          @delete-folder="deleteFolder"
        />
      </div>

      <!-- Resizable Divider -->
      <div
        class="divider"
        @mousedown="startResizing"
      ></div>

      <!-- Right Pane: File or Content Display -->
      <div class="right-pane" @contextmenu.prevent="showRightPaneContextMenu($event)">
        <div>
          <div v-if="isLoadingFiles">
            <v-progress-circular indeterminate></v-progress-circular>
          </div>
          <ul v-else-if="files.length > 0">
            <li
              v-for="file in files"
              :key="file._id" 
              class="file-item"
              @mouseover="hoverFile(file)"
              @mouseleave="hoverFile(null)"
              @click="selectFile(file)"
              @contextmenu.prevent="(event) => { 
                console.log('Right-clicked file:', file); 
                showFileContextMenu(event, file); 
              }"
              :class="{ 
                'selected': selectedFile && selectedFile._id === file._id,
                'hovered': hoveredFile && hoveredFile._id === file._id 
              }"
            >
              <v-icon>{{ getFileIcon(file.contentType) }}</v-icon>
              {{ file.filename }}
            </li>
          </ul>

          <!-- Path Input Field -->
          <div class="path-input-container">
            <v-text-field
              v-if="currentFolderPath"
              v-model="editableFolderPath"
              variant="outlined" 
              density="compact" 
              hide-details
              placeholder="Enter folder path"
              @keyup.enter="navigateToPath"
              :style="{ width: `${inputWidth}px` }"
            />
          </div>

          <!-- Context Menu for Files -->
          <ContextMenu
            v-if="showFileContextMenuVisible"
            v-model:show="showFileContextMenuVisible"
            :options="optionsFileContextMenu"
          >
            <ContextMenuItem label="Download" @click="downloadFile(selectedFile)" />
            <ContextMenuItem label="Rename" @click="renameFile(selectedFile)" />
            <ContextMenuItem 
              label="Delete" 
              @click="handleDeleteFile" 
              :disabled="isDeleting" 
            />
          </ContextMenu>

          <!-- Context Menu for Right Pane -->
          <ContextMenu
            v-if="showRightPaneContextMenuVisible"
            v-model:show="showRightPaneContextMenuVisible"
            :options="optionsRightPaneContextMenu"
          >
            <ContextMenuItem label="Upload File" @click="uploadFile()" />
            <!-- Add more options as needed -->
          </ContextMenu>
        </div>
      </div>
    </div>

    <!-- Context Menu for Root-Level Creation -->
    <ContextMenu
      v-model:show="showRootContextMenu"
      :options="optionsRootContextMenu"
    >
      <ContextMenuItem label="Create Root Folder" @click="handleCreateRootFolder" />
    </ContextMenu>

    <!-- Folder Creation Dialog -->
    <v-dialog v-model="showCreateFolderDialog" persistent max-width="500">
      <v-card>
        <v-card-title>Create New Folder</v-card-title>
        <v-card-text>
          <!-- Folder Name Input -->
          <v-text-field label="Folder Name" v-model="newFolderName" required></v-text-field>
          <!-- Folder Type Selection -->
          <v-radio-group v-model="selectedFolderType" label="Select Folder Type" mandatory>
            <v-radio label="Organizational" value="organizational"></v-radio>
            <v-radio label="Storage" value="storage"></v-radio>
            <v-radio label="Category" value="category"></v-radio>
            <v-radio 
              label="Subcategory" 
              value="subcategory" 
              v-if="isCurrentFolderCategory"
            ></v-radio>
          </v-radio-group>
          <!-- Show storage type selection only if 'Storage' is selected -->
          <v-select 
            v-if="selectedFolderType === 'storage'" 
            v-model="selectedStorageType" 
            :items="['Image', 'Document']" 
            label="Select Storage Type" 
            placeholder="Choose storage type"
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-btn color="blue darken-1" text @click="createFolder">Create</v-btn>
          <v-btn color="red darken-1" text @click="showCreateFolderDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import axios from 'axios';
import SimpleNode from './SimpleNode.vue';
import { ContextMenu, ContextMenuItem } from '@imengyu/vue3-context-menu';
import {
  VBtn,
  VIcon,
  VDialog,
  VCard,
  VCardTitle,
  VCardText,
  VCardActions,
  VTextField,
  VRadioGroup,
  VRadio,
  VSelect,
  VProgressCircular,
} from 'vuetify/components';

export default {
  components: {
    SimpleNode,
    ContextMenu,
    ContextMenuItem,
    VBtn,
    VIcon,
    VDialog,
    VCard,
    VCardTitle,
    VCardText,
    VCardActions,
    VTextField,
    VRadioGroup,
    VRadio,
    VSelect,
    VProgressCircular
  },
  data() {
    return {
      currentFolderPath: 'local_disk', // Initialize to root
      editableFolderPath: '', // Initialize to empty string
      leftPaneWidth: 300, // Default width for the left pane
      isResizing: false,
      history: [], // Stores the navigation history
      historyIndex: -1, // Tracks the current index in the history
      files: [], // Array to store files of the selected folder  
      isLoadingFiles: false,
      folderStructure: [], // Populate this from backend data
      showCreateFolderDialog: false,
      newFolderName: '',
      hoveredFile: null, // New property for tracking hovered file
      selectedFolderType: 'organizational', // Default to 'organizational'
      selectedStorageType: '', // To store 'Image' or 'Document' if 'Storage' is selected
      showRootContextMenu: false, // Flag to show the root context menu
      optionsRootContextMenu: {
        x: 0,
        y: 0,
        zIndex: 9999,
      },
      showFileContextMenuVisible: false,
      selectedFile: null,
      optionsFileContextMenu: {
        x: 0,
        y: 0,
        zIndex: 9999,
      },
      showRightPaneContextMenuVisible: false,
      optionsRightPaneContextMenu: {
        x: 0,
        y: 0,
        zIndex: 9999,
      },
      currentFolder: {}, // Tracks the currently selected folder
      isDeleting: false, // Flag to prevent multiple deletions
      // ... other data properties
    };
  },
  computed: {
    inputWidth() {
      const baseWidth = 150; // Minimum width in pixels
      const charWidth = 8; // Approximate width of a character in pixels
      const path = this.editableFolderPath || ''; // Fallback to empty string
      return Math.max(baseWidth, path.length * charWidth);
    },
    isCurrentFolderCategory() {
      return this.currentFolder && this.currentFolder.type === "category";
    },
    canGoBack() {
      return this.historyIndex > 0;
    },
    canGoForward() {
      return this.historyIndex < this.history.length - 1;
    },
    canGoUp() {
      return this.currentFolderPath && this.currentFolderPath.includes('/');
    }
  },
  watch: {
    currentFolderPath(newPath) {
      // Keep the editableFolderPath synced with currentFolderPath
      this.editableFolderPath = newPath || '';
    },
  },
  methods: {
    // Fetch Files
    async fetchFiles(folderPath = '') {
      console.log('Fetching files for path:', folderPath); // Log folderPath
      this.isLoadingFiles = true;
      try {
        const response = await axios.get('/api/files/get-files', {
          params: { path: folderPath },
        });
        console.log('Response from backend:', response.data); // Log backend response
        this.files = response.data;
        console.log('Files updated:', this.files); // Log updated files
      } catch (error) {
        console.error('Error fetching files:', error);
        alert(error.response?.data?.message || 'Failed to fetch files. Please try again.');
        this.files = [];
      } finally {
        this.isLoadingFiles = false;
      }
    },

    // Navigate to Path
    navigateToPath() {
      if (this.editableFolderPath !== this.currentFolderPath) {
        console.log('Navigating to:', this.editableFolderPath);
        // Call a method to navigate to the entered path
        this.handleSelectFolder({ path: this.editableFolderPath });
      }
    },

    // Handle Folder Selection
    handleSelectFolder({ path }) {
      // Implement folder navigation logic
      console.log('Handling folder selection for path:', path);
      this.currentFolderPath = path;
      this.fetchFiles(path);
      // Update history if implementing navigation history
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }
      this.history.push(path);
      this.historyIndex++;
    },

    // Delete File
    async deleteFile(file) {
      if (this.isDeleting) {
        console.log('Delete operation already in progress.');
        return;
      }
      this.isDeleting = true;
      console.log('Delete function triggered for file:', file);
      
      if (!confirm(`Are you sure you want to delete the file: "${file.filename}"? This action cannot be undone.`)) {
        this.isDeleting = false;
        return;
      }
      
      try {
        const response = await axios.delete('/api/files/delete-file', {
          data: {
            path: this.currentFolderPath,
            fileId: file._id,
          },
          timeout: 10000, // 10 seconds
        });
        console.log('Delete response:', response.data);
        
        // Remove the file from the UI
        this.files = this.files.filter(f => f._id !== file._id);
        this.selectedFile = null; // Clear selectedFile after deletion
      } catch (error) {
        console.error('Error deleting file:', error);
        alert(error.response?.data?.message || 'Failed to delete file. Please try again.');
      } finally {
        this.isDeleting = false;
      }
    },

    // Wrapper method to handle delete file
    handleDeleteFile() {
      if (this.selectedFile) {
        this.deleteFile(this.selectedFile);
      } else {
        console.error('No file selected for deletion.');
      }
    },

    // Other methods (goBack, goForward, goUp, etc.)
    goBack() {
      if (this.canGoBack) {
        this.historyIndex--;
        this.currentFolderPath = this.history[this.historyIndex];
        this.fetchFiles(this.currentFolderPath);
      }
    },
    goForward() {
      if (this.canGoForward) {
        this.historyIndex++;
        this.currentFolderPath = this.history[this.historyIndex];
        this.fetchFiles(this.currentFolderPath);
      }
    },
    goUp() {
      if (this.canGoUp) {
        const newPath = this.currentFolderPath.substring(0, this.currentFolderPath.lastIndexOf('/'));
        this.handleSelectFolder({ path: newPath });
      }
    },
    toggleFolder(folder) {
      // Implement folder toggle logic
      console.log('Toggling folder:', folder);
    },
    createSubFolder(folder) {
      // Implement sub-folder creation logic
      console.log('Creating sub-folder in:', folder);
    },
    renameFolder(folder) {
      // Implement folder rename logic
      console.log('Renaming folder:', folder);
    },
    deleteFolder(folder) {
      // Implement folder deletion logic
      console.log('Deleting folder:', folder);
    },

    // Context Menu Handlers
    showFileContextMenu(event, file) {
      this.selectedFile = file;
      this.showFileContextMenuVisible = true;
      // Optionally set context menu position based on event.clientX/Y
      this.optionsFileContextMenu = {
        x: event.clientX,
        y: event.clientY,
        zIndex: 9999,
      };
    },
    showRightPaneContextMenu(event) {
      this.showRightPaneContextMenuVisible = true;
      // Optionally set context menu position based on event.clientX/Y
      this.optionsRightPaneContextMenu = {
        x: event.clientX,
        y: event.clientY,
        zIndex: 9999,
      };
    },
    showGlobalContextMenu(event) {
      this.showRootContextMenu = true;
      // Optionally set context menu position based on event.clientX/Y
      this.optionsRootContextMenu = {
        x: event.clientX,
        y: event.clientY,
        zIndex: 9999,
      };
    },

    // Hover and Select Handlers
    selectFile(file) {
      this.selectedFile = file;
      // Additional logic for selecting a file
    },
    hoverFile(file) {
      this.hoveredFile = file;
      // Additional logic for hovering a file
    },

    // File Operations
    downloadFile(file) {
      // Implement download logic
      console.log('Downloading file:', file);
      // Example:
      // window.open(`/api/files/download?fileId=${file._id}`, '_blank');
    },
    renameFile(file) {
      // Implement rename logic
      console.log('Renaming file:', file);
      // Example:
      // Prompt user for new name and send a rename request to the backend
    },
    uploadFile() {
      // Implement upload logic
      console.log('Uploading file...');
      // Example:
      // Open a file dialog and handle the upload process
    },

    // Create Root Folder
    handleCreateRootFolder() {
      this.showCreateFolderDialog = true;
      this.selectedFolderType = 'organizational'; // Reset to default
      this.selectedStorageType = ''; // Reset storage type
      this.newFolderName = ''; // Reset folder name
    },

    // Create Folder
    async createFolder() {
      if (!this.newFolderName.trim()) {
        alert('Folder name cannot be empty.');
        return;
      }
      console.log('Creating folder:', this.newFolderName, 'Type:', this.selectedFolderType);
      try {
        const response = await axios.post('/api/files/create-folder', {
          path: this.currentFolderPath,
          name: this.newFolderName,
          type: this.selectedFolderType,
          storageType: this.selectedStorageType,
        });
        console.log('Folder created:', response.data);
        this.showCreateFolderDialog = false;
        this.fetchFiles(this.currentFolderPath);
      } catch (error) {
        console.error('Error creating folder:', error);
        alert(error.response?.data?.message || 'Failed to create folder. Please try again.');
      }
    },

    // Start Resizing Left Pane
    startResizing(event) {
      this.isResizing = true;
      document.addEventListener('mousemove', this.resizeLeftPane);
      document.addEventListener('mouseup', this.stopResizing);
    },
    resizeLeftPane(event) {
      if (this.isResizing) {
        this.leftPaneWidth = event.clientX;
      }
    },
    stopResizing() {
      this.isResizing = false;
      document.removeEventListener('mousemove', this.resizeLeftPane);
      document.removeEventListener('mouseup', this.stopResizing);
    },
  },
  mounted() {
    // Fetch initial files or set up component
    this.fetchFiles(this.currentFolderPath);
    // Fetch initial folder structure if necessary
    this.fetchFolderStructure();
  },
  methods: {
    // Additional methods can be added here
    async fetchFolderStructure() {
      try {
        const response = await axios.get('/api/files/get-folder-structure', {
          params: { path: this.currentFolderPath },
        });
        this.folderStructure = response.data;
      } catch (error) {
        console.error('Error fetching folder structure:', error);
        alert(error.response?.data?.message || 'Failed to fetch folder structure.');
        this.folderStructure = [];
      }
    },
  },
};
</script>

<style scoped>
/* Add your component-specific styles here */
.explorer-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.header {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #f5f5f5;
}
.button-container {
  display: flex;
  align-items: center;
}
.path-input-container {
  margin-left: 20px;
}
.layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.left-pane {
  background-color: #ffffff;
  border-right: 1px solid #ddd;
  overflow-y: auto;
}
.divider {
  width: 5px;
  cursor: col-resize;
  background-color: #f0f0f0;
}
.right-pane {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
}
.file-item {
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
}
.file-item.selected {
  background-color: #e0e0e0;
}
.file-item.hovered {
  background-color: #f5f5f5;
}
.file-item v-icon {
  margin-right: 10px;
}
</style>
