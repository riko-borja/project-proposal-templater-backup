<template>
  <v-container fluid fill-height class="login-shell">
    <v-row class="fill-height" justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4" class="login-col">
        <v-card class="login-card" rounded="xl">
          <v-card-text>
            <v-card-title class="login-title">Login</v-card-title>
            <p class="login-subtitle">Sign in to continue to Proposal Builder</p>
            <v-form @submit.prevent="handleSubmit">
              <v-text-field
                v-model="username"
                label="Username"
                required
                type="text"
                color="primary"
                variant="solo"
                prepend-inner-icon="mdi-account-outline"
                :disabled="isSubmitting"
                class="login-input"
              />
              <v-text-field
                v-model="password"
                label="Password"
                required
                :type="showPassword ? 'text' : 'password'"
                color="primary"
                variant="solo"
                prepend-inner-icon="mdi-lock-outline"
                :disabled="isSubmitting"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
                class="login-input"
              />
              <v-btn type="submit" color="primary" block class="login-submit" :loading="isSubmitting" :disabled="isSubmitting">
                Login
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-snackbar v-model="snackbar" :timeout="3000" color="error">
      {{ snackbarMessage }}
      <v-btn text @click="snackbar = false">Close</v-btn>
    </v-snackbar>
  </v-container>
</template>


<script>
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ref } from 'vue';

export default {
  name: 'LogIn',
  setup() {
    const router = useRouter();
    const store = useStore();

    // Reactive data properties
    const username = ref('');
    const password = ref('');
    const showPassword = ref(false);
    const isSubmitting = ref(false);
    const snackbar = ref(false);
    const snackbarMessage = ref('');

    // Methods
    const handleSubmit = async () => {
      if (isSubmitting.value) {
        return;
      }

      isSubmitting.value = true;
      try {
        const apiUrl = process.env.VUE_APP_API_URL || '/api';
        const response = await fetch(`${apiUrl}/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.value, password: password.value }),
        });

        const data = await response.json();

        if (response.ok) {
          // Store user information in localStorage
          localStorage.setItem('username', username.value);
          localStorage.setItem('jwtToken', data.token);

          // Dispatch user data to Vuex
          store.dispatch('setUser', data.user);

          // Navigate to the appropriate page
          if (data.firstLogin) {
            router.replace({ name: 'welcomePage' });
          } else if (data.user.role === 'Admin') {
            router.replace({ name: 'adminDashboard' });
          } else {
            router.replace({ name: 'selectCategory' });
          }

          // Clear input fields only on successful login
          username.value = '';
          password.value = '';
          showPassword.value = false;
        } else {
          // Handle invalid credentials
          snackbarMessage.value = 'Invalid username or password';
          snackbar.value = true;
        }
      } catch (error) {
        // Handle server error
        snackbarMessage.value = 'Server error';
        snackbar.value = true;
      } finally {
        isSubmitting.value = false;
      }
    };


    return {
      username,
      password,
      showPassword,
      isSubmitting,
      snackbar,
      snackbarMessage,
      handleSubmit,
    };
  },
};
</script>

<style scoped>
.login-shell {
  min-height: 100vh;
  background: linear-gradient(180deg, #eef4f8 0%, #f8fafc 100%);
}

.login-col {
  max-width: 480px;
}

.login-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.08);
}

.login-title {
  padding: 0;
  margin-bottom: 6px;
  font-size: 1.6rem;
  font-weight: 700;
}

.login-subtitle {
  margin: 0 0 18px;
  color: rgba(15, 23, 42, 0.72);
  font-size: 0.95rem;
}

.login-input {
  margin-bottom: 6px;
}

.login-submit {
  margin-top: 8px;
  font-weight: 600;
}
</style>
