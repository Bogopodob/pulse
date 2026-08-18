import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider as RacI18nProvider } from 'react-aria-components'
import './app/styles/index.css'
import { ThemeProvider } from './shared/hooks/useTheme'
import { I18nProvider } from './shared/hooks/useI18n'
import { SettingsProvider } from './shared/hooks/useSettings'
import { TemplatesProvider } from './entities/templates/useTemplates'
import App from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RacI18nProvider locale="ru-RU">
      <ThemeProvider>
        <I18nProvider>
          <SettingsProvider>
            <TemplatesProvider>
              <App />
            </TemplatesProvider>
          </SettingsProvider>
        </I18nProvider>
      </ThemeProvider>
    </RacI18nProvider>
  </StrictMode>,
)