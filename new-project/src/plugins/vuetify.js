// Styles
import '@mdi/font/css/materialdesignicons.css'; // Import MDI icons
import 'vuetify/styles'; // Import Vuetify styles

// Vuetify
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

// Create the Vuetify instance
export default createVuetify({
  icons: {
    defaultSet: 'mdi', // Use MDI as the default icon set
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'light', // Set to 'light' or 'dark' as preferred
  },
  defaults: {
    global: {
      ripple: false, // Optional: Disable ripples globally
    },
  },
  display: {
    mobileBreakpoint: 'sm', // Set the breakpoint for mobile
  },
});
