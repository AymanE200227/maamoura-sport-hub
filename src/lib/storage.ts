import { CourseType, SportCourse, CourseTitle, CourseFile, Stage, StudentAccount, AppSettings, Promo, DocumentModel, ModelFile } from '@/types';
import { saveFileData, getFileData, deleteFileData } from './fileStorage';

const STORAGE_KEYS = {
  COURSE_TYPES: 'csm_course_types',
  SPORT_COURSES: 'csm_sport_courses',
  COURSE_TITLES: 'csm_course_titles',
  FILES: 'csm_files',
  STAGES: 'csm_stages',
  STUDENT_ACCOUNTS: 'csm_student_accounts',
  APP_SETTINGS: 'csm_app_settings',
  ADMIN_PASSWORD: 'csm_admin_password',
  USER_PASSWORD: 'csm_user_password',
  USER_MODE: 'csm_user_mode',
  BACKGROUND_IMAGE: 'csm_background_image',
  BACKGROUND_ENABLED: 'csm_background_enabled',
  CLICK_SOUND: 'csm_click_sound',
  CLICK_SOUND_ENABLED: 'csm_click_sound_enabled',
  PROMOS: 'csm_promos',
  DOCUMENT_MODELS: 'csm_document_models',
  MODEL_FILES: 'csm_model_files',
};

// When true, getters must NOT auto-seed demo/default data.
// This is set by "Supprimer tout" to keep the app truly empty until an import.
const SEED_LOCK_KEY = 'csm_seed_lock';

const isSeedLocked = (): boolean => localStorage.getItem(SEED_LOCK_KEY) === '1';

const ensureArrayKey = (key: string): void => {
  if (localStorage.getItem(key) == null) localStorage.setItem(key, JSON.stringify([]));
};

const DEFAULT_ADMIN_PASSWORD = 'admin123';
const DEFAULT_USER_PASSWORD = 'user123';

// Default stages - AIDE MONITEUR, APP, CAT1, CAT2, BE, BS, MONITEUR, OFF
const DEFAULT_STAGES: Stage[] = [
  { id: 'aide_moniteur', name: 'AIDE MONITEUR', description: 'Aide Moniteur', enabled: true, order: 0 },
  { id: 'app', name: 'APP', description: 'Apprentissage', enabled: true, order: 1 },
  { id: 'cat1', name: 'CAT1', description: 'Catégorie 1', enabled: true, order: 2 },
  { id: 'cat2', name: 'CAT2', description: 'Catégorie 2', enabled: true, order: 3 },
  { id: 'be', name: 'BE', description: 'Brevet Élémentaire', enabled: true, order: 4 },
  { id: 'bs', name: 'BS', description: 'Brevet Supérieur', enabled: true, order: 5 },
  { id: 'moniteur', name: 'MONITEUR', description: 'Moniteur', enabled: true, order: 6 },
  { id: 'off', name: 'OFF', description: 'Officier', enabled: true, order: 7 },
];

// Background settings
export const getBackgroundImage = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.BACKGROUND_IMAGE);
};

export const setBackgroundImage = (imageData: string): void => {
  localStorage.setItem(STORAGE_KEYS.BACKGROUND_IMAGE, imageData);
};

export const resetBackgroundImage = (): void => {
  localStorage.removeItem(STORAGE_KEYS.BACKGROUND_IMAGE);
};

export const isBackgroundEnabled = (): boolean => {
  const value = localStorage.getItem(STORAGE_KEYS.BACKGROUND_ENABLED);
  return value === null ? true : value === 'true';
};

export const setBackgroundEnabled = (enabled: boolean): void => {
  localStorage.setItem(STORAGE_KEYS.BACKGROUND_ENABLED, String(enabled));
};

// Stages
export const getStages = (): Stage[] => {
  const data = localStorage.getItem(STORAGE_KEYS.STAGES);
  if (!data) {
    if (isSeedLocked()) {
      ensureArrayKey(STORAGE_KEYS.STAGES);
      return [];
    }
    localStorage.setItem(STORAGE_KEYS.STAGES, JSON.stringify(DEFAULT_STAGES));
    return DEFAULT_STAGES;
  }
  return JSON.parse(data);
};

