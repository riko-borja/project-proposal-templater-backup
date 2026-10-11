<template>
  <AppBarLayout>
    <v-main>
      <v-container fluid>
        <v-row justify="center">
          <v-col cols="12" sm="11" md="10" lg="9">
            <v-card class="pa-4" outlined>
              <v-card-title class="text-h5">Tag Authoring</v-card-title>
              <v-card-text>
                <p class="selection-subtitle">
                  Choose a category path and template to analyze tag coverage.
                </p>

                <v-alert
                  v-if="selectionError"
                  type="error"
                  variant="tonal"
                  class="mb-4"
                >
                  {{ selectionError }}
                </v-alert>

                <div
                  v-for="(dropdown, index) in categoryDropdowns"
                  :key="dropdown.label + index"
                  class="mb-3"
                >
                  <v-select
                    v-model="dropdown.selected"
                    :items="dropdown.options"
                    item-title="name"
                    item-value="id"
                    :label="dropdown.label"
                    :loading="isLoadingCategories"
                    :disabled="isLoadingCategories || loading || isLoadingTemplates"
                    variant="outlined"
                    density="comfortable"
                    @update:modelValue="(value) => handleCategorySelection(value, index)"
                  />
                </div>

                <v-autocomplete
                  v-model="selectedTemplate"
                  :items="templates"
                  item-title="label"
                  item-value="fileId"
                  label="Template"
                  return-object
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  :loading="isLoadingTemplates"
                  :disabled="!isCategoryPathReady || isLoadingTemplates || loading"
                  @update:modelValue="onTemplateChanged"
                />

                <p
                  v-if="showNoTemplatesState"
                  class="empty-note mb-3"
                >
                  No Word templates were found for this category path.
                </p>

                <v-card
                  v-if="selectedTemplate"
                  outlined
                  class="pa-3 mb-3"
                >
                  <div class="panel-title">Selected Template</div>
                  <div><strong>Filename:</strong> {{ selectedTemplate.filename }}</div>
                  <div><strong>Category Path:</strong> {{ selectedCategoryPathLabel || '-' }}</div>
                </v-card>

                <v-card
                  v-if="selectedTemplate"
                  outlined
                  class="pa-3 mb-3"
                >
                  <div class="panel-title">Document Preview</div>
                  <div class="preview-actions">
                    <v-btn
                      color="primary"
                      :loading="isPreviewLoading"
                      :disabled="!canAnalyze || loading || isLoadingTemplates"
                      @click="loadDocumentPreview"
                    >
                      Load Document Preview
                    </v-btn>
                  </div>

                  <v-alert
                    v-if="previewError"
                    type="error"
                    variant="tonal"
                    class="mb-3"
                  >
                    {{ previewError }}
                  </v-alert>

                  <v-row dense class="preview-layout">
                    <v-col cols="12" md="9">
                      <WordViewer
                        ref="wordViewer"
                        :fileId="String(selectedTemplate.fileId || '')"
                        :bucketName="String(selectedTemplate.bucketName || '')"
                        :loadRequestKey="previewLoadRequestKey"
                        @loading="onPreviewLoading"
                        @loaded="onPreviewLoaded"
                        @error="onPreviewError"
                      />
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-card variant="tonal" class="helper-panel pa-3">
                        <div class="panel-title">Helper Panel</div>
                        <div class="sub-title mb-2">Repeated Text Candidates</div>
                        <p v-if="!analysis" class="mb-0 helper-placeholder">
                          Run Analyze Template to see repeated text suggestions.
                        </p>
                        <p
                          v-else-if="displayedHelperRepeatedTextCandidates.length > 0"
                          class="helper-candidate-meta mb-2"
                        >
                          Showing {{ displayedHelperRepeatedTextCandidates.length }} of {{ helperRepeatedTextCandidates.length }} candidates.
                        </p>
                        <ul v-if="displayedHelperRepeatedTextCandidates.length > 0" class="helper-candidate-list">
                          <li
                            v-for="(candidate, index) in displayedHelperRepeatedTextCandidates"
                            :key="`${candidate.text}-${index}`"
                            class="helper-candidate-item"
                            :class="{ 'helper-candidate-item-selected': selectedHelperCandidateText === candidate.text }"
                            @click="selectHelperCandidate(candidate)"
                          >
                            <span class="helper-candidate-text">{{ candidate.text }}</span>
                            <span class="helper-candidate-count">{{ candidate.count }}x</span>
                          </li>
                        </ul>
                        <div v-else-if="hasHiddenRepeatedTextCandidates" class="mb-0">
                          <p class="mb-1 empty-note">
                            Filtered view hid low-signal candidates.
                          </p>
                        </div>
                        <p v-else class="mb-0 empty-note">
                          No repeated text candidates found.
                        </p>
                        <v-btn
                          v-if="analysis && hasHiddenRepeatedTextCandidates"
                          variant="text"
                          density="comfortable"
                          size="small"
                          class="mt-2"
                          @click="showAllRepeatedTextCandidates = !showAllRepeatedTextCandidates"
                        >
                          {{ showAllRepeatedTextCandidates ? 'Show Filtered' : `Show All (${helperRepeatedTextCandidates.length})` }}
                        </v-btn>
                        <div v-if="selectedHelperCandidate" class="helper-draft-section">
                          <div class="sub-title mb-2">Simple Tag Draft</div>
                          <div class="helper-readonly-row">
                            <strong>Original Text:</strong> {{ selectedHelperCandidate.text }}
                          </div>
                          <div
                            v-if="selectedHelperCandidateOccurrences.length > 0"
                            class="helper-occurrence-section mt-2"
                          >
                            <div class="sub-title mb-1">Occurrence Review</div>
                            <p class="helper-candidate-meta mb-2">
                              {{ selectedHelperCandidateSelectedOccurrenceCount }} of {{ selectedHelperCandidateOccurrences.length }} occurrences selected
                            </p>
                            <ul class="helper-occurrence-list">
                              <li
                                v-for="occurrence in selectedHelperCandidateOccurrences"
                                :key="occurrence.id"
                                class="helper-occurrence-item"
                              >
                                <v-checkbox
                                  :model-value="isOccurrenceSelected(occurrence.id)"
                                  density="compact"
                                  hide-details
                                  class="helper-occurrence-checkbox"
                                  @update:model-value="(value) => setOccurrenceSelected(occurrence.id, value)"
                                />
                                <div class="helper-occurrence-content">
                                  <div class="helper-occurrence-label">#{{ occurrence.order }}</div>
                                  <div class="helper-occurrence-context">{{ occurrence.context }}</div>
                                </div>
                              </li>
                            </ul>
                          </div>
                          <v-select
                            v-model="draftTagType"
                            :items="tagTypeOptions"
                            item-title="label"
                            item-value="value"
                            label="Tag Type"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            class="mt-2"
                          />
                          <v-text-field
                            v-model="draftFieldName"
                            label="Field Label"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            class="mt-2"
                          />
                          <p
                            v-if="!hasDraftFieldNameInput"
                            class="helper-field-status helper-field-status-conflict mb-0 mt-1"
                          >
                            Field label is required.
                          </p>
                          <p
                            v-if="draftFieldNameStatusText"
                            class="helper-field-status mb-0 mt-1"
                            :class="{
                              'helper-field-status-conflict': isDraftFieldNameConflict,
                              'helper-field-status-safe': !isDraftFieldNameConflict,
                            }"
                          >
                            {{ draftFieldNameStatusText }}
                          </p>
                          <v-text-field
                            v-model.number="draftOrder"
                            type="number"
                            min="1"
                            label="Order"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            class="mt-2"
                          />
                          <p
                            v-if="draftOrderStatusText"
                            class="helper-field-status helper-field-status-conflict mb-0 mt-1"
                          >
                            {{ draftOrderStatusText }}
                          </p>
                          <div class="helper-tag-preview mt-3">
                            <strong>Tag Preview:</strong> {{ draftedSimpleTag || '-' }}
                          </div>
                          <div class="mt-2 helper-copy-row">
                            <v-btn
                              size="small"
                              color="primary"
                              variant="outlined"
                              class="helper-action-btn"
                              :disabled="!canCopyDraftedTag || isCopyingDraftTag"
                              @click="copyDraftedTagToClipboard"
                            >
                              Copy Tag
                            </v-btn>
                            <v-btn
                              size="small"
                              color="primary"
                              variant="elevated"
                              class="helper-action-btn"
                              :loading="isReplacingAllCheckedOccurrences"
                              :disabled="!canReplaceAllCheckedOccurrences || isReplacingAllCheckedOccurrences"
                              @click="replaceAllCheckedOccurrences"
                            >
                              Replace All Checked
                            </v-btn>
                            <v-btn
                              size="small"
                              color="secondary"
                              variant="outlined"
                              class="helper-action-btn"
                              :loading="isPreviewHighlightingOccurrences"
                              :disabled="!canPreviewHighlightedOccurrences || isPreviewHighlightingOccurrences || isReplacingAllCheckedOccurrences"
                              @click="previewHighlightedOccurrences"
                            >
                              Preview Highlighted Occurrences
                            </v-btn>
                            <span
                              v-if="copyDraftTagFeedback"
                              class="helper-copy-feedback"
                              :class="{
                                'helper-copy-feedback-success': copyDraftTagFeedbackType === 'success',
                                'helper-copy-feedback-error': copyDraftTagFeedbackType === 'error',
                              }"
                            >
                              {{ copyDraftTagFeedback }}
                            </span>
                          </div>
                          <p
                            v-if="replaceSelectedFeedback"
                            class="helper-copy-feedback mb-0 mt-1"
                            :class="{
                              'helper-copy-feedback-success': replaceSelectedFeedbackType === 'success',
                              'helper-copy-feedback-error': replaceSelectedFeedbackType === 'error',
                            }"
                          >
                            {{ replaceSelectedFeedback }}
                          </p>
                          <p class="helper-note mb-0 mt-2">
                            Replaces the first safe plain-text occurrence in the document body.
                          </p>
                        </div>
                      </v-card>
                    </v-col>
                  </v-row>
                </v-card>

                <v-btn
                  color="primary"
                  :loading="loading"
                  :disabled="!canAnalyze || loading"
                  @click="analyzeTemplate"
                >
                  Analyze Template
                </v-btn>

                <v-alert
                  v-if="errorMessage"
                  type="error"
                  variant="tonal"
                  class="mt-4"
                >
                  {{ errorMessage }}
                </v-alert>

                <v-row v-if="analysis" class="mt-4" dense>
                  <v-col cols="12" md="3">
                    <v-card outlined class="pa-2">
                      <div class="panel-title">Categories</div>
                      <v-btn
                        v-for="category in categories"
                        :key="category.value"
                        block
                        class="mb-2 text-none"
                        :variant="selectedCategory === category.value ? 'elevated' : 'outlined'"
                        :color="selectedCategory === category.value ? 'primary' : ''"
                        @click="selectedCategory = category.value"
                      >
                        {{ category.label }} ({{ getCategoryCount(category.value) }})
                      </v-btn>
                    </v-card>
                  </v-col>

                  <v-col cols="12" md="9">
                    <v-card outlined class="pa-3">
                      <div class="panel-title">{{ selectedCategoryLabel }}</div>

                      <div v-if="selectedCategory === 'fields'">
                        <div
                          v-for="item in analysis.inventories.fields"
                          :key="item.id"
                          class="inventory-item"
                        >
                          <div><strong>Key:</strong> {{ item.key || '-' }}</div>
                          <div><strong>Family:</strong> {{ item.family || '-' }}</div>
                          <div><strong>Raw Tag:</strong> {{ item.rawTag || '-' }}</div>
                        </div>
                        <div v-if="analysis.inventories.fields.length === 0" class="empty-note">
                          No field tags found.
                        </div>
                      </div>

                      <div v-else-if="selectedCategory === 'metadata'">
                        <div
                          v-for="item in analysis.inventories.metadata"
                          :key="item.id"
                          class="inventory-item"
                        >
                          <div><strong>Type:</strong> {{ item.family || '-' }}</div>
                          <div><strong>Target:</strong> {{ item.targetKey || '-' }}</div>
                          <div><strong>Content:</strong> {{ item.content || '-' }}</div>
                        </div>
                        <div v-if="analysis.inventories.metadata.length === 0" class="empty-note">
                          No metadata tags found.
                        </div>
                      </div>

                      <div v-else-if="selectedCategory === 'sections'">
                        <div
                          v-for="(item, index) in analysis.inventories.sections"
                          :key="`${item.key}-${item.type}-${index}`"
                          class="inventory-item"
                        >
                          <div><strong>Name:</strong> {{ item.key || '-' }}</div>
                          <div><strong>Tag Type:</strong> {{ item.type || '-' }}</div>
                          <div><strong>Raw Tag:</strong> {{ item.rawTag || '-' }}</div>
                        </div>
                        <div v-if="analysis.inventories.sections.length === 0" class="empty-note">
                          No section/select wrappers found.
                        </div>
                      </div>

                      <div v-else-if="selectedCategory === 'tables'">
                        <div
                          v-for="table in tableSummary"
                          :key="table.name"
                          class="inventory-item"
                        >
                          <div><strong>Table Name:</strong> {{ table.name || '-' }}</div>
                          <div><strong>Has Tooltip:</strong> {{ table.hasTooltip ? 'Yes' : 'No' }}</div>
                          <div><strong>Has Hyperlink:</strong> {{ table.hasHyperlink ? 'Yes' : 'No' }}</div>
                          <div><strong>Has Hyperlink Tooltip:</strong> {{ table.hasHyperlinkTooltip ? 'Yes' : 'No' }}</div>
                        </div>
                        <div v-if="tableSummary.length === 0" class="empty-note">
                          No table tags found.
                        </div>
                      </div>
                    </v-card>

                    <v-card outlined class="pa-3 mt-3">
                      <div class="panel-title">Validation</div>
                      <div><strong>Errors:</strong> {{ errorCount }}</div>
                      <div><strong>Warnings:</strong> {{ warningCount }}</div>

                      <div v-if="errorCount > 0" class="mt-2">
                        <div class="sub-title">Error Messages</div>
                        <ul class="message-list">
                          <li v-for="(issue, index) in analysis.validation.errors" :key="`error-${index}`">
                            {{ issue.message || 'Unknown error' }}
                          </li>
                        </ul>
                      </div>

                      <div v-if="warningCount > 0" class="mt-2">
                        <div class="sub-title">Warning Messages</div>
                        <ul class="message-list">
                          <li v-for="(issue, index) in analysis.validation.warnings" :key="`warning-${index}`">
                            {{ issue.message || 'Unknown warning' }}
                          </li>
                        </ul>
                      </div>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </AppBarLayout>
