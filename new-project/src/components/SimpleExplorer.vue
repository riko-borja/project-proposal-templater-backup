<template>
  <div class="explorer-container">
    <!-- Header: Navigation Buttons and Path -->
    <div class="header">
      <div class="button-container">
        <!-- Navigation Buttons -->
        <v-btn icon color="primary" @click="goBack" :disabled="!canGoBack">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <v-btn icon color="primary" @click="goForward" :disabled="!canGoForward">
          <v-icon>mdi-arrow-right</v-icon>
        </v-btn>
        <v-btn icon color="primary" @click="goUp" :disabled="!canGoUp">
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
        @contextmenu.prevent="openContextMenu($event, 'root')"
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
      <div class="right-pane" @contextmenu.prevent="openContextMenu($event, 'right-pane')">
        <div>
          <div v-if="isLoadingFiles" class="loading-container">
            <v-progress-circular indeterminate></v-progress-circular>
          </div>
          <ul v-else-if="files.length > 0" class="file-list">
            <li
              v-for="file in files"
              :key="file._id" 
              class="file-item"
              @mouseover="hoverFile(file)"
              @mouseleave="hoverFile(null)"
              @click="selectFile(file)"
              @contextmenu.prevent="openContextMenu($event, 'file', file)"
              :class="{ 
                'selected': selectedFile && selectedFile._id === file._id,
                'hovered': hoveredFile && hoveredFile._id === file._id 
              }"
            >
              <v-icon>{{ getFileIcon(file.contentType) }}</v-icon>
              {{ file.filename }}
            </li>
          </ul>
          <div v-else class="no-files">
            No files in this folder.
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
                @click="deleteFile(selectedFile)" 
                :disabled="selectedFile ? isDeleting[selectedFile._id] : false" 
              />
          </ContextMenu>


          <!-- Context Menu for Right Pane -->
          <context-menu
            v-model:show="showRightPaneContextMenuVisible"
            :options="optionsRightPaneContextMenu"
          >
            <context-menu-item label="Upload File" @click="uploadFile()" />
            <!-- Add more options as needed -->
          </context-menu>
        </div>
      </div>
    </div>

    <!-- Context Menu for Root-Level Creation -->
    <context-menu
      v-model:show="showRootContextMenu"
      :options="optionsRootContextMenu"
    >
      <context-menu-item label="Create Root Folder" @click="handleCreateRootFolder" />
    </context-menu>

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
          <v-btn color="red darken-1" text @click="cancelCreateFolder">Cancel</v-btn>
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
  name: 'SimpleExplorer',
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
      history: ['local_disk'], // Initialize history with root
      historyIndex: 0, // Start at 0
      files: [], // Array to store files of the selected folder  
      isLoadingFiles: false,
      folderStructure: [], // Populate this from backend data
      showCreateFolderDialog: false,
      newFolderName: '',
      hoveredFile: null, // Property for tracking hovered file
      selectedFolderType: 'organizational', // Default to 'organizational'
      selectedStorageType: '', // To store 'Image' or 'Document' if 'Storage' is selected
      showRootContextMenu: false, // Flag to show the root context menu
      optionsRootContextMenu: {
        zIndex: 3,
        minWidth: 230,
        x: 0,
        y: 0
      },
      showFileContextMenuVisible: false,
      selectedFile: null,
      optionsFileContextMenu: {
        zIndex: 3,
        minWidth: 230,
        x: 0,
        y: 0
      },
      showRightPaneContextMenuVisible: false,
      optionsRightPaneContextMenu: {
        zIndex: 3,
        minWidth: 230,
        x: 0,
        y: 0
      },
      currentFolder: {}, // Tracks the currently selected folder
      isDeleting: {}, // Flag to prevent multiple deletions
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
    /**
     * Determines the appropriate icon based on the file's content type.
     * @param {String} contentType - The MIME type of the file.
     * @returns {String} - The icon name.
     */
    getFileIcon(contentType) {
      if (!contentType) return 'mdi-file'; // Default icon if contentType is undefined

      if (contentType.startsWith('image/')) {
        return 'mdi-image';
      } else if (contentType.startsWith('video/')) {
        return 'mdi-video';
      } else if (contentType === 'application/pdf') {
        return 'mdi-file-pdf';
      } else if (contentType.startsWith('text/')) {
        return 'mdi-file-document';
      } else if (contentType.startsWith('audio/')) {
        return 'mdi-music';
      } else if (contentType.startsWith('application/zip') || contentType.startsWith('application/x-7z-compressed')) {
        return 'mdi-file-zip';
      } else {
        return 'mdi-file'; // Generic file icon
      }
    },

    /**
     * Fetches files for a given folder path.
     * @param {String} folderPath - The path of the folder to fetch files from.
     */
     async fetchFiles(folderPath = '') {
      this.isLoadingFiles = true;
      try {
        const response = await axios.get('/api/files/get-files', {
          params: { path: folderPath, timestamp: Date.now() }, // Add timestamp to prevent caching
        });
        this.files = response.data;
      } catch (error) {
        console.error('Error fetching files:', error);
        alert(error.response?.data?.message || 'Failed to fetch files. Please try again.');
        this.files = [];
      } finally {
        this.isLoadingFiles = false;
      }
    },


    /**
     * Fetches the folder structure from the backend.
     */
    async fetchFolderStructure() {
      try {
        const response = await axios.get('/api/folders/folder-structure');
        this.folderStructure = this.addIsExpanded(response.data);
      } catch (error) {
        console.error('Error fetching folder structure:', error);
        alert(error.response?.data?.message || 'Failed to fetch folder structure.');
        this.folderStructure = [];
      }
    },

    /**
     * Recursively adds an `isExpanded` property to each folder.
     * @param {Array} folders - The folder structure array.
     * @returns {Array} - The updated folder structure.
     */
    addIsExpanded(folders) {
      return folders.map(folder => {
        folder.isExpanded = false; // Initialize as collapsed
        if (folder.children) {
          folder.children = this.addIsExpanded(folder.children);
        }
        return folder;
      });
    },

    /**
     * Navigates to a specified folder path entered by the user.
     */
    navigateToPath() {
      if (this.editableFolderPath !== this.currentFolderPath) {
        // Call a method to navigate to the entered path
        this.handleSelectFolder({ path: this.editableFolderPath });
      }
    },

    /**
     * Handles the selection of a folder.
     * @param {Object} folder - The folder object selected.
     */
    handleSelectFolder(folder) {
      this.updateCurrentFolder(folder, true);
    },

    /**
     * Updates the current folder, manages history, and fetches files.
     * @param {Object} folder - The folder object to navigate to.
     * @param {Boolean} addToHistory - Whether to add this navigation to history.
     */
    updateCurrentFolder(folder, addToHistory = true) {
      if (!folder) return;

      const path = folder.path;

      if (path !== this.currentFolderPath) {
        this.currentFolderPath = path;

        if (addToHistory) {
          if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
          }
          this.history.push(path);
          this.historyIndex = this.history.length - 1;
        }

        this.fetchFiles(path); // Fetch files only if the path changes
      }

      this.currentFolder = folder;

      // Expand folders in the tree
      this.updateFolderExpansion();
    },

    /**
     * Recursively expands folders in the folder structure based on the current path.
     */
    updateFolderExpansion() {
      const expandFolders = (folders, path) => {
        folders.forEach(folder => {
          if (path === folder.path || path.startsWith(`${folder.path}/`)) {
            folder.isExpanded = true; // Ensure ancestor folders are expanded
            if (folder.children) {
              expandFolders(folder.children, path);
            }
          }
          // Do not set isExpanded to false for other folders
        });
      };
      expandFolders(this.folderStructure, this.currentFolderPath);
    },

    /**
     * Toggles the expansion state of a folder.
     * @param {String} folderPath - The path of the folder to toggle.
     */
    toggleFolder(folderPath) {
      const folder = this.findFolderByPath(this.folderStructure, folderPath);
      if (folder) {
        folder.isExpanded = !folder.isExpanded;
      } else {
        console.warn(`Folder with path "${folderPath}" not found.`);
      }
    },

    /**
     * Finds a folder within the folder structure based on its path.
     * @param {Array} folders - The folder structure array.
     * @param {String} targetPath - The path to search for.
     * @returns {Object|null} - The folder object if found, else null.
     */
    findFolderByPath(folders, targetPath) {
      for (const folder of folders) {
        if (folder.path === targetPath) {
          return folder;
        }
        if (folder.children && folder.children.length > 0) {
          const found = this.findFolderByPath(folder.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    },

    /**
     * Deletes a specified file.
     * @param {Object} file - The file object to delete.
     */
     async deleteFile(file) {
      if (this.isDeleting[file._id]) {
        return;
      }

      this.isDeleting[file._id] = true;

      if (!confirm(`Are you sure you want to delete the file: "${file.filename}"? This action cannot be undone.`)) {
        delete this.isDeleting[file._id];
        return;
      }

      try {
        await axios.delete('/api/files/delete-file', {
          params: {
            path: this.currentFolderPath,
            fileId: file._id,
          },
        });

        // Fetch updated file list
        await this.fetchFiles(this.currentFolderPath);


        // Clear the selected file
        this.selectedFile = null;
      } catch (error) {
        console.error('Error deleting file:', error);
        const errorMessage = error.response?.data?.message || 'Failed to delete file. Please try again.';
        alert(errorMessage);

        // Refresh file list to ensure UI consistency
        await this.fetchFiles(this.currentFolderPath);

      } finally {
        delete this.isDeleting[file._id];
      }
    },


    /**
     * Wrapper method to handle delete file action.
     */
    handleDeleteFile() {
      if (this.selectedFile) {
        this.deleteFile(this.selectedFile);
      } else {
        console.error('No file selected for deletion.');
      }
    },

    /**
     * Renames a specified file.
     * @param {Object} file - The file object to rename.
     */
    async renameFile(file) {
      if (!file) return;

      const newName = prompt('Enter the new name for the file:', file.filename);
      if (newName && newName.trim() !== '') {
        try {
          await axios.put('/api/files/rename-file', {
            fileId: file._id,
            newName: newName.trim(),
            folderPath: this.currentFolderPath, // Pass folderPath only
          });

          alert('File renamed successfully!');

          // Refresh the file list to reflect the change
          this.fetchFiles(this.currentFolderPath);
        } catch (error) {
          console.error('Error renaming file:', error);
          alert(error.response?.data?.message || 'Failed to rename file. Please try again.');
        }
      }
    },

    /**
     * Uploads files to the current folder.
     */
    async uploadFile() {
      try {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;

        fileInput.onchange = async (event) => {
          const files = event.target.files;
          if (files.length === 0) return;

          // Create FormData object
          const formData = new FormData();
          for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
          }
          formData.append('path', this.currentFolderPath); // Include the current folder path

          this.isLoadingFiles = true;

          try {
            await axios.post('/api/files/upload-file', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
            alert('Files uploaded successfully!');
            this.fetchFiles(this.currentFolderPath); // Refresh files
          } catch (error) {
            console.error('Error uploading files:', error);
            alert(error.response?.data?.message || 'Failed to upload files. Please try again.');
          } finally {
            this.isLoadingFiles = false;
          }
        };

        fileInput.click();
      } catch (error) {
        console.error('Unexpected error during file upload:', error);
        alert('An unexpected error occurred during file upload.');
      }
    },


    mirrorPath(path) {
      if (path.startsWith('local_disk')) {
        return path.replace('local_disk', 'generated_documents');
      }
      return null;
    },

    // Frontend method: createFolder
    async createFolder() {
      if (!this.newFolderName.trim()) {
        alert('Please enter a folder name');
        return;
      }

      const isCategoryType = this.selectedFolderType === 'category' || this.selectedFolderType === 'subcategory';
      const isStorageType = this.selectedFolderType === 'storage';
      const endpoint = isCategoryType ? '/api/folders/create-category-folder' : '/api/folders/create-folder';

      // Find the current folder object to get its _id and type
      const parentFolder = this.findFolderByPath(this.folderStructure, this.currentFolderPath);

   

      // Prepare the payload based on folder type
      const payload = isCategoryType
        ? {
            name: this.newFolderName.trim(),
            type: this.selectedFolderType,
            parentId: parentFolder ? parentFolder._id : null, // Correct field for category/subcategory
          }
        : {
            path: `${this.currentFolderPath}/${this.newFolderName.trim()}`,
            type: this.selectedFolderType,
            storageType: isStorageType ? this.selectedStorageType : null,
          };

      try {
        const response = await axios.post(endpoint, payload);

        // Let the backend handle mirroring

        // Refresh folder structure
        await this.fetchFolderStructure();

        // Navigate into the new folder if it's a category or subcategory
        if (isCategoryType) {
          this.updateCurrentFolder(response.data.folder, true); // Pass the entire folder object
        } else {
          // For organizational or storage folders, stay in the current folder
          this.fetchFiles(this.currentFolderPath);
        }
      } catch (error) {
        console.error('Error creating folder:', error);
        alert(error.response?.data?.message || 'Failed to create folder.');
      } finally {
        // Reset form fields
        this.showCreateFolderDialog = false;
        this.newFolderName = '';
        this.selectedFolderType = 'organizational';
        this.selectedStorageType = '';
      }
    },



    /**
     * Handles the creation of a root folder.
     */
    handleCreateRootFolder() {
      this.resetCurrentFolderPath(); // Navigate to root
      this.showCreateFolderDialog = true;
      this.showRootContextMenu = false;
    },

    /**
     * Resets the current folder path to the root.
     */
    resetCurrentFolderPath() {
      this.currentFolderPath = 'local_disk'; // Reset to root path
      this.currentFolder = {};
      this.fetchFiles(this.currentFolderPath);
      this.fetchFolderStructure();
      this.history = ['local_disk'];
      this.historyIndex = 0;
    },

    /**
     * Deletes a specified folder.
     * @param {String} path - The path of the folder to delete.
     */
    deleteFolder(path) {
      this.deleteFolderAPI(path);
    },

    /**
     * API call to delete a folder with necessary confirmations.
     * @param {String} path - The path of the folder to delete.
     */
    async deleteFolderAPI(path) {
      try {
        // Make an initial API call to check the folder state
        const validationResponse = await axios.post('/api/folders/check-folder', { path });
        const folderInfo = validationResponse.data;

        // Handle case where the folder contains files
        if (folderInfo.containsFiles) {
          const userConfirmed = confirm(
            `The folder contains ${folderInfo.fileCount} files. Are you sure you want to delete the folder, including all files?`
          );
          if (!userConfirmed) {
            alert('Folder deletion canceled.');
            return;
          }
        }

        // Handle case where the folder contains subfolders
        if (folderInfo.hasSubfolders) {
          const userConfirmed = confirm(
            `The folder contains subfolders. Are you sure you want to delete the folder, including all subfolders?`
          );
          if (!userConfirmed) {
            alert('Folder deletion canceled.');
            return;
          }
        }

        // Show confirmation for empty folders
        const finalConfirmation = confirm(
          `Are you sure you want to delete the folder: "${path}"? This action cannot be undone.`
        );
        if (!finalConfirmation) {
          alert('Folder deletion canceled.');
          return;
        }

        // Check if a mirrored folder exists
        const mirroredPath = this.mirrorPath(path); // Use your existing mirrorPath logic
        if (mirroredPath) {
          try {
            const mirrorValidationResponse = await axios.post('/api/folders/check-folder', { path: mirroredPath });
            const mirrorInfo = mirrorValidationResponse.data;

            // If the mirrored folder has files or subfolders, delete it
            if (mirrorInfo.containsFiles || mirrorInfo.hasSubfolders) {
              await axios.delete('/api/folders/delete-folder', { data: { path: mirroredPath } });
            }
          } catch (mirrorError) {
            console.error('Error during mirrored folder deletion:', mirrorError);
          }
        }

        // Proceed with deletion of the primary folder
        const deleteResponse = await axios.delete('/api/folders/delete-folder', { data: { path } });
        alert(deleteResponse.data.message); // Show success message
        this.fetchFolderStructure(); // Refresh the folder structure

        // If the deleted folder was the current folder, navigate up
        if (this.currentFolderPath === path) {
          this.goUp();
        }
      } catch (error) {
        console.error('Error during folder deletion:', error);

        // Handle validation or deletion errors
        if (error.response?.data?.message) {
          alert(error.response.data.message); // Show backend-specific error message
        } else {
          alert('Failed to delete folder. Please try again.');
        }
      }
    },

    /**
     * Renames a specified folder.
     * @param {String} oldPath - The current path of the folder.
     * @param {String} newName - The new name for the folder.
     */
    renameFolder(oldPath, newName) {
      this.renameFolderAPI(oldPath, newName);
    },

    /**
     * API call to rename a folder.
     * @param {String} oldPath - The current path of the folder.
     * @param {String} newName - The new name for the folder.
     */
    async renameFolderAPI(oldPath, newName) {
      if (!newName || !newName.trim()) {
        alert('New folder name cannot be empty.');
        return;
      }

      try {
        await axios.put('/api/folders/rename-folder', { oldPath, newName: newName.trim() });

        // Refresh the folder structure
        await this.fetchFolderStructure();

        // Check if the renamed folder is the current folder
        if (this.currentFolderPath === oldPath) {
          const newPath = oldPath.replace(/[^/]+$/, newName.trim()); // Update current folder path
          this.currentFolderPath = newPath;
          this.fetchFiles(this.currentFolderPath); // Refresh files for the renamed folder
          this.history[this.historyIndex] = newPath;
        }

      } catch (error) {
        console.error('Error renaming folder:', error);
        alert(error.response?.data?.message || 'Failed to rename folder. Please try again.');
      }
    },

    /**
     * Creates a subfolder within a specified parent folder.
     * @param {String} parentPath - The path of the parent folder.
     */
    createSubFolder(parentPath) {
      // Find the parent folder object based on parentPath
      const findFolder = (folders, targetPath) => {
        for (const folder of folders) {
          if (folder.path === targetPath) {
            return folder;
          }
          if (folder.children && folder.children.length > 0) {
            const found = this.findFolderByPath(folder.children, targetPath);
            if (found) return found;
          }
        }
        return null;
      };

      const parentFolder = findFolder(this.folderStructure, parentPath);
      if (parentFolder) {
        this.updateCurrentFolder(parentFolder, false); // Set as current folder
        this.showCreateFolderDialog = true;
      } else {
        alert('Parent folder not found.');
      }
    },

    /**
     * Handles downloading a specified file.
     * @param {Object} file - The file object to download.
     */
    downloadFile(file) {
      if (!file) return; // Add this check
      // Implement file download logic
      // Example:
      window.open(`/api/files/download?fileId=${file._id}`, '_blank');
    },

    /**
     * Opens the context menu at the cursor's position.
     * @param {Event} event - The contextmenu event.
     * @param {String} type - The type of context menu to show ('file', 'right-pane', 'root').
     * @param {Object|null} file - The file object if context menu is for a file.
     */
    openContextMenu(event, type, file = null) {
      event.preventDefault();
      event.stopPropagation();
      
      const position = { x: event.clientX, y: event.clientY };

      switch (type) {
        case 'file':
          this.selectedFile = file;
          this.optionsFileContextMenu = {
            zIndex: 3,
            minWidth: 230,
            x: position.x,
            y: position.y
          };
          this.showFileContextMenuVisible = true;
          // Hide other context menus
          this.showRightPaneContextMenuVisible = false;
          this.showRootContextMenu = false;
          break;
        case 'right-pane':
          this.optionsRightPaneContextMenu = {
            zIndex: 3,
            minWidth: 230,
            x: position.x,
            y: position.y
          };
          this.showRightPaneContextMenuVisible = true;
          // Hide other context menus
          this.showFileContextMenuVisible = false;
          this.showRootContextMenu = false;
          break;
        case 'root':
          this.optionsRootContextMenu = {
            zIndex: 3,
            minWidth: 230,
            x: position.x,
            y: position.y
          };
          this.showRootContextMenu = true;
          // Hide other context menus
          this.showFileContextMenuVisible = false;
          this.showRightPaneContextMenuVisible = false;
          break;
        default:
        console.warn('Unhandled context menu type:', type);
          break;
      }
    },

    /**
     * Selects a specified file.
     * @param {Object} file - The file object to select.
     */
    selectFile(file) {
      this.selectedFile = file;
      // Optionally, you can open or preview the file here
    },

    /**
     * Tracks the file being hovered over.
     * @param {Object|null} file - The file object being hovered, or null.
     */
    hoverFile(file) {
      this.hoveredFile = file;
    },

    /**
     * Initiates the resizing of the left pane.
     * @param {Event} event - The mousedown event on the divider.
     */
    startResizing() {
      this.isResizing = true;

      const onMouseMove = (e) => {
        if (this.isResizing) {
          const newWidth = Math.max(200, e.clientX); // Minimum width of 200px
          this.leftPaneWidth = Math.min(newWidth, window.innerWidth - 300); // Prevent overlapping right pane
        }
      };

      const onMouseUp = () => {
        this.isResizing = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },

    /**
     * Navigates back in the history.
     */
    goBack() {
      if (this.canGoBack) {
        this.historyIndex--;
        const previousPath = this.history[this.historyIndex];
        const folder = this.findFolderByPath(this.folderStructure, previousPath);
        if (folder) {
          this.updateCurrentFolder(folder, false);
        } else {
          console.warn('Folder not found in structure:', previousPath);
        }
      }
    },

    /**
     * Navigates forward in the history.
     */
    goForward() {
      if (this.canGoForward) {
        this.historyIndex++;
        const nextPath = this.history[this.historyIndex];
        const folder = this.findFolderByPath(this.folderStructure, nextPath);
        if (folder) {
          this.updateCurrentFolder(folder, false);
        } else {
          console.warn('Folder not found in structure:', nextPath);
        }
      }
    },

    /**
     * Navigates up to the parent folder.
     */
    goUp() {
      if (this.canGoUp) {
        const parentPath = this.currentFolderPath.substring(0, this.currentFolderPath.lastIndexOf('/')) || 'local_disk';
        const parentFolder = this.findFolderByPath(this.folderStructure, parentPath);
        if (parentFolder) {
          this.updateCurrentFolder(parentFolder, true);
        } else {
          console.warn('Parent folder not found:', parentPath);
        }
      }
    },

    /**
     * Cancels the folder creation dialog.
     */
    cancelCreateFolder() {
      this.showCreateFolderDialog = false;
      this.newFolderName = '';
      this.selectedFolderType = 'organizational';
      this.selectedStorageType = '';
    },
  },
  mounted() {
    this.fetchFolderStructure();
    this.fetchFiles(this.currentFolderPath);

    // Initialize history if it's empty
    if (this.history.length === 0) {
      this.history.push(this.currentFolderPath);
      this.historyIndex = 0;
    }

  },
};
</script>

<style scoped>
/* Explorer Container */
.explorer-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* Header Styles */
.header {
  background-color: #2a302d; /* Dark background for header */
  color: #ffffff; /* White text for contrast */
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 2px solid #184f39; /* Slightly darker for separation */
}

.button-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Path Input Container */
.path-input-container {
  flex-grow: 1;
  overflow: hidden;
  transition: width 0.3s ease; /* Smooth transition for resizing */
}

/* Layout Styles */
.layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Resizable Left Pane */
.left-pane {
  background-color: #ffffff;
  border-right: 2px solid #206948;
  overflow-y: auto; /* Enable vertical scrolling */
  overflow-x: hidden; /* Prevent horizontal scroll */
}

/* Resizable Divider */
.divider {
  width: 8px; /* Increased width for better usability */
  cursor: col-resize;
  background-color: #ccc; /* Slightly darker for visibility */
  transition: background-color 0.2s ease; /* Smooth hover effect */
}

.divider:hover {
  background-color: #999; /* Darker on hover */
}

/* Right Pane Styles */
.right-pane {
  flex-grow: 1;
  padding: 10px;
  overflow-y: auto;
  background-color: #f9f9f9; /* Light background for contrast */
}

/* Loading Container */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

/* File List Styles */
.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* File Item Styles */
.file-item {
  display: flex;
  align-items: center;
  padding: 5px;
  cursor: pointer;
  color: #000; /* Ensure visible text */
  max-width: 300px; /* Limit width for highlight */
  transition: background-color 0.3s ease, color 0.3s ease;
}

.file-item:hover {
  background-color: #62a583;
  color: #fff; /* Ensure visibility on hover */
}

.file-item.selected {
  background-color: #e0f7fa;
  color: #000; /* Ensure contrast when selected */
}

.file-item.hovered {
  background-color: #f5f5f5;
}

.file-item .v-icon {
  margin-right: 8px;
  color: inherit; /* Match the text color */
}

/* No Files Message */
.no-files {
  text-align: center;
  color: #777;
  margin-top: 20px;
}

/* Context Menu Styles */
.context-menu {
  position: absolute;
  background-color: #ffffff;
  border: 1px solid #ddd;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  padding: 5px 0;
  border-radius: 4px;
}

.context-menu-item {
  padding: 8px 20px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.context-menu-item:hover {
  background-color: #f5f5f5;
}

.context-menu-item:disabled {
  color: #ccc;
  cursor: not-allowed;
}

/* Dialog Styles */
.v-dialog .v-card {
  padding: 20px;
}

.v-card-title {
  font-weight: bold;
}

/* Additional Styles for Buttons */
.v-btn {
  transition: background-color 0.3s ease;
}

.v-btn:hover {
  background-color: rgba(0, 0, 0, 0.1); /* Light hover effect */
}

.v-icon {
  color: inherit; /* Ensure icons inherit the button's text color */
}
</style>
