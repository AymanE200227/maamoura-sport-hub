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

// Type name mappings
const typeNameMappings: Record<string, string> = {
  'p.specialite': 'SPECIALITE',
  'p.sportif': 'SPORTIF',
  'p.militaire': 'MILITAIRE',
  'sportif': 'SPORTIF',
  'militaire': 'MILITAIRE',
  'specialite': 'SPECIALITE',
};

// Normalize stage name
const normalizesStageName = (name: string): string => {
  const lower = name.toLowerCase().trim();
  return stageNameMappings[lower] || name.toUpperCase();
};

// Normalize type name
const normalizeTypeName = (name: string): string => {
  const lower = name.toLowerCase().trim().replace('p.', '');
  return typeNameMappings[lower] || name.replace(/^p\./i, '').toUpperCase();
};

// Parse folder structure from FileList
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

  for (const file of Array.from(files)) {
    // Skip hidden files and invalid files
    if (file.name.startsWith('.') || !isValidFile(file.name)) continue;
    
    // Get path parts (folder structure)
    // webkitRelativePath gives us paths like: "RootFolder/Stage/Type/Lecon/Heading/file.pdf"
    const pathParts = file.webkitRelativePath.split('/').filter(p => p);
    
    // Skip if not enough depth (need at least root + file)
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
    // Structure: Stage / Type / Lecon / Heading / Files
    
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

// Import tree to storage
export const importTreeToStorage = async (
  tree: ImportTreeNode[],
  getStages: () => any[],
  getCourseTypes: () => any[],
  addCourseType: (data: any) => any,
  getSportCourses: () => any[],
  addSportCourse: (data: any) => any,
  addCourseTitle: (data: any) => any,
  addFileAsync: (data: any) => Promise<any>
): Promise<number> => {
  let importedFiles = 0;
  
  const existingStages = getStages();
  const existingTypes = getCourseTypes();
  const existingCourses = getSportCourses();
  
  for (const stageNode of tree) {
    // Find matching stage
    const stage = existingStages.find(s => 
      s.name.toLowerCase() === stageNode.name.toLowerCase() ||
      s.id.toLowerCase() === stageNode.name.toLowerCase().replace(/\s+/g, '_')
    );
    
    if (!stage) {
      console.warn(`Stage not found: ${stageNode.name}`);
      continue;
    }
    
    for (const typeNode of stageNode.children) {
      // Find or create course type
      let courseType = existingTypes.find(t => 
        t.name.toLowerCase() === typeNode.name.toLowerCase()
      );
      
      if (!courseType) {
        courseType = addCourseType({ name: typeNode.name, description: '' });
      }
      
      for (const leconNode of typeNode.children) {
        // Find or create sport course (leçon)
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
        }
        
        for (const headingNode of leconNode.children) {
          if (headingNode.type === 'file' && headingNode.file) {
            // Direct file under lecon - create "General" heading
            const generalTitle = addCourseTitle({
              sportCourseId: sportCourse.id,
              title: 'Général'
            });
            
            await addFileAsync({
              courseTitleId: generalTitle.id,
              title: headingNode.name,
              description: '',
              type: headingNode.file.type === 'unknown' ? 'pdf' : headingNode.file.type,
              fileName: headingNode.file.name,
              fileData: headingNode.file.data
            });
            importedFiles++;
          } else if (headingNode.type === 'heading') {
            // Create course title (heading)
            const courseTitle = addCourseTitle({
              sportCourseId: sportCourse.id,
              title: headingNode.name
            });
            
            // Add files to heading
            for (const fileNode of headingNode.children) {
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
      }
    }
  }
  
  return importedFiles;
};
