import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { installRipple } from '@/utils/ripple'

const app = createApp(App)
app.use(createPinia())

installRipple()
app.mount('#app')
