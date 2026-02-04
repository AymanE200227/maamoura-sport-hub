/**
 * Document Editor Component
 * Dual-mode: Markdown + Rich Text
 * Light theme for readability
 */

import { useState, useCallback, useRef, memo } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3, Quote, Code, Link, Image, Save, Eye, Edit3, FileText, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface DocumentEditorProps {
  initialContent?: string;
  onSave: (content: string, format: 'markdown' | 'html') => void;
  fileName?: string;
  readOnly?: boolean;
}

const ToolbarButton = memo(({ 
  icon: Icon, 
  onClick, 
  active = false, 
  title 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  onClick: () => void; 
  active?: boolean;
  title: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-2 rounded-lg transition-colors ${
      active 
        ? 'bg-blue-100 text-blue-700' 
        : 'hover:bg-gray-100 text-gray-700'
    }`}
  >
    <Icon className="w-4 h-4" />
  </button>
));

ToolbarButton.displayName = 'ToolbarButton';

const DocumentEditor = memo(({
  initialContent = '',
  onSave,
  fileName = 'document',
  readOnly = false
}: DocumentEditorProps) => {
  const [mode, setMode] = useState<'markdown' | 'richtext'>('markdown');
  const [content, setContent] = useState(initialContent);
  const [htmlContent, setHtmlContent] = useState(initialContent);
  const [isPreview, setIsPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Markdown to HTML preview conversion
  const markdownToHtml = useCallback((md: string): string => {
    let html = md
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Lists
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Blockquotes
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    return `<p>${html}</p>`;
  }, []);

  // Insert markdown syntax at cursor
  const insertMarkdown = useCallback((before: string, after: string = '') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selected + after + content.substring(end);
    
    setContent(newContent);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selected.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content]);

  // Rich text formatting
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  }, []);

  const handleSave = useCallback(() => {
    const finalContent = mode === 'markdown' ? content : htmlContent;
    const format = mode === 'markdown' ? 'markdown' : 'html';
    onSave(finalContent, format);
    toast.success('Document sauvegardé');
  }, [mode, content, htmlContent, onSave]);

  // Markdown toolbar actions
  const mdActions = [
    { icon: Heading1, action: () => insertMarkdown('# '), title: 'Titre 1' },
    { icon: Heading2, action: () => insertMarkdown('## '), title: 'Titre 2' },
    { icon: Heading3, action: () => insertMarkdown('### '), title: 'Titre 3' },
    { icon: Bold, action: () => insertMarkdown('**', '**'), title: 'Gras' },
    { icon: Italic, action: () => insertMarkdown('*', '*'), title: 'Italique' },
    { icon: List, action: () => insertMarkdown('- '), title: 'Liste à puces' },
    { icon: ListOrdered, action: () => insertMarkdown('1. '), title: 'Liste numérotée' },
    { icon: Quote, action: () => insertMarkdown('> '), title: 'Citation' },
    { icon: Code, action: () => insertMarkdown('`', '`'), title: 'Code' },
    { icon: Link, action: () => insertMarkdown('[', '](url)'), title: 'Lien' },
    { icon: Image, action: () => insertMarkdown('![alt](', ')'), title: 'Image' }
  ];

  // Rich text toolbar actions
  const rtActions = [
    { icon: Bold, action: () => execCommand('bold'), title: 'Gras' },
    { icon: Italic, action: () => execCommand('italic'), title: 'Italique' },
    { icon: Underline, action: () => execCommand('underline'), title: 'Souligné' },
    { icon: Heading1, action: () => execCommand('formatBlock', 'h1'), title: 'Titre 1' },
    { icon: Heading2, action: () => execCommand('formatBlock', 'h2'), title: 'Titre 2' },
    { icon: List, action: () => execCommand('insertUnorderedList'), title: 'Liste à puces' },
    { icon: ListOrdered, action: () => execCommand('insertOrderedList'), title: 'Liste numérotée' },
    { icon: AlignLeft, action: () => execCommand('justifyLeft'), title: 'Aligner à gauche' },
    { icon: AlignCenter, action: () => execCommand('justifyCenter'), title: 'Centrer' },
    { icon: AlignRight, action: () => execCommand('justifyRight'), title: 'Aligner à droite' },
    { icon: Quote, action: () => execCommand('formatBlock', 'blockquote'), title: 'Citation' }
  ];

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-800">{fileName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'markdown' | 'richtext')}>
            <TabsList className="bg-gray-100">
              <TabsTrigger value="markdown" className="text-xs">Markdown</TabsTrigger>
              <TabsTrigger value="richtext" className="text-xs">Rich Text</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {!readOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreview(!isPreview)}
                className="gap-1"
              >
                {isPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {isPreview ? 'Éditer' : 'Aperçu'}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="gap-1 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Sauvegarder
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {!readOnly && !isPreview && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white flex-wrap">
          {(mode === 'markdown' ? mdActions : rtActions).map((action, idx) => (
            <ToolbarButton 
              key={idx} 
              icon={action.icon} 
              onClick={action.action}
              title={action.title}
            />
          ))}
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 overflow-auto">
        {mode === 'markdown' ? (
          isPreview ? (
            <div 
              className="p-6 prose prose-sm max-w-none text-gray-800"
              style={{
                fontFamily: 'Georgia, serif',
                lineHeight: 1.8
              }}
              dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
            />
          ) : (
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Commencez à écrire en Markdown..."
              className="w-full h-full min-h-[400px] p-6 resize-none border-0 focus:ring-0 bg-white text-gray-800 font-mono text-sm"
              style={{ fontFamily: 'Monaco, Consolas, monospace' }}
              readOnly={readOnly}
            />
          )
        ) : (
          isPreview ? (
            <div 
              className="p-6 prose prose-sm max-w-none text-gray-800"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : (
            <div
              ref={editorRef}
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onInput={(e) => setHtmlContent((e.target as HTMLDivElement).innerHTML)}
              className="w-full h-full min-h-[400px] p-6 focus:outline-none bg-white text-gray-800"
              style={{
                fontFamily: 'Calibri, Arial, sans-serif',
                fontSize: '14px',
                lineHeight: 1.6
              }}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )
        )}
      </div>

      {/* Status bar */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
        <span>
          {mode === 'markdown' ? `${content.length} caractères` : `${htmlContent.length} caractères (HTML)`}
        </span>
        <span className="text-gray-400">
          Mode: {mode === 'markdown' ? 'Markdown' : 'Rich Text'}
        </span>
      </div>
    </div>
  );
});

DocumentEditor.displayName = 'DocumentEditor';

export default DocumentEditor;
