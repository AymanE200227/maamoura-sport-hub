import { memo, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Maximize2, FileText, Video, AlertCircle, Image, File, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { isDownloadEnabled } from '@/lib/storage';
import mammoth from 'mammoth';

interface LightweightFileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileData: string | null;
  fileName: string;
  fileType: 'pdf' | 'ppt' | 'word' | 'video';
  onDownload?: () => void;
}

// Convert base64 to ArrayBuffer for document processing
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  let data = base64;
  if (base64.includes(',')) {
    data = base64.split(',')[1];
  }
  const binaryString = atob(data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Convert base64 to blob URL for efficient memory handling
const createBlobUrl = (base64Data: string, mimeType: string): string => {
  try {
    let base64 = base64Data;
    if (base64Data.includes(',')) {
      base64 = base64Data.split(',')[1];
    }
    
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('Error creating blob URL:', e);
    return '';
  }
};

// Get MIME type from file name
const getMimeType = (fileName: string, fileType: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  if (fileType === 'video') {
    const videoMimes: Record<string, string> = {
      'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime',
      'avi': 'video/x-msvideo', 'mkv': 'video/x-matroska', 'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv', 'm4v': 'video/x-m4v', 'mpeg': 'video/mpeg',
      'mpg': 'video/mpeg', '3gp': 'video/3gpp'
    };
    return videoMimes[ext] || 'video/mp4';
  }
  
  const imageMimes: Record<string, string> = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
    'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
    'bmp': 'image/bmp', 'ico': 'image/x-icon'
  };
  if (imageMimes[ext]) return imageMimes[ext];
  
  if (ext === 'pdf') return 'application/pdf';
  if (['doc', 'docx'].includes(ext)) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (['ppt', 'pptx'].includes(ext)) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (ext === 'txt') return 'text/plain';
  
  return 'application/octet-stream';
};

const isImageFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
};

const isTextFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts'].includes(ext);
};

const isWordFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['docx', 'doc'].includes(ext);
};

const isPptFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['pptx', 'ppt'].includes(ext);
};

// Skeleton Loading Component
const ViewerSkeleton = () => (
  <div className="flex flex-col items-center justify-center h-full gap-6 p-8 animate-pulse">
    <div className="w-32 h-32 rounded-2xl bg-muted/50" />
    <div className="w-64 h-4 rounded bg-muted/50" />
    <div className="w-48 h-3 rounded bg-muted/30" />
    <div className="w-full max-w-2xl space-y-3">
      <div className="h-4 rounded bg-muted/40" />
      <div className="h-4 rounded bg-muted/30 w-5/6" />
      <div className="h-4 rounded bg-muted/40" />
      <div className="h-4 rounded bg-muted/30 w-4/6" />
    </div>
  </div>
);

