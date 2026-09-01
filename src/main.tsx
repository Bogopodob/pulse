import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider as RacI18nProvider } from 'react-aria-components'
import './app/styles/index.css'
import { ThemeProvider } from './shared/hooks/useTheme'
import { I18nProvider, useI18n } from './shared/hooks/useI18n'
import { SettingsProvider } from './shared/hooks/useSettings'
import { TemplatesProvider } from './entities/templates/useTemplates'
import { TasksProvider } from './entities/tasks/useTasks'
import { TeamProvider } from './entities/team/useTeam'
import App from './app/App'

function RacWrapper({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n()
  const [racLocale, setRacLocale] = useState(locale === 'ru' ? 'ru-RU' : 'en-US')
  useEffect(() => setRacLocale(locale === 'ru' ? 'ru-RU' : 'en-US'), [locale])
  return <RacI18nProvider locale={racLocale}>{children}</RacI18nProvider>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <RacWrapper>
          <SettingsProvider>
            <TemplatesProvider>
              <TasksProvider>
                <TeamProvider>
                  <App />
                </TeamProvider>
              </TasksProvider>
            </TemplatesProvider>
          </SettingsProvider>
        </RacWrapper>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
