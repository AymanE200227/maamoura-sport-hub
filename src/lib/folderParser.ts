import { ImportTreeNode, ImportFile } from '@/components/FolderImportTree';
import { normalizeCourseTypeBaseName, normalizeCourseTypeNameForStorage } from '@/lib/courseTypeFormat';

// Generate unique ID
const generateId = (): string => Math.random().toString(36).substring(2, 11);

// Get file type from extension - support ALL extensions
export const getFileTypeFromExtension = (fileName: string): 'ppt' | 'word' | 'pdf' | 'video' => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['pptx', 'ppt'].includes(ext)) return 'ppt';
  if (['docx', 'doc', 'rtf', 'odt', 'txt'].includes(ext)) return 'word';
  if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v', 'mpeg', 'mpg', '3gp'].includes(ext)) return 'video';
  // All other extensions (pdf, xlsx, xls, jpg, png, etc.) → pdf type for download
  return 'pdf';
};

// ALL files are valid for import now
export const isValidFile = (fileName: string): boolean => {
  // Skip hidden files and system files
  if (fileName.startsWith('.') || fileName.startsWith('~$')) return false;
  // Must have an extension
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ext.length > 0 && ext.length < 10;
};

// Check if this is a conclusion file (from name pattern)
const isConclusionFile = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return lower.includes('conclusion') || lower.startsWith('conclu');
};

// Stage name mappings - normalize stage names to match default stages
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

// Normalize stage name - but preserve custom stage names
const normalizeStageName = (name: string): string => {
  const lower = name.toLowerCase().trim();
  return stageNameMappings[lower] || name.toUpperCase();
};

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
};

