<template>
  <v-container fluid class="welcome-page" fill-height>
    <v-row class="fill-height" justify="center" align="center">
      <v-col cols="12" sm="9" md="7" lg="5">
        <v-card class="pa-6 pa-sm-8 welcome-card" rounded="xl">
          <v-card-title class="text-center justify-center">
            <h2 class="welcome-title">Welcome to Proposal Builder</h2>
          </v-card-title>
          <p class="welcome-subtitle">
            Let's get you set up to create accurate and professional proposals quickly.
          </p>
          <v-card-text>
            <p class="welcome-copy">
              This system will guide you step-by-step through selecting categories, entering details, and generating structured proposals tailored to your needs.
            </p>
          </v-card-text>
          <v-divider></v-divider>
          <v-card-actions class="d-flex justify-center mt-4">
            <v-btn color="primary" @click="startApp" class="start-btn" size="large">
              Get Started
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: 'WelcomePage',
  methods: {
    startApp() {
      // Route through category selection so hierarchy is built before User Options.
      this.$router.replace({ name: 'selectCategory' });
    },
  },
};
</script>

<style scoped>
.welcome-page {
  background: linear-gradient(180deg, #eef3f8 0%, #f7f9fc 100%);
  min-height: 100vh;
}

.welcome-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.09);
}

.welcome-title {
  margin: 0;
  line-height: 1.2;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
}

.welcome-subtitle {
  margin: 6px 0 6px;
  text-align: center;
  color: rgba(15, 23, 42, 0.75);
  font-size: 1rem;
}

.welcome-copy {
  font-size: 1rem;
  line-height: 1.7;
  margin: 8px 0 10px;
  text-align: center;
  color: rgba(15, 23, 42, 0.86);
}

.start-btn {
  min-width: 160px;
  font-weight: 600;
  letter-spacing: 0.2px;
}
</style>

