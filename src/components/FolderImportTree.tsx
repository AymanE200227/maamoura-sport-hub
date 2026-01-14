import { useState, useMemo, useCallback, memo } from 'react';
import { 
  ChevronRight, ChevronDown, Folder, FolderOpen, FileText, 
  Video, File, Check, X, Edit2, Trash2, Save, FolderPlus,
  AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';

export interface ImportFile {
  id: string;
  name: string;
  path: string;
  type: 'ppt' | 'word' | 'pdf' | 'video' | 'unknown';
  data: string;
  size: number;
}

export interface ImportTreeNode {
  id: string;
  name: string;
  type: 'stage' | 'courseType' | 'lecon' | 'heading' | 'file';
  children: ImportTreeNode[];
  expanded?: boolean;
  file?: ImportFile;
  selected?: boolean;
  editName?: string;
}

interface FolderImportTreeProps {
  tree: ImportTreeNode[];
  onTreeChange: (tree: ImportTreeNode[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isImporting: boolean;
  stats: {
    stages: number;
    types: number;
    lecons: number;
    headings: number;
    files: number;
  };
}

const getTypeColor = (type: string): string => {
  switch (type) {
    case 'stage': return 'text-amber-400 bg-amber-500/20';
    case 'courseType': return 'text-blue-400 bg-blue-500/20';
    case 'lecon': return 'text-green-400 bg-green-500/20';
    case 'heading': return 'text-purple-400 bg-purple-500/20';
    case 'file': return 'text-muted-foreground';
    default: return 'text-muted-foreground';
  }
};

const getTypeLabel = (type: string): string => {
  switch (type) {
    case 'stage': return 'Stage';
    case 'courseType': return 'Type';
    case 'lecon': return 'Leçon';
    case 'heading': return 'Titre';
    case 'file': return 'Fichier';
    default: return '';
  }
};

const getFileIcon = (file?: ImportFile) => {
  if (!file) return <File className="w-4 h-4" />;
  switch (file.type) {
    case 'ppt': return <FileText className="w-4 h-4 text-orange-400" />;
    case 'word': return <FileText className="w-4 h-4 text-blue-400" />;
    case 'pdf': return <FileText className="w-4 h-4 text-red-400" />;
    case 'video': return <Video className="w-4 h-4 text-purple-400" />;
    default: return <File className="w-4 h-4 text-muted-foreground" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface TreeNodeProps {
  node: ImportTreeNode;
  depth: number;
  onToggle: (id: string) => void;
  onEdit: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

const TreeNodeComponent = ({ node, depth, onToggle, onEdit, onDelete, onSelect }: TreeNodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  
  const hasChildren = node.children && node.children.length > 0;
  const isFile = node.type === 'file';
  
  const handleSaveEdit = useCallback(() => {
    if (editValue.trim()) {
      onEdit(node.id, editValue.trim());
    }
    setIsEditing(false);
  }, [editValue, node.id, onEdit]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') {
      setEditValue(node.name);
      setIsEditing(false);
    }
  }, [handleSaveEdit, node.name]);

  const handleClick = useCallback(() => {
    if (isFile) {
      onSelect(node.id);
    } else {
      onToggle(node.id);
    }
  }, [isFile, node.id, onSelect, onToggle]);

  const handleToggleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id);
  }, [node.id, onToggle]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(node.id);
  }, [node.id, onDelete]);

  return (
    <div>
      <div 
        className={`flex items-center gap-1 py-1.5 px-2 rounded-lg hover:bg-muted/50 group cursor-pointer transition-colors ${
          node.selected ? 'bg-primary/20 border-l-2 border-primary' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse */}
        {!isFile && (
          <button className="p-0.5 hover:bg-muted rounded" onClick={handleToggleClick}>
            {node.expanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
        {isFile && <div className="w-5" />}
        
        {/* Icon */}
        {isFile ? (
          getFileIcon(node.file)
        ) : (
          node.expanded ? (
            <FolderOpen className={`w-4 h-4 ${getTypeColor(node.type).split(' ')[0]}`} />
          ) : (
            <Folder className={`w-4 h-4 ${getTypeColor(node.type).split(' ')[0]}`} />
          )
        )}
        
        {/* Name */}
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-muted px-2 py-0.5 rounded text-sm border border-primary focus:outline-none"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-sm truncate">{node.name}</span>
        )}
        
        {/* Type Badge */}
        {!isFile && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getTypeColor(node.type)}`}>
            {getTypeLabel(node.type)}
          </span>
        )}
        
        {/* File Size */}
        {isFile && node.file && (
          <span className="text-xs text-muted-foreground">
            {formatFileSize(node.file.size)}
          </span>
        )}
        
        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <button
            onClick={handleEditClick}
            className="p-1 hover:bg-muted rounded"
            title="Renommer"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-1 hover:bg-destructive/20 text-destructive rounded"
            title="Supprimer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {/* Children - Only render if expanded */}
      {hasChildren && node.expanded && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Memoized TreeNode for performance
const TreeNode = memo(TreeNodeComponent);
TreeNode.displayName = 'TreeNode';

const FolderImportTree = ({ 
  tree, 
  onTreeChange, 
  onConfirm, 
  onCancel, 
  isImporting,
  stats 
}: FolderImportTreeProps) => {
  
  const handleToggle = useCallback((id: string) => {
    const toggleNode = (nodes: ImportTreeNode[]): ImportTreeNode[] => {
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
    onTreeChange(toggleNode(tree));
  }, [tree, onTreeChange]);

  const handleEdit = useCallback((id: string, newName: string) => {
    const editNode = (nodes: ImportTreeNode[]): ImportTreeNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, name: newName };
        }
        if (node.children?.length) {
          return { ...node, children: editNode(node.children) };
        }
        return node;
      });
    };
    onTreeChange(editNode(tree));
  }, [tree, onTreeChange]);

  const handleDelete = useCallback((id: string) => {
    const deleteNode = (nodes: ImportTreeNode[]): ImportTreeNode[] => {
      return nodes.filter(node => {
        if (node.id === id) return false;
        if (node.children?.length) {
          node.children = deleteNode(node.children);
        }
        return true;
      });
    };
    onTreeChange(deleteNode(tree));
  }, [tree, onTreeChange]);

  const handleSelect = useCallback((id: string) => {
    const selectNode = (nodes: ImportTreeNode[]): ImportTreeNode[] => {
      return nodes.map(node => {
        const isSelected = node.id === id;
        return {
          ...node,
          selected: isSelected,
          children: node.children?.length ? selectNode(node.children) : node.children
        };
      });
    };
    onTreeChange(selectNode(tree));
  }, [tree, onTreeChange]);

  const expandAll = () => {
    const expand = (nodes: ImportTreeNode[]): ImportTreeNode[] => {
      return nodes.map(node => ({
        ...node,
        expanded: true,
        children: node.children?.length ? expand(node.children) : node.children
      }));
    };
    onTreeChange(expand(tree));
  };

  const collapseAll = () => {
    const collapse = (nodes: ImportTreeNode[]): ImportTreeNode[] => {
      return nodes.map(node => ({
        ...node,
        expanded: false,
        children: node.children?.length ? collapse(node.children) : node.children
      }));
    };
    onTreeChange(collapse(tree));
  };

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-4xl h-[85vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FolderPlus className="w-6 h-6 text-primary" />
              Import de Projet Complet
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Vérifiez et modifiez la structure avant l'import
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 px-4 py-3 bg-muted/30 border-b border-border/20">
          <div className="flex items-center gap-4 flex-1">
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {stats.stages} Stages
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              {stats.types} Types
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              {stats.lecons} Leçons
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              {stats.headings} Titres
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              {stats.files} Fichiers
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-xs px-2 py-1 hover:bg-muted rounded transition-colors"
            >
              Tout ouvrir
            </button>
            <button
              onClick={collapseAll}
              className="text-xs px-2 py-1 hover:bg-muted rounded transition-colors"
            >
              Tout fermer
            </button>
          </div>
        </div>

        {/* Tree View */}
        <div className="flex-1 overflow-auto p-2 font-mono text-sm">
          {tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <AlertCircle className="w-12 h-12 mb-3" />
              <p>Aucun contenu détecté</p>
              <p className="text-xs mt-1">Vérifiez que votre dossier contient des fichiers valides</p>
            </div>
          ) : (
            tree.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border/30 bg-muted/20">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span>Cliquez sur un élément pour le modifier ou supprimer</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="btn-ghost border border-border px-6 py-2"
              disabled={isImporting}
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="btn-success px-6 py-2 flex items-center gap-2"
              disabled={isImporting || tree.length === 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Importer ({stats.files} fichiers)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderImportTree;
