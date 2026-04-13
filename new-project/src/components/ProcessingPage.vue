<template>
  <v-app>
    <v-main>
      <v-container class="text-center">
        <v-progress-circular indeterminate color="primary" size="100"></v-progress-circular>
        <p class="mt-4">Processing your document, please wait...</p>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'ProcessingPage',
  created() {
    setTimeout(() => {
      this.$router.push({ name: 'EditorPage' });
    }, 3000);
  },
};
</script>

<style scoped>
.text-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.mt-4 {
  margin-top: 1.5rem;
}
</style>
