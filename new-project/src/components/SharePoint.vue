<template>
  <v-container>
    <v-card>
      <v-card-title>Configure SharePoint Integration</v-card-title>
      <v-card-text>
        <v-form ref="configForm" v-model="isFormValid">
          <!-- Azure AD Details -->
          <v-text-field
            v-model="config.clientId"
            label="Client ID"
            required
            outlined
          ></v-text-field>
          <v-text-field
            v-model="config.tenantId"
            label="Tenant ID"
            required
            outlined
          ></v-text-field>
          <v-text-field
            v-model="config.clientSecret"
            label="Client Secret"
            type="password"
            required
            outlined
          ></v-text-field>

          <!-- SharePoint Details -->
          <v-text-field
            v-model="config.siteUrl"
            label="SharePoint Site URL"
            required
            outlined
          ></v-text-field>
          <v-text-field
            v-model="config.siteId"
            label="Site ID"
            required
            outlined
          ></v-text-field>
          <v-text-field
            v-model="config.driveId"
            label="Drive ID (Document Library ID)"
            required
            outlined
          ></v-text-field>

          <!-- Test Configuration -->
          <v-btn
            :disabled="!isFormValid"
            color="primary"
            @click="testConfiguration"
          >
            Test Connection
          </v-btn>
          <v-alert
            v-if="testResult"
            :type="testResult.success ? 'success' : 'error'"
            class="mt-3"
          >
            {{ testResult.message }}
          </v-alert>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn
          :disabled="!isFormValid || !testResult?.success"
          color="success"
          @click="saveConfiguration"
        >
          Save Configuration
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      config: {
        clientId: "",
        tenantId: "",
        clientSecret: "",
        siteUrl: "",
        siteId: "",
        driveId: "",
      },
      isFormValid: false,
      testResult: null,
    };
  },
  methods: {
    async testConfiguration() {
      try {
        const { clientId, tenantId, clientSecret, siteUrl, siteId, driveId } =
          this.config;

        const response = await axios.post("/api/sharepoint/test-connection", {
          clientId,
          tenantId,
          clientSecret,
          siteUrl,
          siteId,
          driveId,
        });

        if (response.data.success) {
          this.testResult = {
            success: true,
            message: "Connection to SharePoint verified successfully!",
          };
        } else {
          throw new Error(response.data.message || "Unknown error");
        }
      } catch (error) {
        this.testResult = {
          success: false,
          message: `Connection test failed: ${error.message}`,
        };
      }
    },
    async saveConfiguration() {
      try {
        const response = await axios.post("/api/sharepoint/save-config", {
          config: this.config,
        });

        if (response.data.success) {
          this.$emit("configurationSaved");
          alert("Configuration saved successfully!");
        } else {
          throw new Error(response.data.message || "Unknown error");
        }
      } catch (error) {
        alert(`Failed to save configuration: ${error.message}`);
      }
    },
  },
};
</script>
