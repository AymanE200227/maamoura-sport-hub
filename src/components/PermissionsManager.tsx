import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Shield, ChevronRight, ChevronDown, Folder, FolderOpen, FileText, 
  Users, Eye, EyeOff, Check, X, Search, Save, RotateCcw,
  Layers, BookOpen, FileType, Lock, Unlock, UserCheck, GraduationCap,
  Copy, Trash2, ChevronUp, AlertTriangle, Zap, Settings2
} from 'lucide-react';
import {
  getPermissions,
  setPermission,
  removePermission,
  getEffectivePermission,
  clearAllPermissions,
  applyPermissionToChildren,
  clearChildrenPermissions,
  setPermissionsBulk,
  getPermissionStats
} from '@/lib/permissions';
import {
  getStages,
  getCourseTypes,
  getSportCourses,
  getCourseTitles,
  getFiles
} from '@/lib/storage';
import { Permission, PermissionTarget, PermissionRole, Stage, SportCourse, CourseTitle, CourseFile } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface PermissionNode {
  id: string;
  name: string;
  type: PermissionTarget;
  children: PermissionNode[];
  permission?: Permission | null;
  inheritedPermission?: Permission | null;
  expanded?: boolean;
  selected?: boolean;
}

const roleLabels: Record<PermissionRole, string> = {
  all: 'Tous',
  eleves: 'Élèves',
  instructeurs: 'Instructeurs',
  none: 'Aucun'
};

const roleColors: Record<PermissionRole, string> = {
  all: 'bg-success/20 text-success border-success/40',
  eleves: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  instructeurs: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  none: 'bg-destructive/20 text-destructive border-destructive/40'
};

const typeIcons: Record<PermissionTarget, React.ReactNode> = {
  stage: <Layers className="w-4 h-4" />,
  courseType: <BookOpen className="w-4 h-4" />,
  lecon: <FileType className="w-4 h-4" />,
  heading: <Folder className="w-4 h-4" />,
  file: <FileText className="w-4 h-4" />
};

const typeLabels: Record<PermissionTarget, string> = {
  stage: 'Stage',
  courseType: 'Type',
  lecon: 'Leçon',
  heading: 'Titre',
  file: 'Fichier'
};

interface PermissionNodeComponentProps {
  node: PermissionNode;
  depth: number;
  onToggleExpand: (id: string) => void;
  onSetPermission: (targetType: PermissionTarget, targetId: string, role: PermissionRole, enabled: boolean) => void;
  onRemovePermission: (targetType: PermissionTarget, targetId: string) => void;
  onToggleSelect: (id: string) => void;
  onApplyToChildren: (targetType: PermissionTarget, targetId: string, role: PermissionRole, enabled: boolean) => void;
  searchTerm: string;
  bulkMode: boolean;
}

