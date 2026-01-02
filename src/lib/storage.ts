import { CourseType, SportCourse, CourseFile } from '@/types';

const STORAGE_KEYS = {
  COURSE_TYPES: 'csm_course_types',
  SPORT_COURSES: 'csm_sport_courses',
  FILES: 'csm_files',
  PASSWORD: 'csm_password',
  USER_MODE: 'csm_user_mode',
};

const DEFAULT_PASSWORD = 'admin123';

// Course Types
export const getCourseTypes = (): CourseType[] => {
  const data = localStorage.getItem(STORAGE_KEYS.COURSE_TYPES);
  if (!data) {
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
    const defaults: SportCourse[] = [
      { id: '1', courseTypeId: '1', title: 'Basketball', description: 'Entraînement basketball tactique et technique', image: 'basketball' },
      { id: '2', courseTypeId: '1', title: 'Volleyball', description: 'Cours de volleyball pour tous niveaux', image: 'volleyball' },
      { id: '3', courseTypeId: '1', title: 'Handball', description: 'Sport collectif handball compétitif', image: 'handball' },
      { id: '4', courseTypeId: '1', title: 'Nutrition', description: 'Conseils nutritionnels pour sportifs', image: 'nutrition' },
      { id: '5', courseTypeId: '2', title: 'Combat', description: 'Techniques de combat avancées', image: 'combat' },
      { id: '6', courseTypeId: '2', title: 'Endurance', description: 'Entraînement endurance militaire', image: 'endurance' },
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
  // Also delete related files
  const files = getFiles().filter(f => f.sportCourseId !== id);
  saveFiles(files);
};

// Files
export const getFiles = (): CourseFile[] => {
  const data = localStorage.getItem(STORAGE_KEYS.FILES);
  if (!data) {
    const defaults: CourseFile[] = [
      { id: '1', sportCourseId: '1', title: 'PPT: Techniques de Base', description: 'Les bases du basketball', type: 'ppt', fileName: 'techniques_base.pptx', fileData: '' },
      { id: '2', sportCourseId: '1', title: 'WORD: Exercices et Drills', description: 'Exercices pratiques', type: 'word', fileName: 'exercices.docx', fileData: '' },
      { id: '3', sportCourseId: '1', title: 'PDF: Règlement Officiel', description: 'Règles officielles FIBA', type: 'pdf', fileName: 'reglement.pdf', fileData: '' },
    ];
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
};

export const saveFiles = (files: CourseFile[]): void => {
  localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
};

export const getFilesBySportCourse = (sportCourseId: string): CourseFile[] => {
  return getFiles().filter(f => f.sportCourseId === sportCourseId);
};

export const addFile = (file: Omit<CourseFile, 'id'>): CourseFile => {
  const files = getFiles();
  const newFile: CourseFile = { ...file, id: Date.now().toString() };
  files.push(newFile);
  saveFiles(files);
  return newFile;
};

export const updateFile = (id: string, updates: Partial<CourseFile>): void => {
  const files = getFiles();
  const index = files.findIndex(f => f.id === id);
  if (index !== -1) {
    files[index] = { ...files[index], ...updates };
    saveFiles(files);
  }
};

export const deleteFile = (id: string): void => {
  const files = getFiles().filter(f => f.id !== id);
  saveFiles(files);
};

// Password
export const getPassword = (): string => {
  return localStorage.getItem(STORAGE_KEYS.PASSWORD) || DEFAULT_PASSWORD;
};

export const setPassword = (password: string): void => {
  localStorage.setItem(STORAGE_KEYS.PASSWORD, password);
};

export const verifyPassword = (password: string): boolean => {
  return password === getPassword();
};

// User Mode
export const getUserMode = (): 'admin' | 'user' | null => {
  return localStorage.getItem(STORAGE_KEYS.USER_MODE) as 'admin' | 'user' | null;
};

export const setUserMode = (mode: 'admin' | 'user'): void => {
  localStorage.setItem(STORAGE_KEYS.USER_MODE, mode);
};

export const clearUserMode = (): void => {
  localStorage.removeItem(STORAGE_KEYS.USER_MODE);
};
