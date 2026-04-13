<template>
  <v-app>
    <!-- App Bar with Dynamic Color -->
    <v-app-bar :style="{ backgroundColor: headerColor }" app dark>
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>Admin Dashboard</v-toolbar-title>

      <v-spacer></v-spacer>

      <!-- User Actions -->
      <v-btn icon @click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Navigation Drawer with Dynamic Color -->
    <v-navigation-drawer
      app
      v-model="drawer"
      class="styled-drawer"
      temporary
    >
      <v-list dense>
        <!-- View Users -->
        <v-list-item @click="showDialog('viewUsers')" class="sidebar-item">
          <v-list-item-icon>
            <v-icon>mdi-account</v-icon>
          </v-list-item-icon>
          <v-list-item-title>View Users</v-list-item-title>
        </v-list-item>

        <!-- Create User -->
        <v-list-item @click="showDialog('createUser')" class="sidebar-item">
          <v-list-item-icon>
            <v-icon>mdi-account-plus</v-icon>
          </v-list-item-icon>
          <v-list-item-title>Create User</v-list-item-title>
        </v-list-item>

        <!-- Admin Field Manager -->
        <v-list-item @click="showDialog('adminFieldManager')" class="sidebar-item">
          <v-list-item-icon>
            <v-icon>mdi-account-plus</v-icon>
          </v-list-item-icon>
          <v-list-item-title>Admin Field Manager</v-list-item-title>
        </v-list-item>


        <!-- File Explorer -->
        <v-list-item @click="navigateToSimpleExplorer" class="sidebar-item">
          <v-list-item-icon>
            <v-icon>mdi-folder</v-icon>
          </v-list-item-icon>
          <v-list-item-title>File Explorer</v-list-item-title>
        </v-list-item>

        
        <!-- SharePoint -->
        <v-list-item @click="navigateToSharePoint" class="sidebar-item">
          <v-list-item-icon>
            <v-icon>mdi-folder</v-icon>
          </v-list-item-icon>
          <v-list-item-title>SharePoint</v-list-item-title>
        </v-list-item>

        <!-- Flow Chart -->
        <v-list-item @click="navigateToFlowChartComponent" class="sidebar-item">
          <v-list-item-icon>
            <v-icon>mdi-node-graph</v-icon>
          </v-list-item-icon>
          <v-list-item-title>Process Flow Chart</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>


    <!-- View Users Dialog -->
    <v-dialog v-model="dialogs.viewUsers" max-width="700">
      <v-card>
        <v-card-title>View Users</v-card-title>
        <v-card-text>
          <view-users />
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="closeDialog('viewUsers')">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create User Dialog -->
    <v-dialog v-model="dialogs.createUser" max-width="500">
      <v-card>
        <v-card-title>Create User</v-card-title>
        <v-card-text>
          <create-user />
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="closeDialog('createUser')">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Admin Field Manager Dialog -->
    <v-dialog v-model="dialogs.adminFieldManager" max-width="500">
      <v-card>
        <v-card-title>Admin Field Manager</v-card-title>
        <v-card-text>
          <admin-field-manager />
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="closeDialog('adminFieldManager')">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Main Content Container -->
    <v-main>
      <v-container fluid>
        <v-container fluid class="full-width-container pa-0">
          <v-row no-gutters>
            <v-col cols="12" class="d-flex">
              <!-- Document Trend Chart -->
              <DocumentTrendChart :documentTrendData="documentTrendData" />
            </v-col>
          </v-row>
        </v-container>

           <!-- High-Level Metric Cards -->
        <v-row class="mb-4">
          <v-col cols="12" md="3" v-for="(metric, index) in metrics" :key="index">
            <v-card class="pa-4" outlined>
              <v-text variant="h6">{{ metric.title }}</v-text>
              <v-text variant="h4" class="mt-2">{{ metric.value }}</v-text>
            </v-card>
          </v-col>
        </v-row>

    <!-- Group 1 -->
    <v-row class="section-gap align-stretch">
      <v-col cols="12" md="6" class="d-flex">
        <login-trends-chart :loginsData="loginTrendsData" class="full-height" />
      </v-col>
      <v-col cols="12" md="6" class="d-flex">
        <document-types-chart :documentTypesData="documentTypesData" class="full-height" />
      </v-col>
    </v-row>

    <!-- Group 2 -->
    <v-row class="section-gap align-stretch">
      <v-col cols="12" md="6" class="d-flex top-margin-adjust">
        <top-users-chart :topUsersData="topUsersData" class="custom-card-height" />
      </v-col>

      <v-col cols="12" md="6" class="d-flex">
        <v-card class="pa-4 custom-card-height" outlined>
          <v-row align="center" class="mb-4">
            <v-col>
              <v-text variant="h5" class="custom-title">User Statistics Panel</v-text>
            </v-col>
            <v-col cols="auto">
              <v-select
                v-model="selectedUser"
                :items="users"
                item-title="username"
                item-value="_id"
                label="Select User"
                variant="outlined"
                dense
                class="dropdown-fullwidth smaller-dropdown"
                @change="updateUserStatistics"
              />
            </v-col>
          </v-row>

          <v-divider class="my-2" />

          <user-activity-chart
            :total-logins="selectedUserLogins"
            :total-documents="selectedUserDocuments"
            :logins-today="loginsToday"
            :documents-today="documentsToday"
            :logins-this-week="loginsThisWeek"
            :documents-this-week="documentsThisWeek"
            :logins-this-month="loginsThisMonth"
            :documents-this-month="documentsThisMonth"
          />

          <v-text variant="h6" class="mb-2">Total Logins: {{ selectedUserLogins }}</v-text>
          <v-divider class="my-2" />
          <v-text variant="h6" class="mt-2">Total Documents: {{ selectedUserDocuments }}</v-text>
        </v-card>

      </v-col>
    </v-row>


        <!-- User Activity Table -->
        <v-row class="mt-4">
          <v-col cols="12">
            <v-card class="pa-4" outlined>
              <v-text variant="h5" class="custom-title">User Activity Table</v-text>

              <!-- Filter Dropdown for User Activity -->
              <v-select
                v-model="selectedActivityType"
                :items="activityTypeOptions"
                item-title="text"
                item-value="value"
                label="Select Activity Type"
                class="mb-4"
                dense
                variant="outlined"
              />
              <v-data-table
                :columns="tableHeaders"
                :items="filteredUserActivityData"
                :items-per-page="10"
                class="elevation-1"
                header-align="center"
                align="center"
                header-class="header-bold"
              >
                <template v-slot:body.cell.username="{ item }">
                  <div class="text-center">
                    <span>{{ item.username }}</span>
                  </div>
                </template>
                <template v-slot:body.cell.action="{ item }">
                  <div class="text-center">
                    <v-chip class="ma-2" color="primary" outlined>
                      {{ item.action }}
                    </v-chip>
                  </div>
                </template>
                <template v-slot:body.cell.documentType="{ item }">
                  <div class="text-center">
                    <v-chip class="ma-2" color="secondary" outlined>
                      {{ item.documentType }}
                    </v-chip>
                  </div>
                </template>
                <template v-slot:body.cell.timestamp="{ item }">
                  <div class="text-center">
                    <span>{{ item.timestamp }}</span>
                  </div>
                </template>
                <template v-slot:body.cell.metadata="{ item }">
                  <div class="text-center">
                    <span>{{ item.metadata }}</span>
                  </div>
                </template>
              </v-data-table>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>

