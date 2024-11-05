import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";

import { createVuetify } from "vuetify";
import * as components from 'vuetify/components'; // Import all Vuetify components
import * as directives from 'vuetify/directives'; // Import Vuetify directives
import "vuetify/dist/vuetify.min.css";

import App from "./App.vue";
import router from "./router";

const app = createApp(App);

app.use(createPinia());
app.use(router);

const vuetify = createVuetify({
  components, // Register Vuetify components
  directives, // Register Vuetify directives
});

app.use(vuetify);

app.mount("#app");
