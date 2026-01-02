export interface CourseType {
  id: string;
  name: string;
  description?: string;
  image?: string; // Custom uploaded image (base64)
}

export interface SportCourse {
  id: string;
  courseTypeId: string;
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
