<template>
    <div class="flowchart-container">
      <!-- Initial step: Log In -->
      <div v-if="currentStep === 'step1'" class="step">
        <img :src="step1" alt="First Step (Log In)" />
        <div class="options">
          <v-btn color="primary" @click="goToStep('adminDashboard')">ADMIN BUTTON</v-btn>
          <v-btn color="primary" @click="goToStep('templateSelection')">TEMPLATE SELECTION BUTTON</v-btn>
        </div>
      </div>
  
      <!-- Admin Dashboard step -->
      <div v-if="currentStep === 'adminDashboard'" class="step">
        <img :src="step2Option1" alt="Second Step Option 1 (Admin Dashboard)" />
        <div class="options">
          <v-btn color="primary" @click="goToSubComponent('subComponent1')">FILE EXPLORER BUTTON</v-btn>
          <v-btn color="primary" @click="goToSubComponent('subComponent2')">CREATE USER BUTTON</v-btn>
          <v-btn color="primary" @click="goToSubComponent('subComponent3')">VIEW USER BUTTON</v-btn>
          <v-btn color="primary" @click="goToSubComponent('subComponent4')">UPLOAD TEMPLATE BUTTON</v-btn>
          <v-btn color="error" @click="resetToInitial">LOGOUT BUTTON</v-btn>
        </div>
        <v-btn color="secondary" @click="goBack">BACK</v-btn>
      </div>
  
      <!-- Sub-components under Admin Dashboard -->
      <div v-if="currentStep === 'subComponent1'" class="sub-step">
        <img :src="subComponent1" alt="Sub-component 1 (File Explorer)" />
        <v-btn color="secondary" @click="goBack">BACK</v-btn>
      </div>
      <div v-if="currentStep === 'subComponent2'" class="sub-step">
        <img :src="subComponent2" alt="Sub-component 2 (Create User)" />
        <v-btn color="secondary" @click="goBack">BACK</v-btn>
      </div>
      <div v-if="currentStep === 'subComponent3'" class="sub-step">
        <img :src="subComponent3" alt="Sub-component 3 (View User)" />
        <v-btn color="secondary" @click="goBack">BACK</v-btn>
      </div>
      <div v-if="currentStep === 'subComponent4'" class="sub-step">
        <img :src="subComponent4" alt="Sub-component 4 (Upload Template)" />
        <v-btn color="secondary" @click="goBack">BACK</v-btn>
      </div>
  
      <!-- Template Selection step -->
      <div v-if="currentStep === 'templateSelection'" class="step">
        <img :src="step2Option2" alt="Second Step Option 2 (Template Selection)" />
        <div class="options">
          <v-btn color="primary" @click="goToStep('inputFields')">GO TO INPUT FIELDS BUTTON</v-btn>
        </div>
        <v-btn color="secondary" @click="goBack">BACK</v-btn>
      </div>
  
      <!-- Step 3: Input Fields -->
      <div v-if="currentStep === 'inputFields'" class="step">
        <img :src="step3" alt="Third Step (Input Fields)" />
        <v-btn color="primary" @click="goToStep('dynamicTable')">NEXT BUTTON</v-btn>
        <v-btn color="secondary" @click="goBack">BACK</v-btn>
      </div>
  
      <!-- Step 4: Dynamic Table -->
      <div v-if="currentStep === 'dynamicTable'" class="step">
        <img :src="step4" alt="Fourth Step (Dynamic Table)" />
        <v-btn color="primary" @click="goToStep('checkboxPage')">NEXT BUTTON</v-btn>
        <v-btn color="secondary" @click="goBack">BACK</v-btn>
      </div>
  
      <!-- Step 5: Checkbox Page -->
      <div v-if="currentStep === 'checkboxPage'" class="step">
        <img :src="step5" alt="Fifth Step (Checkbox Page)" />
        <v-btn color="primary" @click="goToStep('processingPage')">START PROCESSING BUTTON</v-btn>
        <v-btn color="secondary" @click="goBack">BACK</v-btn>
      </div>
  
      <!-- Step 6: Processing Page -->
      <div v-if="currentStep === 'processingPage'" class="step">
        <img :src="step6" alt="Sixth Step (Processing Page)" />
        <v-btn color="primary" @click="goToStep('editorPage')">NEXT BUTTON</v-btn>
        <v-btn color="secondary" @click="goBack">BACK</v-btn>
      </div>
  
      <!-- Step 7: Editor Page -->
      <div v-if="currentStep === 'editorPage'" class="step">
        <img :src="step7" alt="Seventh Step (Editor Page)" />
        <v-btn color="secondary" @click="goBack">BACK</v-btn>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        currentStep: 'step1', // Start at the initial step
        stepHistory: [], // To keep track of previous steps
        step1: require('@/assets/First Step(Log In).svg'),
        step2Option1: require('@/assets/Second Step option 1(Admin Dashboard).svg'),
        step2Option2: require('@/assets/Second Step option 2(Template Selection).svg'),
        step3: require('@/assets/Third Step(Input Fields).svg'),
        step4: require('@/assets/Fourth Step(Dynamic Table).svg'),
        step5: require('@/assets/Fifth Step(Checkbox Page).svg'),
        step6: require('@/assets/Sixth Step(Processing Page).svg'),
        step7: require('@/assets/Seventh Step(Editor Page).svg'),
        subComponent1: require('@/assets/Sub-component Admin Dashboard 1(File Explorer).svg'),
        subComponent2: require('@/assets/Sub-component Admin Dashboard 2(Create User).svg'),
        subComponent3: require('@/assets/Sub-component Admin Dashboard 3(View User).svg'),
        subComponent4: require('@/assets/Sub-component Admin Dashboard 4(Upload Template).svg')
      };
    },
    methods: {
      goToStep(step) {
        this.stepHistory.push(this.currentStep); // Save the current step to history
        this.currentStep = step;
      },
      goToSubComponent(subComponent) {
        this.stepHistory.push(this.currentStep); // Save the current step to history
        this.currentStep = subComponent;
      },
      goBack() {
        if (this.stepHistory.length > 0) {
          this.currentStep = this.stepHistory.pop(); // Go back to the last step in history
        } else {
          this.currentStep = 'step1'; // If history is empty, go back to the initial step
        }
      },
      resetToInitial() {
        this.currentStep = 'step1'; // Reset to the initial step
        this.stepHistory = []; // Clear the history
      }
    }
  };
  </script>
  
  <style scoped>
  .flowchart-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .step, .sub-step {
    margin: 20px;
  }
  
  .options {
    margin-top: 10px;
    display: flex;
    gap: 10px;
  }
  </style>
  