export interface CourseType {
  id: string;
  name: string;
  description?: string;
}

export interface SportCourse {
  id: string;
  courseTypeId: string;
  title: string;
  description: string;
  image: string;
}

export interface CourseFile {
  id: string;
  sportCourseId: string;
  title: string;
  description?: string;
  type: 'ppt' | 'word' | 'pdf';
  fileName: string;
  fileData: string; // Base64 or blob URL
}