const LightweightFileViewer = memo(({
  isOpen,
  onClose,
  fileData,
  fileName,
  fileType,
  onDownload
}: LightweightFileViewerProps) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [pptSlides, setPptSlides] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const downloadAllowed = isDownloadEnabled();
  const contentRef = useRef<HTMLDivElement>(null);

  // Create blob URL for the file
  const blobUrl = useMemo(() => {
    if (!fileData || !isOpen) return '';
    const mimeType = getMimeType(fileName, fileType);
    return createBlobUrl(fileData, mimeType);
  }, [fileData, fileName, fileType, isOpen]);

  // Clean up blob URL
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  // Parse Word documents with mammoth.js
  useEffect(() => {
    if (!isOpen || !fileData || !isWordFile(fileName)) return;
    
    setIsLoading(true);
    setParseError(null);
    
    const parseWord = async () => {
      try {
        const arrayBuffer = base64ToArrayBuffer(fileData);
        const result = await mammoth.convertToHtml({ arrayBuffer });
        
        // Enhanced HTML with styling
        const styledHtml = `
          <style>
            .word-content { font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.8; color: inherit; }
            .word-content h1 { font-size: 2em; font-weight: bold; margin: 1em 0 0.5em; color: hsl(45 70% 60%); }
            .word-content h2 { font-size: 1.5em; font-weight: bold; margin: 1em 0 0.5em; color: hsl(45 60% 55%); }
            .word-content h3 { font-size: 1.25em; font-weight: bold; margin: 1em 0 0.5em; }
            .word-content p { margin: 0.5em 0; }
            .word-content ul, .word-content ol { margin: 0.5em 0; padding-left: 2em; }
            .word-content li { margin: 0.25em 0; }
            .word-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
            .word-content th, .word-content td { border: 1px solid hsl(0 0% 30%); padding: 0.5em; }
            .word-content th { background: hsl(0 0% 15%); font-weight: bold; }
            .word-content img { max-width: 100%; height: auto; margin: 1em 0; border-radius: 8px; }
            .word-content strong { font-weight: bold; color: hsl(45 50% 70%); }
            .word-content em { font-style: italic; }
          </style>
          <div class="word-content">${result.value}</div>
        `;
        setWordHtml(styledHtml);
        setIsLoading(false);
      } catch (e) {
        console.error('Error parsing Word document:', e);
        setParseError('Impossible de lire ce document Word. Il peut être corrompu ou dans un format non supporté.');
        setIsLoading(false);
      }
    };
    
    parseWord();
  }, [isOpen, fileData, fileName]);

  // Parse PowerPoint - Extract slides as images or content
  useEffect(() => {
    if (!isOpen || !fileData || !isPptFile(fileName)) return;
    
    setIsLoading(true);
    setParseError(null);
    
    const parsePpt = async () => {
      try {
        const arrayBuffer = base64ToArrayBuffer(fileData);
        
        // Use JSZip to extract PPTX content
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        const slides: string[] = [];
        const slideFiles = Object.keys(zip.files)
          .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
          .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
            const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
            return numA - numB;
          });
        
        for (const slideFile of slideFiles) {
          const content = await zip.files[slideFile].async('text');
          // Extract text from XML - simplified approach
          const textMatches = content.match(/<a:t>([^<]*)<\/a:t>/g) || [];
          const texts = textMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(t => t);
          
          if (texts.length > 0) {
            slides.push(texts.join('\n'));
          } else {
            slides.push(`Slide ${slides.length + 1}`);
          }
        }
        
        if (slides.length === 0) {
          // Fallback - show file info
          slides.push('Présentation PowerPoint\n\nLe contenu textuel n\'a pas pu être extrait.\nCe fichier contient probablement des images ou des éléments graphiques.');
        }
        
        setPptSlides(slides);
        setCurrentSlide(0);
        setIsLoading(false);
      } catch (e) {
        console.error('Error parsing PowerPoint:', e);
        setParseError('Impossible de lire cette présentation. Le format .pptx est supporté.');
        setIsLoading(false);
      }
    };
    
    parsePpt();
  }, [isOpen, fileData, fileName]);

  // Load text content
  useEffect(() => {
    if (isOpen && fileData && isTextFile(fileName)) {
      try {
        let base64 = fileData;
        if (fileData.includes(',')) base64 = fileData.split(',')[1];
        const decoded = atob(base64);
        setTextContent(decoded);
        setIsLoading(false);
      } catch (e) {
        console.error('Error decoding text file:', e);
        setTextContent(null);
      }
    }
  }, [isOpen, fileData, fileName]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setZoom(100);
      setParseError(null);
      setWordHtml(null);
      setPptSlides([]);
      setCurrentSlide(0);
    }
  }, [isOpen, fileData]);

  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev + 25, 200)), []);
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev - 25, 50)), []);
  const handleResetZoom = useCallback(() => setZoom(100), []);
  const toggleFullscreen = useCallback(() => setIsFullscreen(prev => !prev), []);
  
  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, pptSlides.length - 1));
  }, [pptSlides.length]);
  
  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isFullscreen) setIsFullscreen(false);
      else onClose();
    }
    if (pptSlides.length > 0) {
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    }
  }, [isFullscreen, onClose, pptSlides.length, nextSlide, prevSlide]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const isImage = isImageFile(fileName);
  const isText = isTextFile(fileName);
  const isPdf = fileName.toLowerCase().endsWith('.pdf');
  const isVideo = fileType === 'video';
  const isWord = isWordFile(fileName);
  const isPpt = isPptFile(fileName);

  const renderContent = () => {
    if (!fileData) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
          <AlertCircle className="w-16 h-16" />
          <p>Fichier non disponible</p>
        </div>
      );
    }

    if (isLoading) {
      return <ViewerSkeleton />;
    }

    if (parseError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
          <div className="w-24 h-24 rounded-2xl bg-destructive/20 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Erreur de lecture</h3>
            <p className="text-muted-foreground text-sm max-w-md">{parseError}</p>
          </div>
          {downloadAllowed && onDownload && (
            <button onClick={onDownload} className="btn-primary flex items-center gap-2">
              <Download className="w-5 h-5" />
              Télécharger le fichier
            </button>
          )}
        </div>
      );
    }

    // Image viewer
    if (isImage) {
      return (
        <div className="flex items-center justify-center h-full p-4 bg-black/50">
          <img
            src={blobUrl || fileData}
            alt={fileName}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})` }}
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        </div>
      );
    }

    // Text file viewer
    if (isText && textContent !== null) {
      return (
        <div className="h-full overflow-auto p-4 bg-muted/30">
          <pre 
            className="text-sm font-mono whitespace-pre-wrap break-words p-4 rounded-lg bg-card border border-border"
            style={{ fontSize: `${zoom / 100}rem` }}
          >
            {textContent}
          </pre>
        </div>
      );
    }

    // PDF viewer
    if (isPdf && blobUrl) {
      return (
        <iframe
          src={blobUrl}
          className="w-full h-full border-0"
          style={{ 
            transform: `scale(${zoom / 100})`, 
            transformOrigin: 'top center',
            width: `${10000 / zoom}%`,
            height: `${10000 / zoom}%`
          }}
          onLoad={() => setIsLoading(false)}
          title={fileName}
        />
      );
    }

    // Video viewer
    if (isVideo && blobUrl) {
      return (
        <div className="flex items-center justify-center h-full bg-black">
          <video
            src={blobUrl}
            controls
            autoPlay={false}
            className="max-w-full max-h-full"
            style={{ transform: `scale(${zoom / 100})` }}
            onLoadedData={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        </div>
      );
    }

    // Word document viewer
    if (isWord && wordHtml) {
      return (
        <div 
          ref={contentRef}
          className="h-full overflow-auto p-6 bg-gradient-to-b from-card to-background"
        >
          <div 
            className="max-w-4xl mx-auto bg-card/50 p-8 rounded-xl border border-border shadow-lg"
            style={{ fontSize: `${zoom / 100}rem` }}
            dangerouslySetInnerHTML={{ __html: wordHtml }}
          />
        </div>
      );
    }

    // PowerPoint viewer
    if (isPpt && pptSlides.length > 0) {
      return (
        <div className="flex flex-col h-full">
          {/* Slide content */}
          <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background via-card to-muted/30">
            <div 
              className="w-full max-w-4xl aspect-video bg-card rounded-xl border-2 border-border shadow-2xl p-8 flex items-center justify-center overflow-auto"
              style={{ fontSize: `${zoom / 100}rem` }}
            >
              <pre className="text-center whitespace-pre-wrap font-sans text-lg leading-relaxed">
                {pptSlides[currentSlide]}
              </pre>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 p-4 bg-muted/30 border-t border-border">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              Slide {currentSlide + 1} / {pptSlides.length}
            </span>
            <button
              onClick={nextSlide}
              disabled={currentSlide === pptSlides.length - 1}
              className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      );
    }

    // Fallback - generic file display with download option
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div 
          className="w-24 h-24 rounded-2xl flex items-center justify-center"
          style={{ 
            background: fileType === 'ppt' 
              ? 'linear-gradient(135deg, hsl(24 95% 50%), hsl(24 90% 40%))' 
              : 'linear-gradient(135deg, hsl(210 90% 50%), hsl(210 85% 40%))' 
          }}
        >
          <FileText className="w-12 h-12 text-white" />
        </div>
        
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">{fileName}</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {fileType === 'ppt' ? 'Présentation PowerPoint' : 'Document'}
          </p>
          {downloadAllowed && (
            <p className="text-muted-foreground text-xs max-w-md">
              Ce fichier est en cours de traitement...
            </p>
          )}
        </div>

        {downloadAllowed && onDownload && (
          <button onClick={onDownload} className="btn-primary flex items-center gap-2">
            <Download className="w-5 h-5" />
            Télécharger
          </button>
        )}
      </div>
    );
  };

  const getFileIcon = () => {
    if (isImage) return <Image className="w-4 h-4" />;
    if (isVideo) return <Video className="w-4 h-4" />;
    if (isText) return <File className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getIconColorClass = () => {
    if (isImage) return 'bg-green-500/20 text-green-400';
    if (isVideo) return 'bg-purple-500/20 text-purple-400';
    if (isPdf) return 'bg-red-500/20 text-red-400';
    if (isPpt) return 'bg-orange-500/20 text-orange-400';
    if (isWord) return 'bg-blue-500/20 text-blue-400';
    if (isText) return 'bg-gray-500/20 text-gray-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  const showZoomControls = isImage || isPdf || isVideo || isText || isWord || isPpt;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? '' : 'p-4 md:p-8'}`}
      style={{ backgroundColor: 'hsl(0 0% 0% / 0.9)' }}
    >
      <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />

      <div 
        className={`relative bg-card border border-border rounded-xl overflow-hidden shadow-2xl flex flex-col ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[90vh]'
        }`}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 border-b"
          style={{ borderColor: 'hsl(0 0% 18%)', background: 'hsl(0 0% 9%)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getIconColorClass()}`}>
              {getFileIcon()}
            </div>
            <span className="font-medium truncate" style={{ color: 'hsl(45 20% 95%)' }}>{fileName}</span>
            {isPpt && pptSlides.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                {pptSlides.length} slides
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {showZoomControls && (
              <>
                <button onClick={handleZoomOut} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Zoom arrière" style={{ color: 'hsl(45 20% 85%)' }}>
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs w-12 text-center" style={{ color: 'hsl(0 0% 55%)' }}>{zoom}%</span>
                <button onClick={handleZoomIn} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Zoom avant" style={{ color: 'hsl(45 20% 85%)' }}>
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={handleResetZoom} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Réinitialiser" style={{ color: 'hsl(45 20% 85%)' }}>
                  <RotateCw className="w-4 h-4" />
                </button>
                <div className="w-px h-6 mx-1" style={{ background: 'hsl(0 0% 25%)' }} />
              </>
            )}

            <button onClick={toggleFullscreen} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Plein écran" style={{ color: 'hsl(45 20% 85%)' }}>
              <Maximize2 className="w-4 h-4" />
            </button>

            {downloadAllowed && onDownload && (
              <button onClick={onDownload} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Télécharger" style={{ color: 'hsl(45 20% 85%)' }}>
                <Download className="w-4 h-4" />
              </button>
            )}

            <button onClick={onClose} className="p-2 hover:bg-destructive/20 rounded-lg transition-colors ml-1" title="Fermer (Échap)" style={{ color: 'hsl(0 70% 55%)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto relative" style={{ background: 'hsl(0 0% 6%)' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
});

LightweightFileViewer.displayName = 'LightweightFileViewer';

export default LightweightFileViewer;
