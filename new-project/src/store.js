import { createStore } from 'vuex';
import createPersistedState from 'vuex-persistedstate';


export default createStore({
  state: {

    user: null, // Store the user object here
 
    // Set the initial currentDate to today's date
    currentDate: new Date().toISOString().slice(0, 10),

    // In here is the value of the selected template from UserOptionsPage
    selectedTemplate: {
      fileId: null,
      bucketName: null,
    },

    // Input fields state variables
    dynamicInputs: [],
    dateFields: [],
    dropdownMenus: [],
    dynamicDateFields: [],
    isNavigatingBack: false,  // Default to false

    // State property for table(structured and flattened) in DynamicTablePage.vue
    tableData: {},
    structuredTableData: [],

    // State property for sections in CheckboxPage.vue
    sections: {},

    fileId: null, // New global state for fileId

    emptyTableTags: {},

    hyperlinkTags: {}, // New state for hyperlink tags

    tooltipTags: {},

    tooltipPlaceholders: {},
    

    collatedTags: {},

    dynamicTitle: 'Untitled Proposal', // Default value
    showSnackbar: false, // Add this
    snackbarMessage: '', // Add this
    toolbarTitle: '',
    toolbarPlaceholders: {},

    modifiedFileId: null,
    tempBucketName: null,
    modifiedFilename: null,
    // Phase 1 stabilization: canonical post-dropdown working artifact identity
    workingDocumentArtifact: null,
    tagsState: {}, // To store tags with their placeholders as values
    tableTags: [], // New state for table tags
    allTags: {}, // Holds all tags with their tag names as values
    selectedOptions: {}, // Initialize with an empty object
    processedText: '', 
    toggleTags: [],

 

    
  },
  mutations: {

    saveToggleTags(state, toggleTags) {
      state.toggleTags = toggleTags;
    },

    setProcessedText(state, processedText) {
      console.log("Setting processedText in Vuex:", processedText);
      state.processedText = processedText;
    },
    

      updateSelectedOptions(state, dataModel) {
        console.log('Before Updating Vuex State:', JSON.stringify(state.selectedOptions, null, 2));
        state.selectedOptions = dataModel;
        console.log('After Updating Vuex State:', JSON.stringify(state.selectedOptions, null, 2));
      },

    

    setUser(state, user) {
      console.log('Mutation setUser called with:', user);
      state.user = user; // Save user data to state
      console.log('Updated Vuex user state:', state.user);
    },

    setAllTags(state, tags) {
      state.allTags = tags; // Assign tags to the state
      console.log('This is the content of all the tags present in the document:', JSON.stringify(state.allTags, null, 2));
    },
    
    

    setTableTags(state, tags) {
      state.tableTags = tags;
    },

    setTagsState(state, tags) {
      state.tagsState = { ...tags }; // Overwrite or update the tags state
    },
    

    setModifiedFileId(state, fileId) {
      state.modifiedFileId = fileId;
    },
    setTempBucketName(state, bucketName) {
      state.tempBucketName = bucketName;
    },
    setModifiedFilename(state, filename) {
      state.modifiedFilename = filename;
    },
    setWorkingDocumentArtifact(state, artifact) {
      state.workingDocumentArtifact = artifact;
    },
    setSelectedTemplate(state, template) {
      state.selectedTemplate = template;
    },

    
    setToolbarPlaceholders(state, placeholders) {
      console.log('saveToolbarPlaceholders mutation called with:', placeholders); // Debugging
      state.toolbarPlaceholders = { ...state.toolbarPlaceholders, ...placeholders };
      console.log('Updated state.toolbarPlaceholders:', state.toolbarPlaceholders); // Debugging
    },

    setToolbarTitle(state, title) {
      console.log('setToolbarTitle called with:', title); // Log the received title
      state.toolbarTitle = title; // Update the state
      console.log('Updated toolbarTitle in state:', state.toolbarTitle); // Log the updated state
    },

    SET_SHOW_SNACKBAR(state, value) {
      state.showSnackbar = value;
    },
    SET_SNACKBAR_MESSAGE(state, message) {
      state.snackbarMessage = message;
    },

    SET_DYNAMIC_TITLE(state, title) {
      console.log('Setting dynamicTitle in Vuex:', title); // Add debug log
      state.dynamicTitle = title; // Update the dynamic title
    },
  

    saveCollatedTags(state, tags) {
      state.collatedTags = tags;
    },

    SET_TOOLTIP_TAGS(state, tags) {
      if (!tags) {

        return;
      }
 
      state.tooltipTags = { ...state.tooltipTags, ...tags };
    },
    SET_TOOLTIP_PLACEHOLDERS(state, placeholders) {
      if (!placeholders) {
        return;
      }
      
      console.log('Tooltip Placeholders Added to Vuex:', placeholders);
      state.tooltipPlaceholders = { ...state.tooltipPlaceholders, ...placeholders };
    },
    
    SET_HYPERLINK_TAGS(state, hyperlinkTags) {
      if (!hyperlinkTags) {
       
        return;
      }
      console.log('Tooltip Hyperlinks Added to Vuex:', hyperlinkTags);
      state.hyperlinkTags = { ...state.hyperlinkTags, ...hyperlinkTags };
    },

    setEmptyTableTags(state, tags) {
      state.emptyTableTags = tags; // Mutation to set the empty table tags
   
    },
    
    
    // Set the initial currentDate to today's date
    updateCurrentDate(state) {
      console.log('this is the content of the current date:', state.currentDate)
      state.currentDate = new Date().toISOString().slice(0, 10);
    },

    // This is the group of dynamic fields from Input Fields Page mutation
    setDynamicInputs(state, dynamicInputs) {
      console.log('Previous dynamic inputs in Vuex:', state.dynamicInputs); // Log the current state
      state.dynamicInputs = dynamicInputs; // Update the state
      console.log('Updated dynamic inputs in Vuex:', state.dynamicInputs); // Log the new state
    },

    // Input fields mutations variables
    updateDropdownMenus(state, dropdownMenus) {
      state.dropdownMenus = dropdownMenus;
      
    },
    updateDynamicDateField(state, dateField) {
      const index = state.dynamicDateFields.findIndex(df => df.id === dateField.id);
      if (index !== -1) {
        state.dynamicDateFields.splice(index, 1, dateField);
      }
    },
    setDynamicDateFields(state, dynamicDateFields) {
      
      
      state.dynamicDateFields = dynamicDateFields;
      
    },
    setNavigatingBack(state, value) {
      
      state.isNavigatingBack = value;
    },
    updateDynamicField(state, { key, value }) {
      
      const field = state.dynamicInputs.find(input => input.id === key);
      if (field) {
        field.value = value;
      }
    },




    // Mutation for the flattened table data from DynamicTablePage.vue
    setTableData(state, data) {
      state.tableData = data;
      
    },
    // Mutation for the structured table data from DynamicTablePage.vue
    setStructuredTableData(state, tableData) {
      console.log('This is the content of the tags and tooltips for table with an empty value:', state.structuredTableData)
      state.structuredTableData = tableData;
      
    },

    
    setSections(state, sections) {
      
      state.sections = sections;
    },
    updateDateField(state, { id, value }) {
      const field = state.dateFields.find(f => f.id === id);
      if (field) field.value = value;
    },
    
    setFileId(state, fileId) {
      state.fileId = fileId;
      
    },

    // Reset mutation to clear all state properties
    resetState(state) {
      state.selectedTemplate = null;
      state.dynamicInputs = [];
      state.dropdownMenus = [];
      state.dynamicDateFields = [];
      state.structuredTableData = [];
      state.tableData = {};
      state.fileId = null;
      state.isNavigatingBack = false;
      state.sections = {};
      state.dateFields = [];
      state.dynamicTitle = '';
      state.showSnackbar = false; // Reset snackbar
      state.snackbarMessage = ''; // Reset message
      state.modifiedFileId = null;
      state.tempBucketName = null;
      state.modifiedFilename = null;
      state.workingDocumentArtifact = null;
      state.tooltipPlaceholders = {};
      state.tooltipTags = {};
      state.collatedTags = {};
      state.hyperlinkTags ={};
    },

    resetDynamicInputs(state) {
      state.dynamicInputs = [];
    },
  },

  actions: {

    saveToggleTags({ commit }, toggleTags) {
      commit('saveToggleTags', toggleTags);
    },

    saveProcessedText({ commit }, processedText) {
      commit('setProcessedText', processedText);
    },
    
    updateSelectedOptions({ commit }, dataModel) {
      console.log('Action: Updating selected options in Vuex...');
      commit('updateSelectedOptions', dataModel);
      console.log('Mutation committed successfully.');
    },

    setUser({ commit }, user) {
      console.log('Action setUser called with:', user);
      commit('setUser', user); // Commit mutation
    },

    updateAllTags({ commit }, tags) {
      console.log('Vuex Action - updateAllTags received:', JSON.stringify(tags, null, 2));
      commit('setAllTags', tags);
    },
    
    

    saveTableTags({ commit }, tags) {
      commit('setTableTags', tags);
    },
    setWorkingDocumentArtifact({ commit }, artifact) {
      commit('setWorkingDocumentArtifact', artifact);
    },

    updateTagsState({ commit }, tags) {
      commit('setTagsState', tags); // Commit to the state
    },
    

    saveToolbarPlaceholders({ commit }, placeholders) {
      console.log('Action saveToolbarPlaceholders dispatched with:', placeholders); // Debugging
      commit('setToolbarPlaceholders', placeholders); // Commit the mutation
    },


    showSnackbar({ commit }, message) {
      commit('SET_SNACKBAR_MESSAGE', message);
      commit('SET_SHOW_SNACKBAR', true);
    },

    updateDynamicTitle({ commit }, title) {
      console.log('Dispatching SET_DYNAMIC_TITLE with:', title); // Add debug log
      commit('SET_DYNAMIC_TITLE', title); // Commit the title change
    },


    saveCollatedTags({ commit }, tags) {
      commit("saveCollatedTags", tags);
    },

    saveHyperlinkTags({ commit }, hyperlinkTags) {
      if (!hyperlinkTags) {
       
        return;
      }
      commit('SET_HYPERLINK_TAGS', hyperlinkTags);
    },

    saveTooltipTags({ commit }, tags) {
      if (!tags) {
      
        return;
      }
      commit('SET_TOOLTIP_TAGS', tags);
    },
    saveTooltipPlaceholders({ commit }, placeholders) {
      if (!placeholders) {
  
        return;
      }
      commit('SET_TOOLTIP_PLACEHOLDERS', placeholders);
    },

    saveEmptyTableTags({ commit }, tags) {
      commit('setEmptyTableTags', tags); // Action to commit the mutation
    },
  
    // Input fields actions variables
    updateDropdownMenus({ commit }, dropdownMenus) {
      commit('updateDropdownMenus', dropdownMenus);
    },
    updateDynamicDateField({ commit }, dateField) {
      commit('updateDynamicDateField', dateField);
    },
    setDynamicDateFields({ commit }, dynamicDateFields) {
    
      commit('setDynamicDateFields', dynamicDateFields);
    },
    updateDynamicField({ commit }, payload) {
      commit('updateDynamicField', payload);
    },

    // From user options page for saving to state the selected template
    updateSelectedTemplate({ commit }, template) {
      commit('setSelectedTemplate', template);
    },
    // From user options page for updating the selected template value when it is changed.
    updateDynamicInputs({ commit }, dynamicInputs) {
      commit('setDynamicInputs', dynamicInputs);
    },



    // Action to update sections in CheckboxPage.vue
    updateSections({ commit }, sections) {
      commit('setSections', sections);
    },
  

    // Action for the flattened table data from DynamicTablePage.vue
    saveTableData({ commit }, data) {
      commit('setTableData', data);
    },
    // Action for the structured table data from DynamicTablePage.vue
    saveStructuredTableData({ commit }, tableData) {
      commit('setStructuredTableData', tableData);
    },

    setFileId({ commit }, fileId) {
      commit('setFileId', fileId);
    },

    resetStore({ commit }) {
      commit('resetState');
    },

    resetDynamicInputs({ commit }) {
      commit('resetDynamicInputs');
    },
  },

  getters: {
    getToggleTags(state) {
      return state.toggleTags;
    },
    getProcessedText(state) {
      return state.processedText;
    },
    getTagsState: (state) => state.tagsState,
    getFileId: (state) => state.fileId,
    getHyperlinkTags: (state) => state.hyperlinkTags,
    getTooltipTags: (state) => state.tooltipTags,
    getTooltipPlaceholders: (state) => state.tooltipPlaceholders,
    getCollatedTags: (state) => state.collatedTags,
    getDynamicTitle: (state) => state.dynamicTitle,
    getSnackbarMessage: (state) => state.snackbarMessage,
    getStructuredTableData: (state) => state.structuredTableData,
    getToolbarPlaceholders: (state) => {
      console.log('Accessing toolbarPlaceholders from Vuex:', state.toolbarPlaceholders);
      return state.toolbarPlaceholders;
    },    
    getTableTags(state) {
      return state.tableTags;
    },
    getSelectedOptions(state) {
      return state.selectedOptions;
    },
    // ... other getters
  },

  plugins: [
    createPersistedState({
      storage: window.localStorage,
      paths: [        
        'year', 
        'quarter', 
        'selectedTemplate',
        'workingDocumentArtifact',
        'showSnackbar', // Persist these if needed
        'snackbarMessage',
        'dynamicTitle',
        'user',
      
      ],
    }),
  ],
  
});
