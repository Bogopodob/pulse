import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app/styles/index.css'
import { ThemeProvider } from './shared/hooks/useTheme'
import { I18nProvider } from './shared/hooks/useI18n'
import { SettingsProvider } from './shared/hooks/useSettings'
import { TemplatesProvider } from './entities/templates/useTemplates'
import App from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <SettingsProvider>
          <TemplatesProvider>
            <App />
          </TemplatesProvider>
        </SettingsProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)