<template>
  <div>
    <h2>Fetch and Parse Word Document</h2>
    <button @click="fetchAndParseDocument">Fetch and Parse</button>

    <div v-if="tableData">
      <h3>Parsed Table Data</h3>
      <pre>{{ JSON.stringify(tableData, null, 2) }}</pre>
    </div>
  </div>
</template>

<script>
import PizZip from 'pizzip';
import { XMLParser } from 'fast-xml-parser';

export default {
  data() {
    return {
      tableData: null
    };
  },
  methods: {
    async fetchAndParseDocument() {
      try {
        // Fetch the .docx file from the Flask server
        const response = await fetch('http://127.0.0.1:5000/serve/Description.docx');
        if (!response.ok) throw new Error('Failed to fetch the document.');

        // Read the file as a binary array
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Load the .docx file using PizZip
        const zip = new PizZip(uint8Array);

        // Get the document.xml file which contains the document content
        const docXml = zip.file('word/document.xml').asText();
        console.log('this is the contents of this document in xml', docXml)

        // Parse the XML content
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_'
        });
        const jsonObj = parser.parse(docXml);

        // Extract table data
        this.tableData = this.extractTables(jsonObj);

      } catch (error) {
        console.error('Error fetching or parsing document:', error);
        alert('Failed to fetch or parse document.');
      }
    },
    extractTables(jsonObj) {
      // Namespace prefixes can make parsing complex
      // We'll navigate the JSON structure to find the tables
      const body = jsonObj['w:document']['w:body'];
      const tables = [];

      // Ensure body has content
      if (!body) return { tables };

      const content = Array.isArray(body['w:tbl']) ? body['w:tbl'] : [body['w:tbl']];

      content.forEach(tbl => {
        if (tbl) {
          const table = this.parseTable(tbl);
          if (table) {
            tables.push(table);
          }
        }
      });

      return { tables };
    },
    parseTable(tbl) {
  const rows = [];
  const mergeMap = {}; // Track merged cells

  const tblRows = tbl['w:tr'];
  if (!tblRows) return null;

  const rowsArray = Array.isArray(tblRows) ? tblRows : [tblRows];

  rowsArray.forEach((tr, rowIndex) => {
    const row = [];
    let colIndex = 0;

    const tblCells = tr['w:tc'];
    if (!tblCells) return;

    const cellsArray = Array.isArray(tblCells) ? tblCells : [tblCells];

    cellsArray.forEach(tc => {
      // Skip merged cells
      while (mergeMap[`${rowIndex},${colIndex}`]) {
        row.push(null); // Add placeholder for merged cell
        colIndex++;
      }

      const cellContent = this.getTextFromParagraphs(tc['w:p']);
      const cellProps = tc['w:tcPr'] || {};

      // Determine colspan
      const gridSpanElement = cellProps['w:gridSpan'];
      const colspan = gridSpanElement ? parseInt(gridSpanElement['@_w:val']) : 1;

      // Determine rowspan
      const vMergeElement = cellProps['w:vMerge'];
      const rowspan = vMergeElement && vMergeElement['@_w:val'] === 'restart'
        ? this.calculateRowspan(tblRows, rowIndex, colIndex)
        : 1;

      // Track merged cells
      if (rowspan > 1) {
        for (let i = 1; i < rowspan; i++) {
          mergeMap[`${rowIndex + i},${colIndex}`] = true; // Mark merged rows
        }
      }

      // Append cell to the row
      row.push({
        content: cellContent,
        colspan: colspan,
        rowspan: rowspan
      });

      // Add placeholders for horizontally merged cells
      for (let i = 1; i < colspan; i++) {
        row.push(null); // Placeholder for colspan
      }

      colIndex += colspan; // Move to the next column
    });

    rows.push(row);
  });

  return { rows };
},

calculateRowspan(tblRows, rowIndex, colIndex) {
  let rowspan = 1;

  for (let i = rowIndex + 1; i < tblRows.length; i++) {
    const cell = tblRows[i]['w:tc'][colIndex];
    if (cell && cell['w:tcPr'] && cell['w:tcPr']['w:vMerge'] && cell['w:tcPr']['w:vMerge']['@_w:val'] === 'continue') {
      rowspan++;
    } else {
      break;
    }
  }

  return rowspan;
},

getTextFromParagraphs(paragraphs) {
  let text = '';

  const paragraphsArray = Array.isArray(paragraphs) ? paragraphs : [paragraphs];

  paragraphsArray.forEach(p => {
    const runs = p['w:r'];
    if (runs) {
      const runsArray = Array.isArray(runs) ? runs : [runs];
      runsArray.forEach(r => {
        const t = r['w:t'];
        if (t) {
          text += t;
        }
      });
    }
  });

  return text.trim(); // Remove excess whitespace
}


  }
};
</script>
