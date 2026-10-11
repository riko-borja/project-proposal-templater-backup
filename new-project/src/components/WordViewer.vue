<template>
  <div id="editor-container">
    <DocumentEditor
      v-if="config.document.url"
      id="docEditor"
      :documentServerUrl="resolvedDocumentServerUrl"
      :config="config"
      :events_onAppReady="onAppReady"
      :events_onDocumentReady="onDocumentReady"
      :onLoadComponentError="onLoadComponentError"
    />
    <div v-show="!config.document.url" class="viewer-placeholder">
      Select a template, then click "Load Document Preview".
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { defineComponent } from 'vue';
import { DocumentEditor } from '@onlyoffice/document-editor-vue';

export default defineComponent({
  name: 'WordViewer',
  components: {
    DocumentEditor,
  },
  props: {
    fileId: {
      type: String,
      default: '',
    },
    bucketName: {
      type: String,
      default: '',
    },
    loadRequestKey: {
      type: Number,
      default: 0,
    },
    documentServerUrl: {
      type: String,
      default: '',
    },
  },
  emits: ['loading', 'loaded', 'error'],
  data() {
    return {
      editorInstance: null,
      connectorInstance: null,
      config: {
        document: {
          fileType: 'docx',
          key: '',
          title: '',
          url: '',
          permissions: { edit: false, review: false },
        },
        documentType: 'word',
        editorConfig: {
          mode: 'view',
          user: {
            id: 'tag-authoring',
            name: 'Tag Authoring',
          },
        },
        callbackUrl: '/callback',
      },
    };
  },
  computed: {
    resolvedDocumentServerUrl() {
      const configuredUrl =
        this.documentServerUrl ||
        process.env.VUE_APP_ONLYOFFICE_SERVER_URL ||
        process.env.VUE_APP_ONLYOFFICE_DOCS_API_URL ||
        'http://127.0.0.1:8080/';
      return this.normalizeServerUrl(configuredUrl);
    },
  },
  watch: {
    loadRequestKey(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.loadDocument();
      }
    },
  },
  methods: {
    normalizeServerUrl(baseUrl) {
      const fallback = 'http://127.0.0.1:8080/';
      const normalized = String(baseUrl || '').trim();
      if (!normalized) return fallback;

      // Support either a full DocsAPI URL or a server base URL.
      const docsApiSuffixPattern = /\/web-apps\/apps\/api\/documents\/api\.js(?:[?#].*)?$/i;
      let serverUrl = normalized.replace(docsApiSuffixPattern, '');

      // The wrapper appends /web-apps/... itself, so /welcome is not a valid base here.
      serverUrl = serverUrl.replace(/\/welcome\/?$/i, '');

      if (!serverUrl) return fallback;
      return serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`;
    },
    getDocsApiScriptUrl() {
      return `${this.resolvedDocumentServerUrl}web-apps/apps/api/documents/api.js`;
    },
    buildDocumentUrlWithToken(documentUrl, token) {
      if (!documentUrl) return '';
      return documentUrl.includes('?') ? `${documentUrl}&token=${encodeURIComponent(token)}` : `${documentUrl}?token=${encodeURIComponent(token)}`;
    },
    clearDocument() {
      this.editorInstance = null;
      this.connectorInstance = null;
      this.config.document.url = '';
      this.config.document.title = '';
      this.config.document.key = '';
      this.config.token = '';
    },
    getEditorInstance() {
      if (this.editorInstance) return this.editorInstance;

      if (typeof window !== 'undefined' && window?.DocEditor?.instances?.docEditor) {
        this.editorInstance = window.DocEditor.instances.docEditor;
        return this.editorInstance;
      }

      return null;
    },
    getOrCreateConnector() {
      if (this.connectorInstance) return this.connectorInstance;

      const editor = this.getEditorInstance();
      if (!editor || typeof editor.createConnector !== 'function') return null;

      try {
        this.connectorInstance = editor.createConnector();
        return this.connectorInstance;
      } catch (error) {
        return null;
      }
    },
    getViewerCapabilities() {
      const editor = this.getEditorInstance();
      const connector = this.connectorInstance;
      return {
        hasEditorInstance: Boolean(editor),
        hasCreateConnector: Boolean(editor && typeof editor.createConnector === 'function'),
        hasEditorExecuteMethod: Boolean(editor && typeof editor.executeMethod === 'function'),
        hasConnectorExecuteMethod: Boolean(connector && typeof connector.executeMethod === 'function'),
      };
    },
    getViewerCommandStatus() {
      const capabilities = this.getViewerCapabilities();
      return {
        ready: capabilities.hasEditorInstance,
        ...capabilities,
      };
    },
    async invokeViewerCommand(commandName, payload = {}) {
      const normalizedCommandName = String(commandName || '').trim();
      if (normalizedCommandName !== 'searchText') {
        return {
          ok: false,
          reason: 'UNSUPPORTED_COMMAND',
          commandName: normalizedCommandName,
        };
      }

      const editor = this.getEditorInstance();
      if (!editor) {
        return {
          ok: false,
          reason: 'EDITOR_NOT_READY',
          commandName: normalizedCommandName,
        };
      }

      const query = String(payload?.query || '').trim();
      if (!query) {
        return {
          ok: false,
          reason: 'EMPTY_QUERY',
          commandName: normalizedCommandName,
        };
      }

      const args = [
        {
          searchString: query,
          matchCase: Boolean(payload?.matchCase),
        },
        payload?.isForward !== false,
      ];

      const connector = this.getOrCreateConnector();
      if (connector && typeof connector.executeMethod === 'function') {
        try {
          const result = await new Promise((resolve, reject) => {
            try {
              connector.executeMethod('SearchNext', args, (response) => resolve(response));
            } catch (error) {
              reject(error);
            }
          });

          return {
            ok: true,
            commandName: normalizedCommandName,
            transport: 'connector.executeMethod',
            method: 'SearchNext',
            result,
          };
        } catch (error) {
          return {
            ok: false,
            commandName: normalizedCommandName,
            reason: 'SEARCH_EXECUTION_FAILED',
            transport: 'connector.executeMethod',
            error: error?.message || String(error),
          };
        }
      }

      if (typeof editor.executeMethod === 'function') {
        try {
          const result = await new Promise((resolve, reject) => {
            try {
              editor.executeMethod('SearchNext', args, (response) => resolve(response));
            } catch (error) {
              reject(error);
            }
          });

          return {
            ok: true,
            commandName: normalizedCommandName,
            transport: 'editor.executeMethod',
            method: 'SearchNext',
            result,
          };
        } catch (error) {
          return {
            ok: false,
            commandName: normalizedCommandName,
            reason: 'SEARCH_EXECUTION_FAILED',
            transport: 'editor.executeMethod',
            error: error?.message || String(error),
          };
        }
      }

      return {
        ok: false,
        commandName: normalizedCommandName,
        reason: 'SEARCH_API_NOT_AVAILABLE',
        capabilities: this.getViewerCapabilities(),
      };
    },
    async loadDocument() {
      const normalizedFileId = String(this.fileId || '').trim();
      const normalizedBucketName = String(this.bucketName || '').trim();

      if (!normalizedFileId || !normalizedBucketName) {
        this.clearDocument();
        this.$emit('error', 'fileId and bucketName are required for preview.');
        return;
      }

      this.$emit('loading');

      try {
        const response = await axios.post('/api/files/generate-editor-url', {
          fileId: normalizedFileId,
          bucketName: normalizedBucketName,
        });

        if (!response?.data?.document?.url || !response?.data?.token) {
          throw new Error('Invalid preview response from server.');
        }

        this.config.document.url = this.buildDocumentUrlWithToken(response.data.document.url, response.data.token);
        this.config.document.title = response.data.document.title || '';
        this.config.document.key = response.data.document.key || '';
        this.config.token = response.data.token;
      } catch (error) {
        this.clearDocument();
        this.$emit('error', error?.response?.data?.error || error.message || 'Failed to load document preview.');
      }
    },
    onAppReady(editorInstance) {
      this.editorInstance = editorInstance || this.getEditorInstance();
      this.connectorInstance = null;
    },
    onDocumentReady() {
      this.getEditorInstance();
      this.$emit('loaded');
    },
    onLoadComponentError(errorCode, errorDescription) {
      if (errorCode === -2) {
        this.$emit(
          'error',
          `OnlyOffice component error (-2): failed to load DocsAPI from ${this.getDocsApiScriptUrl()}`
        );
        return;
      }
      this.$emit('error', `OnlyOffice component error (${errorCode}): ${errorDescription}`);
    },
  },
});
</script>

<style scoped>
#docEditor {
  width: 100%;
  height: 100%;
}

#editor-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 72vh;
  min-height: 520px;
}

.viewer-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #607d8b;
  border: 1px dashed #cfd8dc;
  border-radius: 8px;
  padding: 16px;
}
</style>
