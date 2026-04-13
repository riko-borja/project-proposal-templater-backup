<template>
    <v-app>
        <!-- App Bar with Dark Mode Toggle -->
        <v-app-bar app color="primary" dark>
            <v-app-bar-nav-icon></v-app-bar-nav-icon>
            <v-toolbar-title>Project Proposal Assistant</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-switch v-model="darkTheme" label="Dark Mode" @change="toggleDarkMode"></v-switch>
            <v-spacer></v-spacer>
            <v-btn @click="goToSelectCategory">
                <v-icon>mdi-back</v-icon>
                Back
            </v-btn>
        </v-app-bar>
  
      <v-main>
        <v-container class="mt-5" fluid>
          <!-- Query Input Form -->
          <v-row justify="center">
            <v-col cols="12" md="8">
              <v-card elevation="4">
                <v-card-title class="headline">Enter Your Query</v-card-title>
                <v-card-text>
                  <v-form @submit.prevent="handleSubmit">
                    <v-text-field
                      v-model="query"
                      label="Type your request here..."
                      outlined
                      dense
                      required
                    ></v-text-field>
                    <v-btn color="primary" type="submit" class="mt-4" :loading="isLoading" block>
                      Send
                    </v-btn>
                  </v-form>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
  
          <!-- Intent Recognition Display -->
          <v-row v-if="intentResponse" class="mt-5" justify="center">
            <v-col cols="12" md="8">
              <v-alert type="info" outlined>
                <strong>Intent Recognized:</strong> {{ intentResponse.intent }}
              </v-alert>
            </v-col>
          </v-row>
  
          <!-- Generated Proposal Display -->
          <v-row v-if="proposalResponse && intentResponse.intent === 'generate_new_proposal'" class="mt-5" justify="center">
            <v-col cols="12" md="8">
              <v-card elevation="4">
                <v-card-title class="headline">Generated Proposal</v-card-title>
                <v-card-text>
                  <v-list dense>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title><strong>Title:</strong> {{ proposalResponse.title }}</v-list-item-title>
                        <v-list-item-subtitle><strong>Author:</strong> {{ proposalResponse.author }}</v-list-item-subtitle>
                        <v-list-item-subtitle><strong>Date Created:</strong> {{ proposalResponse.date_created }}</v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                  <v-divider class="my-4"></v-divider>
                  <div v-html="formattedContent"></div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
  
        <!-- Generated Snippets Display -->
        <v-row v-if="snippetResponse && intentResponse.intent === 'generate_snippet'" class="mt-5" justify="center">
        <v-col cols="12" md="8">
            <v-card elevation="4">
            <v-card-title class="headline">Generated Snippets</v-card-title>
            <v-card-text>
                <v-list dense>
                <v-list-item v-for="(snippetData, section) in snippetResponse.snippets" :key="section">
                    <v-list-item-content>
                    <v-list-item-title class="no-truncate">
                        <strong>{{ section }}:</strong> {{ snippetData.snippet }}
                    </v-list-item-title>
                    <p class="no-truncate"><em>Date Created:</em> {{ snippetData.date_created }}</p>
                    </v-list-item-content>
                </v-list-item>
                </v-list>
            </v-card-text>
            </v-card>
        </v-col>
        </v-row>
  
          <!-- Comparison Results Display -->
          <v-row v-if="comparisonResponse && intentResponse.intent === 'compare_proposals'" class="mt-5" justify="center">
            <v-col cols="12" md="8">
              <v-card elevation="4">
                <v-card-title class="headline">Comparison Results</v-card-title>
                <v-card-text>
                  <v-list dense>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title><strong>Proposal 1:</strong> {{ comparisonResponse.proposal1_title }}</v-list-item-title>
                        <v-list-item-title><strong>Proposal 2:</strong> {{ comparisonResponse.proposal2_title }}</v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                  <v-divider class="my-4"></v-divider>
                  <v-expansion-panels>
                    <v-expansion-panel v-for="report in comparisonResponse.comparison_report" :key="report.section">
                      <v-expansion-panel-title>{{ report.section }}</v-expansion-panel-title>
                      <v-expansion-panel-text>
                        <v-row>
                          <v-col cols="12" sm="4">
                            <strong>Score:</strong> {{ report.score }}
                          </v-col>
                          <v-col cols="12" sm="4">
                            <strong>Interpretation:</strong> {{ report.interpretation }}
                          </v-col>
                          <v-col cols="12" sm="4">
                            <strong>Insight:</strong> {{ report.insight }}
                          </v-col>
                        </v-row>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
  
          <!-- Summarized Proposal Display -->
          <v-row v-if="summaryResponse && intentResponse.intent === 'summarize_proposal'" class="mt-5" justify="center">
            <v-col cols="12" md="8">
              <v-card elevation="4">
                <v-card-title class="headline">Proposal Summary</v-card-title>
                <v-card-text>
                <v-list dense>
                    <v-list-item>
                    <v-list-item-content>
                        <v-list-item-title><strong>Title:</strong> {{ summaryResponse.title }}</v-list-item-title>
                        <!-- Replace this with a regular paragraph to see if it displays correctly -->
                        <p><strong>Summary:</strong> {{ summaryResponse.summary }}</p>
                    </v-list-item-content>
                    </v-list-item>
                </v-list>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-main>
    </v-app>
  </template>
  
  <script>
  import axios from 'axios';
  import { useRouter } from 'vue-router';
  import { useTheme } from 'vuetify';
  
  export default {
    name: 'IntentRecognitionPage',
    setup() {
      const router = useRouter();
      const theme = useTheme(); // Access Vuetify theme
      return { router, theme };
    },
    data() {
      return {
        query: '',
        intentResponse: null,
        proposalResponse: null,
        snippetResponse: null,
        comparisonResponse: null,
        summaryResponse: null,
        isLoading: false,
        darkTheme: false
      };
    },
    computed: {
      formattedContent() {
        if (this.proposalResponse && this.proposalResponse.content) {
          return this.proposalResponse.content.replace(/\n/g, '<br>');
        }
        return '';
      }
    },
    methods: {
      async handleSubmit() {
        try {
            console.log('Query submitted:', this.query);
            this.isLoading = true;

            // Send query to recognize intent
            const res = await axios.post('http://192.168.50.57:5000/recognize_intent', { text: this.query });
            this.intentResponse = res.data;
            console.log('Recognized intent:', this.intentResponse);

            // Reset all previous responses
            this.proposalResponse = null;
            this.snippetResponse = null;
            this.comparisonResponse = null;
            this.summaryResponse = null;

            if (this.intentResponse.intent === 'generate_new_proposal') {
                console.log('Calling generate_proposal endpoint...');
                const proposalRes = await axios.post('http://192.168.50.57:5000/generate_proposal', {
                    keyword: this.query
                });
                this.proposalResponse = proposalRes.data;
                console.log('Generated proposal response:', this.proposalResponse);
            } else if (this.intentResponse.intent === 'generate_snippet') {
                console.log('Calling generate_snippet endpoint...');
                const snippetRes = await axios.post('http://192.168.50.57:5000/generate_snippet', {
                    query: this.query
                });
                this.snippetResponse = snippetRes.data;
                console.log('Generated snippet response:', this.snippetResponse);
            } else if (this.intentResponse.intent === 'compare_proposals') {
                console.log('Calling compare_proposals endpoint...');
                const comparisonRes = await axios.post('http://192.168.50.57:5000/compare_proposals', {
                    query: this.query
                });
                this.comparisonResponse = comparisonRes.data;
                console.log('Comparison response:', this.comparisonResponse);
            } else if (this.intentResponse.intent === 'summarize_proposal') {
                console.log('Calling summarize_proposal endpoint...');
                const summaryRes = await axios.post('http://192.168.50.57:5000/summarize_proposal', {
                    query: this.query
                });
                this.summaryResponse = summaryRes.data;
                console.log('Generated summary response:', this.summaryResponse);
            } else if (this.intentResponse.intent === 'tell_a_joke') {
                console.log('Calling tell_a_joke endpoint...');
                const jokeRes = await axios.get('http://192.168.50.57:5000/tell_a_joke');
                console.log('Joke response:', jokeRes.data);
                this.intentResponse.response = jokeRes.data.response; // Show the joke in your UI
            } else if (this.intentResponse.intent === 'unknown') {
                console.error('Intent not recognized or supported.');
                alert("I'm not sure how to help with that. Could you please rephrase?");
            } else {
                console.log('Intent not related to specific endpoints:', this.intentResponse.intent);
                switch (this.intentResponse.intent) {
                    case 'add_proposal_prompt':
                        this.router.push({ name: 'ProposalCreation' });
                        break;
                    default:
                        console.error('Intent not recognized or supported.');
                }
            }
        } catch (error) {
            console.error('Error processing query:', error);
        } finally {
            this.isLoading = false;
        }
    },

      goToSelectCategory() {
      // Navigate to the Intent Recognition Page
      this.$router.push({ name: 'selectCategory' });
    },
      toggleDarkMode() {
        this.theme.global.name = this.darkTheme ? 'dark' : 'light';
      }
    }
  };
  </script>
  
  
  <style scoped>
  /* Existing styles */
  .headline {
    font-weight: bold;
  }
  
  /* New styles to prevent text truncation */
  .no-truncate {
    white-space: normal; /* Allow text to wrap */
    overflow: visible;   /* Ensure the text is fully displayed */
    text-overflow: clip; /* Prevent truncation with ellipsis */
  }
  </style>
  
  