export const saveStages = (stages: Stage[]): void => {
  localStorage.setItem(STORAGE_KEYS.STAGES, JSON.stringify(stages));
};

export const addStage = (stage: Omit<Stage, 'id'>): Stage => {
  const stages = getStages();
  const newStage: Stage = { ...stage, id: Date.now().toString() };
  stages.push(newStage);
  saveStages(stages);
  return newStage;
};

export const updateStage = (id: string, updates: Partial<Stage>): void => {
  const stages = getStages();
  const index = stages.findIndex(s => s.id === id);
  if (index !== -1) {
    stages[index] = { ...stages[index], ...updates };
    saveStages(stages);
  }
};

export const deleteStage = (id: string): void => {
  const stages = getStages().filter(s => s.id !== id);
  saveStages(stages);
  // Also delete related sport courses
  const courses = getSportCourses().filter(c => c.stageId !== id);
  saveSportCourses(courses);
};

export const getEnabledStages = (): Stage[] => {
  return getStages().filter(s => s.enabled).sort((a, b) => a.order - b.order);
};

// Course Types
export const getCourseTypes = (): CourseType[] => {
  const data = localStorage.getItem(STORAGE_KEYS.COURSE_TYPES);
  if (!data) {
    if (isSeedLocked()) {
      ensureArrayKey(STORAGE_KEYS.COURSE_TYPES);
      return [];
    }
    const defaults: CourseType[] = [
      { id: '1', name: 'Sportif', description: 'Cours sportifs variés' },
      { id: '2', name: 'Militaire', description: 'Entraînement militaire' },
    ];
    localStorage.setItem(STORAGE_KEYS.COURSE_TYPES, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
};

export const saveCourseTypes = (types: CourseType[]): void => {
  localStorage.setItem(STORAGE_KEYS.COURSE_TYPES, JSON.stringify(types));
};

export const addCourseType = (type: Omit<CourseType, 'id'>): CourseType => {
  const types = getCourseTypes();
  const newType: CourseType = { ...type, id: Date.now().toString() };
  types.push(newType);
  saveCourseTypes(types);
  return newType;
};

export const updateCourseType = (id: string, updates: Partial<CourseType>): void => {
  const types = getCourseTypes();
  const index = types.findIndex(t => t.id === id);
  if (index !== -1) {
    types[index] = { ...types[index], ...updates };
    saveCourseTypes(types);
  }
};

export const deleteCourseType = (id: string): void => {
  const types = getCourseTypes().filter(t => t.id !== id);
  saveCourseTypes(types);
  // Also delete related sport courses
  const courses = getSportCourses().filter(c => c.courseTypeId !== id);
  saveSportCourses(courses);
};

// Sport Courses (Carousel cards)
export const getSportCourses = (): SportCourse[] => {
  const data = localStorage.getItem(STORAGE_KEYS.SPORT_COURSES);
  if (!data) {
    if (isSeedLocked()) {
      ensureArrayKey(STORAGE_KEYS.SPORT_COURSES);
      return [];
    }
    const defaults: SportCourse[] = [
      { id: '1', courseTypeId: '1', stageId: 'cat2', title: 'Basketball', description: 'Entraînement basketball tactique et technique', image: 'basketball' },
      { id: '2', courseTypeId: '1', stageId: 'cat2', title: 'Volleyball', description: 'Cours de volleyball pour tous niveaux', image: 'volleyball' },
      { id: '3', courseTypeId: '1', stageId: 'cat1', title: 'Handball', description: 'Sport collectif handball compétitif', image: 'handball' },
      { id: '4', courseTypeId: '1', stageId: 'be', title: 'Nutrition', description: 'Conseils nutritionnels pour sportifs', image: 'nutrition' },
      { id: '5', courseTypeId: '2', stageId: 'bs', title: 'Combat', description: 'Techniques de combat avancées', image: 'combat' },
      { id: '6', courseTypeId: '2', stageId: 'cat1', title: 'Endurance', description: 'Entraînement endurance militaire', image: 'endurance' },
    ];
    localStorage.setItem(STORAGE_KEYS.SPORT_COURSES, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
};

export const saveSportCourses = (courses: SportCourse[]): void => {
  localStorage.setItem(STORAGE_KEYS.SPORT_COURSES, JSON.stringify(courses));
};

export const getSportCoursesByType = (courseTypeId: string): SportCourse[] => {
  return getSportCourses().filter(c => c.courseTypeId === courseTypeId);
};

export const getSportCoursesByStage = (stageId: string): SportCourse[] => {
  return getSportCourses().filter(c => c.stageId === stageId);
};

export const getSportCoursesByTypeAndStage = (courseTypeId: string, stageId: string): SportCourse[] => {
  return getSportCourses().filter(c => c.courseTypeId === courseTypeId && c.stageId === stageId);
};

export const addSportCourse = (course: Omit<SportCourse, 'id'>): SportCourse => {
  const courses = getSportCourses();
  const newCourse: SportCourse = { ...course, id: Date.now().toString() };
  courses.push(newCourse);
  saveSportCourses(courses);
  return newCourse;
};

export const updateSportCourse = (id: string, updates: Partial<SportCourse>): void => {
  const courses = getSportCourses();
  const index = courses.findIndex(c => c.id === id);
  if (index !== -1) {
    courses[index] = { ...courses[index], ...updates };
    saveSportCourses(courses);
  }
};

export const deleteSportCourse = (id: string): void => {
  const courses = getSportCourses().filter(c => c.id !== id);
  saveSportCourses(courses);
  // Also delete related course titles
  const titles = getCourseTitles().filter(t => t.sportCourseId !== id);
  saveCourseTitles(titles);
};

// Course Titles
export const getCourseTitles = (): CourseTitle[] => {
  const data = localStorage.getItem(STORAGE_KEYS.COURSE_TITLES);
  if (!data) {
    if (isSeedLocked()) {
      ensureArrayKey(STORAGE_KEYS.COURSE_TITLES);
      return [];
    }
    const defaults: CourseTitle[] = [
      { id: '1', sportCourseId: '1', title: 'Initiation au Basketball' },
      { id: '2', sportCourseId: '1', title: 'Basketball – Techniques de Base' },
      { id: '3', sportCourseId: '1', title: 'Perfectionnement en Basketball' },
      { id: '4', sportCourseId: '1', title: 'Dribbles et Contrôle du Ballon' },
      { id: '5', sportCourseId: '1', title: 'Tirs et Précision au Basketball' },
      { id: '6', sportCourseId: '2', title: 'Initiation au Volleyball' },
      { id: '7', sportCourseId: '2', title: 'Techniques de Service' },
    ];
    localStorage.setItem(STORAGE_KEYS.COURSE_TITLES, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
};

export const saveCourseTitles = (titles: CourseTitle[]): void => {
  localStorage.setItem(STORAGE_KEYS.COURSE_TITLES, JSON.stringify(titles));
};

export const getCourseTitlesBySportCourse = (sportCourseId: string): CourseTitle[] => {
  const titles = getCourseTitles().filter(t => t.sportCourseId === sportCourseId);
  // Sort by order if available, otherwise by id (older first)
  return titles.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return parseInt(a.id) - parseInt(b.id);
  });
};

export const addCourseTitle = (title: Omit<CourseTitle, 'id'>): CourseTitle => {
  const titles = getCourseTitles();
  // Get max order for this sport course
  const sameCourse = titles.filter(t => t.sportCourseId === title.sportCourseId);
  const maxOrder = sameCourse.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
  const newTitle: CourseTitle = { 
    ...title, 
    id: Date.now().toString(),
    order: maxOrder + 1
  };
  titles.push(newTitle);
  saveCourseTitles(titles);
  return newTitle;
};

export const updateCourseTitle = (id: string, updates: Partial<CourseTitle>): void => {
  const titles = getCourseTitles();
  const index = titles.findIndex(t => t.id === id);
  if (index !== -1) {
    titles[index] = { ...titles[index], ...updates };
    saveCourseTitles(titles);
  }
};

export const deleteCourseTitle = (id: string): void => {
  const titles = getCourseTitles().filter(t => t.id !== id);
  saveCourseTitles(titles);
  // Also delete related files
  const files = getFiles().filter(f => f.courseTitleId !== id);
  saveFiles(files);
};

// Files - Metadata only in localStorage, actual file data in IndexedDB
export const getFiles = (): CourseFile[] => {
  const data = localStorage.getItem(STORAGE_KEYS.FILES);
  if (!data) {
    if (isSeedLocked()) {
      ensureArrayKey(STORAGE_KEYS.FILES);
      return [];
    }
    const defaults: CourseFile[] = [
      { id: '1', courseTitleId: '1', title: 'PPT: Techniques de Base', description: 'Les bases du basketball', type: 'ppt', fileName: 'techniques_base.pptx', fileData: '' },
      { id: '2', courseTitleId: '1', title: 'WORD: Exercices et Drills', description: 'Exercices pratiques', type: 'word', fileName: 'exercices.docx', fileData: '' },
      { id: '3', courseTitleId: '2', title: 'PDF: Règlement Officiel', description: 'Règles officielles FIBA', type: 'pdf', fileName: 'reglement.pdf', fileData: '' },
    ];
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
};

export const saveFiles = (files: CourseFile[]): void => {
  // Only save metadata (without fileData) to localStorage
  const metadataOnly = files.map(f => ({ ...f, fileData: '' }));
  localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(metadataOnly));
};

export const getFilesByCourseTitle = (courseTitleId: string): CourseFile[] => {
  return getFiles().filter(f => f.courseTitleId === courseTitleId);
};

// Async file operations using IndexedDB
export const addFileAsync = async (file: Omit<CourseFile, 'id'>): Promise<CourseFile> => {
  const files = getFiles();
  const newFile: CourseFile = { ...file, id: Date.now().toString() };
  
  // Store file data in IndexedDB
  if (file.fileData) {
    await saveFileData(newFile.id, file.fileData, file.fileName, file.type);
  }
  
  // Store metadata in localStorage (without fileData)
  files.push({ ...newFile, fileData: '' });
  saveFiles(files);
  
  return newFile;
};

export const getFileDataAsync = async (fileId: string): Promise<string | null> => {
  return getFileData(fileId);
};

export const updateFileAsync = async (id: string, updates: Partial<CourseFile>): Promise<void> => {
  const files = getFiles();
  const index = files.findIndex(f => f.id === id);
  if (index !== -1) {
    // If updating file data, save to IndexedDB
    if (updates.fileData) {
      await saveFileData(id, updates.fileData, updates.fileName || files[index].fileName, updates.type || files[index].type);
      updates = { ...updates, fileData: '' };
    }
    files[index] = { ...files[index], ...updates };
    saveFiles(files);
  }
};

export const deleteFileAsync = async (id: string): Promise<void> => {
  const files = getFiles().filter(f => f.id !== id);
  saveFiles(files);
  await deleteFileData(id);
};

// Legacy sync functions (for backwards compatibility - will use empty fileData)
export const addFile = (file: Omit<CourseFile, 'id'>): CourseFile => {
  const files = getFiles();
  const newFile: CourseFile = { ...file, id: Date.now().toString() };
  
  // Store file data asynchronously
  if (file.fileData) {
    saveFileData(newFile.id, file.fileData, file.fileName, file.type).catch(console.error);
  }
  
  files.push({ ...newFile, fileData: '' });
  saveFiles(files);
  return newFile;
};

export const updateFile = (id: string, updates: Partial<CourseFile>): void => {
  const files = getFiles();
  const index = files.findIndex(f => f.id === id);
  if (index !== -1) {
    if (updates.fileData) {
      saveFileData(id, updates.fileData, updates.fileName || files[index].fileName, updates.type || files[index].type).catch(console.error);
      updates = { ...updates, fileData: '' };
    }
    files[index] = { ...files[index], ...updates };
    saveFiles(files);
  }
};

export const deleteFile = (id: string): void => {
  const files = getFiles().filter(f => f.id !== id);
  saveFiles(files);
  deleteFileData(id).catch(console.error);
};

// Student Accounts
export const getStudentAccounts = (): StudentAccount[] => {
  const data = localStorage.getItem(STORAGE_KEYS.STUDENT_ACCOUNTS);
  return data ? JSON.parse(data) : [];
};

export const saveStudentAccounts = (accounts: StudentAccount[]): void => {
  localStorage.setItem(STORAGE_KEYS.STUDENT_ACCOUNTS, JSON.stringify(accounts));
};

export const addStudentAccount = (account: Omit<StudentAccount, 'id' | 'createdAt'>): StudentAccount => {
  const accounts = getStudentAccounts();
  const newAccount: StudentAccount = { 
    ...account, 
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };
  accounts.push(newAccount);
  saveStudentAccounts(accounts);
  return newAccount;
};

export const updateStudentAccount = (id: string, updates: Partial<StudentAccount>): void => {
  const accounts = getStudentAccounts();
  const index = accounts.findIndex(a => a.id === id);
  if (index !== -1) {
    accounts[index] = { ...accounts[index], ...updates };
    saveStudentAccounts(accounts);
  }
};

export const deleteStudentAccount = (id: string): void => {
  const accounts = getStudentAccounts().filter(a => a.id !== id);
  saveStudentAccounts(accounts);
};

export const verifyStudentCredentials = (matricule: string, cin: string): StudentAccount | null => {
  const accounts = getStudentAccounts();
  return accounts.find(a => a.matricule === matricule && a.cin === cin) || null;
};

export const importStudentAccountsBulk = (accounts: Omit<StudentAccount, 'id' | 'createdAt'>[]): number => {
  const existing = getStudentAccounts();
  const existingMatricules = new Set(existing.map(a => a.matricule));
  
  let added = 0;
  for (const account of accounts) {
    if (!existingMatricules.has(account.matricule)) {
      existing.push({
        ...account,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      });
      existingMatricules.add(account.matricule);
      added++;
    }
  }
  
  saveStudentAccounts(existing);
  return added;
};

// Promos
export const getPromos = (): Promo[] => {
  const data = localStorage.getItem(STORAGE_KEYS.PROMOS);
  return data ? JSON.parse(data) : [];
};

export const savePromos = (promos: Promo[]): void => {
  localStorage.setItem(STORAGE_KEYS.PROMOS, JSON.stringify(promos));
};

export const addPromo = (promo: Omit<Promo, 'id' | 'createdAt'>): Promo => {
  const promos = getPromos();
  const newPromo: Promo = { ...promo, id: Date.now().toString(), createdAt: new Date().toISOString() };
  promos.push(newPromo);
  savePromos(promos);
  return newPromo;
};

export const deletePromo = (id: string): void => {
  const promos = getPromos().filter(p => p.id !== id);
  savePromos(promos);
  // Remove promo assignment from students
  const accounts = getStudentAccounts();
  accounts.forEach(a => { if (a.promoId === id) delete a.promoId; });
  saveStudentAccounts(accounts);
};

export const promotePromo = (promoId: string): void => {
  const promos = getPromos();
  const promo = promos.find(p => p.id === promoId);
  if (promo && promo.level < 2) {
    promo.level = 2;
    promo.name = promo.name.replace('1ère année', '2ème année').replace('1er année', '2ème année');
    savePromos(promos);
  }
};

export const getStudentsByPromo = (promoId: string): StudentAccount[] => {
  return getStudentAccounts().filter(a => a.promoId === promoId);
};

export const assignStudentsToPromo = (studentIds: string[], promoId: string): void => {
  const accounts = getStudentAccounts();
  accounts.forEach(a => {
    if (studentIds.includes(a.id)) {
      a.promoId = promoId;
    }
  });
  saveStudentAccounts(accounts);
};

export const deleteStudentsByPromo = (promoId: string): number => {
  const accounts = getStudentAccounts();
  const toDelete = accounts.filter(a => a.promoId === promoId);
  const remaining = accounts.filter(a => a.promoId !== promoId);
  saveStudentAccounts(remaining);
  return toDelete.length;
};

// Document Models
const DEFAULT_MODELS: DocumentModel[] = [
  { id: 'compte_rendu', name: 'Compte Rendu', description: 'Modèles de comptes rendus', order: 0, enabled: true },
  { id: 'demande_permission', name: 'Demande de Permission', description: 'Modèles de demandes de permission', order: 1, enabled: true },
  { id: 'demande_mariage', name: 'Demande de Mariage', description: 'Modèles de demandes de mariage', order: 2, enabled: true },
];

export const getDocumentModels = (): DocumentModel[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DOCUMENT_MODELS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.DOCUMENT_MODELS, JSON.stringify(DEFAULT_MODELS));
    return DEFAULT_MODELS;
  }
  // Migrate old models without enabled property
  const models: DocumentModel[] = JSON.parse(data);
  return models.map(m => ({ ...m, enabled: m.enabled !== undefined ? m.enabled : true }));
};

export const saveDocumentModels = (models: DocumentModel[]): void => {
  localStorage.setItem(STORAGE_KEYS.DOCUMENT_MODELS, JSON.stringify(models));
};

export const addDocumentModel = (model: Omit<DocumentModel, 'id' | 'order'>): DocumentModel => {
  const models = getDocumentModels();
  const newModel: DocumentModel = { ...model, id: Date.now().toString(), order: models.length, enabled: model.enabled !== undefined ? model.enabled : true };
  models.push(newModel);
  saveDocumentModels(models);
  return newModel;
};

export const updateDocumentModel = (id: string, updates: Partial<DocumentModel>): void => {
  const models = getDocumentModels();
  const index = models.findIndex(m => m.id === id);
  if (index !== -1) {
    models[index] = { ...models[index], ...updates };
    saveDocumentModels(models);
  }
};

export const deleteDocumentModel = (id: string): void => {
  const models = getDocumentModels().filter(m => m.id !== id);
  saveDocumentModels(models);
  // Delete related files
  const files = getModelFiles().filter(f => f.modelId !== id);
  saveModelFiles(files);
};

// Model Files - Metadata in localStorage, file data in IndexedDB
export const getModelFiles = (): ModelFile[] => {
  const data = localStorage.getItem(STORAGE_KEYS.MODEL_FILES);
  return data ? JSON.parse(data) : [];
};

export const saveModelFiles = (files: ModelFile[]): void => {
  const metadataOnly = files.map(f => ({ ...f, fileData: '' }));
  localStorage.setItem(STORAGE_KEYS.MODEL_FILES, JSON.stringify(metadataOnly));
};

export const getModelFilesByModel = (modelId: string): ModelFile[] => {
  return getModelFiles().filter(f => f.modelId === modelId);
};

export const addModelFileAsync = async (file: Omit<ModelFile, 'id'>): Promise<ModelFile> => {
  const files = getModelFiles();
  const newFile: ModelFile = { ...file, id: `model_${Date.now().toString()}` };
  
  if (file.fileData) {
    await saveFileData(newFile.id, file.fileData, file.fileName, file.type);
  }
  
  files.push({ ...newFile, fileData: '' });
  saveModelFiles(files);
  return newFile;
};

export const getModelFileDataAsync = async (fileId: string): Promise<string | null> => {
  return getFileData(fileId);
};

export const addModelFile = (file: Omit<ModelFile, 'id'>): ModelFile => {
  const files = getModelFiles();
  const newFile: ModelFile = { ...file, id: `model_${Date.now().toString()}` };
  
  if (file.fileData) {
    saveFileData(newFile.id, file.fileData, file.fileName, file.type).catch(console.error);
  }
  
  files.push({ ...newFile, fileData: '' });
  saveModelFiles(files);
  return newFile;
};

export const updateModelFile = (id: string, updates: Partial<ModelFile>): void => {
  const files = getModelFiles();
  const index = files.findIndex(f => f.id === id);
  if (index !== -1) {
    if (updates.fileData) {
      saveFileData(id, updates.fileData, updates.fileName || files[index].fileName, updates.type || files[index].type).catch(console.error);
      updates = { ...updates, fileData: '' };
    }
    files[index] = { ...files[index], ...updates };
    saveModelFiles(files);
  }
};

export const deleteModelFileAsync = async (id: string): Promise<void> => {
  const files = getModelFiles().filter(f => f.id !== id);
  saveModelFiles(files);
  await deleteFileData(id);
};

export const deleteModelFile = (id: string): void => {
  const files = getModelFiles().filter(f => f.id !== id);
  saveModelFiles(files);
  deleteFileData(id).catch(console.error);
};

// App Settings
export const getAppSettings = (): AppSettings => {
  const data = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
  if (!data) {
    const defaults: AppSettings = {
      fcbEnabled: false,
      excelColumnMapping: {
        matriculeColumn: 'Mle',
        cinColumn: 'CIN',
        additionalColumns: ['Nom', 'Prenom', 'Grade', 'Unite']
      }
    };
    localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
};

export const saveAppSettings = (settings: AppSettings): void => {
  localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
};

// Password - Admin
export const getAdminPassword = (): string => {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD) || DEFAULT_ADMIN_PASSWORD;
};

export const setAdminPassword = (password: string): void => {
  localStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, password);
};

export const verifyAdminPassword = (password: string): boolean => {
  return password === getAdminPassword();
};

// Password - User
export const getUserPassword = (): string => {
  return localStorage.getItem(STORAGE_KEYS.USER_PASSWORD) || DEFAULT_USER_PASSWORD;
};

export const setUserPassword = (password: string): void => {
  localStorage.setItem(STORAGE_KEYS.USER_PASSWORD, password);
};

export const verifyUserPassword = (password: string): boolean => {
  return password === getUserPassword();
};

// Legacy support - kept for backward compatibility
export const getPassword = (): string => getAdminPassword();
export const setPassword = (password: string): void => setAdminPassword(password);
export const verifyPassword = (password: string): boolean => verifyAdminPassword(password);

// User Mode
export const getUserMode = (): 'admin' | 'user' | 'eleve' | null => {
  return localStorage.getItem(STORAGE_KEYS.USER_MODE) as 'admin' | 'user' | 'eleve' | null;
};

export const setUserMode = (mode: 'admin' | 'user' | 'eleve'): void => {
  localStorage.setItem(STORAGE_KEYS.USER_MODE, mode);
};

export const clearUserMode = (): void => {
  localStorage.removeItem(STORAGE_KEYS.USER_MODE);
};

// Export/Import All Data (includes files with their base64 data)
export const exportAllData = (): string => {
  const data = {
    courseTypes: getCourseTypes(),
    sportCourses: getSportCourses(),
    courseTitles: getCourseTitles(),
    files: getFiles(),
    stages: getStages(),
    studentAccounts: getStudentAccounts(),
    appSettings: getAppSettings(),
    adminPassword: getAdminPassword(),
    userPassword: getUserPassword(),
    backgroundImage: getBackgroundImage(),
    backgroundEnabled: isBackgroundEnabled(),
    clickSound: localStorage.getItem(STORAGE_KEYS.CLICK_SOUND),
    clickSoundEnabled: localStorage.getItem(STORAGE_KEYS.CLICK_SOUND_ENABLED) !== 'false',
    exportedAt: new Date().toISOString(),
    version: '3.0'
  };
  return JSON.stringify(data, null, 2);
};

// Import modes: 'replace' (clear all then import) or 'merge' (add to existing)
export const importAllData = (jsonData: string, mode: 'replace' | 'merge' = 'replace'): boolean => {
  try {
    const data = JSON.parse(jsonData);
    
    if (mode === 'replace') {
      // Replace mode: clear existing before import
      if (data.courseTypes) {
        saveCourseTypes(data.courseTypes);
      }
      if (data.sportCourses) {
        saveSportCourses(data.sportCourses);
      }
      if (data.courseTitles) {
        saveCourseTitles(data.courseTitles);
      }
      if (data.files) {
        saveFiles(data.files);
      }
      if (data.stages) {
        saveStages(data.stages);
      }
      if (data.studentAccounts) {
        saveStudentAccounts(data.studentAccounts);
      }
      if (data.appSettings) {
        saveAppSettings(data.appSettings);
      }
    } else {
      // Merge mode: add to existing data
      if (data.courseTypes) {
        const existing = getCourseTypes();
        const merged = [...existing];
        data.courseTypes.forEach((newType: CourseType) => {
          if (!merged.find(t => t.id === newType.id || t.name.toLowerCase() === newType.name.toLowerCase())) {
            merged.push(newType);
          }
        });
        saveCourseTypes(merged);
      }
      if (data.sportCourses) {
        const existing = getSportCourses();
        const merged = [...existing];
        data.sportCourses.forEach((newCourse: SportCourse) => {
          if (!merged.find(c => c.id === newCourse.id)) {
            merged.push(newCourse);
          }
        });
        saveSportCourses(merged);
      }
      if (data.courseTitles) {
        const existing = getCourseTitles();
        const merged = [...existing];
        data.courseTitles.forEach((newTitle: CourseTitle) => {
          if (!merged.find(t => t.id === newTitle.id)) {
            merged.push(newTitle);
          }
        });
        saveCourseTitles(merged);
      }
      if (data.files) {
        const existing = getFiles();
        const merged = [...existing];
        data.files.forEach((newFile: CourseFile) => {
          if (!merged.find(f => f.id === newFile.id)) {
            merged.push(newFile);
          }
        });
        saveFiles(merged);
      }
      if (data.stages) {
        const existing = getStages();
        const merged = [...existing];
        data.stages.forEach((newStage: Stage) => {
          if (!merged.find(s => s.id === newStage.id)) {
            merged.push(newStage);
          }
        });
        saveStages(merged);
      }
      if (data.studentAccounts) {
        const existing = getStudentAccounts();
        const merged = [...existing];
        data.studentAccounts.forEach((newAccount: StudentAccount) => {
          if (!merged.find(a => a.id === newAccount.id || a.matricule === newAccount.matricule)) {
            merged.push(newAccount);
          }
        });
        saveStudentAccounts(merged);
      }
    }
    
    // These always replace (passwords, settings)
    if (data.adminPassword) {
      setAdminPassword(data.adminPassword);
    }
    if (data.userPassword) {
      setUserPassword(data.userPassword);
    }
    if (data.backgroundImage) {
      setBackgroundImage(data.backgroundImage);
    }
    if (data.backgroundEnabled !== undefined) {
      setBackgroundEnabled(data.backgroundEnabled);
    }
    if (data.clickSound) {
      localStorage.setItem(STORAGE_KEYS.CLICK_SOUND, data.clickSound);
    }
    if (data.clickSoundEnabled !== undefined) {
      localStorage.setItem(STORAGE_KEYS.CLICK_SOUND_ENABLED, String(data.clickSoundEnabled));
    }
    
    return true;
  } catch (error) {
    console.error('Import failed:', error);
    return false;
  }
};

// Delete all application data
export const clearAllData = (): void => {
  // Clear all localStorage keys
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });

  // IMPORTANT: prevent auto-seeding defaults after a "delete all".
  // Some getters (getStages/getCourseTypes/getSportCourses/...) re-seed when their key is missing.
  // By writing explicit empty arrays, the app stays truly empty until the admin imports/creates data.
  localStorage.setItem(STORAGE_KEYS.STAGES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.COURSE_TYPES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.SPORT_COURSES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.COURSE_TITLES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify([]));

  // Also clear other seeded/related collections.
  localStorage.setItem(STORAGE_KEYS.DOCUMENT_MODELS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.MODEL_FILES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.STUDENT_ACCOUNTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.PROMOS, JSON.stringify([]));

  // Lock seeding so missing keys never re-create demo/default data after wipe.
  localStorage.setItem(SEED_LOCK_KEY, '1');
};
