<template>
  <v-card>
    <!-- Summary Table -->
    <v-card class="summary-card">
      <v-card-title>Monthly Summary</v-card-title>
      <v-data-table
        :headers="summaryHeaders"
        :items="monthlySummaryItems"
        class="elevation-1"
        hide-default-footer
      />
    </v-card>

    <!-- Generated Documents Table -->
    <v-card-title>Generated Documents by Date</v-card-title>
    <v-data-table :headers="headers" :items="documents" class="elevation-1">
      <template v-slot:[`item.date`]="{ item }">
        {{ formatDate(item.uploadDate) }}
      </template>
    </v-data-table>
  </v-card>
</template>

<script>
import axios from 'axios';
import { format } from 'date-fns-tz';

export default {
  data() {
    return {
      documents: [],
      monthlySummary: {},
      summaryHeaders: [
        { title: 'Month', value: 'month', align: 'center' },
        { title: 'Generated Documents Count', value: 'count', align: 'center' },
      ],
      headers: [
        { title: 'Document Name', value: 'filename', align: 'center' },
        { title: 'Date (Dubai Time)', value: 'date', align: 'center' },
      ],
    };
  },
  methods: {
    async fetchDocuments() {
      try {
        const response = await axios.get('/api/documents');
        this.documents = response.data;
        this.calculateMonthlySummary();
      } catch (error) {
        console.error('Error fetching documents:', error);
      }
    },
    formatDate(date) {
      return format(new Date(date), 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Asia/Dubai' });
    },
    calculateMonthlySummary() {
      const summary = {};

      this.documents.forEach(doc => {
        const month = new Date(doc.uploadDate).toLocaleString('en-US', { month: 'long' });
        summary[month] = (summary[month] || 0) + 1;
      });

      this.monthlySummaryItems = Object.entries(summary).map(([month, count]) => ({
        month,
        count,
      }));
    },
  },
  created() {
    this.fetchDocuments();
  },
};
</script>

<style scoped>
.v-card {
  margin: 16px;
}

.summary-card {
  margin-bottom: 16px;
  padding: 16px;
}

.v-data-table th, .v-data-table td {
  text-align: center;
}
</style>
