import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import router from './router'
import store from './store' // Import the store
import ContextMenu from '@imengyu/vue3-context-menu';
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css';
import 'vuetify/styles'; // Ensure you import Vuetify styles
import '@mdi/font/css/materialdesignicons.css'; // Import MDI font


loadFonts()

const app = createApp(App)

// No need to import components directly. Vuetify components will be registered automatically if properly configured in vuetify plugin.

app.use(router)
app.use(vuetify)
app.use(store) // Use the store
app.use(ContextMenu);
app.mount('#app')
