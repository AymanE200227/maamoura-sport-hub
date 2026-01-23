import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Shield, ChevronRight, ChevronDown, Folder, FolderOpen, FileText, 
  Users, Eye, EyeOff, Check, X, Search, Filter, Save, RotateCcw,
  Layers, BookOpen, FileType, Lock, Unlock, UserCheck, GraduationCap
} from 'lucide-react';
import {
  getPermissions,
  setPermission,
  removePermission,
  getPermission,
  clearAllPermissions
} from '@/lib/permissions';
import {
  getStages,
  getCourseTypes,
  getSportCourses,
  getCourseTitles,
  getFiles
} from '@/lib/storage';
import { Permission, PermissionTarget, PermissionRole, Stage, CourseType, SportCourse, CourseTitle, CourseFile } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface PermissionNode {
  id: string;
  name: string;
  type: PermissionTarget;
  children: PermissionNode[];
  permission?: Permission | null;
  expanded?: boolean;
}

const roleLabels: Record<PermissionRole, string> = {
  all: 'Tous',
  eleves: 'Élèves',
  instructeurs: 'Instructeurs',
  none: 'Aucun'
};

const roleColors: Record<PermissionRole, string> = {
  all: 'bg-success/20 text-success border-success/30',
  eleves: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  instructeurs: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  none: 'bg-destructive/20 text-destructive border-destructive/30'
};

const typeIcons: Record<PermissionTarget, React.ReactNode> = {
  stage: <Layers className="w-4 h-4" />,
  courseType: <BookOpen className="w-4 h-4" />,
  lecon: <FileType className="w-4 h-4" />,
  heading: <Folder className="w-4 h-4" />,
  file: <FileText className="w-4 h-4" />
};

interface PermissionNodeComponentProps {
  node: PermissionNode;
  depth: number;
  onToggleExpand: (id: string) => void;
  onSetPermission: (targetType: PermissionTarget, targetId: string, role: PermissionRole, enabled: boolean) => void;
  onRemovePermission: (targetType: PermissionTarget, targetId: string) => void;
  searchTerm: string;
}

