// CHANGAN Management - Mock Data for the updated CRM workflow

export const visitReasons = [
  'Техническое обслуживание (ТО)',
  'Диагностика электроники и ПО',
  'Ремонт ходовой части / Подвески',
  'Кузовной ремонт & Покраска',
  'Тест-драйв новой модели Changan',
  'Оформление страхового полиса / Кредит',
  'Другое'
];

export const initialWaitlist = [
  {
    id: 'w-01',
    firstName: 'Иван',
    lastName: 'Петров',
    phone: '+7 (900) 123-45-67',
    date: new Date().toISOString().split('T')[0], // Today's date to trigger top-sorting & green highlight!
    time: '14:30',
    reason: 'Техническое обслуживание (ТО)',
    customReason: '',
    servicedBy: 'Администратор'
  },
  {
    id: 'w-02',
    firstName: 'Дмитрий',
    lastName: 'Козлов',
    phone: '+7 (911) 987-65-43',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    time: '11:00',
    reason: 'Диагностика электроники и ПО',
    customReason: '',
    servicedBy: 'Администратор'
  }
];

export const initialDocs = [
  {
    id: 'doc-01',
    firstName: 'Сергей',
    lastName: 'Смирнов',
    passportNumber: '4615-998877',
    vinCode: 'LSG1A2B3C4D5E6F7G',
    virtualPhone: '+374-94-112233',
    country: 'Армения',
    pdfFileName: 'risk_LSG1A2B3C4D5E6F7G.pdf',
    servicedBy: 'Вова',
    hasPassportPhoto: true,
    hasVinPhoto: true,
    hasPdfFile: true,
    hasNumPhoto: true
  }
];

export const initialConfirmed = [
  {
    id: 'c-01',
    firstName: 'Алексей',
    lastName: 'Иванов',
    phone: '+7 (950) 444-55-66',
    date: '2026-06-05',
    time: '16:00',
    reason: 'Тест-драйв новой модели Changan',
    passportNumber: '4508-112233',
    vinCode: 'LSG9Y8X7W6V5U4T3S',
    virtualPhone: '+374-91-998877',
    country: 'Армения',
    pdfFileName: 'risk_LSG9Y8X7W6V5U4T3S.pdf',
    servicedBy: 'Вова',
    confirmedAt: '2026-06-05 17:30'
  }
];
