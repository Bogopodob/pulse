import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app/styles/index.css'
import { ThemeProvider } from './shared/hooks/useTheme'
import { I18nProvider } from './shared/hooks/useI18n'
import App from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)