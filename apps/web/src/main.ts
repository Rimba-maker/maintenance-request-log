import '@fontsource/fira-code/latin-400.css'
import '@fontsource/fira-code/latin-500.css'
import '@fontsource/fira-sans/latin-400.css'
import '@fontsource/fira-sans/latin-500.css'
import '@fontsource/fira-sans/latin-600.css'
import { createApp } from 'vue'
import App from './App.vue'
import { setUnauthorizedHandler } from './api/client'
import { router } from './router'
import { clearSession } from './session'
import './styles/tokens.css'
import './styles/base.css'

setUnauthorizedHandler(() => {
  clearSession()
  router.push({ name: 'login' })
})

createApp(App).use(router).mount('#app')
