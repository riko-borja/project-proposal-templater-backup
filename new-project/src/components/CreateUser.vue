<template>
  <v-container fluid>
    <v-row justify="center">
      <v-col cols="12" sm="8" md="8">
        <v-form ref="form" @submit.prevent="createUser" autocomplete="off">
          <v-text-field
            v-model="username"
            label="Username"
            required
            autocomplete="off"
          ></v-text-field>

          <v-text-field
            v-model="password"
            label="Password"
            type="password"
            required
            autocomplete="new-password"
          ></v-text-field>

          <v-text-field
            v-model="confirmPassword"
            label="Confirm Password"
            type="password"
            required
            autocomplete="new-password"
          ></v-text-field>

          <v-select v-model="role" :items="roleOptions" label="Application Role" required></v-select>
          <v-text-field v-model="emailId" label="Email Address" required :rules="[emailRule]" autocomplete="off" />
          <v-select v-if="false" v-model="documentrole" :items="documentroleOptions" label="Document Role" required></v-select>

          <v-btn @click="createUser" :disabled="!formIsValid">Create User</v-btn>
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      username: '',
      password: '',
      confirmPassword: '',
      role: null,
      emailId: '',
      documentrole: null,
      documentroleOptions: ['Owner', 'Approver'],
      roleOptions: ['Admin', 'User'],
      formIsValid: false,
      snackbar: false,
      snackbarMessage: '',
    };
  },
  computed: {
    passwordsMatch() {
      return this.password === this.confirmPassword;
    },
    emailRule() {
      return (v) => /.+@.+\..+/.test(v) || 'Email must be valid';
    },
  },
  methods: {
    async createUser() {
      if (!this.passwordsMatch) {
        this.snackbarMessage = 'Passwords do not match!';
        this.snackbar = true;
        return;
      }

      try {
        await fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: this.username,
            password: this.password,
            role: this.role,
            emailId: this.emailId,
            documentrole: this.documentrole,
          }),
        });

        this.snackbarMessage = 'User created successfully!';
        this.snackbar = true;

        this.username = '';
        this.password = '';
        this.confirmPassword = '';
        this.role = null;
        this.emailId = '';
        this.documentrole = null;
      } catch (error) {
        console.error('Error creating user:', error);
        this.snackbarMessage = 'Error creating user. Please try again.';
        this.snackbar = true;
      }
    },
    validateForm() {
      this.formIsValid = this.passwordsMatch && /.+@.+\..+/.test(this.emailId);
    },
  },
  watch: {
    password() {
      this.validateForm();
    },
    confirmPassword() {
      this.validateForm();
    },
    emailId() {
      this.validateForm();
    },
  },
};
</script>

<style scoped>
.v-text-field input,
.v-select input,
.v-text-field .v-label,
.v-select .v-label {
  color: #000000 !important;
}

.v-text-field .v-input__control,
.v-select .v-input__control {
  background-color: #232222 !important;
}

.v-btn {
  color: #fffdfd !important;
  background-color: #555555 !important;
}
</style>
