<template>
  <v-app>
    <!-- AppBar -->
    <v-app-bar app color="white" elevation="0" class="context-app-bar">
      <v-toolbar-title class="layout-toolbar-title">
        <span class="context-label">You are currently creating:</span>
        <span class="dynamic-title">{{ formattedDynamicTitle }}</span>
      </v-toolbar-title>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="context-main">
      <slot />
    </v-main>

    <!-- Global Snackbar -->
    <v-snackbar
      v-model="showSnackbar"
      color="info"
      timeout="3000"
      top
    >
      {{ snackbarMessage }}
      <template v-slot:actions>
        <v-btn color="pink" variant="text" @click="closeSnackbar">Close</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script>
import { computed } from 'vue';
import { useStore } from 'vuex';

export default {
  setup() {
    const store = useStore();

    // Access Vuex state for snackbar visibility and message
    const showSnackbar = computed({
      get: () => store.state.showSnackbar,
      set: (value) => store.commit('SET_SHOW_SNACKBAR', value),
    });

    const snackbarMessage = computed(() => store.state.snackbarMessage);

    // Access Vuex getter for dynamic title
    const formattedDynamicTitle = computed(() => {
      const title = store.getters.getDynamicTitle || 'Untitled Proposal';
      return typeof title === 'string' ? title.replace(/\.docx$/i, '') : 'Untitled Proposal';
    });

    const closeSnackbar = () => {
      showSnackbar.value = false; // Close the snackbar
    };

    return {
      showSnackbar,
      snackbarMessage,
      formattedDynamicTitle,
      closeSnackbar,
    };
  },
};
</script>

<style scoped>
.context-app-bar {
  background: linear-gradient(180deg, #f8fbff 0%, #f3f8ff 100%);
  border-top: 1px solid rgba(15, 23, 42, 0.05);
  border-bottom: 1px solid rgba(29, 78, 216, 0.16);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.07);
}

.context-main {
  padding-top: 10px;
}

.layout-toolbar-title {
  display: flex;
  align-items: center;
  max-width: 100%;
  min-width: 0;
}

.context-label {
  color: rgba(15, 23, 42, 0.62);
  font-weight: 600;
  font-size: 0.82rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.dynamic-title {
  margin-left: 8px;
  display: inline-block;
  max-width: 65vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
  color: #1e40af;
  font-weight: 600;
  font-size: 1rem;
}
</style>
  
