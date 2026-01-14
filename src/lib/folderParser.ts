import { ImportTreeNode, ImportFile } from '@/components/FolderImportTree';

// Generate unique ID
const generateId = (): string => Math.random().toString(36).substring(2, 11);

// Get file type from extension
export const getFileTypeFromExtension = (fileName: string): 'ppt' | 'word' | 'pdf' | 'video' | 'unknown' => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['pptx', 'ppt'].includes(ext)) return 'ppt';
  if (['docx', 'doc'].includes(ext)) return 'word';
  if (ext === 'pdf') return 'pdf';
  if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v'].includes(ext)) return 'video';
  return 'unknown';
};

// Check if file is valid for import
export const isValidFile = (fileName: string): boolean => {
  const validExtensions = ['pptx', 'ppt', 'docx', 'doc', 'pdf', 'mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v'];
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return validExtensions.includes(ext);
};

// Stage name mappings
const stageNameMappings: Record<string, string> = {
  'a.moniteur': 'AIDE MONITEUR',
  'aide moniteur': 'AIDE MONITEUR',
  'aide_moniteur': 'AIDE MONITEUR',
  'app': 'APP',
  'cat1': 'CAT1',
  'cat 1': 'CAT1',
  'cat2': 'CAT2', 
  'cat 2': 'CAT2',
  'be': 'BE',
  'bs': 'BS',
  'moniteur': 'MONITEUR',
  'off': 'OFF',
};

// Type name mappings - normalize to SPORTIF or MILITAIRE only
const typeNameMappings: Record<string, string> = {
  'p.specialite': 'SPORTIF',
  'p.sportif': 'SPORTIF',
  'specialite': 'SPORTIF',
  'sportif': 'SPORTIF',
  'p.militaire': 'MILITAIRE',
  'militaire': 'MILITAIRE',
};

// Get stage ID from name
const getStageId = (name: string): string => {
  const lower = name.toLowerCase().trim();
  const stageIdMap: Record<string, string> = {
    'aide moniteur': 'aide_moniteur',
    'a.moniteur': 'aide_moniteur',
    'app': 'app',
    'cat1': 'cat1',
    'cat 1': 'cat1',
    'cat2': 'cat2',
    'cat 2': 'cat2',
    'be': 'be',
    'bs': 'bs',
    'moniteur': 'moniteur',
    'off': 'off',
  };
  return stageIdMap[lower] || lower.replace(/\s+/g, '_');
};

// Normalize stage name
const normalizesStageName = (name: string): string => {
  const lower = name.toLowerCase().trim();
  return stageNameMappings[lower] || name.toUpperCase();
};

// Normalize type name - ALWAYS return either SPORTIF or MILITAIRE
const normalizeTypeName = (name: string): string => {
  const lower = name.toLowerCase().trim().replace('p.', '');
  return typeNameMappings[lower] || typeNameMappings[name.toLowerCase().replace('p.', '')] || 'SPORTIF';
};

