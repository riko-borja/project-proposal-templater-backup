<template>
  <v-container>
    <v-card class="pa-5">
      <v-card-title>Create a New Category</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="createCategory">
          <v-text-field
            v-model="categoryName"
            label="Enter Category Name"
            placeholder="E.g., ProjectDocs"
            required
          ></v-text-field>
          <v-btn type="submit" color="primary">Create Category</v-btn>
        </v-form>
        <v-alert v-if="successMessage" type="success" dismissible>{{ successMessage }}</v-alert>
        <v-alert v-if="errorMessage" type="error" dismissible>{{ errorMessage }}</v-alert>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      categoryName: '',
      successMessage: '',
      errorMessage: '',
    };
  },
  computed: {
    formattedCategoryName() {
      // Only prepend the prefix without displaying it
      const prefix = 'cat_';
      return `${prefix}${this.categoryName.trim()}`;
    },
  },
  methods: {
  async createCategory() {
    try {
      // Send the formatted category name to the backend
      const response = await axios.post('/api/create-category', {
        categoryName: this.formattedCategoryName,
      });
      
      // Log the response to check what is returned by the server
      console.log('Server response:', response.data);
      
      // Display success message based on response from the server
      if (response.data && response.data.message) {
        this.successMessage = response.data.message;
      } else {
        this.successMessage = `Category "${this.formattedCategoryName}" created successfully!`;
      }
      
      this.errorMessage = '';
      this.categoryName = ''; // Clear the input field
    } catch (error) {
      console.error('Error creating category:', error);
      
      // Display error message based on the error response
      if (error.response && error.response.data && error.response.data.message) {
        this.errorMessage = error.response.data.message;
      } else {
        this.errorMessage = 'Failed to create category. Please try again.';
      }
      
      this.successMessage = '';
    }
  },
},

};
</script>

<style scoped>
.v-card {
  margin-top: 20px;
}
</style>
