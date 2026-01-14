import JSZip from 'jszip';
import { 
  getCourseTypes, 
  getSportCourses, 
  getCourseTitles, 
  getFiles,
  getAdminPassword,
  getUserPassword,
  getBackgroundImage,
  isBackgroundEnabled,
  saveCourseTypes,
  saveSportCourses,
  saveCourseTitles,
  saveFiles,
  setAdminPassword,
  setUserPassword,
  setBackgroundImage,
  setBackgroundEnabled,
  getFileDataAsync
} from './storage';
import { saveFileData } from './fileStorage';
import { getClickSound, isClickSoundEnabled, setClickSound, setClickSoundEnabled } from '@/hooks/useClickSound';

interface ExportData {
  courseTypes: any[];
  sportCourses: any[];
  courseTitles: any[];
  files: any[];
  adminPassword: string;
  userPassword: string;
  backgroundEnabled: boolean;
  clickSoundEnabled: boolean;
  exportedAt: string;
  version: string;
}

// Convert base64 data URL to Blob
const dataURLtoBlob = (dataURL: string): Blob | null => {
  try {
    const parts = dataURL.split(',');
    if (parts.length !== 2) return null;
    
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const bstr = atob(parts[1]);
    const u8arr = new Uint8Array(bstr.length);
    
    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    
    return new Blob([u8arr], { type: mime });
  } catch {
    return null;
  }
};

// Get file extension from mime type or data URL
const getExtension = (dataURL: string, fileName?: string): string => {
  if (fileName) {
    const ext = fileName.split('.').pop();
    if (ext) return ext;
  }
  
  const mime = dataURL.match(/data:(.*?);/)?.[1] || '';
  const mimeToExt: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/x-msvideo': 'avi',
    'video/quicktime': 'mov',
  };
  
  return mimeToExt[mime] || 'bin';
};

export const exportToZip = async (): Promise<void> => {
  const zip = new JSZip();
  
  // Create folders
  const filesFolder = zip.folder('fichiers');
  const settingsFolder = zip.folder('settings');
  
  // Get all data
  const files = getFiles();
  const backgroundImage = getBackgroundImage();
  const clickSound = getClickSound();
  
  // Prepare files list with references - fetch actual data from IndexedDB
  const filesWithRefs = await Promise.all(files.map(async (file) => {
    // Get actual file data from IndexedDB
    const fileData = await getFileDataAsync(file.id);
    
    if (fileData && filesFolder) {
      const ext = getExtension(fileData, file.fileName);
      const fileName = `file_${file.id}.${ext}`;
      
      const blob = dataURLtoBlob(fileData);
      if (blob) {
        filesFolder.file(fileName, blob);
      }
      
      return {
        ...file,
        fileData: fileName, // Replace with filename reference
        originalFileName: file.fileName
      };
    }
    
    return {
      ...file,
      fileData: '',
      originalFileName: file.fileName
    };
  }));
  
  // Export background image if exists
  if (backgroundImage && settingsFolder) {
    const ext = getExtension(backgroundImage);
    const blob = dataURLtoBlob(backgroundImage);
    if (blob) {
      settingsFolder.file(`background.${ext}`, blob);
    }
  }
  
  // Export click sound if custom
  if (clickSound && !clickSound.startsWith('data:audio/wav;base64,UklGR') && settingsFolder) {
    const ext = getExtension(clickSound);
    const blob = dataURLtoBlob(clickSound);
    if (blob) {
      settingsFolder.file(`clicksound.${ext}`, blob);
    }
  }
  
  // Create JSON data
  const exportData: ExportData = {
    courseTypes: getCourseTypes(),
    sportCourses: getSportCourses(),
    courseTitles: getCourseTitles(),
    files: filesWithRefs,
    adminPassword: getAdminPassword(),
    userPassword: getUserPassword(),
    backgroundEnabled: isBackgroundEnabled(),
    clickSoundEnabled: isClickSoundEnabled(),
    exportedAt: new Date().toISOString(),
    version: '4.0'
  };
  
  // Add main data.json
  zip.file('data.json', JSON.stringify(exportData, null, 2));
  
  // Generate and download ZIP
  const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `csm_backup_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importFromZip = async (file: File): Promise<boolean> => {
  try {
    const zip = await JSZip.loadAsync(file);
    
    // Read main data.json
    const dataFile = zip.file('data.json');
    if (!dataFile) {
      throw new Error('data.json not found in archive');
    }
    
    const dataContent = await dataFile.async('string');
    const data: ExportData = JSON.parse(dataContent);
    
    // Restore files with their actual data - save to IndexedDB
    const restoredFiles = await Promise.all(
      data.files.map(async (file) => {
        const fileName = file.fileData; // This is now the filename in the ZIP
        const zipFile = zip.file(`fichiers/${fileName}`);
        
        if (zipFile) {
          const blob = await zipFile.async('blob');
          const fileData = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          
          // Save to IndexedDB
          await saveFileData(file.id, fileData, file.originalFileName || file.fileName, file.type);
          
          return {
            ...file,
            fileData: '', // Metadata only
            fileName: file.originalFileName || file.fileName
          };
        }
        
        return { ...file, fileData: '' };
      })
    );
    
    // Restore background image
    const bgFiles = ['background.jpg', 'background.png', 'background.webp', 'background.gif'];
    for (const bgFileName of bgFiles) {
      const bgFile = zip.file(`settings/${bgFileName}`);
      if (bgFile) {
        const blob = await bgFile.async('blob');
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = () => {
            setBackgroundImage(reader.result as string);
            resolve();
          };
          reader.readAsDataURL(blob);
        });
        break;
      }
    }
    
    // Restore click sound
    const soundFiles = ['clicksound.mp3', 'clicksound.wav', 'clicksound.ogg'];
    for (const soundFileName of soundFiles) {
      const soundFile = zip.file(`settings/${soundFileName}`);
      if (soundFile) {
        const blob = await soundFile.async('blob');
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = () => {
            setClickSound(reader.result as string);
            resolve();
          };
          reader.readAsDataURL(blob);
        });
        break;
      }
    }
    
    // Save all data
    if (data.courseTypes) saveCourseTypes(data.courseTypes);
    if (data.sportCourses) saveSportCourses(data.sportCourses);
    if (data.courseTitles) saveCourseTitles(data.courseTitles);
    if (restoredFiles) saveFiles(restoredFiles);
    if (data.adminPassword) setAdminPassword(data.adminPassword);
    if (data.userPassword) setUserPassword(data.userPassword);
    if (data.backgroundEnabled !== undefined) setBackgroundEnabled(data.backgroundEnabled);
    if (data.clickSoundEnabled !== undefined) setClickSoundEnabled(data.clickSoundEnabled);
    
    return true;
  } catch (error) {
    console.error('Import failed:', error);
    return false;
  }
};
