export interface CourseType {
  id: string;
  name: string;
  description?: string;
  image?: string; // Custom uploaded image (base64)
}

export interface Stage {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  order: number;
}

export interface SportCourse {
  id: string;
  courseTypeId: string;
  stageId: string; // Link to stage
  title: string;
  description: string;
  image: string;
}

export interface CourseTitle {
  id: string;
  sportCourseId: string;
  title: string;
  order?: number; // For maintaining insertion order
}

export interface CourseFile {
  id: string;
  courseTitleId: string;
  title: string;
  description?: string;
  type: 'ppt' | 'word' | 'pdf' | 'video';
  fileName: string;
  fileData: string; // Base64 or blob URL
}

export interface StudentAccount {
  id: string;
  matricule: string; // Login (Mle)
  cin: string; // Password
  nom?: string;
  prenom?: string;
  grade?: string;
  unite?: string;
  promoId?: string; // Link to promo
  createdAt: string;
}

export interface Promo {
  id: string;
  name: string; // e.g., "Promotion 1ère année 2025"
  year: number;
  level: number; // 1 = 1ère année, 2 = 2ème année
  createdAt: string;
}

export interface DocumentModel {
  id: string;
  name: string; // e.g., "Compte Rendu", "Demande de Permission"
  description?: string;
  order: number;
  enabled: boolean;
}

export interface ModelFile {
  id: string;
  modelId: string;
  title: string;
  description?: string;
  type: 'ppt' | 'word' | 'pdf' | 'video';
  fileName: string;
  fileData: string;
}

export interface AppSettings {
  fcbEnabled: boolean;
  customLogo?: string; // Base64 custom logo
  excelColumnMapping: {
    matriculeColumn: string;
    cinColumn: string;
    additionalColumns: string[];
  };
}

// Folder upload structure for hierarchical import
export interface FolderStructure {
  stage: string;
  courseType: string;
  sportCourse: string;
  courseTitle: string;
  files: {
    name: string;
    data: string;
    type: 'ppt' | 'word' | 'pdf' | 'video';
  }[];
}

// Permission/Access Control Types
export type PermissionTarget = 'stage' | 'courseType' | 'lecon' | 'heading' | 'file';
export type PermissionRole = 'all' | 'eleves' | 'instructeurs' | 'none';

export interface Permission {
  id: string;
  targetType: PermissionTarget;
  targetId: string; // ID of stage/courseType/lecon/heading/file
  role: PermissionRole;
  enabled: boolean; // false = disabled for everyone
  createdAt: string;
  updatedAt: string;
}

// User role type
export type UserRole = 'admin' | 'instructeur' | 'eleve';
