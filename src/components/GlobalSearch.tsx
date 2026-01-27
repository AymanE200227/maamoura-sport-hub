import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Folder, Layers, BookOpen, X, Filter, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getStages,
  getCourseTypes,
  getSportCourses,
  getCourseTitles,
  getFiles,
  getUserMode
} from '@/lib/storage';
import { canAccessCached, canAccessStageCached, buildEntityCaches } from '@/lib/permissionCache';
import { formatCourseTypeLabel } from '@/lib/courseTypeFormat';
import { UserRole } from '@/types';

interface SearchResult {
  id: string;
  type: 'stage' | 'type' | 'lecon' | 'heading' | 'file';
  title: string;
  path: string[];
  route: string;
  icon: React.ReactNode;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeIcons = {
  stage: <Layers className="w-4 h-4 text-primary" />,
  type: <BookOpen className="w-4 h-4 text-amber-500" />,
  lecon: <Folder className="w-4 h-4 text-blue-500" />,
  heading: <Folder className="w-4 h-4 text-emerald-500" />,
  file: <FileText className="w-4 h-4 text-purple-500" />
};

const typeLabels = {
  stage: 'Stage',
  type: 'Type',
  lecon: 'Leçon',
  heading: 'Titre',
  file: 'Fichier'
};

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'stage' | 'type' | 'lecon' | 'file'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const userMode = getUserMode();
  const userRole: UserRole = useMemo(() => {
    if (userMode === 'admin') return 'admin';
    if (userMode === 'user') return 'instructeur';
    return 'eleve';
  }, [userMode]);
  
  // Build search index on open
  const searchIndex = useMemo(() => {
    if (!open) return [];
    
    const stages = getStages();
    const types = getCourseTypes();
    const courses = getSportCourses();
    const titles = getCourseTitles();
    const files = getFiles();
    
    // Build entity caches for permission checks
    buildEntityCaches(stages, courses, titles, files);
    
    const results: SearchResult[] = [];
    
    // Index stages
    for (const stage of stages) {
      if (!stage.enabled) continue;
      if (!canAccessStageCached(userRole, stage.id, stage)) continue;
      
      results.push({
        id: stage.id,
        type: 'stage',
        title: stage.name,
        path: [],
        route: `/stage/${stage.id}`,
        icon: typeIcons.stage
      });
      
      // Index types within stage
      for (const type of types) {
        const coursesForType = courses.filter(
          c => c.stageId === stage.id && c.courseTypeId === type.id
        );
        if (coursesForType.length === 0) continue;
        
        results.push({
          id: `${stage.id}-${type.id}`,
          type: 'type',
          title: formatCourseTypeLabel(type.name),
          path: [stage.name],
          route: `/stage/${stage.id}/type/${type.id}`,
          icon: typeIcons.type
        });
        
        // Index leçons
        for (const course of coursesForType) {
          if (!canAccessCached(userRole, 'lecon', course.id)) continue;
          
          results.push({
            id: course.id,
            type: 'lecon',
            title: course.title,
            path: [stage.name, formatCourseTypeLabel(type.name)],
            route: `/stage/${stage.id}/type/${type.id}/lecon/${course.id}`,
            icon: typeIcons.lecon
          });
          
          // Index files within leçon
          const leconTitles = titles.filter(t => t.sportCourseId === course.id);
          for (const title of leconTitles) {
            if (!canAccessCached(userRole, 'heading', title.id)) continue;
            
            const titleFiles = files.filter(f => f.courseTitleId === title.id);
            for (const file of titleFiles) {
              if (!canAccessCached(userRole, 'file', file.id)) continue;
              
              results.push({
                id: file.id,
                type: 'file',
                title: file.title || file.fileName,
                path: [stage.name, formatCourseTypeLabel(type.name), course.title, title.title],
                route: `/stage/${stage.id}/type/${type.id}/lecon/${course.id}`,
                icon: typeIcons.file
              });
            }
          }
        }
      }
    }
    
    return results;
  }, [open, userRole]);
  
  // Filter results
  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];
    
    const q = query.toLowerCase();
    let results = searchIndex.filter(r => {
      const matchesQuery = r.title.toLowerCase().includes(q) ||
        r.path.some(p => p.toLowerCase().includes(q));
      
      if (filter === 'all') return matchesQuery;
      if (filter === 'file') return matchesQuery && r.type === 'file';
      if (filter === 'lecon') return matchesQuery && (r.type === 'lecon' || r.type === 'heading');
      return matchesQuery && r.type === filter;
    });
    
    // Sort: exact matches first, then by type priority
    const typePriority = { stage: 0, type: 1, lecon: 2, heading: 3, file: 4 };
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === q ? -1 : 0;
      const bExact = b.title.toLowerCase() === q ? -1 : 0;
      if (aExact !== bExact) return aExact - bExact;
      return typePriority[a.type] - typePriority[b.type];
    });
    
    return results.slice(0, 50); // Limit to 50 results
  }, [query, filter, searchIndex]);
  
  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults]);
  
  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setFilter('all');
    }
  }, [open]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
      navigate(filteredResults[selectedIndex].route);
      onOpenChange(false);
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  }, [filteredResults, selectedIndex, navigate, onOpenChange]);
  
  const handleSelect = (result: SearchResult) => {
    navigate(result.route);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher stages, cours, fichiers..."
            className="border-0 focus-visible:ring-0 px-0 text-base"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-muted rounded">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(['all', 'stage', 'type', 'lecon', 'file'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === f 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {f === 'all' ? 'Tout' : typeLabels[f]}
            </button>
          ))}
        </div>
        
        {/* Results */}
        <ScrollArea className="max-h-[400px]">
          {query && filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">Aucun résultat pour "{query}"</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredResults.map((result, idx) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    idx === selectedIndex ? 'bg-primary/10' : 'hover:bg-muted/50'
                  }`}
                >
                  <span className="shrink-0">{result.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.title}</p>
                    {result.path.length > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        {result.path.map((p, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && <ChevronRight className="w-3 h-3" />}
                            {p}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                    {typeLabels[result.type]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          <span>
            {filteredResults.length > 0 
              ? `${filteredResults.length} résultat(s)` 
              : 'Tapez pour rechercher'}
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
              naviguer
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd>
              sélectionner
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">esc</kbd>
              fermer
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
