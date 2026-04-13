<template>
    <table :style="tableStyle" border="1">
      <thead>
        <tr v-for="(headerRow, rowIndex) in headerRows" :key="rowIndex">
          <th
            v-for="(headerCell, cellIndex) in headerRow"
            :key="cellIndex"
            v-if="headerCell"
            :colspan="headerCell.colspan"
            :rowspan="headerCell.rowspan"
          >
            {{ headerCell.content }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in bodyRows" :key="rowIndex">
          <td
            v-for="(cell, cellIndex) in row"
            :key="cellIndex"
            v-if="cell"
            :colspan="cell.colspan"
            :rowspan="cell.rowspan"
          >
            {{ cell.content }}
          </td>
        </tr>
      </tbody>
    </table>
  </template>
  
  <script>
  export default {
    props: {
      table: {
        type: Object,
        required: true
      }
    },
    computed: {
      headerRows() {
        // Assume headers are the first row(s)
        return this.table.rows.slice(0, 1);
      },
      bodyRows() {
        // Body starts after headers
        return this.table.rows.slice(1);
      },
      tableStyle() {
        return {
          width: '100%',
          borderCollapse: 'collapse'
        };
      }
    }
  };
  </script>
  
  <style scoped>
  table {
    margin-bottom: 20px;
  }
  </style>
  