const PermissionNodeComponent = ({ 
  node, 
  depth, 
  onToggleExpand, 
  onSetPermission,
  onRemovePermission,
  searchTerm
}: PermissionNodeComponentProps) => {
  const hasChildren = node.children && node.children.length > 0;
  const isFile = node.type === 'file';
  const permission = node.permission;
  
  const currentRole = permission?.role || 'all';
  const isEnabled = permission?.enabled !== false;
  
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
    <div>
      <div 
        className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 group transition-colors ${
          !isEnabled ? 'opacity-50' : ''
        }`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {/* Expand/Collapse */}
        {hasChildren && (
          <button 
            onClick={() => onToggleExpand(node.id)} 
            className="p-1 hover:bg-muted rounded"
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
        <span className={`${permission ? 'text-primary' : 'text-muted-foreground'}`}>
          {node.expanded && hasChildren ? <FolderOpen className="w-4 h-4" /> : typeIcons[node.type]}
        </span>
        
        {/* Name */}
        <span className="flex-1 text-sm font-medium truncate">{node.name}</span>
        
        {/* Enable/Disable Toggle */}
        <button
          onClick={() => onSetPermission(node.type, node.id, currentRole, !isEnabled)}
          className={`p-1.5 rounded-lg transition-colors ${
            isEnabled ? 'text-success hover:bg-success/20' : 'text-destructive hover:bg-destructive/20'
          }`}
          title={isEnabled ? 'Désactiver' : 'Activer'}
        >
          {isEnabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        </button>
        
        {/* Role Selector */}
        <div className="flex items-center gap-1">
          {(['all', 'eleves', 'instructeurs', 'none'] as PermissionRole[]).map(role => (
            <button
              key={role}
              onClick={() => onSetPermission(node.type, node.id, role, isEnabled)}
              className={`px-2 py-1 text-xs rounded-lg border transition-all ${
                currentRole === role 
                  ? roleColors[role] 
                  : 'border-transparent hover:border-border text-muted-foreground hover:text-foreground'
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
        
        {/* Reset */}
        {permission && (
          <button
            onClick={() => onRemovePermission(node.type, node.id)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            title="Réinitialiser"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {/* Children */}
      {hasChildren && node.expanded && (
        <div>
          {filteredChildren.map(child => (
            <PermissionNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              onToggleExpand={onToggleExpand}
              onSetPermission={onSetPermission}
              onRemovePermission={onRemovePermission}
              searchTerm={searchTerm}
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
  const [filterType, setFilterType] = useState<PermissionTarget | 'all'>('all');
  const [showOnlyCustom, setShowOnlyCustom] = useState(false);
  
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
    
    const treeData: PermissionNode[] = stages
      .filter(s => s.enabled)
      .sort((a, b) => a.order - b.order)
      .map(stage => ({
        id: stage.id,
        name: stage.name,
        type: 'stage' as PermissionTarget,
        permission: getPermForNode('stage', stage.id),
        expanded: true,
        children: courseTypes.map(type => {
          const coursesForType = sportCourses.filter(
            c => c.stageId === stage.id && c.courseTypeId === type.id
          );
          
          if (coursesForType.length === 0) return null;
          
          return {
            id: `${stage.id}-${type.id}`,
            name: type.name,
            type: 'courseType' as PermissionTarget,
            permission: getPermForNode('courseType', type.id),
            expanded: false,
            children: coursesForType.map(course => {
              const titlesForCourse = courseTitles.filter(t => t.sportCourseId === course.id);
              
              return {
                id: course.id,
                name: course.title,
                type: 'lecon' as PermissionTarget,
                permission: getPermForNode('lecon', course.id),
                expanded: false,
                children: titlesForCourse.map(title => {
                  const filesForTitle = files.filter(f => f.courseTitleId === title.id);
                  
                  return {
                    id: title.id,
                    name: title.title,
                    type: 'heading' as PermissionTarget,
                    permission: getPermForNode('heading', title.id),
                    expanded: false,
                    children: filesForTitle.map(file => ({
                      id: file.id,
                      name: file.title,
                      type: 'file' as PermissionTarget,
                      permission: getPermForNode('file', file.id),
                      expanded: false,
                      children: []
                    }))
                  };
                })
              };
            })
          };
        }).filter(Boolean) as PermissionNode[]
      }));
    
    setTree(treeData);
  }, []);
  
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
    setTree(prev => toggleNode(prev));
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
    toast({ title: 'Permission réinitialisée' });
  }, [buildTree, toast]);
  
  const handleResetAll = () => {
    if (confirm('Réinitialiser toutes les permissions ?')) {
      clearAllPermissions();
      buildTree();
      toast({ title: 'Toutes les permissions réinitialisées' });
    }
  };
  
  const expandAll = () => {
    const expand = (nodes: PermissionNode[]): PermissionNode[] => {
      return nodes.map(node => ({
        ...node,
        expanded: true,
        children: node.children?.length ? expand(node.children) : node.children
      }));
    };
    setTree(prev => expand(prev));
  };
  
  const collapseAll = () => {
    const collapse = (nodes: PermissionNode[]): PermissionNode[] => {
      return nodes.map(node => ({
        ...node,
        expanded: false,
        children: node.children?.length ? collapse(node.children) : node.children
      }));
    };
    setTree(prev => collapse(prev));
  };
  
  // Stats
  const permissionCount = getPermissions().length;
  
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-primary/20 to-amber-500/20 border-b border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Gestion des Permissions
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {permissionCount} règles actives
            </span>
            <button
              onClick={handleResetAll}
              className="btn-ghost text-xs py-1.5 px-3 border border-border flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Réinitialiser tout
            </button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground">Accès:</span>
          <span className={`px-2 py-1 rounded border ${roleColors.all}`}>
            <Users className="w-3 h-3 inline mr-1" /> Tous
          </span>
          <span className={`px-2 py-1 rounded border ${roleColors.eleves}`}>
            <GraduationCap className="w-3 h-3 inline mr-1" /> Élèves
          </span>
          <span className={`px-2 py-1 rounded border ${roleColors.instructeurs}`}>
            <UserCheck className="w-3 h-3 inline mr-1" /> Instructeurs
          </span>
          <span className={`px-2 py-1 rounded border ${roleColors.none}`}>
            <EyeOff className="w-3 h-3 inline mr-1" /> Aucun
          </span>
        </div>
      </div>
      
      {/* Search & Filter Bar */}
      <div className="p-4 border-b border-border/30 flex flex-wrap gap-3">
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
              searchTerm={searchTerm}
            />
          ))
        )}
      </div>
      
      {/* Help Text */}
      <div className="p-4 bg-muted/30 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          <strong>Comment ça marche:</strong> Définissez qui peut accéder à chaque élément. 
          Les permissions héritent du parent si non définies. 
          Utilisez le cadenas pour désactiver complètement un élément.
        </p>
      </div>
    </div>
  );
};

export default PermissionsManager;