// Parse folder structure from FileList
// Expected structure: RootFolder/Stage/Type/Leçon/Heading/file.pdf
// Example: CAT1/P.SPORTIF/BASKET/1.HISTORIQUE/test.ppt
export const parseFolderStructure = async (files: FileList): Promise<{
  tree: ImportTreeNode[];
  stats: { stages: number; types: number; lecons: number; headings: number; files: number };
}> => {
  const tree: ImportTreeNode[] = [];
  const stageMap = new Map<string, ImportTreeNode>();
  const typeMap = new Map<string, ImportTreeNode>();
  const leconMap = new Map<string, ImportTreeNode>();
  const headingMap = new Map<string, ImportTreeNode>();
  
  let fileCount = 0;
  
  // Process files in batches to avoid freezing
  const filesArray = Array.from(files).filter(f => !f.name.startsWith('.') && isValidFile(f.name));
  const batchSize = 20;
  
  for (let i = 0; i < filesArray.length; i += batchSize) {
    const batch = filesArray.slice(i, i + batchSize);
    
    // Allow UI to breathe
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    for (const file of batch) {
      // Get path parts (folder structure)
      const pathParts = file.webkitRelativePath.split('/').filter(p => p);
      
      // Skip if not enough depth
      if (pathParts.length < 2) continue;

      // Remove root folder name and file name
      const fileName = pathParts.pop()!;
      const folders = pathParts.slice(1); // Remove root folder

      // Read file data
      const fileData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const importFile: ImportFile = {
        id: generateId(),
        name: fileName,
        path: file.webkitRelativePath,
        type: getFileTypeFromExtension(fileName),
        data: fileData,
        size: file.size
      };

      // Build tree structure based on folder depth
      // Structure: Stage / Type (P.SPORTIF or P.MILITAIRE) / Leçon (BASKET) / Heading / Files
      
      if (folders.length >= 1) {
        const stageName = normalizesStageName(folders[0]);
        const stageKey = stageName.toLowerCase();
        
        if (!stageMap.has(stageKey)) {
          const stageNode: ImportTreeNode = {
            id: generateId(),
            name: stageName,
            type: 'stage',
            children: [],
            expanded: true
          };
          stageMap.set(stageKey, stageNode);
          tree.push(stageNode);
        }
        
        let parentNode = stageMap.get(stageKey)!;
        
        if (folders.length >= 2) {
          // Normalize type to either SPORTIF or MILITAIRE
          const typeName = normalizeTypeName(folders[1]);
          const typeKey = `${stageKey}/${typeName.toLowerCase()}`;
          
          if (!typeMap.has(typeKey)) {
            const typeNode: ImportTreeNode = {
              id: generateId(),
              name: typeName,
              type: 'courseType',
              children: [],
              expanded: true
            };
            typeMap.set(typeKey, typeNode);
            parentNode.children.push(typeNode);
          }
          
          parentNode = typeMap.get(typeKey)!;
          
          if (folders.length >= 3) {
            // This is the Leçon level (e.g., BASKET, HANDBALL, etc.)
            const leconName = folders[2].toUpperCase();
            const leconKey = `${typeKey}/${leconName.toLowerCase()}`;
            
            if (!leconMap.has(leconKey)) {
              const leconNode: ImportTreeNode = {
                id: generateId(),
                name: leconName,
                type: 'lecon',
                children: [],
                expanded: true
              };
              leconMap.set(leconKey, leconNode);
              parentNode.children.push(leconNode);
            }
            
            parentNode = leconMap.get(leconKey)!;
            
            if (folders.length >= 4) {
              // This is the Heading level
              const headingName = folders[3];
              const headingKey = `${leconKey}/${headingName.toLowerCase()}`;
              
              if (!headingMap.has(headingKey)) {
                const headingNode: ImportTreeNode = {
                  id: generateId(),
                  name: headingName,
                  type: 'heading',
                  children: [],
                  expanded: false
                };
                headingMap.set(headingKey, headingNode);
                parentNode.children.push(headingNode);
              }
              
              parentNode = headingMap.get(headingKey)!;
            }
          }
        }
        
        // Add file to current parent
        const fileNode: ImportTreeNode = {
          id: generateId(),
          name: fileName.replace(/\.[^/.]+$/, ''), // Remove extension for display
          type: 'file',
          children: [],
          file: importFile
        };
        parentNode.children.push(fileNode);
        fileCount++;
      }
    }
  }

  return {
    tree,
    stats: {
      stages: stageMap.size,
      types: typeMap.size,
      lecons: leconMap.size,
      headings: headingMap.size,
      files: fileCount
    }
  };
};

