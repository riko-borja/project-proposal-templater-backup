<template>
  <v-container>
    <!-- Table to Show Current Fields -->
    <v-data-table
      :headers="headers"
      :items="fields"
      class="elevation-1"
    >
      <template v-slot:top>
        <v-toolbar flat>
          <v-toolbar-title>Dynamic Form Field Manager</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="openDialog(null)">Add Field</v-btn>
        </v-toolbar>
      </template>

      <template v-slot:[`item.actions`]="{ item }">
        <v-btn icon @click="openDialog(item)">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon @click="deleteField(item)">
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </template>
    </v-data-table>

    <!-- Dialog to Add/Edit Fields -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ editingField ? "Edit Field" : "Add Field" }}</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="form">
            <!-- Field Type -->
            <v-select
              v-model="newField.type"
              :items="['text', 'password', 'select', 'checkbox']"
              label="Field Type"
              required
            ></v-select>

            <!-- Field Label -->
            <v-text-field
              v-model="newField.label"
              label="Field Label"
              required
            ></v-text-field>

            <!-- Field Model Name -->
            <v-text-field
              v-model="newField.model"
              label="Model Name (key)"
              required
            ></v-text-field>

            <!-- Required Checkbox -->
            <v-checkbox
              v-model="newField.required"
              label="Is Required?"
            ></v-checkbox>

            <!-- Options for Select -->
            <v-textarea
              v-if="newField.type === 'select'"
              v-model="newField.options"
              label="Options (comma-separated)"
            ></v-textarea>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-btn color="blue darken-1" text @click="saveField">Save</v-btn>
          <v-btn color="grey darken-1" text @click="closeDialog">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Display Generated Form for Testing -->
    <v-divider class="my-5"></v-divider>
    <h3>Preview Form</h3>
    <v-form>
      <template v-for="(field, index) in fields" :key="index">
        <v-text-field
          v-if="field.type === 'text'"
          :label="field.label"
          v-model="formData[field.model]"
          :required="field.required"
        ></v-text-field>

        <v-text-field
          v-if="field.type === 'password'"
          :label="field.label"
          type="password"
          v-model="formData[field.model]"
          :required="field.required"
        ></v-text-field>

        <v-select
          v-if="field.type === 'select'"
          :label="field.label"
          :items="field.options"
          v-model="formData[field.model]"
          :required="field.required"
        ></v-select>

        <v-checkbox
          v-if="field.type === 'checkbox'"
          :label="field.label"
          v-model="formData[field.model]"
          :required="field.required"
        ></v-checkbox>
      </template>
      <v-btn color="primary" @click="submitForm">Submit Form</v-btn>
    </v-form>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      // List of dynamic form fields
      fields: [],

      // Headers for the table
      headers: [
        { text: "Type", value: "type" },
        { text: "Label", value: "label" },
        { text: "Model", value: "model" },
        { text: "Required", value: "required" },
        { text: "Actions", value: "actions", sortable: false },
      ],

      // Dialog control
      dialog: false,
      editingField: null,

      // Form for adding/editing fields
      newField: {
        type: "",
        model: "",
        label: "",
        required: false,
        options: "",
      },

      // Generated form data for preview
      formData: {},
    };
  },
  methods: {
    openDialog(field) {
      this.editingField = field;
      this.dialog = true;

      if (field) {
        this.newField = { ...field, options: field.options?.join(",") || "" };
      } else {
        this.newField = { type: "", model: "", label: "", required: false, options: "" };
      }
    },
    closeDialog() {
      this.dialog = false;
    },
    saveField() {
      if (this.editingField) {
        // Edit field
        Object.assign(this.editingField, {
          ...this.newField,
          options: this.newField.options ? this.newField.options.split(",") : [],
        });
      } else {
        // Add new field
        this.fields.push({
          ...this.newField,
          options: this.newField.options ? this.newField.options.split(",") : [],
        });
      }
      this.dialog = false;
      this.resetFormData();
    },
    deleteField(field) {
      this.fields = this.fields.filter((f) => f !== field);
      this.resetFormData();
    },
    resetFormData() {
      this.formData = {};
      this.fields.forEach((field) => {
        this.$set(this.formData, field.model, field.type === "checkbox" ? false : "");
      });
    },
    submitForm() {
      console.log("Form Data:", this.formData);
      alert("Form Submitted! Check console for data.");
    },
  },
  created() {
    // Initialize formData with existing fields
    this.resetFormData();
  },
};
</script>

<style scoped>
.v-data-table {
  margin-bottom: 20px;
}
</style>
