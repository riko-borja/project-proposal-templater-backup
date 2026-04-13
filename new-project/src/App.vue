<template>
  <v-app>
    <div v-if="!$route.meta.hideHeader" class="header-wrapper">
      <v-app-bar
        app
        color="white"
        elevation="0"
        class="global-app-bar"
      >
        <v-toolbar-title class="header-title">Proposal Builder</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn @click="goToUploadForApproval" class="header-action-btn">
          <v-icon>mdi-cloud-upload-outline</v-icon>
          Upload for Approval
        </v-btn>
        <v-btn @click="logout" class="header-action-btn">
          <v-icon>mdi-logout</v-icon>
          Logout
        </v-btn>
      </v-app-bar>
    </div>

    <!-- Main Content -->
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
export default {
  methods: {
    logout() {
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('username');
      this.$router.replace({ name: 'login' });
    },
    goToUploadForApproval() {
      this.$router.push({ name: 'uploadForApproval' });
    },
  },
};
</script>

<style scoped>
.header-wrapper {
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.header-title {
  margin: 0;
  padding: 0 16px;
  font-weight: 600;
  color: #0f172a;
}

.global-app-bar {
  background: #ffffff;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.header-action-btn {
  color: #0f172a;
  font-weight: 500;
}
</style>