import axios from 'axios';
import LoginTrendsChart from '@/components/LoginTrendsChart.vue';
import DocumentTypesChart from '@/components/DocumentTypesChart.vue';
import TopUsersChart from '@/components/TopUsersChart.vue';
import UserActivityChart from '@/components/UserActivityChart.vue';
import ViewUsers from '@/components/ViewUsers.vue';
import CreateUser from '@/components/CreateUser.vue';
import DocumentTrendChart from '@/components/DocumentTrendChart.vue';
import AdminFieldManager from '@/components/AdminFieldManager.vue';



export default {
  components: {
    LoginTrendsChart,
    DocumentTypesChart,
    DocumentTrendChart,
    TopUsersChart,
    UserActivityChart,
    ViewUsers,
    CreateUser,
    AdminFieldManager,
    
  },
  data() {
    return {
      headerColor: '#00897B', // Initial color for header 
      metrics: [
        { title: 'Total Users: ', value: null },
        { title: 'Active Users Today: ', value: null },
        { title: 'Logins Today: ', value: null },
        { title: 'Documents Generated Today: ', value: null }
      ],
      users: [],
      selectedUser: null,
      loginLogs: [], // All login logs
      documents: [], // All documents
      userActivityData: [],
      documentTrendData: [], // Filtered document data for the chart
      activityTypeOptions: [
      { text: 'All Activities', value: 'all' },
      { text: 'Logins', value: 'logins' },
      { text: 'Document Creations', value: 'documents' },
      ],
      tableHeaders: [
        { title: 'Username', key: 'username', align: 'center' },
        { title: 'Action', key: 'action', align: 'center' },
        { title: 'Document Type', key: 'documentType', align: 'center' },
        { title: 'Timestamp', key: 'timestamp', align: 'center' },
        { title: 'Metadata', key: 'metadata', align: 'center' },
      ],
        loginTrendsData: [], // Data for login trends
        documentTypesData: [], // Data for document types distribution
        topUsersData: [], // Data for top users by document generation
        selectedActivityType: 'all',

        drawer: false,
        dialogs: {
          viewUsers: false,
          createUser: false,
          adminFieldManager: false,
    },

    };
  },
  computed: {
    filteredUserActivityData() {
      if (this.selectedActivityType === 'logins') {
        return this.userActivityData.filter(
          activity => activity.action === 'Login'
        );
      } else if (this.selectedActivityType === 'documents') {
        return this.userActivityData.filter(
          activity => activity.action === 'Document Created'
        );
      } else {
        return this.userActivityData;
      }
    },
// These computed are for the user activity donut charts
selectedUsername() {
    return this.users.find(user => user._id === this.selectedUser)?.username || null;
  },
  selectedUserLogins() {
    if (!this.selectedUsername) {
      return 0;
    }
    return this.loginLogs.filter(log => log.username === this.selectedUsername).length;
  },
  selectedUserDocuments() {
    if (!this.selectedUser) {
      return 0;
    }
    return this.documents.filter(doc => doc.metadata?.userId === this.selectedUser).length;
  },
  loginsToday() {
    const today = new Date().toISOString().slice(0, 10);
    return this.loginLogs.filter(log => 
      log.username === this.selectedUsername && 
      log.loginTime.startsWith(today)
    ).length;
  },
  documentsToday() {
    const today = new Date().toISOString().slice(0, 10);
    return this.documents.filter(doc => {
      const uploadDate = new Date(doc.uploadDate).toISOString().slice(0, 10);
      return doc.metadata?.userId === this.selectedUser && uploadDate === today;
    }).length;
  },
  loginsThisWeek() {
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
    return this.loginLogs.filter(log => {
      const logDate = new Date(log.loginTime);
      return log.username === this.selectedUsername && logDate >= startOfWeek;
    }).length;
  },
  documentsThisWeek() {
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
    return this.documents.filter(doc => {
      const uploadDate = new Date(doc.uploadDate);
      return doc.metadata?.userId === this.selectedUser && uploadDate >= startOfWeek;
    }).length;
  },
  loginsThisMonth() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return this.loginLogs.filter(log => {
      const logDate = new Date(log.loginTime);
      return log.username === this.selectedUsername && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
    }).length;
  },
  documentsThisMonth() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return this.documents.filter(doc => {
      const uploadDate = new Date(doc.uploadDate);
      return doc.metadata?.userId === this.selectedUser && uploadDate.getMonth() === currentMonth && uploadDate.getFullYear() === currentYear;
    }).length;
  }
  },
  methods: {
    closeDialog(dialog) {
      this.dialogs[dialog] = false;
    },
    showDialog(dialog) {
      this.dialogs[dialog] = true;
    },
    updateUserStatistics() {
      if (this.selectedUser) {
        localStorage.setItem('selectedUser', this.selectedUser);
      }
    },
    navigateToSharePoint() {
      this.$router.push({ name: 'sharePoint' });
      this.drawer = false;
    },
    navigateToSimpleExplorer() {
      this.$router.push({ name: 'simpleExplorer' });
      this.drawer = false;
    },
    navigateToFlowChartComponent() {
      this.$router.push({ name: 'flowChartComponent' });
      this.drawer = false;
    },

    logout() {
      this.$router.push({ name: 'login' }); // Navigate to the login page
    },
    extractDocumentType(filename) {
    if (!filename) return 'Unknown';
    const nameWithoutExtension = filename.split('.').slice(0, -1).join('.');
    return nameWithoutExtension;
    },
    processLoginEvents(logins) {
      return logins.map(login => {
        const username = login.username || 'Unknown User';
        const timestamp = login.loginTime
          ? new Date(login.loginTime).toLocaleString()
          : 'Invalid Date';
        return {
          username,
          action: 'Login',
          documentType: '-',
          timestamp,
          metadata: login.ipAddress || 'N/A',
        };
      });
    },
    processDocumentEvents(documents, userIdToUsername) {
      return documents.map(doc => {
        const userId = doc.metadata?.userId;
        const username = userIdToUsername[userId] || 'Unknown User';
        const documentType = this.extractDocumentType(doc.filename);
        const timestamp = doc.uploadDate
          ? new Date(doc.uploadDate).toLocaleString()
          : 'Invalid Date';
        return {
          username,
          action: 'Document Created',
          documentType,
          timestamp,
          metadata: doc._id,
        };
      });
    },
    

    async fetchTotalUsers() {
      try {
        // Fetch all users from the existing endpoint
        const response = await axios.get('http://127.0.0.1:5001/api/users'); // Update the URL if needed

        // Calculate the total number of users
        const totalUsers = Array.isArray(response.data) ? response.data.length : 0;

        // Update the Total Users metric
        this.metrics[0].value = totalUsers;
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    },
    async fetchUserActivityData() {
      try {
        // Fetch data concurrently
        const [loginResponse, documentResponse, usersResponse] = await Promise.all([
          axios.get('http://127.0.0.1:5001/api/logs'),
          axios.get('http://127.0.0.1:5001/api/files/documents'),
          axios.get('http://127.0.0.1:5001/api/users'),
        ]);

        // Validate and initialize data
        const logins = Array.isArray(loginResponse.data) ? loginResponse.data : [];
        const documents = Array.isArray(documentResponse.data) ? documentResponse.data : [];
        const users = Array.isArray(usersResponse.data) ? usersResponse.data : [];

        // Create userId to username mapping
        const userIdToUsername = {};
        users.forEach(user => {
          userIdToUsername[user._id] = user.username;
        });

        // Process events
        const loginEvents = this.processLoginEvents(logins);

        const documentEvents = this.processDocumentEvents(documents, userIdToUsername);

        // Combine, validate, and sort events
        this.userActivityData = [...loginEvents, ...documentEvents]
          .filter(event => event.timestamp && !isNaN(new Date(event.timestamp)))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      } catch (error) {
        console.error('Error fetching user activity data:', error);

        // Ensure fallback values
        this.userActivityData = [];
      }
    },

    async fetchDocumentTrendData() {
      try {
        // Fetch documents from the endpoint
        const documentResponse = await axios.get('http://127.0.0.1:5001/api/files/documents');
        const documents = Array.isArray(documentResponse.data) ? documentResponse.data : [];

        // Structure document data for the chart
        const dailyData = {};

        documents.forEach(item => {
          // Use the original timestamp and set the date to midnight in Gulf Standard Time
          const date = new Date(item.uploadDate);
          date.setHours(0, 0, 0, 0); // Normalize to midnight in local time
          
          // Calculate Gulf Standard Time by converting local midnight to UTC + 4 hours
          const gulfStandardTime = date.getTime() + (4 * 60 * 60 * 1000);

          const dayKey = gulfStandardTime;

          // Prepare entries by type, using the Gulf Standard Time timestamp as `x`
          const docType = item.filename.split('.')[0]; // Assuming document type from filename prefix
          if (!dailyData[dayKey]) {
            dailyData[dayKey] = {};
          }
          dailyData[dayKey][docType] = (dailyData[dayKey][docType] || 0) + 1;
        });

        // Format data for the chart with Gulf Standard Time timestamps
        this.documentTrendData = Object.entries(dailyData).flatMap(([timestamp, docCounts]) => {
          return Object.entries(docCounts).map(([docType, count]) => ({
            docType,
            x: parseInt(timestamp, 10), // Use Gulf Standard Time timestamp directly
            y: count,
          }));
        });

      } catch (error) {
        console.error('Error fetching document trend data:', error);
        this.documentTrendData = [];
      }
    },


    async fetchLoginsToday() {
      try {
        // Fetch all login logs from the endpoint
        const response = await axios.get('http://127.0.0.1:5001/api/logs');
        const logs = Array.isArray(response.data) ? response.data : [];

        // Calculate logins that occurred today
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        const loginsToday = logs.filter(log => {
          const loginDate = new Date(log.loginTime).toISOString().split('T')[0];
          return loginDate === today;
        }).length;

        // Update the Logins Today metric
        this.metrics[2].value = loginsToday;
      } catch (error) {
        console.error('Error fetching logins today:', error);
      }
    },

    async fetchDocumentsToday() {
      try {
        const response = await axios.get('http://127.0.0.1:5001/api/files/documents');
        const documents = Array.isArray(response.data) ? response.data : [];

        // Calculate documents generated today
        const today = new Date().toISOString().split('T')[0];
        const documentsToday = documents.filter(doc => {
          const uploadDate = new Date(doc.uploadDate).toISOString().split('T')[0];
          return uploadDate === today;
        }).length;

        // Update the Documents Generated Today metric
        this.metrics[3].value = documentsToday;
      } catch (error) {
        console.error('Error fetching documents today:', error);
      }
    },

    async fetchActiveUsersToday() {
      try {
        // Fetch user logs from the correct endpoint
        const response = await axios.get('http://127.0.0.1:5001/api/logs/userlogs');

        // Validate if the response is an array
        const logs = Array.isArray(response.data) ? response.data : [];

        // Filter logs for today
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = logs.filter(log => {
          const loginDate = new Date(log.loginTime).toISOString().split('T')[0];
          return loginDate === today;
        });

        // Group logs by username
        const userSessions = {};
        todayLogs.forEach(log => {
          if (!userSessions[log.username]) {
            userSessions[log.username] = [];
          }
          userSessions[log.username].push(new Date(log.loginTime));
        });

        // Calculate total active time for each user
        const activeUsers = Object.keys(userSessions).filter(username => {
          const sessions = userSessions[username];
          let totalActiveTime = 0; // in minutes

          // Calculate active time from login sessions
          for (let i = 0; i < sessions.length - 1; i++) {
            const diff = (sessions[i + 1] - sessions[i]) / (1000 * 60); // convert to minutes
            totalActiveTime += diff;
          }

          // Check if total active time is at least 30 minutes
          return totalActiveTime >= 1;
        });

        // Update the Active Users Today metric
        this.metrics[1].value = activeUsers.length;
      } catch (error) {
        console.error('Error fetching active users today:', error);
      }
    },
    async fetchLogins() {
      try {
        const response = await axios.get('http://127.0.0.1:5001/api/logs');
        const logs = Array.isArray(response.data) ? response.data : [];

        // Format login data for the chart
        this.formatLoginTrendsData(logs);
      } catch (error) {
        console.error('Error fetching logins:', error);
      }
    },

    formatLoginTrendsData(logs) {
      const loginsByDay = logs.reduce((acc, log) => {
        const loginDate = new Date(log.loginTime).toISOString().split('T')[0];
        acc[loginDate] = (acc[loginDate] || 0) + 1;
        return acc;
      }, {});

      // Prepare data for the chart
      this.loginTrendsData = Object.entries(loginsByDay).map(([date, count]) => ({ date, count }));
    },

    async fetchDocumentTypes() {
      try {
        const response = await axios.get('http://127.0.0.1:5001/api/files/documents');
        const documents = Array.isArray(response.data) ? response.data : [];

        // Filter and format document types for the chart
        this.formatDocumentTypesData(documents);
      } catch (error) {
        console.error('Error fetching documents:', error);
      }
    },

    formatDocumentTypesData(documents) {
      // Extract document types from filenames without altering underscores
      const typeCounts = documents.reduce((acc, doc) => {
        if (doc.filename) {
          // Extract document type using underscores
          const nameWithoutExtension = doc.filename.split('.').slice(0, -1).join('.');
          const documentType = nameWithoutExtension; // Keep underscores intact

          // Increment the count for the document type
          acc[documentType] = (acc[documentType] || 0) + 1;
        } else {
          acc['Other'] = (acc['Other'] || 0) + 1;
        }

        return acc;
      }, {});

      // Prepare data for the chart
      this.documentTypesData = Object.entries(typeCounts).map(([type, count]) => ({
        type,
        count,
      }));
    },

    async fetchUsers() {
      try {
        const response = await axios.get('http://127.0.0.1:5001/api/users');
        this.users = Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error('Error fetching users:', error);
        this.users = [];
      }
    },

    async fetchLoginLogs() {
      try {
        const response = await axios.get('http://127.0.0.1:5001/api/logs/userlogs');
        this.loginLogs = Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error('Error fetching login logs:', error);
        this.loginLogs = [];
      }
    },

    async fetchDocuments() {
      try {
        const response = await axios.get('http://127.0.0.1:5001/api/files/documents');
        this.documents = Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error('Error fetching documents:', error);
        this.documents = [];
      }
    },


async fetchTopUsers() {
  try {
    // Fetch documents from the backend
    const response = await axios.get('http://127.0.0.1:5001/api/files/documents');
    const documents = Array.isArray(response.data) ? response.data : [];

    // Fetch users to get usernames
    const usersResponse = await axios.get('http://127.0.0.1:5001/api/users');
    const users = Array.isArray(usersResponse.data) ? usersResponse.data : [];

    // Map user IDs to usernames
    const userIdToUsername = users.reduce((acc, user) => {
      acc[user._id] = user.username;
      return acc;
    }, {});

    // Initialize aggregation objects
    const documentCounts = {};  // Document count by type
    const totalDocumentCounts = {};  // Total document count by user

    // Aggregate document counts per user and document type
    documents.forEach((doc) => {
      const userId = doc.metadata?.userId;
      const documentType = this.extractDocumentType(doc.filename);

      if (userId) {
      const username = userIdToUsername[userId] || 'Unknown User';

      // Aggregate document counts by type
      if (documentType) {
        if (!documentCounts[documentType]) {
          documentCounts[documentType] = {};
        }
        if (!documentCounts[documentType][username]) {
          documentCounts[documentType][username] = { username, documentType, count: 0 };
        }
        documentCounts[documentType][username].count += 1;
      }

      // Aggregate total document counts for "All" data
      if (!totalDocumentCounts[username]) {
        totalDocumentCounts[username] = { username, documentType: 'All', count: 0 };
      }
      totalDocumentCounts[username].count += 1;
    }
    });

    // Combine results for each document type
    const topUsersByType = Object.keys(documentCounts).reduce((acc, docType) => {
      // Get user data for the current document type and sort by count
      const sortedUsers = Object.values(documentCounts[docType])
        .sort((a, b) => b.count - a.count || a.username.localeCompare(b.username))
        .slice(0, 5); // Get top 5 users

      acc.push(...sortedUsers);
      return acc;
    }, []);

    // Combine "All" document counts
    const topAllUsers = Object.values(totalDocumentCounts)
      .sort((a, b) => b.count - a.count || a.username.localeCompare(b.username))
      .slice(0, 5);

    // Combine all results into one array
    this.topUsersData = [...topUsersByType, ...topAllUsers];

  } catch (error) {
    console.error('Error fetching top users data:', error);
    this.topUsersData = [];
  }
    }
  },
  created() {
  const storedUser = localStorage.getItem('selectedUser');
  if (storedUser) {
    this.selectedUser = storedUser;
  }
},
  watch: {
    users(newUsers) {
    if (Array.isArray(newUsers) && newUsers.length > 0) {
      if (!this.selectedUser || !newUsers.find(user => user._id === this.selectedUser)) {
        this.selectedUser = newUsers[0]._id; // Default to the first user if none is selected
      }
    } else {
      this.selectedUser = null; // Reset selectedUser if no users are available
    }
  },
  },

  mounted() {
    this.fetchTotalUsers();
    this.fetchLoginsToday();
    this.fetchDocumentsToday();
    this.fetchActiveUsersToday();
    this.fetchLogins();
    this.fetchDocumentTypes(); // Fetch document types data on mount
    this.fetchTopUsers(); // Fetch top users data on mount
    this.fetchUsers();
    this.fetchLoginLogs();
    this.fetchDocuments();
    this.fetchUserActivityData();
    this.fetchDocumentTrendData();
   

  },
}; 
</script>
<style scoped>
.flowchart-container {
  width: 100%; /* Make sure the container spans the full width */
  overflow-x: auto; /* Enable horizontal scrolling */
  white-space: nowrap; /* Prevent wrapping */
}

