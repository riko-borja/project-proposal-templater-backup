<template>
    <div>
      <pie-chart :data="chartData" />
    </div>
  </template>
  
  <script>
  import { Pie } from 'vue-chartjs'
  import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js'
  
  ChartJS.register(Title, Tooltip, Legend, ArcElement);
  
  export default {
    components: {
      PieChart: Pie
    },
    props: ['data'],
    computed: {
      chartData() {
        return {
          labels: this.data.map(log => new Date(log.timestamp).toLocaleDateString()), // Example labels based on timestamps
          datasets: [{
            label: 'Log Counts',
            data: this.data.map(log => log.count), // Example data based on log counts
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
          }]
        }
      }
    }
  }
  </script>
  