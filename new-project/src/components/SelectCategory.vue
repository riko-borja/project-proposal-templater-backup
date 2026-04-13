<template>
  <v-container fluid class="select-category-shell">
    <v-row justify="center" align="center" class="fill-height">
      <v-col cols="12" sm="9" md="7" lg="5">
        <v-card class="select-category-card pa-4 pa-sm-6" rounded="xl">
          <v-card-title class="select-category-title">Select a Category</v-card-title>
          <v-card-text>
            <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4 select-category-alert">
              {{ errorMessage }}
            </v-alert>

            <p class="select-category-subtitle">
              Choose the category path to narrow templates for your proposal.
            </p>

            <div v-for="(dropdown, index) in dropdowns" :key="dropdown.label + index" class="mt-4 dropdown-block">
              <v-select
                v-model="dropdown.selected"
                :items="dropdown.options"
                item-title="name"
                item-value="id"
                :label="dropdown.label"
                :loading="isLoading"
                :disabled="isLoading"
                @update:modelValue="(value) => handleSelection(value, index)"
                class="category-select"
                variant="outlined"
                density="comfortable"
              ></v-select>
            </div>

            <div class="actions-row mt-4">
              <v-btn
                :disabled="!isSelectionComplete || isLoading"
                :loading="isLoading"
                color="primary"
                @click="proceedToTemplateSelection"
                class="proceed-btn"
                size="large"
                block
              >
                Proceed to Template Selection
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import axios from 'axios';
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';

export default {
  setup() {
    const dropdowns = ref([]);
    const isLoading = ref(false);
    const errorMessage = ref('');
    const router = useRouter();
    const store = useStore();

    // Fetch root categories on mount
    const fetchRootCategories = async () => {
      isLoading.value = true;
      errorMessage.value = '';
      try {
        const response = await axios.get('/api/folders/query-folders', {
          params: {
            type: 'category',
            parent: null,
          },
        });

        dropdowns.value.push({
          label: 'Select a Category',
          options: response.data.map(folder => ({
            id: folder._id,
            name: folder.name,
            path: folder.path,
          })),
          selected: null,
        });
      } catch (error) {
        console.error('Error fetching root categories:', error);
        errorMessage.value = 'Failed to load categories. Please try again.';
      } finally {
        isLoading.value = false;
      }
    };

    // Fetch child folders when a dropdown selection is made
    const fetchChildFolders = async (parentId, index) => {
      isLoading.value = true;
      errorMessage.value = '';
      try {
        const response = await axios.get('/api/folders/query-folders', {
          params: {
            parent: parentId,
            excludeType: 'storage',
          },
        });

        const childFolders = response.data;

        // Remove dropdowns deeper than the current selection
        dropdowns.value.splice(index + 1);

        if (childFolders.length > 0) {
          const nextType = childFolders[0].type === 'subcategory' ? 'Subcategory' : 'Category';

          dropdowns.value.push({
            label: `Select a ${nextType}`,
            options: childFolders.map(folder => ({
              id: folder._id,
              name: folder.name,
              path: folder.path,
            })),
            selected: null,
          });
        }
      } catch (error) {
        console.error('Error fetching child folders:', error);
        errorMessage.value = 'Failed to load subcategories. Please try again.';
      } finally {
        isLoading.value = false;
      }
    };

    const handleSelection = (selectedId, index) => {
      if (!selectedId) return;
      fetchChildFolders(selectedId, index);
    };

    const isSelectionComplete = computed(() => {
      return Boolean(
        dropdowns.value.length > 0 && dropdowns.value[dropdowns.value.length - 1].selected
      );
    });

    const proceedToTemplateSelection = () => {
      const hierarchy = dropdowns.value.map(dropdown => {
        const selectedOption = dropdown.options.find(option => option.id === dropdown.selected);
        return {
          id: dropdown.selected,
          name: selectedOption?.name,
          path: selectedOption?.path,
        };
      });

      router.push({ name: 'userOptionsPage', query: { hierarchy: JSON.stringify(hierarchy) } });
    };

    onMounted(() => {
      store.dispatch('resetStore');
      fetchRootCategories();
    });

    return {
      dropdowns,
      isLoading,
      errorMessage,
      handleSelection,
      isSelectionComplete,
      proceedToTemplateSelection,
    };
  },
};
</script>

<style scoped>
.select-category-shell {
  min-height: 100vh;
  background: linear-gradient(180deg, #eef3f8 0%, #f8fafc 100%);
  padding-top: 24px;
  padding-bottom: 24px;
}

.select-category-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.09);
}

.select-category-title {
  padding: 0 0 8px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

.select-category-subtitle {
  margin: 0 0 8px;
  color: rgba(15, 23, 42, 0.75);
  font-size: 0.95rem;
}

.dropdown-block {
  margin-bottom: 2px;
}

.actions-row {
  display: flex;
  justify-content: center;
}

.proceed-btn {
  font-weight: 600;
  letter-spacing: 0.2px;
}
</style>
