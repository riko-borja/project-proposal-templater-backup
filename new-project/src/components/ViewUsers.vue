<template>
  <v-container fluid>
    <v-row justify="center" class="fill-height">
      <v-col cols="12" md="12">
        <v-card outlined>
          <v-card-title>
            Registered Users
          </v-card-title>

          <v-card-subtitle>
            Below is the list of users registered in the app.
          </v-card-subtitle>

          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="paginatedUsers"
              item-key="username"
              class="elevation-1"
              dense
              hide-default-footer
              :items-per-page="5"
              style="min-height: 400px;"
            >
              <template v-slot:[`item.actions`]="{ item }">
                <v-btn
                  icon
                  @click="viewDetails(item)"
                  color="primary"
                  :style="{ width: '24px', height: '24px', padding: '2px', 'margin-right': '8px' }"
                >
                  <v-icon size="12">mdi-pencil</v-icon>
                </v-btn>

                <v-btn
                  icon
                  @click="deleteUser(item)"
                  color="red darken-2"
                  :style="{ width: '24px', height: '24px', padding: '2px' }"
                >
                  <v-icon size="12">mdi-delete</v-icon>
                </v-btn>
              </template>

              <template v-slot:no-data>
                <v-alert type="info" text>
                  No users found. Please try again later.
                </v-alert>
              </template>
            </v-data-table>
          </v-card-text>

          <v-card-actions>
            <v-pagination
              v-model="currentPage"
              :length="pageCount"
              total-visible="5"
              circle
            ></v-pagination>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="editDialog" max-width="600px">
      <v-card>
        <v-card-title class="headline">User Details</v-card-title>
        <v-card-text>
          <v-form>
            <v-text-field v-model="selectedUser.username" label="Username" disabled></v-text-field>
            <v-text-field v-model="selectedUser.emailId" label="Email" required></v-text-field>
            <v-select v-model="selectedUser.role" :items="roleOptions" label="Application Role" required></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="saveUser">Save</v-btn>
          <v-btn color="secondary" @click="editDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <div class="text-center">
      <v-snackbar
        v-model="snackbar"
        :timeout="timeout"
      >
        {{ text }}
        <template v-slot:actions>
          <v-btn color="blue" variant="text" @click="snackbar = false">Close</v-btn>
        </template>
      </v-snackbar>
    </div>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      users: [],
      headers: [
        { text: 'Username', value: 'username' },
        { text: 'Actions', value: 'actions', sortable: false },
      ],
      currentPage: 1,
      itemsPerPage: 5,
      editDialog: false,
      roleOptions: ['Admin', 'User'],
      selectedUser: {},
      snackbar: false,
      text: 'User updated successfully!',
      timeout: 2000,
    };
  },
  computed: {
    pageCount() {
      return Math.ceil(this.users.length / this.itemsPerPage);
    },
    paginatedUsers() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.users.slice(start, end);
    },
  },
  mounted() {
    this.fetchUsers();
  },
  methods: {
    async fetchUsers() {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        this.users = data;
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    },
    viewDetails(user) {
      this.selectedUser = user;
      this.editDialog = true;
    },
    async saveUser() {
      try {
        const { _id, username, role, emailId } = this.selectedUser;
        const response = await fetch(`/api/users/update-user/${_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, role, emailId }),
        });

        if (!response.ok) {
          throw new Error('Failed to update user');
        }

        this.editDialog = false;
        this.fetchUsers();
        this.snackbar = true;
      } catch (error) {
        console.error('Error updating user:', error);
      }
    },

    async deleteUser(user) {
      const confirmed = confirm(`Are you sure you want to delete user ${user.username}?`);
      if (confirmed) {
        try {
          const response = await fetch('/api/users/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: [user._id] }),
          });
          if (!response.ok) {
            throw new Error('Failed to delete user');
          }
          alert('User deleted successfully!');
          this.fetchUsers();
        } catch (error) {
          console.error('Error deleting user:', error);
        }
      }
    },
    goBack() {
      this.$router.push({ name: 'adminDashboard' });
    },
  },
};
</script>

<style scoped>
.v-card-title {
  font-size: 1.25rem;
  font-weight: 500;
  color: #3f51b5;
}

.v-btn {
  font-size: 1rem;
}

.v-data-table {
  min-height: 300px;
}

.v-pagination {
  justify-content: center;
}
</style>