svg {
  max-width: 100%; /* Ensure the SVG scales with the container */
  height: auto; /* Maintain aspect ratio */
}

.v-container {
  padding: 24px;
}

.v-card {
  background-color: #f8f9fa;
  border-radius: 8px;
}

.chart-placeholder,
.leaderboard-placeholder {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e9ecef;
  border-radius: 8px;
  margin-top: 16px;
}

.font-weight-bold {
  font-weight: bold;
}

/* Adjust existing custom-card-height if necessary to ensure height consistency */
.custom-card-height {
  height: 600px; /* Keep this consistent with the other group components */
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.custom-card {
  height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.custom-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
}

.smaller-dropdown .v-input__control {
  height: 36px !important; /* Set to Vuetify’s default for better alignment */
  padding: 0 !important;
}

.smaller-dropdown .v-select__selections {
  font-size: 14px;
  line-height: 36px; /* Center text vertically */
}


.full-height {
  height: 100%;
}

.v-row.align-stretch > .v-col {
  display: flex;
  align-items: stretch;
}

.custom-card-height {
  flex-grow: 1;
}

.custom-title {
  font-size: 24px;
  font-weight: bold; /* Ensures the title is bold */
  margin-bottom: 16px;
}

.v-row.align-stretch > .v-col {
  display: flex;
  align-items: stretch;
}

.custom-card-height {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.top-margin-adjust {
  margin-top: 0; /* Ensures no extra margin at the top */
  padding-top: 0px; /* Consistent padding to match other components */
}

.styled-drawer {
  background-color: rgba(15, 101, 84, 0.644); /* Semi-transparent */
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px); /* For Safari support */
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  position: fixed; /* Ensure the drawer overlays content */
}

.section-gap {
  margin-bottom: px !important; /* Adjust as needed for consistent vertical spacing */
}


.sidebar-item {
  color: rgb(0, 0, 0);
  padding: 10px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.sidebar-item:hover {
  background-color: rgba(255, 255, 255, 0.3); /* Slightly brighter on hover */
  color: #e0f7fa; /* Light teal text on hover */
  cursor: pointer;
}


.v-list-item-title {
  font-weight: bold;
  font-size: 16px;
}

.v-sparkline {
  height: 200px;
  margin-top: 10px;
}

.custom-title {
  margin-bottom: 10px;
  font-weight: bold;
}

.apexcharts-canvas {
  margin: 0 auto;
  width: 100% !important;
}

.full-width-container {
  padding: 0 !important;
  margin: 0;
  width: 100%;
}

.v-row {
  margin: 0 !important; /* Remove row margin */
}

.apexchart-fullwidth {
  width: 100% !important;
  margin: 0;
  padding: 0;
}

.apexcharts-canvas {
  margin: 0 auto;
}

.v-card {
  margin-top: 16px;
}

.custom-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
}

.dropdown-fullwidth {
  width: 150px !important;
  margin-left: auto !important;
}

.smaller-dropdown :deep(.v-input__control) {
  height: 50px !important;
  padding: 0 !important;
}

.smaller-dropdown :deep(.v-select__selections) {
  font-size: 14px;
  line-height: 36px;
}

.smaller-dropdown :deep(.v-menu__content) {
  max-height: 200px;
}
</style>