</template>

<script>
import axios from 'axios';
import AppBarLayout from '@/components/AppBarLayout.vue';
import WordViewer from '@/components/WordViewer.vue';

export default {
  name: 'TagAuthoringPage',
  components: {
    AppBarLayout,
    WordViewer,
  },
  data() {
    return {
      categoryDropdowns: [],
      templates: [],
      selectedTemplate: null,
      isLoadingCategories: false,
      isLoadingTemplates: false,
      templatesRequested: false,
      selectionError: '',
      loading: false,
      analysis: null,
      errorMessage: '',
      previewError: '',
      previewLoadRequestKey: 0,
      isPreviewLoading: false,
      selectedCategory: 'fields',
      selectedHelperCandidateText: '',
      showAllRepeatedTextCandidates: false,
      occurrenceSelectionByCandidate: {},
      draftTagType: 'input',
      draftFieldName: '',
      draftOrder: 1,
      isCopyingDraftTag: false,
      copyDraftTagFeedback: '',
      copyDraftTagFeedbackType: '',
      copyDraftTagFeedbackTimeoutId: null,
      isReplacingAllCheckedOccurrences: false,
      isPreviewHighlightingOccurrences: false,
      replaceSelectedFeedback: '',
      replaceSelectedFeedbackType: '',
      replaceSelectedFeedbackTimeoutId: null,
      tagTypeOptions: [
        { label: 'Text Input', value: 'input' },
        { label: 'Number Input', value: 'number_input' },
        { label: 'Date', value: 'date' },
      ],
      categories: [
        { value: 'fields', label: 'Fields' },
        { value: 'metadata', label: 'Metadata' },
        { value: 'sections', label: 'Sections' },
        { value: 'tables', label: 'Tables' },
      ],
    };
  },
  mounted() {
    this.fetchRootCategories();
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      delete window.__tagAuthoringRunViewerSearchProbe;
      delete window.__tagAuthoringGetViewerBridgeStatus;
    }
  },
  computed: {
    isCategoryPathReady() {
      if (this.categoryDropdowns.length === 0) return false;
      return Boolean(this.categoryDropdowns[this.categoryDropdowns.length - 1].selected);
    },
    selectedCategoryPathLabel() {
      const names = this.selectedHierarchy.map((item) => item.name).filter(Boolean);
      return names.join(' > ');
    },
    selectedHierarchy() {
      return this.categoryDropdowns
        .map((dropdown) => {
          const selectedOption = dropdown.options.find((option) => option.id === dropdown.selected);
          if (!selectedOption) return null;
          return {
            id: selectedOption.id,
            name: selectedOption.name,
            path: selectedOption.path,
          };
        })
        .filter(Boolean);
    },
    canAnalyze() {
      return Boolean(this.selectedTemplate && this.selectedTemplate.fileId && this.selectedTemplate.bucketName);
    },
    showNoTemplatesState() {
      return (
        this.templatesRequested &&
        !this.isLoadingTemplates &&
        this.templates.length === 0 &&
        !this.selectionError
      );
    },
    selectedCategoryLabel() {
      const selected = this.categories.find((item) => item.value === this.selectedCategory);
      return selected ? selected.label : 'Inventory';
    },
    errorCount() {
      return this.analysis?.validation?.errors?.length || 0;
    },
    warningCount() {
      return this.analysis?.validation?.warnings?.length || 0;
    },
    helperRepeatedTextCandidates() {
      if (!Array.isArray(this.analysis?.helperCandidates?.repeatedText)) return [];

      const mapped = this.analysis.helperCandidates.repeatedText
        .map((candidate) => {
          const text = String(candidate?.text || '')
            .trim()
            .replace(/\s+/g, ' ');
          const count = Number.parseInt(candidate?.count, 10);
          const occurrences = Array.isArray(candidate?.occurrences)
            ? candidate.occurrences
              .map((occurrence, index) => {
                const order = Number.parseInt(occurrence?.order, 10);
                const safeOrder = Number.isFinite(order) && order > 0 ? order : index + 1;
                const id = String(occurrence?.id || `${text}_${safeOrder}`).trim();
                const context = String(occurrence?.context || '')
                  .trim()
                  .replace(/\s+/g, ' ');
                return {
                  id,
                  order: safeOrder,
                  context: context || text,
                };
              })
              .filter((occurrence) => occurrence.id)
            : [];

          return {
            text,
            count: Number.isFinite(count) && count > 0 ? count : 0,
            occurrences,
          };
        })
        .filter((candidate) => candidate.text && candidate.count > 0);

      return mapped.sort((a, b) => {
        const aWords = a.text.split(/\s+/).length;
        const bWords = b.text.split(/\s+/).length;
        if (aWords !== bWords) return bWords - aWords;
        if (b.count !== a.count) return b.count - a.count;
        if (b.text.length !== a.text.length) return b.text.length - a.text.length;
        return a.text.localeCompare(b.text);
      });
    },
    filteredHelperRepeatedTextCandidates() {
      const minOverallLength = 4;
      const minSingleWordLength = 8;
      const minSingleWordCount = 3;
      const maxShortAcronymLength = 5;

      const filtered = this.helperRepeatedTextCandidates.filter((candidate) => {
        const text = candidate.text;
        const count = candidate.count;
        const words = text.split(/\s+/).filter(Boolean);
        const wordCount = words.length;

        if (text.length < minOverallLength) return false;

        if (wordCount > 1) return true;

        const isShortAllCapsAcronym = /^[A-Z0-9]+$/.test(text) && text.length <= maxShortAcronymLength;
        if (isShortAllCapsAcronym) return false;

        return text.length >= minSingleWordLength && count >= minSingleWordCount;
      });

      if (!this.selectedHelperCandidateText) return filtered;
      if (filtered.some((candidate) => candidate.text === this.selectedHelperCandidateText)) return filtered;

      const selected = this.helperRepeatedTextCandidates.find(
        (candidate) => candidate.text === this.selectedHelperCandidateText
      );
      return selected ? [selected, ...filtered] : filtered;
    },
    displayedHelperRepeatedTextCandidates() {
      if (this.showAllRepeatedTextCandidates) return this.helperRepeatedTextCandidates;
      return this.filteredHelperRepeatedTextCandidates;
    },
    hasHiddenRepeatedTextCandidates() {
      return this.filteredHelperRepeatedTextCandidates.length < this.helperRepeatedTextCandidates.length;
    },
    selectedHelperCandidate() {
      if (!this.selectedHelperCandidateText) return null;
      return this.helperRepeatedTextCandidates.find(
        (candidate) => candidate.text === this.selectedHelperCandidateText
      ) || null;
    },
    selectedHelperCandidateOccurrences() {
      if (!Array.isArray(this.selectedHelperCandidate?.occurrences)) return [];
      return this.selectedHelperCandidate.occurrences;
    },
    selectedHelperCandidateSelectedOccurrenceCount() {
      if (!this.selectedHelperCandidate?.text) return 0;
      const selectionMap = this.occurrenceSelectionByCandidate[this.selectedHelperCandidate.text] || {};
      return this.selectedHelperCandidateOccurrences.reduce((count, occurrence) => {
        if (selectionMap[occurrence.id] === false) return count;
        return count + 1;
      }, 0);
    },
    selectedHelperCandidateCheckedOccurrences() {
      if (!this.selectedHelperCandidate?.text) return [];
      const selectionMap = this.occurrenceSelectionByCandidate[this.selectedHelperCandidate.text] || {};
      return this.selectedHelperCandidateOccurrences.filter(
        (occurrence) => selectionMap[occurrence.id] !== false
      );
    },
    selectedHelperCandidateCheckedOccurrenceIds() {
      return this.selectedHelperCandidateCheckedOccurrences
        .map((occurrence) => String(occurrence.id || '').trim())
        .filter(Boolean);
    },
    selectedHelperCandidateCheckedOccurrenceOrders() {
      return this.selectedHelperCandidateCheckedOccurrences
        .map((occurrence) => Number.parseInt(occurrence.order, 10))
        .filter((order) => Number.isFinite(order) && order >= 1)
        .sort((a, b) => a - b);
    },
    existingAnalyzedInputFieldKeys() {
      const fields = Array.isArray(this.analysis?.inventories?.fields)
        ? this.analysis.inventories.fields
        : [];
      const keys = new Set();

      fields.forEach((field) => {
        const family = String(field?.family || '').toLowerCase();
        const key = this.normalizeFieldNameFromText(field?.key || '');

        if (family === 'input' || family === 'number_input' || family === 'date') {
          if (key && key !== 'field_name') {
            keys.add(key);
          }
          return;
        }

        if (family === 'range_input') {
          const minKey = this.normalizeFieldNameFromText(field?.minKey || '');
          const maxKey = this.normalizeFieldNameFromText(field?.maxKey || '');

          if (minKey && minKey !== 'field_name') keys.add(minKey);
          if (maxKey && maxKey !== 'field_name') keys.add(maxKey);

          const parts = String(field?.key || '')
            .split('|')
            .map((part) => this.normalizeFieldNameFromText(part))
            .filter((part) => part && part !== 'field_name');
          parts.forEach((part) => keys.add(part));
        }
      });

      return keys;
    },
    normalizedDraftFieldName() {
      return this.normalizeFieldNameFromText(this.draftFieldName);
    },
    hasDraftFieldNameInput() {
      return Boolean(String(this.draftFieldName || '').trim());
    },
    isDraftFieldNameConflict() {
      if (!this.hasDraftFieldNameInput) return false;
      return this.existingAnalyzedInputFieldKeys.has(this.normalizedDraftFieldName);
    },
    draftFieldNameStatusText() {
      if (!this.hasDraftFieldNameInput) return '';
      if (this.isDraftFieldNameConflict) return 'Field name already exists.';
      return 'Field name is available.';
    },
    hasDraftOrderInput() {
      return String(this.draftOrder ?? '').trim().length > 0;
    },
    hasValidDraftOrder() {
      const parsed = Number.parseInt(this.draftOrder, 10);
      return Number.isFinite(parsed) && parsed >= 1;
    },
    draftOrderStatusText() {
      if (!this.hasDraftOrderInput) return 'Order is required.';
      if (!this.hasValidDraftOrder) return 'Order must be a positive number.';
      return '';
    },
    draftFieldLabelForPreview() {
      return String(this.draftFieldName || '')
        .trim()
        .replace(/\s+/g, ' ');
    },
    normalizedDraftOrder() {
      const parsed = Number.parseInt(this.draftOrder, 10);
      if (!Number.isFinite(parsed) || parsed < 1) return 1;
      return parsed;
    },
    draftedSimpleTag() {
      if (!this.hasDraftFieldNameInput || !this.hasValidDraftOrder) return '';
      const family = String(this.draftTagType || 'input');
      return `{${family}:${this.draftFieldLabelForPreview}|order:${this.normalizedDraftOrder}}`;
    },
    canCopyDraftedTag() {
      return Boolean(this.draftedSimpleTag);
    },
    canReplaceAllCheckedOccurrences() {
      return Boolean(
        this.canAnalyze &&
        this.selectedHelperCandidate?.text &&
        this.draftedSimpleTag &&
        this.selectedHelperCandidateOccurrences.length > 0 &&
        this.selectedHelperCandidateCheckedOccurrenceOrders.length > 0
      );
    },
    canPreviewHighlightedOccurrences() {
      return Boolean(
        this.canAnalyze &&
        this.selectedHelperCandidate?.text &&
        this.selectedHelperCandidateOccurrences.length > 0 &&
        this.selectedHelperCandidateCheckedOccurrenceOrders.length > 0
      );
    },
    tableSummary() {
      if (!this.analysis?.inventories?.tables) return [];

      const grouped = {};
      this.analysis.inventories.tables.forEach((entry) => {
        const tableName = entry.key || 'unknown_table';
        if (!grouped[tableName]) {
          grouped[tableName] = {
            name: tableName,
            hasTooltip: false,
            hasHyperlink: false,
            hasHyperlinkTooltip: false,
          };
        }

        if (entry.family === 'table_tooltip') grouped[tableName].hasTooltip = true;
        if (entry.family === 'table_hyperlink') grouped[tableName].hasHyperlink = true;
        if (entry.family === 'table_hyperlink_tooltip') grouped[tableName].hasHyperlinkTooltip = true;
      });

      return Object.values(grouped);
    },
  },
  methods: {
    setCopyDraftTagFeedback(message, type = 'success') {
      this.copyDraftTagFeedback = message;
      this.copyDraftTagFeedbackType = type;
      if (this.copyDraftTagFeedbackTimeoutId) {
        clearTimeout(this.copyDraftTagFeedbackTimeoutId);
      }
      this.copyDraftTagFeedbackTimeoutId = setTimeout(() => {
        this.copyDraftTagFeedback = '';
        this.copyDraftTagFeedbackType = '';
        this.copyDraftTagFeedbackTimeoutId = null;
      }, 1800);
    },
    setReplaceSelectedFeedback(message, type = 'success') {
      this.replaceSelectedFeedback = message;
      this.replaceSelectedFeedbackType = type;
      if (this.replaceSelectedFeedbackTimeoutId) {
        clearTimeout(this.replaceSelectedFeedbackTimeoutId);
      }
      this.replaceSelectedFeedbackTimeoutId = setTimeout(() => {
        this.replaceSelectedFeedback = '';
        this.replaceSelectedFeedbackType = '';
        this.replaceSelectedFeedbackTimeoutId = null;
      }, 2200);
    },
    async writeTextToClipboard(text) {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }

      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (!copied) {
        throw new Error('Copy command failed.');
      }
    },
    async copyDraftedTagToClipboard() {
      const tag = this.draftedSimpleTag;
      if (!tag) {
        this.setCopyDraftTagFeedback('No valid tag to copy.', 'error');
        return;
      }

      this.isCopyingDraftTag = true;
      try {
        await this.writeTextToClipboard(tag);
        this.setCopyDraftTagFeedback('Copied!');
      } catch (error) {
        this.setCopyDraftTagFeedback('Copy failed. Please try again.', 'error');
      } finally {
        this.isCopyingDraftTag = false;
      }
    },
    async replaceAllCheckedOccurrences() {
      if (!this.canReplaceAllCheckedOccurrences || this.isReplacingAllCheckedOccurrences) {
        this.setReplaceSelectedFeedback('Select a candidate and build a valid tag first.', 'error');
        return;
      }

      const sourceText = String(this.selectedHelperCandidate?.text || '').trim();
      const replacementText = this.draftedSimpleTag;
      const fileId = String(this.selectedTemplate?.fileId || '').trim();
      const bucketName = String(this.selectedTemplate?.bucketName || '').trim();
      const checkedOccurrenceIds = this.selectedHelperCandidateCheckedOccurrenceIds;
      const checkedOccurrenceOrders = this.selectedHelperCandidateCheckedOccurrenceOrders;

      if (!sourceText || !replacementText || !fileId || !bucketName) {
        this.setReplaceSelectedFeedback('Replacement requires a selected template, candidate, and valid tag.', 'error');
        return;
      }

      if (this.selectedHelperCandidateOccurrences.length > 0 && checkedOccurrenceOrders.length === 0) {
        this.setReplaceSelectedFeedback('No checked occurrences are available to replace.', 'error');
        return;
      }

      this.isReplacingAllCheckedOccurrences = true;
      try {
        const response = await axios.post('/api/tag-authoring/replace-selected', {
          fileId,
          bucketName,
          sourceText,
          replacementText,
          checkedOccurrenceIds,
          checkedOccurrenceOrders,
          replaceAllChecked: true,
        });

        const modifiedFileId = response?.data?.modifiedFileId;
        const tempBucketName = response?.data?.tempBucketName;
        const modifiedFilename = response?.data?.modifiedFilename;

        if (!modifiedFileId || !tempBucketName) {
          throw new Error('Replacement response did not include updated template details.');
        }

        this.selectedTemplate = {
          ...this.selectedTemplate,
          fileId: String(modifiedFileId),
          bucketName: String(tempBucketName),
          filename: modifiedFilename || this.selectedTemplate?.filename || '',
          label: modifiedFilename || this.selectedTemplate?.label || this.selectedTemplate?.filename || '',
        };

        this.setReplaceSelectedFeedback(response?.data?.message || 'Replaced checked occurrences.');

        this.loadDocumentPreview();
        await this.analyzeTemplate();
      } catch (error) {
        this.setReplaceSelectedFeedback(
          error?.response?.data?.error || 'Replacement failed.',
          'error'
        );
      } finally {
        this.isReplacingAllCheckedOccurrences = false;
      }
    },
    async previewHighlightedOccurrences() {
      if (!this.canPreviewHighlightedOccurrences || this.isPreviewHighlightingOccurrences || this.isReplacingAllCheckedOccurrences) {
        this.setReplaceSelectedFeedback('Select a candidate with checked occurrences first.', 'error');
        return;
      }

      const sourceText = String(this.selectedHelperCandidate?.text || '').trim();
      const fileId = String(this.selectedTemplate?.fileId || '').trim();
      const bucketName = String(this.selectedTemplate?.bucketName || '').trim();
      const checkedOccurrenceOrders = this.selectedHelperCandidateCheckedOccurrenceOrders;

      if (!sourceText || !fileId || !bucketName) {
        this.setReplaceSelectedFeedback('Preview highlighting requires a selected template and candidate.', 'error');
        return;
      }

      if (checkedOccurrenceOrders.length === 0) {
        this.setReplaceSelectedFeedback('No checked occurrences are available for highlighting.', 'error');
        return;
      }

      this.isPreviewHighlightingOccurrences = true;
      try {
        const response = await axios.post('/api/tag-authoring/preview-highlight-checked', {
          fileId,
          bucketName,
          sourceText,
          checkedOccurrenceOrders,
        });

        const modifiedFileId = response?.data?.modifiedFileId;
        const tempBucketName = response?.data?.tempBucketName;
        const modifiedFilename = response?.data?.modifiedFilename;

        if (!modifiedFileId || !tempBucketName) {
          throw new Error('Highlighted preview response did not include updated template details.');
        }

        this.selectedTemplate = {
          ...this.selectedTemplate,
          fileId: String(modifiedFileId),
          bucketName: String(tempBucketName),
          filename: modifiedFilename || this.selectedTemplate?.filename || '',
          label: modifiedFilename || this.selectedTemplate?.label || this.selectedTemplate?.filename || '',
        };

        this.setReplaceSelectedFeedback(response?.data?.message || 'Highlighted preview ready.');
        this.loadDocumentPreview();
      } catch (error) {
        this.setReplaceSelectedFeedback(
          error?.response?.data?.error || 'Failed to generate highlighted preview.',
          'error'
        );
      } finally {
        this.isPreviewHighlightingOccurrences = false;
      }
    },
    normalizeFieldNameFromText(value) {
      const normalized = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      return normalized || 'field_name';
    },
    resetHelperDraft() {
      this.selectedHelperCandidateText = '';
      this.showAllRepeatedTextCandidates = false;
      this.occurrenceSelectionByCandidate = {};
      this.draftTagType = 'input';
      this.draftFieldName = '';
      this.draftOrder = 1;
      this.copyDraftTagFeedback = '';
      this.copyDraftTagFeedbackType = '';
      if (this.copyDraftTagFeedbackTimeoutId) {
        clearTimeout(this.copyDraftTagFeedbackTimeoutId);
        this.copyDraftTagFeedbackTimeoutId = null;
      }
      this.replaceSelectedFeedback = '';
      this.replaceSelectedFeedbackType = '';
      if (this.replaceSelectedFeedbackTimeoutId) {
        clearTimeout(this.replaceSelectedFeedbackTimeoutId);
        this.replaceSelectedFeedbackTimeoutId = null;
      }
    },
    selectHelperCandidate(candidate) {
      const candidateText = String(candidate?.text || '').trim();
      if (!candidateText) {
        this.resetHelperDraft();
        return;
      }
      this.selectedHelperCandidateText = candidateText;
      this.ensureOccurrenceSelectionsForCandidate(candidate);
      this.draftTagType = 'input';
      this.draftFieldName = candidateText;
      this.draftOrder = 1;
    },
    ensureOccurrenceSelectionsForCandidate(candidate) {
      const candidateText = String(candidate?.text || '').trim();
      if (!candidateText) return;

      const occurrences = Array.isArray(candidate?.occurrences) ? candidate.occurrences : [];
      if (occurrences.length === 0) return;

      const existing = this.occurrenceSelectionByCandidate[candidateText] || {};
      const next = { ...existing };

      occurrences.forEach((occurrence) => {
        if (typeof next[occurrence.id] !== 'boolean') {
          next[occurrence.id] = true;
        }
      });

      this.occurrenceSelectionByCandidate = {
        ...this.occurrenceSelectionByCandidate,
        [candidateText]: next,
      };
    },
    isOccurrenceSelected(occurrenceId) {
      const candidateText = String(this.selectedHelperCandidate?.text || '').trim();
      if (!candidateText || !occurrenceId) return false;
      const selectionMap = this.occurrenceSelectionByCandidate[candidateText] || {};
      if (selectionMap[occurrenceId] === false) return false;
      return true;
    },
    setOccurrenceSelected(occurrenceId, value) {
      const candidateText = String(this.selectedHelperCandidate?.text || '').trim();
      if (!candidateText || !occurrenceId) return;

      const selectionMap = {
        ...(this.occurrenceSelectionByCandidate[candidateText] || {}),
      };
      selectionMap[occurrenceId] = Boolean(value);
      this.occurrenceSelectionByCandidate = {
        ...this.occurrenceSelectionByCandidate,
        [candidateText]: selectionMap,
      };
    },
    resetAnalysisState() {
      this.analysis = null;
      this.errorMessage = '';
      this.selectedCategory = 'fields';
      this.resetHelperDraft();
    },
    resetPreviewState() {
      this.previewError = '';
      this.isPreviewLoading = false;
      this.previewLoadRequestKey = 0;
    },
    isDocxTemplate(file) {
      const filename = (file?.filename || '').toLowerCase();
      const contentType = (file?.contentType || '').toLowerCase();
      return (
        filename.endsWith('.docx') ||
        contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      );
    },
    async fetchRootCategories() {
      this.isLoadingCategories = true;
      this.selectionError = '';
      this.categoryDropdowns = [];
      this.templates = [];
      this.selectedTemplate = null;
      this.templatesRequested = false;
      this.resetAnalysisState();
      this.resetPreviewState();

      try {
        const response = await axios.get('/api/folders/query-folders', {
          params: {
            type: 'category',
            parent: null,
          },
        });

        this.categoryDropdowns.push({
          label: 'Select a Category',
          options: (response.data || []).map((folder) => ({
            id: folder._id,
            name: folder.name,
            path: folder.path,
          })),
          selected: null,
        });
      } catch (error) {
        this.selectionError = 'Failed to load categories. Please try again.';
      } finally {
        this.isLoadingCategories = false;
      }
    },
    async fetchChildFolders(parentId, index) {
      this.isLoadingCategories = true;
      this.selectionError = '';

      try {
        const response = await axios.get('/api/folders/query-folders', {
          params: {
            parent: parentId,
            excludeType: 'storage',
          },
        });

        const childFolders = Array.isArray(response.data) ? response.data : [];
        this.categoryDropdowns.splice(index + 1);

        if (childFolders.length > 0) {
          const nextType = childFolders[0].type === 'subcategory' ? 'Subcategory' : 'Category';
          this.categoryDropdowns.push({
            label: `Select a ${nextType}`,
            options: childFolders.map((folder) => ({
              id: folder._id,
              name: folder.name,
              path: folder.path,
            })),
            selected: null,
          });
          this.templates = [];
          this.selectedTemplate = null;
          this.templatesRequested = false;
          this.resetPreviewState();
          return;
        }

        await this.fetchTemplatesForSelectedPath();
      } catch (error) {
        this.selectionError = 'Failed to load subcategories. Please try again.';
      } finally {
        this.isLoadingCategories = false;
      }
    },
    async handleCategorySelection(selectedId, index) {
      this.resetAnalysisState();
      this.selectionError = '';
      this.errorMessage = '';
      this.selectedTemplate = null;
      this.templates = [];
      this.templatesRequested = false;

      this.categoryDropdowns.splice(index + 1);

      if (!selectedId) {
        return;
      }

      await this.fetchChildFolders(selectedId, index);
    },
    async fetchTemplatesForSelectedPath() {
      const hierarchy = this.selectedHierarchy;
      if (hierarchy.length === 0) {
        return;
      }

      this.isLoadingTemplates = true;
      this.selectionError = '';
      this.templatesRequested = true;
      this.templates = [];
      this.selectedTemplate = null;
      this.resetPreviewState();

      try {
        const response = await axios.get('/api/files/fetch-template-files', {
          params: { hierarchy: JSON.stringify(hierarchy) },
        });

        const files = Array.isArray(response.data) ? response.data : [];
        this.templates = files
          .filter((file) => this.isDocxTemplate(file))
          .map((file) => ({
            label: file.filename,
            filename: file.filename,
            fileId: file._id,
            bucketName: file.bucketName,
            contentType: file.contentType,
            path: file.path,
          }));
      } catch (error) {
        if (error?.response?.status === 404) {
          this.templates = [];
        } else {
          this.selectionError = 'Failed to fetch templates. Please try again later.';
        }
      } finally {
        this.isLoadingTemplates = false;
      }
    },
    onTemplateChanged() {
      this.resetAnalysisState();
      this.errorMessage = '';
      this.previewError = '';
      this.isPreviewLoading = false;
    },
    loadDocumentPreview() {
      if (!this.canAnalyze) {
        this.previewError = 'Select a valid template before loading preview.';
        return;
      }
      this.previewError = '';
      this.isPreviewLoading = true;
      this.previewLoadRequestKey += 1;
    },
    onPreviewLoading() {
      this.previewError = '';
      this.isPreviewLoading = true;
    },
    getWordViewerBridgeStatus() {
      const viewer = this.$refs.wordViewer;
      if (!viewer || typeof viewer.getViewerCommandStatus !== 'function') {
        return {
          ready: false,
          reason: 'WORD_VIEWER_BRIDGE_UNAVAILABLE',
        };
      }
      return viewer.getViewerCommandStatus();
    },
    validateWordViewerBridge(context = 'preview_loaded') {
      const status = this.getWordViewerBridgeStatus();
      console.debug('[TagAuthoring] WordViewer command bridge status', {
        context,
        ...status,
      });
      return status;
    },
    registerWordViewerProbeCommands() {
      if (typeof window === 'undefined') return;
      window.__tagAuthoringRunViewerSearchProbe = (query = 'Customer') => this.runViewerSearchProbe(query);
      window.__tagAuthoringGetViewerBridgeStatus = () => this.getWordViewerBridgeStatus();
      console.debug('[TagAuthoring] Probe commands registered:', {
        run: 'window.__tagAuthoringRunViewerSearchProbe("Customer")',
        status: 'window.__tagAuthoringGetViewerBridgeStatus()',
      });
    },
    async runViewerSearchProbe(query = 'Customer') {
      const viewer = this.$refs.wordViewer;
      if (!viewer || typeof viewer.invokeViewerCommand !== 'function') {
        const missingBridgeResult = {
          ok: false,
          reason: 'WORD_VIEWER_BRIDGE_UNAVAILABLE',
        };
        console.debug('[TagAuthoring] Search probe result', missingBridgeResult);
        return missingBridgeResult;
      }

      const result = await viewer.invokeViewerCommand('searchText', {
        query: String(query || ''),
        matchCase: false,
        isForward: true,
      });
      console.debug('[TagAuthoring] Search probe result', result);
      return result;
    },
    onPreviewLoaded() {
      this.previewError = '';
      this.isPreviewLoading = false;
      this.validateWordViewerBridge('onPreviewLoaded');
      this.registerWordViewerProbeCommands();
    },
    onPreviewError(message) {
      this.previewError = message || 'Failed to load document preview.';
      this.isPreviewLoading = false;
    },
    getCategoryCount(category) {
      if (!this.analysis?.inventories) return 0;
      if (category === 'fields') return this.analysis.inventories.fields?.length || 0;
      if (category === 'metadata') return this.analysis.inventories.metadata?.length || 0;
      if (category === 'sections') return this.analysis.inventories.sections?.length || 0;
      if (category === 'tables') return this.tableSummary.length;
      return 0;
    },
    async analyzeTemplate() {
      this.resetAnalysisState();
      this.loading = true;

      if (!this.selectedTemplate) {
        this.loading = false;
        this.errorMessage = 'Please select a template before running analysis.';
        return;
      }

      const fileId = this.selectedTemplate.fileId;
      const bucketName = this.selectedTemplate.bucketName;
      if (!fileId || !bucketName) {
        this.loading = false;
        this.errorMessage = 'Selected template is missing required metadata. Please choose another template.';
        return;
      }

      try {
        const response = await axios.post('/api/tag-authoring/analyze-template', {
          fileId: String(fileId).trim(),
          bucketName: String(bucketName).trim(),
        });
        this.analysis = response.data;
      } catch (error) {
        this.errorMessage =
          error?.response?.data?.error ||
          'Failed to analyze template. Please try again.';
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.panel-title {
  font-weight: 700;
  margin-bottom: 12px;
}

.selection-subtitle {
  margin-bottom: 12px;
  color: #546e7a;
}

.sub-title {
  font-weight: 600;
}

.preview-actions {
  margin-bottom: 12px;
}

.preview-layout {
  align-items: stretch;
}

.helper-panel {
  min-height: 220px;
}

.helper-placeholder {
  color: #546e7a;
  font-size: 0.95rem;
}

.helper-candidate-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.helper-candidate-meta {
  color: #546e7a;
  font-size: 0.82rem;
}

.helper-candidate-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid #d7dee2;
  cursor: pointer;
}

.helper-candidate-item:first-child {
  border-top: none;
}

.helper-candidate-item-selected {
  background: rgba(25, 118, 210, 0.08);
  border-radius: 6px;
  padding-left: 8px;
  padding-right: 8px;
}

.helper-candidate-text {
  color: #263238;
  word-break: break-word;
}

.helper-candidate-count {
  color: #455a64;
  font-weight: 600;
  white-space: nowrap;
}

.helper-draft-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #d7dee2;
}

