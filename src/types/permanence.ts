// Permanence App Types

export type Grade = 'sergent' | 'sergent_chef' | 'adjudant' | 'adjudant_chef';

export const GRADES: { value: Grade; label: string }[] = [
  { value: 'sergent', label: 'Sergent' },
  { value: 'sergent_chef', label: 'Sergent Chef' },
  { value: 'adjudant', label: 'Adjudant' },
  { value: 'adjudant_chef', label: 'Adjudant Chef' },
];

export const getGradeLabel = (grade: Grade): string => {
  return GRADES.find(g => g.value === grade)?.label || grade;
};

export interface Soldier {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  grade: Grade;
  isActive: boolean; // Can be skipped/excluded from rotation
  createdAt: string;
  lastPermanenceDate?: string; // Track when they last had permanence
}

export interface PermanenceRecord {
  id: string;
visionnement: string; // Date of permanence (YYYY-MM-DD)
  soldierId: string;
  note?: string;
  wasSkipped: boolean; // If this was manually skipped
  createdAt: string;
  assignedBy: 'system' | 'admin'; // Auto-assigned or manually set
}

export interface PermanenceSettings {
  lastRotationDate: string; // Last date rotation was performed
  rotationHour: number; // Hour of day to rotate (0-23), default 8 (8 AM)
  adminPassword: string;
  userPassword: string;
}

export type PermanenceUserMode = 'admin' | 'user' | null;
