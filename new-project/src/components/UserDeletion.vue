<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card outlined elevated>
          <v-card-title>Delete User</v-card-title>
          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="users"
              class="elevation-1"
            >
              <!-- Checkbox and Username Column -->
              <template v-slot:[`item.username`]="{ item }">
                <div class="d-flex align-center">
                  <v-checkbox
                    v-model="selectedUsers"
                    :value="item._id"
                    class="mr-2"
                  ></v-checkbox>
                  <span>{{ item.username }}</span>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
          <v-card-actions>
            <v-btn @click="confirmDelete" color="red">Delete Selected Users</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="dialog" max-width="400">
      <v-card>
        <v-card-title>Confirmation</v-card-title>
        <v-card-text>Are you sure you want to delete the selected users?</v-card-text>
        <v-card-actions>
          <v-btn @click="deleteUsers" color="primary">OK</v-btn>
          <v-btn @click="dialog = false" color="grey">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      users: [], // This will be populated with the list of users
      selectedUsers: [], // Tracks selected user IDs
      dialog: false, // Controls the visibility of the confirmation dialog
      headers: [
        { text: 'Username', value: 'username' }, // Define the headers for the table
        { text: 'Actions', value: 'actions', sortable: false } // Placeholder for possible actions column
      ],
    };
  },
  mounted() {
    this.fetchUsers();
  },
  methods: {
    async fetchUsers() {
      try {
        const apiUrl = process.env.VUE_APP_API_URL || '/api';
        const response = await fetch(`${apiUrl}/users`);
        const data = await response.json();
        this.users = data;
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    },
    confirmDelete() {
      if (this.selectedUsers.length === 0) {
        this.$emit('show-toast', 'No users selected for deletion.');
        return;
      }
      this.dialog = true;
    },
    async deleteUsers() {
      const selectedUserIds = this.selectedUsers;

      try {
        const apiUrl = process.env.VUE_APP_API_URL || '/api';
        const response = await fetch(`${apiUrl}/delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userIds: selectedUserIds })
        });
        const data = await response.json();

        if (data.message === 'Users deleted successfully') {
          this.selectedUsers = []; // Clear selection
          this.dialog = false; // Close dialog
          this.fetchUsers(); // Refresh user list
          this.$emit('show-toast', 'Selected users have been deleted.');
        } else {
          console.error('Error deleting users:', data.message);
          this.$emit('show-toast', `Error: ${data.message}`);
        }
      } catch (error) {
        console.error('Error deleting users:', error);
        this.$emit('show-toast', 'An error occurred while deleting users.');
      }
    },
    goBack() {
      this.$router.push({ name: 'adminDashboard' });
    }
  }
};
</script>

<style scoped>
.custom-drawer {
  height: 80vh;
  border-radius: 16px;
}
</style>