.helper-readonly-row {
  color: #37474f;
  font-size: 0.92rem;
}

.helper-tag-preview {
  color: #1b5e20;
  font-size: 0.92rem;
  word-break: break-word;
}

.helper-occurrence-section {
  border-top: 1px solid #d7dee2;
  padding-top: 10px;
}

.helper-occurrence-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.helper-occurrence-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 0;
  border-top: 1px solid #dfe5e8;
}

.helper-occurrence-item:first-child {
  border-top: none;
}

.helper-occurrence-checkbox {
  margin-top: -2px;
}

.helper-occurrence-content {
  min-width: 0;
}

.helper-occurrence-label {
  font-weight: 600;
  color: #37474f;
  font-size: 0.82rem;
}

.helper-occurrence-context {
  color: #455a64;
  font-size: 0.82rem;
  line-height: 1.3;
  word-break: break-word;
}

.helper-note {
  color: #546e7a;
  font-size: 0.86rem;
}

.helper-copy-row {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px;
}

.helper-action-btn {
  white-space: normal;
  min-width: 0;
}

.helper-copy-row .helper-copy-feedback {
  flex: 1 1 100%;
}

@media (max-width: 1200px) {
  .helper-action-btn {
    flex: 1 1 100%;
  }
}

.helper-copy-feedback {
  font-size: 0.82rem;
}

.helper-copy-feedback-success {
  color: #1b5e20;
}

.helper-copy-feedback-error {
  color: #b71c1c;
}

.helper-field-status {
  font-size: 0.82rem;
}

.helper-field-status-conflict {
  color: #b71c1c;
}

.helper-field-status-safe {
  color: #1b5e20;
}

.inventory-item {
  background: #fafafa;
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

.empty-note {
  color: #607d8b;
  font-size: 0.92rem;
}

.message-list {
  margin: 8px 0 0;
  padding-left: 18px;
}
</style>
