import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'client-db-lang'

export const translations = {
  bg: {
    // menu
    menuLabel: 'Меню',
    backToHome: '← Обратно към картотеката',
    backToProfile: '← Обратно към профила',
    navHome: 'Начало',
    navSettings: 'Настройки на параметрите',

    // common
    loading: 'Зареждане...',
    cancel: 'Отказ',
    save: 'Запази',
    saving: 'Запис...',
    delete: 'Изтрий',

    // home page
    searchPlaceholder: 'Търси по име, телефон, имейл или адрес...',
    newClient: '+ Нов клиент',
    noClientsYet: 'Все още няма добавени клиенти.',
    noSearchMatches: 'Няма съвпадения за търсенето.',
    deleteClientTitle: 'Изтриване на {name}',
    deleteClientMessage:
      'Това ще изтрие клиента и цялата история от параметри. Действието е необратимо.',

    // client card
    noContacts: 'Няма контакти',
    deleteClientAria: 'Изтрий клиент',
    ageSuffix: ' г.',

    // add client modal
    newClientTitle: 'Нов клиент',
    nameRequired: 'Името е задължително.',
    genericSaveError: 'Възникна грешка при запис.',
    fieldFullName: 'Име и фамилия *',
    fieldPhone: 'Телефон',
    fieldEmail: 'Имейл',
    fieldAddress: 'Адрес',
    fieldBirthDate: 'Дата на раждане',
    fieldGender: 'Пол',
    fieldPhoto: 'Снимка',
    fieldNotes: 'Бележки',
    genderMale: 'Мъж',
    genderFemale: 'Жена',
    genderOther: 'Друго',
    saveClient: 'Запази клиент',

    // client profile
    changePhoto: 'Смени снимка',
    removePhoto: 'Премахни снимка',
    editClient: 'Редактирай',
    deleteClient: 'Изтрий клиента',
    parametersHeading: 'Параметри',
    openArrow: 'Отвори →',
    tanitaTitle: 'Танита измервания',
    tanitaSubtitleShort: 'Везна Tanita',
    bodyTitle: 'Мерки на тялото',
    bodySubtitleShort: 'Обиколки',

    // parameter group page
    unknownGroup: 'Непозната група параметри.',
    measurementDate: 'Дата на измерване',
    addAll: 'Добави',
    tanitaSubtitleLong: 'Измервания от везна Tanita',
    bodySubtitleLong: 'Обиколки с шивашки метър',

    // parameters table
    historyButton: 'История →',
    colNum: '№',
    colParameter: 'Параметър',
    colLatest: 'Последна стойност',
    colNewValue: 'Нова стойност',
    newValuePlaceholder: 'Нова стойност...',

    // history modal
    historyTitle: 'История по дати',
    closeAria: 'Затвори',
    noValuesYet: 'Няма въведени стойности все още.',
    deleteQuestion: 'Изтрий?',
    no: 'Не',
    noValueForDate: 'Няма стойност за тази дата',
    editAria: 'Редактирай',
    deleteAria: 'Изтрий',
    saveAria: 'Запази',
    cancelAria: 'Отказ',

    // settings page
    settingsTitle: 'Настройки на параметрите',
    settingsDescription:
      'Преименувай, добавяй или изтривай параметри във всяка група. Всички стойности са числови. Изтриването на параметър трие и цялата му история.',
    namePlaceholder: 'Име на параметъра',
    newParamPlaceholder: 'Име на нов параметър...',
    addParameter: '+ Добави параметър',
    deleteParamAria: 'Изтрий параметъра',
    deleteParamConfirm: 'Изтрий „{name}" и цялата му история?',
  },
  en: {
    // menu
    menuLabel: 'Menu',
    backToHome: '← Back to client list',
    backToProfile: '← Back to profile',
    navHome: 'Home',
    navSettings: 'Parameter settings',

    // common
    loading: 'Loading...',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    delete: 'Delete',

    // home page
    searchPlaceholder: 'Search by name, phone, email or address...',
    newClient: '+ New client',
    noClientsYet: 'No clients added yet.',
    noSearchMatches: 'No matches for your search.',
    deleteClientTitle: 'Delete {name}',
    deleteClientMessage:
      'This will delete the client and all parameter history. This action cannot be undone.',

    // client card
    noContacts: 'No contact info',
    deleteClientAria: 'Delete client',
    ageSuffix: ' yrs',

    // add client modal
    newClientTitle: 'New client',
    nameRequired: 'Name is required.',
    genericSaveError: 'Something went wrong while saving.',
    fieldFullName: 'Full name *',
    fieldPhone: 'Phone',
    fieldEmail: 'Email',
    fieldAddress: 'Address',
    fieldBirthDate: 'Date of birth',
    fieldGender: 'Gender',
    fieldPhoto: 'Photo',
    fieldNotes: 'Notes',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderOther: 'Other',
    saveClient: 'Save client',

    // client profile
    changePhoto: 'Change photo',
    removePhoto: 'Remove photo',
    editClient: 'Edit',
    deleteClient: 'Delete client',
    parametersHeading: 'Parameters',
    openArrow: 'Open →',
    tanitaTitle: 'Tanita measurements',
    tanitaSubtitleShort: 'Tanita scale',
    bodyTitle: 'Body measurements',
    bodySubtitleShort: 'Tape measurements',

    // parameter group page
    unknownGroup: 'Unknown parameter group.',
    measurementDate: 'Measurement date',
    addAll: 'Add',
    tanitaSubtitleLong: 'Measurements from a Tanita scale',
    bodySubtitleLong: 'Tape measurements',

    // parameters table
    historyButton: 'History →',
    colNum: '№',
    colParameter: 'Parameter',
    colLatest: 'Latest value',
    colNewValue: 'New value',
    newValuePlaceholder: 'New value...',

    // history modal
    historyTitle: 'History by date',
    closeAria: 'Close',
    noValuesYet: 'No values recorded yet.',
    deleteQuestion: 'Delete?',
    no: 'No',
    noValueForDate: 'No value recorded for this date',
    editAria: 'Edit',
    deleteAria: 'Delete',
    saveAria: 'Save',
    cancelAria: 'Cancel',

    // settings page
    settingsTitle: 'Parameter settings',
    settingsDescription:
      'Rename, add, or delete parameters in each group. All values are numeric. Deleting a parameter also deletes its entire history.',
    namePlaceholder: 'Parameter name',
    newParamPlaceholder: 'New parameter name...',
    addParameter: '+ Add parameter',
    deleteParamAria: 'Delete parameter',
    deleteParamConfirm: 'Delete "{name}" and all its history?',
  },
}

const LOCALES = { bg: 'bg-BG', en: 'en-GB' }

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'bg'
    return window.localStorage.getItem(STORAGE_KEY) || 'bg'
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  function t(key, vars) {
    const dict = translations[lang] || translations.bg
    let str = dict[key] ?? translations.bg[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, v)
      }
    }
    return str
  }

  function formatDate(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString(LOCALES[lang] || LOCALES.bg, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Client gender is stored using the fixed Bulgarian values the database
  // expects ("Мъж"/"Жена"/"Друго"), regardless of UI language - this just
  // maps that stored value to a translated label for display.
  function genderLabel(value) {
    if (value === 'Мъж') return t('genderMale')
    if (value === 'Жена') return t('genderFemale')
    if (value === 'Друго') return t('genderOther')
    return value
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, formatDate, genderLabel }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