// Import tree to storage - FIXED to ensure only ONE P.SPORTIF and ONE P.MILITAIRE per stage
export const importTreeToStorage = async (
  tree: ImportTreeNode[],
  getStages: () => any[],
  getCourseTypes: () => any[],
  addCourseType: (data: any) => any,
  getSportCourses: () => any[],
  addSportCourse: (data: any) => any,
  getCourseTitles: () => any[],
  addCourseTitle: (data: any) => any,
  addFileAsync: (data: any) => Promise<any>
): Promise<number> => {
  let importedFiles = 0;
  
  const existingStages = getStages();
  let existingTypes = getCourseTypes();
  let existingCourses = getSportCourses();
  let existingTitles = getCourseTitles();
  
  // Process in batches
  for (const stageNode of tree) {
    // Find matching stage
    const stageId = getStageId(stageNode.name);
    const stage = existingStages.find(s => 
      s.id === stageId ||
      s.name.toLowerCase() === stageNode.name.toLowerCase()
    );
    
    if (!stage) {
      console.warn(`Stage not found: ${stageNode.name}`);
      continue;
    }
    
    for (const typeNode of stageNode.children) {
      if (typeNode.type !== 'courseType') continue;
      
      // Normalize type name to SPORTIF or MILITAIRE
      const normalizedTypeName = normalizeTypeName(typeNode.name);
      
      // Find existing course type (SPORTIF or MILITAIRE)
      let courseType = existingTypes.find(t => 
        t.name.toUpperCase() === normalizedTypeName ||
        t.name.toLowerCase() === normalizedTypeName.toLowerCase()
      );
      
      // Only create if doesn't exist
      if (!courseType) {
        courseType = addCourseType({ 
          name: normalizedTypeName === 'SPORTIF' ? 'Sportif' : 'Militaire', 
          description: normalizedTypeName === 'SPORTIF' ? 'Cours sportifs' : 'Cours militaires' 
        });
        existingTypes = [...existingTypes, courseType];
      }
      
      for (const leconNode of typeNode.children) {
        if (leconNode.type !== 'lecon') continue;
        
        // Find or create sport course (leçon) - check existing first
        let sportCourse = existingCourses.find(c => 
          c.title.toLowerCase() === leconNode.name.toLowerCase() &&
          c.stageId === stage.id &&
          c.courseTypeId === courseType.id
        );
        
        if (!sportCourse) {
          sportCourse = addSportCourse({
            courseTypeId: courseType.id,
            stageId: stage.id,
            title: leconNode.name,
            description: '',
            image: 'basketball' // Default image
          });
          existingCourses = [...existingCourses, sportCourse];
        }
        
        for (const child of leconNode.children) {
          if (child.type === 'file' && child.file) {
            // Direct file under lecon - create "Général" heading if not exists
            let generalTitle = existingTitles.find(t => 
              t.sportCourseId === sportCourse.id && 
              t.title.toLowerCase() === 'général'
            );
            
            if (!generalTitle) {
              generalTitle = addCourseTitle({
                sportCourseId: sportCourse.id,
                title: 'Général'
              });
              existingTitles = [...existingTitles, generalTitle];
            }
            
            await addFileAsync({
              courseTitleId: generalTitle.id,
              title: child.name,
              description: '',
              type: child.file.type === 'unknown' ? 'pdf' : child.file.type,
              fileName: child.file.name,
              fileData: child.file.data
            });
            importedFiles++;
            
          } else if (child.type === 'heading') {
            // Find or create course title (heading)
            let courseTitle = existingTitles.find(t => 
              t.sportCourseId === sportCourse.id && 
              t.title.toLowerCase() === child.name.toLowerCase()
            );
            
            if (!courseTitle) {
              courseTitle = addCourseTitle({
                sportCourseId: sportCourse.id,
                title: child.name
              });
              existingTitles = [...existingTitles, courseTitle];
            }
            
            // Add files to heading
            for (const fileNode of child.children) {
              if (fileNode.type === 'file' && fileNode.file) {
                await addFileAsync({
                  courseTitleId: courseTitle.id,
                  title: fileNode.name,
                  description: '',
                  type: fileNode.file.type === 'unknown' ? 'pdf' : fileNode.file.type,
                  fileName: fileNode.file.name,
                  fileData: fileNode.file.data
                });
                importedFiles++;
              }
            }
          }
        }
        
        // Allow UI to breathe after each leçon
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
  
  return importedFiles;
};
