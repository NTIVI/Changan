import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  UserCheck,
  FolderOpen,
  CalendarCheck,
  Search,
  Plus,
  Check,
  Trash,
  PlusCircle,
  X,
  User,
  ShieldAlert,
  Edit3,
  Download,
  AlertTriangle,
  Upload,
  FileText,
  UserX,
  Camera
} from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { visitReasons } from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  // 1. Auth States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 2. Navigation States
  const [activeTab, setActiveTab] = useState('waitlist'); // 'waitlist', 'documents', 'confirmed'
  const [confirmedSubTab, setConfirmedSubTab] = useState('documents'); // 'documents' | 'waitlist'

  // 3. Database States
  const [waitlist, setWaitlist] = useState([]);
  const [docsList, setDocsList] = useState([]);
  const [confirmed, setConfirmed] = useState([]);

  // Fetch all data from API on mount
  useEffect(() => {
    fetchWaitlist();
    fetchDocs();
    fetchConfirmed();
  }, []);

  const fetchWaitlist = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/waitlist`);
      if (res.ok) {
        const data = await res.json();
        setWaitlist(data);
      }
    } catch (err) {
      console.error('Error fetching waitlist:', err);
    }
  };

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocsList(data);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const fetchConfirmed = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/confirmed`);
      if (res.ok) {
        const data = await res.json();
        setConfirmed(data);
      }
    } catch (err) {
      console.error('Error fetching confirmed:', err);
    }
  };

  // 4. Form States (Menu 1: Manual registration)
  const [waitlistForm, setWaitlistForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    reason: visitReasons[0],
    customReason: ''
  });

  // 5. OCR Simulator States (Menu 2)
  const [uploadedFiles, setUploadedFiles] = useState({
    passport: null, // file name or dummy indicator
    vin: null,
    pdf: null,
    numberScreenshot: null
  });
  const [uploadedFilesData, setUploadedFilesData] = useState({
    passport: null,
    vin: null,
    pdf: null,
    numberScreenshot: null
  });
  const [cameraActiveSlot, setCameraActiveSlot] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');

  // Extracted data (editable after OCR)
  const [ocrData, setOcrData] = useState({
    firstName: '',
    lastName: '',
    passportNumber: '',
    vinCode: '',
    virtualPhone: '',
    country: 'Армения',
    pdfFileName: ''
  });

  // 6. Edit Modals
  const [editWaitlistRecord, setEditWaitlistRecord] = useState(null);
  const [editDocsRecord, setEditDocsRecord] = useState(null);

  // 7. Duplicate Warning Modal States
  const [duplicateWarning, setDuplicateWarning] = useState(null); // holds { clientData, source: 'waitlist' | 'ocr' }

  // 8. Toast Alert State
  const [toast, setToast] = useState('');

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfileName, setTempProfileName] = useState('');

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSaveProfileName = () => {
    if (tempProfileName.trim()) {
      setUsername(tempProfileName.trim());
      setIsEditingProfile(false);
      triggerToast('Имя профиля успешно обновлено!');
    }
  };

  // Login handler
  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setIsLoggedIn(true);
      triggerToast(`Добро пожаловать в систему, ${username}!`);
    } else {
      alert('Пожалуйста, введите имя пользователя.');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  // Helper: check if a client (FirstName, LastName) is already in Menu 3 (Confirmed)
  const findInConfirmed = (first, last) => {
    return confirmed.find(
      (c) => c.firstName.trim().toLowerCase() === first.trim().toLowerCase() &&
             c.lastName.trim().toLowerCase() === last.trim().toLowerCase()
    );
  };

  // Today's date string helper for highlight comparison (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];

  // Menu 1: Save Waitlist Registration
  const handleSaveWaitlist = (e) => {
    e.preventDefault();
    const { firstName, lastName, phone, date, time, reason, customReason } = waitlistForm;
    if (!firstName || !lastName || !phone || !date || !time) {
      alert('Заполните все обязательные поля!');
      return;
    }

    const clientData = {
      id: `w-${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      date,
      time,
      reason,
      customReason: reason === 'Другое' ? customReason.trim() : '',
      servicedBy: username || 'Администратор'
    };

    // Check for duplicate in Confirmed
    const alreadyConfirmed = findInConfirmed(firstName, lastName);
    if (alreadyConfirmed) {
      setDuplicateWarning({ clientData, source: 'waitlist', confirmedId: alreadyConfirmed.id });
    } else {
      executeAddWaitlist(clientData);
    }
  };

  const executeAddWaitlist = async (clientData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      if (res.ok) {
        const newRecord = await res.json();
        setWaitlist((prev) => [newRecord, ...prev]);
        setWaitlistForm({
          firstName: '',
          lastName: '',
          phone: '',
          date: todayStr,
          time: '12:00',
          reason: visitReasons[0],
          customReason: ''
        });
        triggerToast(`Клиент ${clientData.firstName} ${clientData.lastName} добавлен в список ожидания.`);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Ошибка соединения с сервером');
    }
  };

  // Menu 1: Update Waitlist Registration (Edit Modal)
  const handleUpdateWaitlist = async (e) => {
    e.preventDefault();
    if (!editWaitlistRecord.firstName || !editWaitlistRecord.lastName || !editWaitlistRecord.phone) {
      alert('Пожалуйста, заполните основные поля.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/waitlist/${editWaitlistRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editWaitlistRecord)
      });
      if (res.ok) {
        const updatedRecord = await res.json();
        setWaitlist((prev) =>
          prev.map((item) => (item.id === updatedRecord.id ? updatedRecord : item))
        );
        setEditWaitlistRecord(null);
        triggerToast('Данные клиента успешно отредактированы.');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Ошибка соединения с сервером');
    }
  };

  // Menu 1: Delete Waitlist Record
  const handleDeleteWaitlist = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/waitlist/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setWaitlist((prev) => prev.filter((item) => item.id !== id));
        triggerToast('Запись удалена.');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Ошибка соединения с сервером');
    }
  };

  // Menu 1: Confirm Waitlist Record (moves to Menu 3: Confirmed list)
  const handleConfirmWaitlist = async (record) => {
    const confirmedEntry = {
      id: `c-${Date.now()}`,
      firstName: record.firstName,
      lastName: record.lastName,
      phone: record.phone || '+7 (900) 000-00-00',
      date: record.date,
      time: record.time,
      reason: record.reason === 'Другое' ? record.customReason : record.reason,
      passportNumber: 'Нет',
      vinCode: 'Нет',
      virtualPhone: 'Нет',
      country: 'Армения',
      pdfFileName: '',
      servicedBy: username || record.servicedBy || 'Администратор',
      confirmedAt: new Date().toLocaleString(),
      source: 'waitlist'
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/confirmed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmedEntry)
      });
      if (res.ok) {
        const newConfirmed = await res.json();
        setConfirmed((prev) => [newConfirmed, ...prev]);

        await fetch(`${API_BASE_URL}/api/waitlist/${record.id}`, {
          method: 'DELETE'
        });
        setWaitlist((prev) => prev.filter((item) => item.id !== record.id));
        triggerToast(`Клиент ${record.firstName} ${record.lastName} подтвержден и добавлен в архив.`);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Ошибка соединения с сервером');
    }
  };

  // Menu 2: File upload simulator (click to upload dummy files)
  const simulateUpload = (slotKey, fileName) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [slotKey]: fileName
    }));
    triggerToast(`Файл "${fileName}" загружен.`);
  };

  const handleRealFileUpload = (slotKey, file) => {
    if (!file) return;
    
    // Size check: limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('Файл слишком большой. Максимальный размер 10 МБ.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result;
      
      setUploadedFiles((prev) => ({
        ...prev,
        [slotKey]: file.name
      }));

      setUploadedFilesData((prev) => ({
        ...prev,
        [slotKey]: base64Data
      }));

      triggerToast(`Файл "${file.name}" успешно загружен.`);
      
      // Automatic OCR recognition upon upload
      runAutoOcrForSlot(slotKey, file.name, base64Data);
    };
    reader.readAsDataURL(file);
  };

  const runAutoOcrForSlot = async (slotKey, fileName, base64Data) => {
    setIsScanning(true);
    setScanProgress(0);
    
    let statusText = '';
    if (slotKey === 'passport') {
      statusText = 'Авто-OCR: Отправка паспорта на сервер...';
    } else if (slotKey === 'vin') {
      statusText = 'Авто-OCR: Отправка VIN-кода на сервер...';
    } else if (slotKey === 'pdf') {
      statusText = 'Авто-OCR: Чтение PDF договора...';
    } else if (slotKey === 'numberScreenshot') {
      statusText = 'Авто-OCR: Извлечение телефонного номера...';
    }
    
    setScanStatusText(statusText);

    // Increment progress bar up to 90% while waiting for backend
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      if (progress < 90) {
        setScanProgress(progress);
        if (slotKey === 'passport' && progress === 40) {
          setScanStatusText('Авто-OCR: Распознавание ФИО и серии паспорта Tesseract нейросетью...');
        } else if (slotKey === 'vin' && progress === 40) {
          setScanStatusText('Авто-OCR: Анализ VIN-пластины и фильтрация символов...');
        }
      }
    }, 150);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: base64Data, slotKey, fileName })
      });
      
      clearInterval(progressInterval);
      setScanProgress(100);
      
      if (res.ok) {
        const ocrResult = await res.json();
        
        setOcrData((prev) => ({
          ...prev,
          ...ocrResult
        }));

        setIsScanning(false);
        if (slotKey === 'passport') {
          triggerToast(`Авто-OCR успешно распознал паспорт: ${ocrResult.firstName} ${ocrResult.lastName}`);
        } else if (slotKey === 'vin') {
          triggerToast(`Авто-OCR успешно распознал VIN-код: ${ocrResult.vinCode}`);
        } else if (slotKey === 'numberScreenshot') {
          triggerToast(`Авто-OCR успешно распознал номер: ${ocrResult.virtualPhone}`);
        } else {
          triggerToast(`Авто-OCR завершено успешно.`);
        }
      } else {
        throw new Error('Backend OCR failed');
      }
    } catch (err) {
      console.error(err);
      clearInterval(progressInterval);
      setScanProgress(100);
      setIsScanning(false);
      triggerToast('Ошибка связи с сервером при распознавании.');
    }
  };

  const startCamera = async (slotKey) => {
    setCameraActiveSlot(slotKey);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 300);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Не удалось получить доступ к камере. Убедитесь, что разрешения предоставлены.');
      setCameraActiveSlot(null);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setCameraActiveSlot(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const base64Data = canvas.toDataURL('image/png');
    const mockFileName = `camera_capture_${cameraActiveSlot}_${Date.now()}.png`;

    setUploadedFiles((prev) => ({
      ...prev,
      [cameraActiveSlot]: mockFileName
    }));

    setUploadedFilesData((prev) => ({
      ...prev,
      [cameraActiveSlot]: base64Data
    }));

    triggerToast(`Снимок с камеры успешно сохранен.`);
    
    stopCamera();
    runAutoOcrForSlot(cameraActiveSlot, mockFileName, base64Data);
  };

  // Menu 2: OCR Scanning Simulator
  const handleRunOcr = () => {
    if (!uploadedFiles.passport && !uploadedFiles.vin && !uploadedFiles.pdf && !uploadedFiles.numberScreenshot) {
      alert('Загрузите хотя бы один файл для распознавания!');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanStatusText('Инициализация нейросетей Changan OCR...');

    const statuses = [
      { p: 15, t: 'Сканирование паспорта РФ/Армении...' },
      { p: 40, t: 'Извлечение имени и серии паспорта...' },
      { p: 60, t: 'Считывание VIN-кода с фото (17 знаков)...' },
      { p: 80, t: 'Парсинг скриншота: обнаружение виртуального номера...' },
      { p: 95, t: 'Авто-переименование PDF-файла по шаблону "risk_[VIN].pdf"...' },
      { p: 100, t: 'Синхронизация данных завершена!' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < statuses.length) {
        setScanProgress(statuses[currentStep].p);
        setScanStatusText(statuses[currentStep].t);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsScanning(false);
          // Generate mock OCR results based on what was uploaded
          const mockNames = ['Армен', 'Тигран', 'Василий', 'Карен', 'Давид'];
          const mockLastNames = ['Саркисян', 'Мкртчян', 'Григорян', 'Петров', 'Карапетян'];
          const randIdx = Math.floor(Math.random() * mockNames.length);

          const firstName = uploadedFiles.passport ? mockNames[randIdx] : 'Имя';
          const lastName = uploadedFiles.passport ? mockLastNames[randIdx] : 'Фамилия';
          const passportNumber = uploadedFiles.passport ? `AM ${Math.floor(100000 + Math.random() * 900000)}` : 'AM 451278';
          const vinCode = uploadedFiles.vin ? `LSG${Math.random().toString(36).substring(2, 16).toUpperCase()}` : 'LSG1A2B3C4D5E6F7G';
          const virtualPhone = uploadedFiles.numberScreenshot ? `+374-94-${Math.floor(100000 + Math.random() * 900000)}` : '+374-93-112233';
          
          setOcrData({
            firstName,
            lastName,
            passportNumber,
            vinCode,
            virtualPhone,
            country: 'Армения',
            pdfFileName: uploadedFiles.pdf ? `risk_${vinCode}.pdf` : ''
          });
          triggerToast('Данные успешно распознаны! Вы можете отредактировать их перед сохранением.');
        }, 300);
      }
    }, 450);
  };

  // Menu 2: Save OCR client record
  const handleSaveOcrData = (e) => {
    e.preventDefault();
    const { firstName, lastName, passportNumber, vinCode, virtualPhone, country, pdfFileName } = ocrData;
    if (!firstName || !lastName || !vinCode) {
      alert('Имя, Фамилия и VIN-код обязательны для сохранения!');
      return;
    }

    const clientData = {
      id: `doc-${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      passportNumber: passportNumber.trim(),
      vinCode: vinCode.trim(),
      virtualPhone: virtualPhone.trim(),
      country: country.trim(),
      pdfFileName: pdfFileName || `risk_${vinCode.trim()}.pdf`,
      servicedBy: username || 'Администратор',
      hasPassportPhoto: !!uploadedFiles.passport,
      hasVinPhoto: !!uploadedFiles.vin,
      hasPdfFile: !!uploadedFiles.pdf,
      hasNumPhoto: !!uploadedFiles.numberScreenshot,
      passportFileData: uploadedFilesData.passport,
      passportFileName: uploadedFiles.passport,
      vinFileData: uploadedFilesData.vin,
      vinFileName: uploadedFiles.vin,
      pdfFileData: uploadedFilesData.pdf,
      numFileData: uploadedFilesData.numberScreenshot,
      numFileName: uploadedFiles.numberScreenshot
    };

    // Check for duplicate in Confirmed
    const alreadyConfirmed = findInConfirmed(firstName, lastName);
    if (alreadyConfirmed) {
      setDuplicateWarning({ clientData, source: 'ocr', confirmedId: alreadyConfirmed.id });
    } else {
      executeAddOcr(clientData);
    }
  };

  const executeAddOcr = async (clientData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      if (res.ok) {
        const newRecord = await res.json();
        setDocsList((prev) => [newRecord, ...prev]);
        setUploadedFiles({ passport: null, vin: null, pdf: null, numberScreenshot: null });
        setUploadedFilesData({ passport: null, vin: null, pdf: null, numberScreenshot: null });
        setOcrData({
          firstName: '',
          lastName: '',
          passportNumber: '',
          vinCode: '',
          virtualPhone: '',
          country: 'Армения',
          pdfFileName: ''
        });
        triggerToast(`Пакет документов для ${clientData.firstName} ${clientData.lastName} сохранен.`);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Ошибка соединения с сервером');
    }
  };

  // Menu 2: Update Docs (Edit Modal)
  const handleUpdateDocs = async (e) => {
    e.preventDefault();
    if (!editDocsRecord.firstName || !editDocsRecord.lastName || !editDocsRecord.vinCode) {
      alert('Пожалуйста, заполните основные поля.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${editDocsRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDocsRecord)
      });
      if (res.ok) {
        const updatedRecord = await res.json();
        setDocsList((prev) =>
          prev.map((item) => (item.id === updatedRecord.id ? updatedRecord : item))
        );
        setEditDocsRecord(null);
        triggerToast('Данные документов обновлены.');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Ошибка соединения с сервером');
    }
  };

  // Menu 2: Delete Docs Record
  const handleDeleteDocs = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDocsList((prev) => prev.filter((item) => item.id !== id));
        triggerToast('Пакет документов удален.');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Ошибка соединения с сервером');
    }
  };

  // Menu 2: Confirm Docs Record (moves to Menu 3: Confirmed list)
  const handleConfirmDocs = async (record) => {
    const confirmedEntry = {
      id: `c-${Date.now()}`,
      firstName: record.firstName,
      lastName: record.lastName,
      phone: record.virtualPhone || '+7 (900) 000-00-00',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      reason: 'Подтверждено по документам',
      passportNumber: record.passportNumber,
      vinCode: record.vinCode,
      virtualPhone: record.virtualPhone,
      country: record.country,
      pdfFileName: record.pdfFileName,
      servicedBy: username || record.servicedBy || 'Администратор',
      confirmedAt: new Date().toLocaleString(),
      source: 'documents',
      // Pass actual uploaded files
      passportFileData: record.passportFileData,
      passportFileName: record.passportFileName,
      vinFileData: record.vinFileData,
      vinFileName: record.vinFileName,
      pdfFileData: record.pdfFileData,
      numFileData: record.numFileData,
      numFileName: record.numFileName
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/confirmed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmedEntry)
      });
      if (res.ok) {
        const newConfirmed = await res.json();
        setConfirmed((prev) => [newConfirmed, ...prev]);

        await fetch(`${API_BASE_URL}/api/documents/${record.id}`, {
          method: 'DELETE'
        });
        setDocsList((prev) => prev.filter((item) => item.id !== record.id));
        triggerToast(`Клиент ${record.firstName} ${record.lastName} успешно подтвержден и перенесен в архив.`);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Ошибка соединения с сервером');
    }
  };

  // Menu 2: ZIP Download generator (creates zip with real Excel Sheet and uploaded files)
  const handleDownloadZip = (record) => {
    const { firstName, lastName, passportNumber, vinCode, virtualPhone, country, servicedBy } = record;
    
    // Create spreadsheet sheet data
    const clientDataArray = [
      { 'Показатель': 'Имя клиента', 'Значение': firstName },
      { 'Показатель': 'Фамилия клиента', 'Значение': lastName },
      { 'Показатель': 'Серийный номер паспорта', 'Значение': passportNumber || 'Не указан' },
      { 'Показатель': 'VIN-код автомобиля', 'Значение': vinCode },
      { 'Показатель': 'Виртуальный номер телефона', 'Значение': virtualPhone || 'Не указан' },
      { 'Показатель': 'Страна обслуживания', 'Значение': country },
      { 'Показатель': 'Имя оператора (Кто обслуживал)', 'Значение': servicedBy },
      { 'Показатель': 'Дата выгрузки', 'Значение': new Date().toLocaleString() }
    ];

    // Create Excel Workbook
    const worksheet = XLSX.utils.json_to_sheet(clientDataArray);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Спецификация');
    
    // Write XLSX array buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Generate Zip Archive
    const zip = new JSZip();
    
    // 1. Add Excel file renamed automatically to Name_LastName_VIN.xlsx
    const xlsxFileName = `${firstName}_${lastName}_${vinCode}.xlsx`;
    zip.file(xlsxFileName, excelBuffer);

    // 2. Add Passport Photo file if it exists
    if (record.passportFileData) {
      try {
        const base64Content = record.passportFileData.split(',')[1];
        zip.file(record.passportFileName || 'passport_photo.jpg', base64Content, { base64: true });
      } catch (e) {
        console.error('Error adding passport photo to ZIP:', e);
      }
    }

    // 3. Add VIN Photo file if it exists
    if (record.vinFileData) {
      try {
        const base64Content = record.vinFileData.split(',')[1];
        zip.file(record.vinFileName || 'vin_plate.jpg', base64Content, { base64: true });
      } catch (e) {
        console.error('Error adding VIN photo to ZIP:', e);
      }
    }

    // 4. Add PDF file (uploaded or dummy)
    if (record.pdfFileData) {
      try {
        const base64Content = record.pdfFileData.split(',')[1];
        zip.file(record.pdfFileName || `risk_${vinCode}.pdf`, base64Content, { base64: true });
      } catch (e) {
        console.error('Error adding PDF to ZIP:', e);
      }
    } else {
      const pdfFileName = `risk_${vinCode}.pdf`;
      const pdfDummyContent = `%PDF-1.4
1 0 obj
<< /Title (Changan Risk Assessment - ${firstName} ${lastName})
   /Author (${servicedBy})
   /Subject (VIN: ${vinCode}) >>
endobj
xref
0 1
0000000000 65535 f
trailer
<< /Root 1 0 R >>
startxref
110
%%EOF`;
      zip.file(pdfFileName, pdfDummyContent);
    }

    // 5. Add Virtual Number Screenshot file if it exists
    if (record.numFileData) {
      try {
        const base64Content = record.numFileData.split(',')[1];
        zip.file(record.numFileName || 'virtual_phone_screenshot.jpg', base64Content, { base64: true });
      } catch (e) {
        console.error('Error adding virtual number photo to ZIP:', e);
      }
    }

    // Generate blob and trigger download
    zip.generateAsync({ type: 'blob' }).then((content) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${firstName}_${lastName}_${vinCode}.zip`;
      link.click();
      triggerToast(`Выгружен архив: ${firstName}_${lastName}_${vinCode}.zip`);
    });
  };

  // Menu 3: Restore Confirmed client back to Waitlist (Menu 1)
  const handleRestoreToWaitlist = async (record) => {
    const waitlistEntry = {
      id: `w-${Date.now()}`,
      firstName: record.firstName,
      lastName: record.lastName,
      phone: record.phone || record.virtualPhone || '+7 (900) 000-00-00',
      date: todayStr, // Set to today so it displays at the very top and highlights green!
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      reason: record.reason || 'Повторный визит',
      customReason: '',
      servicedBy: username || 'Администратор'
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waitlistEntry)
      });
      if (res.ok) {
        const newWaitlist = await res.json();
        setWaitlist((prev) => [newWaitlist, ...prev]);

        await fetch(`${API_BASE_URL}/api/confirmed/${record.id}`, {
          method: 'DELETE'
        });
        setConfirmed((prev) => prev.filter((item) => item.id !== record.id));
        triggerToast(`Клиент ${record.firstName} ${record.lastName} возвращен в ожидание на сегодня!`);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Ошибка соединения с сервером');
    }
  };

  // Duplicate Warning Modal Confirm Actions
  const handleResolveDuplicateWithRestore = () => {
    if (!duplicateWarning) return;
    const { clientData, confirmedId } = duplicateWarning;
    
    // Find record in confirmed
    const confirmedRecord = confirmed.find((c) => c.id === confirmedId);
    if (confirmedRecord) {
      handleRestoreToWaitlist(confirmedRecord);
    }
    setDuplicateWarning(null);
  };

  const handleResolveDuplicateWithCopy = () => {
    if (!duplicateWarning) return;
    const { clientData, source } = duplicateWarning;
    
    if (source === 'waitlist') {
      executeAddWaitlist(clientData);
    } else {
      executeAddOcr(clientData);
    }
    setDuplicateWarning(null);
  };

  // Sorting helper: today's registrations must go to the very top
  const sortedWaitlist = [...waitlist].sort((a, b) => {
    const isAToday = a.date === todayStr;
    const isBToday = b.date === todayStr;
    if (isAToday && !isBToday) return -1;
    if (!isAToday && isBToday) return 1;
    // Otherwise sort by date/time ascending
    return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
  });

  // Render Login View if not authenticated
  if (!isLoggedIn) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-inner">
            <UserCheck className="login-logo" />
            <h2 className="login-title">CHANGAN Management</h2>
            <p className="login-subtitle">Интеллектуальная система контроля дилерского центра</p>
            
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Имя пользователя (Используется при скачивании отчетов)</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Вова"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Пароль</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="login-btn">
                Войти в терминал
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Render main CRM Application
  return (
    <div className="app-container">
      
      {/* Toast popup */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#0e1122',
          border: '1.5px solid var(--accent-cyan)',
          boxShadow: '0 0 15px rgba(0, 240, 255, 0.35)',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          animation: 'modal-enter 0.3s ease',
        }}>
          <Check size={18} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{toast}</span>
        </div>
      )}

      {/* 1. Desktop Left Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <UserCheck className="logo-icon" />
          <span className="logo-text">Changan CRM</span>
        </div>

        {/* User Profile Info */}
        <div className="user-profile-badge">
          <div className="user-avatar">
            {username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flexGrow: 1 }}>
            {isEditingProfile ? (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
                  value={tempProfileName}
                  onChange={(e) => setTempProfileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveProfileName();
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveProfileName}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-emerald)', cursor: 'pointer' }}
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div>
                  <div className="user-name">{username}</div>
                  <div className="user-role">Оператор</div>
                </div>
                <button
                  onClick={() => {
                    setTempProfileName(username);
                    setIsEditingProfile(true);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                  title="Редактировать имя"
                >
                  <Edit3 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
        
        <nav>
          <ul className="nav-links">
            <li>
              <button
                className={`nav-btn ${activeTab === 'waitlist' ? 'active' : ''}`}
                onClick={() => setActiveTab('waitlist')}
              >
                <CalendarCheck />
                <span>Регистрация клиентов</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-btn ${activeTab === 'documents' ? 'active' : ''}`}
                onClick={() => setActiveTab('documents')}
              >
                <FolderOpen />
                <span>Сканирование док.</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-btn ${activeTab === 'confirmed' ? 'active' : ''}`}
                onClick={() => setActiveTab('confirmed')}
              >
                <UserCheck />
                <span>Подтвержденные</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button 
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-rose)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              marginBottom: '1rem'
            }}
          >
            <UserX size={14} /> Выйти из профиля
          </button>
          <p>© Changan CRM Portal</p>
          <p style={{ opacity: 0.5 }}>Оператор: {username}</p>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="main-wrapper">
        
        {/* Header */}
        <header className="app-header">
          <div className="page-title">
            <h1>
              {activeTab === 'waitlist' && 'Регистрация клиентов'}
              {activeTab === 'documents' && 'Верификация & Сканирование'}
              {activeTab === 'confirmed' && 'Список подтверждённых клиентов'}
            </h1>
            <p>
              {activeTab === 'waitlist' && 'Запись клиентов на визит и ручное управление расписанием'}
              {activeTab === 'documents' && 'Распознавание документов, VIN-кодов и авто-генерация XLSX отчетов'}
              {activeTab === 'confirmed' && 'Архив клиентов, успешно прошедших проверку документов'}
            </p>
          </div>

          <div className="header-status">
            <div className="header-status-dot"></div>
            <span>Рабочая сессия активна</span>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="content-body">
          
          {/* MENU 1: WAITLIST & MANUAL REGISTRATION */}
          {activeTab === 'waitlist' && (
            <div className="content-split">
              {/* Form card */}
              <div className="card">
                <h3 className="card-title">
                  <PlusCircle size={20} style={{ color: 'var(--accent-cyan)' }} />
                  Записать клиента
                </h3>

                <form onSubmit={handleSaveWaitlist} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Имя *</label>
                    <input
                      type="text"
                      required
                      placeholder="Иван"
                      className="form-input"
                      value={waitlistForm.firstName}
                      onChange={(e) => setWaitlistForm(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Фамилия *</label>
                    <input
                      type="text"
                      required
                      placeholder="Петров"
                      className="form-input"
                      value={waitlistForm.lastName}
                      onChange={(e) => setWaitlistForm(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Телефон *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+7 (999) 000-00-00"
                      className="form-input"
                      value={waitlistForm.phone}
                      onChange={(e) => setWaitlistForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Дата визита *</label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={waitlistForm.date}
                        onChange={(e) => setWaitlistForm(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Время *</label>
                      <input
                        type="time"
                        required
                        className="form-input"
                        value={waitlistForm.time}
                        onChange={(e) => setWaitlistForm(prev => ({ ...prev, time: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Причина приезда *</label>
                    <select
                      className="form-input"
                      value={waitlistForm.reason}
                      onChange={(e) => setWaitlistForm(prev => ({ ...prev, reason: e.target.value }))}
                    >
                      {visitReasons.map((r, idx) => (
                        <option key={idx} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {waitlistForm.reason === 'Другое' && (
                    <div className="form-group" style={{ animation: 'modal-enter 0.2s ease' }}>
                      <label>Введите причину *</label>
                      <input
                        type="text"
                        required
                        placeholder="Например: Обкатка нового двигателя"
                        className="form-input"
                        value={waitlistForm.customReason}
                        onChange={(e) => setWaitlistForm(prev => ({ ...prev, customReason: e.target.value }))}
                      />
                    </div>
                  )}

                  <button type="submit" className="login-btn" style={{ marginTop: '0.5rem' }}>
                    Сохранить запись
                  </button>
                </form>
              </div>

              {/* Waitlist list cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.15rem' }}>Текущие визиты в очереди ({sortedWaitlist.length})</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Сортировка: Сначала сегодняшние визиты
                  </span>
                </div>

                <div className="waitlist-container">
                  {sortedWaitlist.map((client) => {
                    const isToday = client.date === todayStr;
                    return (
                      <div
                        key={client.id}
                        className={`client-card ${isToday ? 'today-highlight' : ''}`}
                      >
                        <div className="client-header">
                          <div>
                            <div className="client-name">{client.firstName} {client.lastName}</div>
                            <div className="client-phone">{client.phone}</div>
                          </div>
                          <span className="reason-tag">
                            {client.reason === 'Другое' ? client.customReason : client.reason}
                          </span>
                        </div>

                        <div className="client-details">
                          <div className="detail-item">
                            <span style={{ color: isToday ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>Дата:</span>
                            <span style={{ fontWeight: isToday ? 700 : 500 }}>
                              {isToday ? 'Сегодня' : client.date}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span style={{ color: 'var(--text-muted)' }}>Время:</span>
                            <span>{client.time}</span>
                          </div>
                          <div className="detail-item">
                            <span style={{ color: 'var(--text-muted)' }}>Оформил:</span>
                            <span style={{ color: 'var(--accent-cyan)' }}>{client.servicedBy}</span>
                          </div>
                        </div>

                        <div className="client-actions">
                          <button
                            className="btn-icon confirm"
                            title="Подтвердить клиента (в архив)"
                            onClick={() => handleConfirmWaitlist(client)}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            className="btn-icon edit"
                            title="Редактировать"
                            onClick={() => setEditWaitlistRecord(client)}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            className="btn-icon delete"
                            title="Удалить"
                            onClick={() => handleDeleteWaitlist(client.id)}
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {sortedWaitlist.length === 0 && (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Клиенты в очереди ожидания отсутствуют.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MENU 2: DOCUMENTS, OCR SIMULATION, AND PACKAGING */}
          {activeTab === 'documents' && (
            <div className="content-split">
              {/* Document upload panels */}
              <div className="card">
                <h3 className="card-title">
                  <Upload size={20} style={{ color: 'var(--accent-cyan)' }} />
                  Загрузка документов
                </h3>

                <div className="ocr-slots-grid">
                  {/* Hidden Native File Inputs */}
                  <input
                    id="passport-file-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleRealFileUpload('passport', e.target.files[0])}
                  />
                  <input
                    id="vin-file-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleRealFileUpload('vin', e.target.files[0])}
                  />
                  <input
                    id="pdf-file-input"
                    type="file"
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => handleRealFileUpload('pdf', e.target.files[0])}
                  />
                  <input
                    id="num-file-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleRealFileUpload('numberScreenshot', e.target.files[0])}
                  />

                  <div
                    className={`ocr-slot ${uploadedFiles.passport ? 'active' : ''}`}
                    onClick={() => document.getElementById('passport-file-input').click()}
                  >
                    <User className="ocr-slot-icon" />
                    <span className="ocr-slot-title">Фото паспорта</span>
                    <span className="ocr-slot-subtitle">Нажмите для загрузки</span>
                    {uploadedFiles.passport && (
                      <span className="slot-file-indicator">{uploadedFiles.passport}</span>
                    )}
                    <button
                      className="camera-slot-btn"
                      title="Использовать камеру"
                      onClick={(e) => {
                        e.stopPropagation();
                        startCamera('passport');
                      }}
                    >
                      <Camera size={16} />
                    </button>
                  </div>

                  <div
                    className={`ocr-slot ${uploadedFiles.vin ? 'active' : ''}`}
                    onClick={() => document.getElementById('vin-file-input').click()}
                  >
                    <ShieldAlert className="ocr-slot-icon" />
                    <span className="ocr-slot-title">Фото VIN-кода</span>
                    <span className="ocr-slot-subtitle">Нажмите для загрузки</span>
                    {uploadedFiles.vin && (
                      <span className="slot-file-indicator">{uploadedFiles.vin}</span>
                    )}
                    <button
                      className="camera-slot-btn"
                      title="Использовать камеру"
                      onClick={(e) => {
                        e.stopPropagation();
                        startCamera('vin');
                      }}
                    >
                      <Camera size={16} />
                    </button>
                  </div>

                  <div
                    className={`ocr-slot ${uploadedFiles.pdf ? 'active' : ''}`}
                    onClick={() => document.getElementById('pdf-file-input').click()}
                  >
                    <FileText className="ocr-slot-icon" />
                    <span className="ocr-slot-title">PDF Контракт</span>
                    <span className="ocr-slot-subtitle">Нажмите для загрузки</span>
                    {uploadedFiles.pdf && (
                      <span className="slot-file-indicator">{uploadedFiles.pdf}</span>
                    )}
                  </div>

                  <div
                    className={`ocr-slot ${uploadedFiles.numberScreenshot ? 'active' : ''}`}
                    onClick={() => document.getElementById('num-file-input').click()}
                  >
                    <Upload className="ocr-slot-icon" />
                    <span className="ocr-slot-title">Скриншот вирт. номера</span>
                    <span className="ocr-slot-subtitle">Нажмите для загрузки</span>
                    {uploadedFiles.numberScreenshot && (
                      <span className="slot-file-indicator">{uploadedFiles.numberScreenshot}</span>
                    )}
                    <button
                      className="camera-slot-btn"
                      title="Использовать камеру"
                      onClick={(e) => {
                        e.stopPropagation();
                        startCamera('numberScreenshot');
                      }}
                    >
                      <Camera size={16} />
                    </button>
                  </div>
                </div>

                {/* Progress scan block */}
                {isScanning && (
                  <div className="scanner-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--accent-cyan)' }}>{scanStatusText}</span>
                      <span>{scanProgress}%</span>
                    </div>
                    <div className="scan-progress-bar">
                      <div className="scan-progress-fill" style={{ width: `${scanProgress}%` }}></div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleRunOcr}
                  disabled={isScanning}
                  className="login-btn"
                  style={{
                    margin: '0.5rem 0 1.5rem',
                    background: isScanning ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-violet) 100%)',
                    cursor: isScanning ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isScanning ? 'Идет обработка OCR...' : 'Распознать и извлечь данные'}
                </button>

                {/* Extracted form results (Editable) */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                    Извлеченные данные (редактируемые)
                  </h4>

                  <form onSubmit={handleSaveOcrData} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label>Имя</label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          value={ocrData.firstName}
                          onChange={(e) => setOcrData(prev => ({ ...prev, firstName: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Фамилия</label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          value={ocrData.lastName}
                          onChange={(e) => setOcrData(prev => ({ ...prev, lastName: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label>Номер паспорта</label>
                        <input
                          type="text"
                          className="form-input"
                          value={ocrData.passportNumber}
                          onChange={(e) => setOcrData(prev => ({ ...prev, passportNumber: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>VIN-код</label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          value={ocrData.vinCode}
                          onChange={(e) => setOcrData(prev => ({ ...prev, vinCode: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label>Виртуальный номер телефона</label>
                        <input
                          type="tel"
                          className="form-input"
                          value={ocrData.virtualPhone}
                          onChange={(e) => setOcrData(prev => ({ ...prev, virtualPhone: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Страна обслуживания</label>
                        <input
                          type="text"
                          className="form-input"
                          value={ocrData.country}
                          onChange={(e) => setOcrData(prev => ({ ...prev, country: e.target.value }))}
                        />
                      </div>
                    </div>

                    {ocrData.pdfFileName && (
                      <div className="form-group">
                        <label>PDF-документ (авто-переименован)</label>
                        <input
                          type="text"
                          disabled
                          className="form-input"
                          style={{ opacity: 0.7, color: 'var(--accent-cyan)' }}
                          value={ocrData.pdfFileName}
                        />
                      </div>
                    )}

                    <button type="submit" className="login-btn" style={{ background: 'var(--accent-emerald)', color: '#000' }}>
                      Сохранить пакет
                    </button>
                  </form>
                </div>
              </div>

              {/* Saved document verification list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3>Верифицированные пакеты ({docsList.length})</h3>

                <div className="waitlist-container">
                  {docsList.map((record) => (
                    <div key={record.id} className="client-card">
                      <div className="client-header" style={{ paddingRight: 0 }}>
                        <div>
                          <div className="client-name">{record.firstName} {record.lastName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Паспорт: <span style={{ color: '#fff' }}>{record.passportNumber || 'Нет'}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', border: '1px solid rgba(13, 242, 138, 0.3)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                          {record.country}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: '0.75rem 0 1rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>VIN: </span><code style={{ color: 'var(--accent-cyan)' }}>{record.vinCode}</code></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Вирт. Номер: </span><span>{record.virtualPhone || 'Нет'}</span></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>PDF файл: </span><span style={{ color: 'var(--accent-violet)' }}>{record.pdfFileName}</span></div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}><span style={{ color: 'var(--text-muted)' }}>Обработал: </span><span>{record.servicedBy}</span></div>
                      </div>

                      <div className="client-actions">
                        <button
                          className="btn-icon confirm"
                          title="Подтвердить клиента (в архив)"
                          onClick={() => handleConfirmDocs(record)}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          className="btn-icon download"
                          title="Скачать ZIP (XLSX + PDF)"
                          onClick={() => handleDownloadZip(record)}
                        >
                          <Download size={16} />
                        </button>
                        <button
                          className="btn-icon edit"
                          title="Редактировать"
                          onClick={() => setEditDocsRecord(record)}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="btn-icon delete"
                          title="Удалить"
                          onClick={() => handleDeleteDocs(record.id)}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {docsList.length === 0 && (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Пакеты документов не сохранены. Загрузите файлы и выполните распознавание.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MENU 3: ARCHIVE & CONFIRMED VISITORS */}
          {activeTab === 'confirmed' && (() => {
            const confirmedDocs = confirmed.filter(c => c.source !== 'waitlist');
            const confirmedWaitlist = confirmed.filter(c => c.source === 'waitlist');
            return (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 className="card-title" style={{ margin: 0 }}>
                    <UserCheck size={20} style={{ color: 'var(--accent-emerald)', marginRight: '8px' }} />
                    Архив верифицированных и принятых клиентов
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Всего клиентов в базе: {confirmed.length}
                  </span>
                </div>

                {/* Sub-tabs to split Confirmed list by origin source */}
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                  <button
                    className="btn"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: confirmedSubTab === 'documents' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      borderBottom: confirmedSubTab === 'documents' ? '2.5px solid var(--accent-cyan)' : '2.5px solid transparent',
                      borderRadius: 0,
                      padding: '0.5rem 1.25rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                    onClick={() => setConfirmedSubTab('documents')}
                  >
                    Пакеты документов (OCR) ({confirmedDocs.length})
                  </button>
                  <button
                    className="btn"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: confirmedSubTab === 'waitlist' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      borderBottom: confirmedSubTab === 'waitlist' ? '2.5px solid var(--accent-cyan)' : '2.5px solid transparent',
                      borderRadius: 0,
                      padding: '0.5rem 1.25rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                    onClick={() => setConfirmedSubTab('waitlist')}
                  >
                    Записи визитов ({confirmedWaitlist.length})
                  </button>
                </div>

                {confirmedSubTab === 'documents' ? (
                  confirmedDocs.length > 0 ? (
                    <div className="table-responsive">
                      <table className="confirmed-table">
                        <thead>
                          <tr>
                            <th>Имя клиента</th>
                            <th>VIN-код автомобиля</th>
                            <th>Номер паспорта</th>
                            <th>Виртуальный номер</th>
                            <th>Страна</th>
                            <th>Кто обслуживал</th>
                            <th>Подтвержден</th>
                            <th>Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {confirmedDocs.map((item) => (
                            <tr key={item.id}>
                              <td className="cell-name">{item.firstName} {item.lastName}</td>
                              <td><code style={{ color: 'var(--accent-cyan)' }}>{item.vinCode || 'Не указан'}</code></td>
                              <td>{item.passportNumber || 'Нет'}</td>
                              <td>{item.virtualPhone || 'Нет'}</td>
                              <td><span style={{ color: 'var(--accent-emerald)', fontSize: '0.8rem', border: '1px solid rgba(13,242,138,0.2)', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>{item.country || 'Армения'}</span></td>
                              <td style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>{item.servicedBy}</td>
                              <td className="cell-date">{item.confirmedAt || 'Ранее'}</td>
                              <td style={{ display: 'flex', gap: '0.35rem' }}>
                                <button
                                  className="btn-icon download"
                                  title="Скачать ZIP (XLSX + PDF)"
                                  style={{ width: '30px', height: '30px', borderRadius: '6px' }}
                                  onClick={() => handleDownloadZip(item)}
                                >
                                  <Download size={14} />
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                  onClick={() => handleRestoreToWaitlist(item)}
                                  title="Вернуть клиента в список ожидания на сегодня"
                                >
                                  <Plus size={10} />
                                  В ожидание
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                      Пакеты документов не найдены. Подтвердите документы во вкладке "Сканирование док."
                    </div>
                  )
                ) : (
                  confirmedWaitlist.length > 0 ? (
                    <div className="table-responsive">
                      <table className="confirmed-table">
                        <thead>
                          <tr>
                            <th>Имя клиента</th>
                            <th>Номер телефона</th>
                            <th>Дата/Время визита</th>
                            <th>Причина приезда</th>
                            <th>Кто обслуживал</th>
                            <th>Подтвержден</th>
                            <th>Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {confirmedWaitlist.map((item) => (
                            <tr key={item.id}>
                              <td className="cell-name">{item.firstName} {item.lastName}</td>
                              <td>{item.phone}</td>
                              <td>{item.date} {item.time}</td>
                              <td><span className="reason-tag" style={{ fontSize: '0.75rem' }}>{item.reason}</span></td>
                              <td style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>{item.servicedBy}</td>
                              <td className="cell-date">{item.confirmedAt}</td>
                              <td>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                  onClick={() => handleRestoreToWaitlist(item)}
                                  title="Вернуть клиента в список ожидания на сегодня"
                                >
                                  <Plus size={10} />
                                  В ожидание
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                      Визиты не найдены. Подтвердите клиента во вкладке "Регистрация клиентов"
                    </div>
                  )
                )}
              </div>
            );
          })()}
        </main>
      </div>

      {/* 2. Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav">
        <ul className="mobile-nav-list">
          <li>
            <button
              className={`mobile-nav-btn ${activeTab === 'waitlist' ? 'active' : ''}`}
              onClick={() => setActiveTab('waitlist')}
            >
              <CalendarCheck />
              <span>Регистрация</span>
            </button>
          </li>
          <li>
            <button
              className={`mobile-nav-btn ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              <FolderOpen />
              <span>Документы</span>
            </button>
          </li>
          <li>
            <button
              className={`mobile-nav-btn ${activeTab === 'confirmed' ? 'active' : ''}`}
              onClick={() => setActiveTab('confirmed')}
            >
              <UserCheck />
              <span>Подтвержденные</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* MODAL: Edit Waitlist Record */}
      {editWaitlistRecord && (
        <div className="modal-overlay" onClick={() => setEditWaitlistRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditWaitlistRecord(null)}><X size={20} /></button>
            <h3 style={{ marginBottom: '1.25rem', color: 'var(--accent-cyan)' }}>Редактирование записи клиента</h3>
            
            <form onSubmit={handleUpdateWaitlist} className="booking-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Имя</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editWaitlistRecord.firstName}
                  onChange={(e) => setEditWaitlistRecord(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Фамилия</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editWaitlistRecord.lastName}
                  onChange={(e) => setEditWaitlistRecord(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Телефон</label>
                <input
                  type="tel"
                  required
                  className="form-input"
                  value={editWaitlistRecord.phone}
                  onChange={(e) => setEditWaitlistRecord(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Дата визита</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={editWaitlistRecord.date}
                    onChange={(e) => setEditWaitlistRecord(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Время</label>
                  <input
                    type="time"
                    required
                    className="form-input"
                    value={editWaitlistRecord.time}
                    onChange={(e) => setEditWaitlistRecord(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Причина приезда</label>
                <select
                  className="form-input"
                  value={editWaitlistRecord.reason}
                  onChange={(e) => setEditWaitlistRecord(prev => ({ ...prev, reason: e.target.value }))}
                >
                  {visitReasons.map((r, idx) => (
                    <option key={idx} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {editWaitlistRecord.reason === 'Другое' && (
                <div className="form-group">
                  <label>Своя причина</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editWaitlistRecord.customReason}
                    onChange={(e) => setEditWaitlistRecord(prev => ({ ...prev, customReason: e.target.value }))}
                  />
                </div>
              )}

              <button type="submit" className="login-btn" style={{ marginTop: '0.75rem' }}>
                Сохранить изменения
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Documents Record */}
      {editDocsRecord && (
        <div className="modal-overlay" onClick={() => setEditDocsRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditDocsRecord(null)}><X size={20} /></button>
            <h3 style={{ marginBottom: '1.25rem', color: 'var(--accent-cyan)' }}>Редактирование пакета документов</h3>
            
            <form onSubmit={handleUpdateDocs} className="booking-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Имя</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editDocsRecord.firstName}
                    onChange={(e) => setEditDocsRecord(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Фамилия</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editDocsRecord.lastName}
                    onChange={(e) => setEditDocsRecord(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Номер паспорта</label>
                <input
                  type="text"
                  className="form-input"
                  value={editDocsRecord.passportNumber}
                  onChange={(e) => setEditDocsRecord(prev => ({ ...prev, passportNumber: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>VIN-код</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editDocsRecord.vinCode}
                  onChange={(e) => setEditDocsRecord(prev => ({ ...prev, vinCode: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Виртуальный номер телефона</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={editDocsRecord.virtualPhone}
                    onChange={(e) => setEditDocsRecord(prev => ({ ...prev, virtualPhone: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Страна</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editDocsRecord.country}
                    onChange={(e) => setEditDocsRecord(prev => ({ ...prev, country: e.target.value }))}
                  />
                </div>
              </div>

              <button type="submit" className="login-btn" style={{ marginTop: '0.75rem' }}>
                Сохранить изменения
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Duplicate Client Warning */}
      {duplicateWarning && (
        <div className="modal-overlay">
          <div className="modal-content warning-dialog">
            <div className="warning-icon-wrapper">
              <AlertTriangle size={32} />
            </div>
            
            <h3 className="warning-title">Повторный визит клиента!</h3>
            <p className="warning-text">
              Клиент <strong>{duplicateWarning.clientData.firstName} {duplicateWarning.clientData.lastName}</strong> уже был в нашем сервисе и находится в базе подтверждённых клиентов!
              <br /><br />
              Вы хотите восстановить старую запись из архива (перенести обратно в список ожидания на сегодня) или создать новую независимую копию записи?
            </p>

            <div className="dialog-actions">
              <button
                className="btn btn-success"
                onClick={handleResolveDuplicateWithRestore}
              >
                Восстановить из архива
              </button>
              <button
                className="btn btn-primary"
                onClick={handleResolveDuplicateWithCopy}
              >
                Создать копию
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setDuplicateWarning(null)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Camera Scanner */}
      {cameraActiveSlot && (
        <div className="modal-overlay" onClick={stopCamera}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <button className="modal-close" onClick={stopCamera}><X size={20} /></button>
            <h3 style={{ margin: '0 0 1rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Camera size={20} />
              Камера: {cameraActiveSlot === 'passport' ? 'Сканирование паспорта' : cameraActiveSlot === 'vin' ? 'Сканирование VIN-кода' : 'Сканирование номера'}
            </h3>
            
            <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', aspectRatio: '4/3', marginBottom: '1.25rem' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              
              {/* Scan box visual overlay */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                border: '2px dashed var(--accent-cyan)',
                borderRadius: '8px',
                pointerEvents: 'none',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                width: cameraActiveSlot === 'passport' ? '80%' : '85%',
                height: cameraActiveSlot === 'passport' ? '55%' : '30%'
              }}>
                {/* Visual scan animation line */}
                <div style={{
                  width: '100%',
                  height: '2px',
                  backgroundColor: 'var(--accent-cyan)',
                  boxShadow: '0 0 8px var(--accent-cyan)',
                  position: 'absolute',
                  top: '0',
                  animation: 'scanner-loop 2s infinite linear'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={capturePhoto}
                className="action-btn check"
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <Check size={18} /> Сделать снимок
              </button>
              <button
                onClick={stopCamera}
                className="action-btn delete"
                style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
              >
                Отмена
              </button>
            </div>
            
            <style>{`
              @keyframes scanner-loop {
                0% { top: 0%; }
                50% { top: 100%; }
                100% { top: 0%; }
              }
            `}</style>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
