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
}

export interface CourseFile {
  id: string;
  courseTitleId: string;
  title: string;
  description?: string;
  type: 'ppt' | 'word' | 'pdf';
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
  createdAt: string;
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
