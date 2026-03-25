import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Stub: translations loaded here in Phase E
i18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        ui: {},
        game: {},
        narrative: {},
      },
    },
    ns: ['ui', 'game', 'narrative'],
    defaultNS: 'ui',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