// Parse folder structure from FileList
// Expected structure: RootFolder/Stage/Type/Leçon/Heading/file.pdf
// Example: CAT1/P.SPORTIF/BASKET/1.HISTORIQUE/test.ppt
// NO NORMALIZATION OF TYPE NAMES - preserve exactly as folder is named
export const parseFolderStructure = async (
  files: FileList,
  options?: {
    onProgress?: (info: { processed: number; total: number; currentPath?: string }) => void;
    progressEvery?: number;
  }
): Promise<{
  tree: ImportTreeNode[];
  stats: { stages: number; types: number; lecons: number; headings: number; files: number };
}> => {
  const tree: ImportTreeNode[] = [];
  const stageMap = new Map<string, ImportTreeNode>();
  const typeMap = new Map<string, ImportTreeNode>();
  const leconMap = new Map<string, ImportTreeNode>();
  const headingMap = new Map<string, ImportTreeNode>();
  
  // Track order of insertion for stages
  const stageOrder: string[] = [];
  const typeOrder = new Map<string, string[]>();
  const leconOrder = new Map<string, string[]>();
  const headingOrder = new Map<string, string[]>();
  
  let fileCount = 0;
  
  // Convert to array and sort by path to maintain folder order
  const filesArray = Array.from(files)
    .filter(f => !f.name.startsWith('.') && isValidFile(f.name))
    .sort((a, b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath));

  const total = filesArray.length;
  let processed = 0;
  const progressEvery = options?.progressEvery ?? 10;
  
  // Larger batches + yielding keeps the UI responsive, while avoiding too-frequent yields.
  const batchSize = 40;
  
  for (let i = 0; i < filesArray.length; i += batchSize) {
    const batch = filesArray.slice(i, i + batchSize);
    
    // Allow UI to breathe
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    for (const file of batch) {
      processed++;
      if (options?.onProgress && (processed % progressEvery === 0 || processed === total)) {
        options.onProgress({ processed, total, currentPath: file.webkitRelativePath });
      }
      // Get path parts (folder structure)
      const pathParts = file.webkitRelativePath.split('/').filter(p => p);
      
      // Skip if not enough depth
      if (pathParts.length < 2) continue;

      // Remove root folder name and file name
      const fileName = pathParts.pop()!;
      const folders = pathParts.slice(1); // Remove root folder

      const importFile: ImportFile = {
        id: generateId(),
        name: fileName,
        path: file.webkitRelativePath,
        type: getFileTypeFromExtension(fileName),
        // Defer bytes reading until the actual import step to avoid freezes during parsing.
        data: '',
        blob: file,
        size: file.size
      };

      // Build tree structure based on folder depth
      // Structure: Stage / Type (PRESERVE ORIGINAL NAME) / Leçon (BASKET) / Heading / Files
      
      if (folders.length >= 1) {
        const stageName = normalizeStageName(folders[0]);
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
          stageOrder.push(stageKey);
          typeOrder.set(stageKey, []);
        }
        
        let parentNode = stageMap.get(stageKey)!;
        
        if (folders.length >= 2) {
          // PRESERVE ORIGINAL TYPE NAME - no normalization!
          const typeName = folders[1].toUpperCase();
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
            typeOrder.get(stageKey)!.push(typeKey);
            leconOrder.set(typeKey, []);
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
              leconOrder.get(typeKey)!.push(leconKey);
              headingOrder.set(leconKey, []);
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
                headingOrder.get(leconKey)!.push(headingKey);
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

  // Build tree in correct order
  for (const stageKey of stageOrder) {
    const stageNode = stageMap.get(stageKey)!;
    // Clear children and rebuild in order
    const stageTypes = typeOrder.get(stageKey) || [];
    stageNode.children = [];
    
    for (const typeKey of stageTypes) {
      const typeNode = typeMap.get(typeKey)!;
      const typeLecons = leconOrder.get(typeKey) || [];
      
      // Separate files and lecons
      const directFiles = typeNode.children.filter(c => c.type === 'file');
      typeNode.children = [];
      
      for (const leconKey of typeLecons) {
        const leconNode = leconMap.get(leconKey)!;
        const leconHeadings = headingOrder.get(leconKey) || [];
        
        // Separate files and headings
        const leconFiles = leconNode.children.filter(c => c.type === 'file');
        leconNode.children = [];
        
        for (const headingKey of leconHeadings) {
          const headingNode = headingMap.get(headingKey)!;
          leconNode.children.push(headingNode);
        }
        
        // Add direct files after headings
        leconNode.children.push(...leconFiles);
        typeNode.children.push(leconNode);
      }
      
      // Add direct files after lecons
      typeNode.children.push(...directFiles);
      stageNode.children.push(typeNode);
    }
    
    tree.push(stageNode);
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

export interface ImportReport {
  durationMs: number;
  stages: { created: number; matched: number };
  types: { created: number; matched: number };
  lecons: { created: number; matched: number };
  headings: { created: number; matched: number };
  files: { created: number; replaced: number; imported: number; errors: number };
  warnings: string[];
}

// Safe file read with timeout to prevent hanging
const safeReadFileAsDataURL = async (file: File, timeoutMs = 30000): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout reading file: ${file.name}`));
    }, timeoutMs);
    
    const reader = new FileReader();
    reader.onerror = () => {
      clearTimeout(timeout);
      reject(reader.error || new Error('FileReader error'));
    };
    reader.onload = () => {
      clearTimeout(timeout);
      resolve(reader.result as string);
    };
    reader.readAsDataURL(file);
  });
};

// Import tree to storage - preserves original type names
// Also handles conclusion files directly (no separate heading needed)
export const importTreeToStorage = async (
  tree: ImportTreeNode[],
  getStages: () => any[],
  getCourseTypes: () => any[],
  addCourseType: (data: any) => any,
  getSportCourses: () => any[],
  addSportCourse: (data: any) => any,
  getCourseTitles: () => any[],
  addCourseTitle: (data: any) => any,
  addFileAsync: (data: any) => Promise<any>,
  options?: {
    totalFiles?: number;
    onProgress?: (info: { processed: number; total: number; currentPath?: string }) => void;
    yieldEvery?: number;
    saveStages?: (stages: any[]) => void;
    getFilesByCourseTitle?: (courseTitleId: string) => any[];
    updateFileAsync?: (id: string, updates: any) => Promise<void>;
  }
): Promise<ImportReport> => {
  const startedAt = performance.now();

  const report: ImportReport = {
    durationMs: 0,
    stages: { created: 0, matched: 0 },
    types: { created: 0, matched: 0 },
    lecons: { created: 0, matched: 0 },
    headings: { created: 0, matched: 0 },
    files: { created: 0, replaced: 0, imported: 0, errors: 0 },
    warnings: [],
  };

  let importedFiles = 0;
  const totalFiles = options?.totalFiles ?? 0;
  const yieldEvery = options?.yieldEvery ?? 8;
  
  // Get fresh data from storage
  let existingStages = getStages();
  let existingTypes = getCourseTypes();
  let existingCourses = getSportCourses();
  let existingTitles = getCourseTitles();
  
  // Process in order (tree already sorted)
  for (const stageNode of tree) {
    // Find matching stage
    const stageId = getStageId(stageNode.name);
    let stage = existingStages.find(s => 
      s.id === stageId ||
      s.name.toLowerCase() === stageNode.name.toLowerCase()
    );
    
    if (!stage) {
      // After "Supprimer tout", there are no stages left. Create them.
      if (!options?.saveStages) {
        report.warnings.push(`Impossible de créer le stage "${stageNode.name}" - saveStages manquant`);
        continue;
      }

      stage = {
        id: stageId,
        name: stageNode.name,
        description: stageNode.name,
        enabled: true,
        order: existingStages.length,
      };
      existingStages = [...existingStages, stage];
      options.saveStages(existingStages);
      report.stages.created++;
    } else {
      report.stages.matched++;
    }
    
    for (const typeNode of stageNode.children) {
      if (typeNode.type !== 'courseType') continue;
      
      // Normalize for matching to avoid duplicates like Sportif vs P.SPORTIF or P.P.SPORTIF
      const incomingTypeBase = normalizeCourseTypeBaseName(typeNode.name);

      // Find existing course type by base name
      let courseType = existingTypes.find(t =>
        normalizeCourseTypeBaseName(t.name) === incomingTypeBase
      );
      
      // Only create if doesn't exist
      if (!courseType) {
        const normalizedName = normalizeCourseTypeNameForStorage(typeNode.name);
        courseType = addCourseType({ 
          name: normalizedName,
          description: `Cours ${normalizedName}` 
        });
        existingTypes = [...existingTypes, courseType];
        report.types.created++;
      } else {
        report.types.matched++;
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
          report.lecons.created++;
        } else {
          report.lecons.matched++;
        }
        
        // Process children in order
        for (const child of leconNode.children) {
          if (child.type === 'file' && child.file) {
            let fileData = '';
            try {
              if (child.file.data) {
                fileData = child.file.data;
              } else if (child.file.blob) {
                fileData = await safeReadFileAsDataURL(child.file.blob);
              }
            } catch (e) {
              report.files.errors++;
              report.warnings.push(`Erreur lecture: ${child.file.path}`);
              importedFiles++;
              report.files.imported = importedFiles;
              options?.onProgress?.({ processed: importedFiles, total: totalFiles, currentPath: child.file.path });
              continue;
            }
            
            // Check if it's a conclusion file - import directly with its name
            const isConclusion = isConclusionFile(child.file.name);
            
            if (isConclusion) {
              // Find or create a "Conclusion" course title
              let conclusionTitle = existingTitles.find(t => 
                t.sportCourseId === sportCourse.id && 
                t.title.toLowerCase() === 'conclusion'
              );
              
              if (!conclusionTitle) {
                conclusionTitle = addCourseTitle({
                  sportCourseId: sportCourse.id,
                  title: 'Conclusion'
                });
                existingTitles = [...existingTitles, conclusionTitle];
                report.headings.created++;
              } else {
                report.headings.matched++;
              }

              // Upsert file by filename within the same heading
              try {
                const existingFiles = options?.getFilesByCourseTitle?.(conclusionTitle.id) ?? [];
                const match = existingFiles.find((f: any) => (f.fileName || '').toLowerCase() === child.file!.name.toLowerCase());
                if (match && options?.updateFileAsync) {
                  await options.updateFileAsync(match.id, {
                    title: child.name,
                    description: '',
                    type: child.file.type,
                    fileName: child.file.name,
                    fileData,
                  });
                  report.files.replaced++;
                } else {
                  await addFileAsync({
                    courseTitleId: conclusionTitle.id,
                    title: child.name,
                    description: '',
                    type: child.file.type,
                    fileName: child.file.name,
                    fileData
                  });
                  report.files.created++;
                }
              } catch (e) {
                report.files.errors++;
                report.warnings.push(`Erreur enregistrement: ${child.file.path}`);
              }
              importedFiles++;
              report.files.imported = importedFiles;
              options?.onProgress?.({ processed: importedFiles, total: totalFiles, currentPath: child.file.path });
            } else {
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
                report.headings.created++;
              } else {
                report.headings.matched++;
              }

              try {
                const existingFiles = options?.getFilesByCourseTitle?.(generalTitle.id) ?? [];
                const match = existingFiles.find((f: any) => (f.fileName || '').toLowerCase() === child.file!.name.toLowerCase());
                if (match && options?.updateFileAsync) {
                  await options.updateFileAsync(match.id, {
                    title: child.name,
                    description: '',
                    type: child.file.type,
                    fileName: child.file.name,
                    fileData,
                  });
                  report.files.replaced++;
                } else {
                  await addFileAsync({
                    courseTitleId: generalTitle.id,
                    title: child.name,
                    description: '',
                    type: child.file.type,
                    fileName: child.file.name,
                    fileData
                  });
                  report.files.created++;
                }
              } catch (e) {
                report.files.errors++;
                report.warnings.push(`Erreur enregistrement: ${child.file.path}`);
              }
              importedFiles++;
              report.files.imported = importedFiles;
              options?.onProgress?.({ processed: importedFiles, total: totalFiles, currentPath: child.file.path });
            }

            if (importedFiles % yieldEvery === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
            
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
              report.headings.created++;
            } else {
              report.headings.matched++;
            }
            
            // Add files to heading in order
            for (const fileNode of child.children) {
              if (fileNode.type === 'file' && fileNode.file) {
                let fileData = '';
                try {
                  if (fileNode.file.data) {
                    fileData = fileNode.file.data;
                  } else if (fileNode.file.blob) {
                    fileData = await safeReadFileAsDataURL(fileNode.file.blob);
                  }
                } catch (e) {
                  report.files.errors++;
                  report.warnings.push(`Erreur lecture: ${fileNode.file.path}`);
                  importedFiles++;
                  report.files.imported = importedFiles;
                  options?.onProgress?.({ processed: importedFiles, total: totalFiles, currentPath: fileNode.file.path });
                  continue;
                }

                try {
                  const existingFiles = options?.getFilesByCourseTitle?.(courseTitle.id) ?? [];
                  const match = existingFiles.find((f: any) => (f.fileName || '').toLowerCase() === fileNode.file!.name.toLowerCase());
                  if (match && options?.updateFileAsync) {
                    await options.updateFileAsync(match.id, {
                      title: fileNode.name,
                      description: '',
                      type: fileNode.file.type,
                      fileName: fileNode.file.name,
                      fileData,
                    });
                    report.files.replaced++;
                  } else {
                    await addFileAsync({
                      courseTitleId: courseTitle.id,
                      title: fileNode.name,
                      description: '',
                      type: fileNode.file.type,
                      fileName: fileNode.file.name,
                      fileData
                    });
                    report.files.created++;
                  }
                } catch (e) {
                  report.files.errors++;
                  report.warnings.push(`Erreur enregistrement: ${fileNode.file.path}`);
                }
                importedFiles++;
                report.files.imported = importedFiles;
                options?.onProgress?.({ processed: importedFiles, total: totalFiles, currentPath: fileNode.file.path });

                if (importedFiles % yieldEvery === 0) {
                  await new Promise(resolve => setTimeout(resolve, 0));
                }
              }
            }
          }
        }
        
        // Allow UI to breathe after each leçon
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  report.durationMs = Math.round(performance.now() - startedAt);
  return report;
};
