import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import axios from 'axios';
import './style.css';

// Configure axios to send credentials (cookies) with all requests
axios.defaults.withCredentials = true;

// Don't set baseURL - use relative paths so it works on any port
// When served from backend/public, relative paths will work automatically

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');