const PermissionNodeComponent = ({ 
  node, 
  depth, 
  onToggleExpand, 
  onSetPermission,
  onRemovePermission,
  onToggleSelect,
  onApplyToChildren,
  searchTerm,
  bulkMode
}: PermissionNodeComponentProps) => {
  const [showCascade, setShowCascade] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const permission = node.permission;
  const inherited = node.inheritedPermission;
  
  const currentRole = permission?.role || inherited?.role || 'all';
  const isEnabled = permission?.enabled !== false && inherited?.enabled !== false;
  const isInherited = !permission && !!inherited;
  
  // Filter children by search
  const filteredChildren = useMemo(() => {
    if (!searchTerm) return node.children;
    return node.children.filter(child => 
      child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      child.children.some(grandChild => 
        grandChild.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [node.children, searchTerm]);
  
  const matchesSearch = !searchTerm || node.name.toLowerCase().includes(searchTerm.toLowerCase());
  
  if (!matchesSearch && filteredChildren.length === 0) return null;
  
  return (
    <div className="transition-all duration-200">
      <div 
        className={`flex items-center gap-2 py-2.5 px-3 rounded-xl hover:bg-muted/50 group transition-all duration-200 ${
          !isEnabled ? 'opacity-60' : ''
        } ${node.selected ? 'bg-primary/10 ring-1 ring-primary/30' : ''} ${
          isInherited ? 'border-l-2 border-primary/30' : ''
        }`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {/* Bulk Select Checkbox */}
        {bulkMode && (
          <button
            onClick={() => onToggleSelect(node.id)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              node.selected 
                ? 'bg-primary border-primary text-primary-foreground' 
                : 'border-muted-foreground/50 hover:border-primary'
            }`}
          >
            {node.selected && <Check className="w-3 h-3" />}
          </button>
        )}
        
        {/* Expand/Collapse */}
        {hasChildren && (
          <button 
            onClick={() => onToggleExpand(node.id)} 
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            {node.expanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}
        
        {/* Icon */}
        <span className={`transition-colors duration-200 ${
          permission ? 'text-primary' : isInherited ? 'text-primary/60' : 'text-muted-foreground'
        }`}>
          {node.expanded && hasChildren ? <FolderOpen className="w-4 h-4" /> : typeIcons[node.type]}
        </span>
        
        {/* Name */}
        <span className="flex-1 text-sm font-medium truncate">{node.name}</span>
        
        {/* Type Badge */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hidden sm:block">
          {typeLabels[node.type]}
        </span>
        
        {/* Inherited Indicator */}
        {isInherited && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1">
            <ChevronUp className="w-3 h-3" /> Hérité
          </span>
        )}
        
        {/* Enable/Disable Toggle */}
        <button
          onClick={() => onSetPermission(node.type, node.id, currentRole, !isEnabled)}
          className={`p-1.5 rounded-lg transition-all duration-200 ${
            isEnabled 
              ? 'text-success hover:bg-success/20 hover:scale-110' 
              : 'text-destructive hover:bg-destructive/20 hover:scale-110'
          }`}
          title={isEnabled ? 'Désactiver' : 'Activer'}
        >
          {isEnabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        </button>
        
        {/* Role Selector */}
        <div className="flex items-center gap-0.5">
          {(['all', 'eleves', 'instructeurs', 'none'] as PermissionRole[]).map(role => (
            <button
              key={role}
              onClick={() => onSetPermission(node.type, node.id, role, isEnabled)}
              className={`px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
                currentRole === role 
                  ? `${roleColors[role]} scale-105 shadow-sm` 
                  : 'border-transparent hover:border-border text-muted-foreground hover:text-foreground hover:scale-105'
              }`}
              title={roleLabels[role]}
            >
              {role === 'all' && <Users className="w-3 h-3" />}
              {role === 'eleves' && <GraduationCap className="w-3 h-3" />}
              {role === 'instructeurs' && <UserCheck className="w-3 h-3" />}
              {role === 'none' && <EyeOff className="w-3 h-3" />}
            </button>
          ))}
        </div>
        
        {/* Cascade Menu */}
        {hasChildren && (
          <div className="relative">
            <button
              onClick={() => setShowCascade(!showCascade)}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              title="Appliquer aux enfants"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            {showCascade && (
              <div className="absolute right-0 top-8 z-50 bg-card border border-border rounded-xl shadow-xl p-3 min-w-[200px] animate-scale-in">
                <p className="text-xs text-muted-foreground mb-2">Appliquer à tous les enfants:</p>
                <div className="space-y-1">
                  {(['all', 'eleves', 'instructeurs', 'none'] as PermissionRole[]).map(role => (
                    <button
                      key={role}
                      onClick={() => {
                        onApplyToChildren(node.type, node.id, role, true);
                        setShowCascade(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${roleColors[role]}`}
                    >
                      {role === 'all' && <Users className="w-4 h-4" />}
                      {role === 'eleves' && <GraduationCap className="w-4 h-4" />}
                      {role === 'instructeurs' && <UserCheck className="w-4 h-4" />}
                      {role === 'none' && <EyeOff className="w-4 h-4" />}
                      {roleLabels[role]}
                    </button>
                  ))}
                  <hr className="my-2 border-border/50" />
                  <button
                    onClick={() => {
                      onApplyToChildren(node.type, node.id, 'all', false);
                      setShowCascade(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-destructive hover:bg-destructive/10"
                  >
                    <Lock className="w-4 h-4" /> Désactiver tous
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Reset */}
        {permission && (
          <button
            onClick={() => onRemovePermission(node.type, node.id)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            title="Réinitialiser (hériter du parent)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {/* Children */}
      {hasChildren && node.expanded && (
        <div className="animate-fade-in">
          {filteredChildren.map(child => (
            <PermissionNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              onToggleExpand={onToggleExpand}
              onSetPermission={onSetPermission}
              onRemovePermission={onRemovePermission}
              onToggleSelect={onToggleSelect}
              onApplyToChildren={onApplyToChildren}
              searchTerm={searchTerm}
              bulkMode={bulkMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PermissionsManager = () => {
  const { toast } = useToast();
  const [tree, setTree] = useState<PermissionNode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState(getPermissionStats());
  const treeRef = useRef<PermissionNode[]>([]);
  
  // Build permission tree from data
  const buildTree = useCallback(() => {
    const stages = getStages();
    const courseTypes = getCourseTypes();
    const sportCourses = getSportCourses();
    const courseTitles = getCourseTitles();
    const files = getFiles();
    const permissions = getPermissions();
    
    const getPermForNode = (type: PermissionTarget, id: string) => 
      permissions.find(p => p.targetType === type && p.targetId === id) || null;
    
    const getInheritedPerm = (type: PermissionTarget, id: string) => {
      const effective = getEffectivePermission(type, id);
      const direct = getPermForNode(type, id);
      return direct ? null : effective;
    };
    
    // Preserve expanded state from previous tree
    const getExpandedState = (id: string): boolean => {
      const findNode = (nodes: PermissionNode[]): PermissionNode | undefined => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.children) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return undefined;
      };
      return findNode(treeRef.current)?.expanded ?? (id.length < 20); // Stages expanded by default
    };
    
    const treeData: PermissionNode[] = stages
      .filter(s => s.enabled)
      .sort((a, b) => a.order - b.order)
      .map(stage => ({
        id: stage.id,
        name: stage.name,
        type: 'stage' as PermissionTarget,
        permission: getPermForNode('stage', stage.id),
        inheritedPermission: null,
        expanded: getExpandedState(stage.id),
        selected: selectedNodes.has(stage.id),
        children: courseTypes.map(type => {
          const coursesForType = sportCourses.filter(
            c => c.stageId === stage.id && c.courseTypeId === type.id
          );
          
          if (coursesForType.length === 0) return null;
          
          const typeNodeId = `${stage.id}-${type.id}`;
          
          return {
            id: typeNodeId,
            name: type.name,
            type: 'courseType' as PermissionTarget,
            permission: getPermForNode('courseType', typeNodeId),
            inheritedPermission: getInheritedPerm('courseType', typeNodeId),
            expanded: getExpandedState(typeNodeId),
            selected: selectedNodes.has(typeNodeId),
            children: coursesForType.map(course => {
              const titlesForCourse = courseTitles.filter(t => t.sportCourseId === course.id);
              
              return {
                id: course.id,
                name: course.title,
                type: 'lecon' as PermissionTarget,
                permission: getPermForNode('lecon', course.id),
                inheritedPermission: getInheritedPerm('lecon', course.id),
                expanded: getExpandedState(course.id),
                selected: selectedNodes.has(course.id),
                children: titlesForCourse.map(title => {
                  const filesForTitle = files.filter(f => f.courseTitleId === title.id);
                  
                  return {
                    id: title.id,
                    name: title.title,
                    type: 'heading' as PermissionTarget,
                    permission: getPermForNode('heading', title.id),
                    inheritedPermission: getInheritedPerm('heading', title.id),
                    expanded: getExpandedState(title.id),
                    selected: selectedNodes.has(title.id),
                    children: filesForTitle.map(file => ({
                      id: file.id,
                      name: file.title,
                      type: 'file' as PermissionTarget,
                      permission: getPermForNode('file', file.id),
                      inheritedPermission: getInheritedPerm('file', file.id),
                      expanded: false,
                      selected: selectedNodes.has(file.id),
                      children: []
                    }))
                  };
                })
              };
            })
          };
        }).filter(Boolean) as PermissionNode[]
      }));
    
    treeRef.current = treeData;
    setTree(treeData);
    setStats(getPermissionStats());
  }, [selectedNodes]);
  
  useEffect(() => {
    buildTree();
  }, [buildTree]);
  
  const handleToggleExpand = useCallback((id: string) => {
    const toggleNode = (nodes: PermissionNode[]): PermissionNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children?.length) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    setTree(prev => {
      const updated = toggleNode(prev);
      treeRef.current = updated;
      return updated;
    });
  }, []);
  
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  const handleSetPermission = useCallback((
    targetType: PermissionTarget, 
    targetId: string, 
    role: PermissionRole, 
    enabled: boolean
  ) => {
    setPermission(targetType, targetId, role, enabled);
    buildTree();
    toast({ 
      title: 'Permission mise à jour',
      description: `${roleLabels[role]} - ${enabled ? 'Activé' : 'Désactivé'}`
    });
  }, [buildTree, toast]);
  
  const handleRemovePermission = useCallback((targetType: PermissionTarget, targetId: string) => {
    removePermission(targetType, targetId);
    buildTree();
    toast({ title: 'Permission réinitialisée', description: 'Hérite du parent' });
  }, [buildTree, toast]);
  
  const handleApplyToChildren = useCallback((
    targetType: PermissionTarget,
    targetId: string,
    role: PermissionRole,
    enabled: boolean
  ) => {
    // First set the parent permission
    setPermission(targetType, targetId, role, enabled);
    // Then cascade to children
    const count = applyPermissionToChildren(targetType, targetId, role, enabled);
    buildTree();
    toast({ 
      title: 'Permissions appliquées', 
      description: `${count} éléments mis à jour`
    });
  }, [buildTree, toast]);
  
  const handleBulkApply = useCallback((role: PermissionRole, enabled: boolean) => {
    if (selectedNodes.size === 0) {
      toast({ title: 'Aucun élément sélectionné', variant: 'destructive' });
      return;
    }
    
    const findNodeInfo = (nodes: PermissionNode[], id: string): { type: PermissionTarget; id: string } | null => {
      for (const node of nodes) {
        if (node.id === id) return { type: node.type, id: node.id };
        if (node.children) {
          const found = findNodeInfo(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const permissions: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    selectedNodes.forEach(id => {
      const info = findNodeInfo(tree, id);
      if (info) {
        permissions.push({ targetType: info.type, targetId: info.id, role, enabled });
      }
    });
    
    setPermissionsBulk(permissions);
    setSelectedNodes(new Set());
    setBulkMode(false);
    buildTree();
    toast({ title: 'Permissions appliquées', description: `${permissions.length} éléments mis à jour` });
  }, [selectedNodes, tree, buildTree, toast]);
  
  const handleResetAll = () => {
    if (confirm('Réinitialiser toutes les permissions ? Cette action est irréversible.')) {
      clearAllPermissions();
      buildTree();
      toast({ title: 'Toutes les permissions réinitialisées' });
    }
  };
  
  const handleSelectAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: PermissionNode[]) => {
      nodes.forEach(node => {
        allIds.add(node.id);
        if (node.children) collectIds(node.children);
      });
    };
    collectIds(tree);
    setSelectedNodes(allIds);
  };
  
  const handleDeselectAll = () => {
    setSelectedNodes(new Set());
  };
  
  const expandAll = () => {
    const expand = (nodes: PermissionNode[]): PermissionNode[] => {
      return nodes.map(node => ({
        ...node,
        expanded: true,
        children: node.children?.length ? expand(node.children) : node.children
      }));
    };
    setTree(prev => {
      const updated = expand(prev);
      treeRef.current = updated;
      return updated;
    });
  };
  
  const collapseAll = () => {
    const collapse = (nodes: PermissionNode[]): PermissionNode[] => {
      return nodes.map(node => ({
        ...node,
        expanded: false,
        children: node.children?.length ? collapse(node.children) : node.children
      }));
    };
    setTree(prev => {
      const updated = collapse(prev);
      treeRef.current = updated;
      return updated;
    });
  };
  
  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/20 to-amber-500/20 border-b border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Gestion des Permissions
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`text-xs py-1.5 px-3 rounded-lg border flex items-center gap-1 transition-all ${
                bulkMode 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'btn-ghost border-border'
              }`}
            >
              <Settings2 className="w-3 h-3" /> Mode groupé
            </button>
            <button
              onClick={handleResetAll}
              className="btn-ghost text-xs py-1.5 px-3 border border-border flex items-center gap-1 hover:border-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" /> Réinitialiser
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <div className="bg-card/50 rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-primary">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total règles</p>
          </div>
          <div className={`rounded-lg p-2 text-center ${roleColors.all}`}>
            <p className="text-xl font-bold">{stats.byRole.all}</p>
            <p className="text-[10px]">Tous</p>
          </div>
          <div className={`rounded-lg p-2 text-center ${roleColors.eleves}`}>
            <p className="text-xl font-bold">{stats.byRole.eleves}</p>
            <p className="text-[10px]">Élèves</p>
          </div>
          <div className={`rounded-lg p-2 text-center ${roleColors.instructeurs}`}>
            <p className="text-xl font-bold">{stats.byRole.instructeurs}</p>
            <p className="text-[10px]">Instructeurs</p>
          </div>
          <div className={`rounded-lg p-2 text-center ${roleColors.none}`}>
            <p className="text-xl font-bold">{stats.byRole.none + stats.disabled}</p>
            <p className="text-[10px]">Bloqués</p>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Accès:</span>
          <span className={`px-2 py-1 rounded-lg border ${roleColors.all}`}>
            <Users className="w-3 h-3 inline mr-1" /> Tous
          </span>
          <span className={`px-2 py-1 rounded-lg border ${roleColors.eleves}`}>
            <GraduationCap className="w-3 h-3 inline mr-1" /> Élèves
          </span>
          <span className={`px-2 py-1 rounded-lg border ${roleColors.instructeurs}`}>
            <UserCheck className="w-3 h-3 inline mr-1" /> Instructeurs
          </span>
          <span className={`px-2 py-1 rounded-lg border ${roleColors.none}`}>
            <EyeOff className="w-3 h-3 inline mr-1" /> Aucun
          </span>
        </div>
      </div>
      
      {/* Bulk Actions Bar */}
      {bulkMode && (
        <div className="p-3 bg-primary/10 border-b border-primary/20 flex flex-wrap items-center gap-2 animate-fade-in">
          <span className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            {selectedNodes.size} sélectionné(s)
          </span>
          <button onClick={handleSelectAll} className="text-xs px-2 py-1 hover:bg-muted rounded-lg">
            Tout sélectionner
          </button>
          <button onClick={handleDeselectAll} className="text-xs px-2 py-1 hover:bg-muted rounded-lg">
            Désélectionner
          </button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">Appliquer:</span>
          {(['all', 'eleves', 'instructeurs', 'none'] as PermissionRole[]).map(role => (
            <button
              key={role}
              onClick={() => handleBulkApply(role, true)}
              disabled={selectedNodes.size === 0}
              className={`px-2 py-1 text-xs rounded-lg border transition-all disabled:opacity-50 ${roleColors[role]}`}
            >
              {roleLabels[role]}
            </button>
          ))}
          <button
            onClick={() => handleBulkApply('all', false)}
            disabled={selectedNodes.size === 0}
            className="px-2 py-1 text-xs rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Lock className="w-3 h-3" />
          </button>
        </div>
      )}
      
      {/* Search & Filter Bar */}
      <div className="p-3 border-b border-border/30 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-2 glass-input rounded-lg"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={expandAll} className="text-xs px-3 py-2 hover:bg-muted rounded-lg transition-colors">
            Tout ouvrir
          </button>
          <button onClick={collapseAll} className="text-xs px-3 py-2 hover:bg-muted rounded-lg transition-colors">
            Tout fermer
          </button>
        </div>
      </div>
      
      {/* Tree View */}
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {tree.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun contenu à gérer</p>
            <p className="text-sm">Ajoutez des cours dans Gestion Cours</p>
          </div>
        ) : (
          tree.map(node => (
            <PermissionNodeComponent
              key={node.id}
              node={node}
              depth={0}
              onToggleExpand={handleToggleExpand}
              onSetPermission={handleSetPermission}
              onRemovePermission={handleRemovePermission}
              onToggleSelect={handleToggleSelect}
              onApplyToChildren={handleApplyToChildren}
              searchTerm={searchTerm}
              bulkMode={bulkMode}
            />
          ))
        )}
      </div>
      
      {/* Help Text */}
      <div className="p-4 bg-muted/30 border-t border-border/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Héritage:</strong> Les permissions se propagent automatiquement aux enfants sauf si explicitement définies.</p>
            <p><strong>Mode groupé:</strong> Sélectionnez plusieurs éléments pour appliquer des permissions en masse.</p>
            <p><strong>Cascade:</strong> Cliquez sur l'icône copie pour appliquer une permission à tous les enfants.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionsManager;
