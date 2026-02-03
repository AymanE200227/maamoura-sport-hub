import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Maximize2, FileText, Video, AlertCircle, Image, File } from 'lucide-react';
import { isDownloadEnabled } from '@/lib/storage';

interface LightweightFileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileData: string | null;
  fileName: string;
  fileType: 'pdf' | 'ppt' | 'word' | 'video';
  onDownload?: () => void;
}

// Convert base64 to blob URL for efficient memory handling
const createBlobUrl = (base64Data: string, mimeType: string): string => {
  try {
    // Handle data URL format
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
  
  // Video types
  if (fileType === 'video') {
    const videoMimes: Record<string, string> = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'm4v': 'video/x-m4v',
      'mpeg': 'video/mpeg',
      'mpg': 'video/mpeg',
      '3gp': 'video/3gpp'
    };
    return videoMimes[ext] || 'video/mp4';
  }
  
  // Image types (handled as PDF type in our system)
  const imageMimes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon'
  };
  if (imageMimes[ext]) return imageMimes[ext];
  
  // Document types
  if (ext === 'pdf') return 'application/pdf';
  if (['doc', 'docx'].includes(ext)) return 'application/msword';
  if (['ppt', 'pptx'].includes(ext)) return 'application/vnd.ms-powerpoint';
  if (['xls', 'xlsx'].includes(ext)) return 'application/vnd.ms-excel';
  if (ext === 'txt') return 'text/plain';
  
  return 'application/octet-stream';
};

// Check if file is an image
const isImageFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
};

// Check if file is a text file
const isTextFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts'].includes(ext);
};

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
  const downloadAllowed = isDownloadEnabled();

  // Create blob URL for the file
  const blobUrl = useMemo(() => {
    if (!fileData || !isOpen) return '';
    
    const mimeType = getMimeType(fileName, fileType);
    return createBlobUrl(fileData, mimeType);
  }, [fileData, fileName, fileType, isOpen]);

  // Clean up blob URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Load text content for text files
  useEffect(() => {
    if (isOpen && fileData && isTextFile(fileName)) {
      try {
        let base64 = fileData;
        if (fileData.includes(',')) {
          base64 = fileData.split(',')[1];
        }
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
    }
  }, [isOpen, fileData]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 50));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(100);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isFullscreen) {
        setIsFullscreen(false);
      } else {
        onClose();
      }
    }
  }, [isFullscreen, onClose]);

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

  // Determine the actual content type
  const isImage = isImageFile(fileName);
  const isText = isTextFile(fileName);
  const isPdf = fileName.toLowerCase().endsWith('.pdf');
  const isVideo = fileType === 'video';
  const isOfficeDoc = ['ppt', 'word'].includes(fileType) && !isImage && !isText && !isPdf;

  const renderContent = () => {
    if (!fileData) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
          <AlertCircle className="w-16 h-16" />
          <p>Fichier non disponible</p>
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

    // Office documents (PPT/Word) - Show download prompt
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
            {fileType === 'ppt' ? 'Présentation PowerPoint' : 'Document Word'}
          </p>
          <p className="text-muted-foreground text-xs max-w-md">
            Ce type de fichier ne peut pas être affiché directement dans le navigateur.
            {downloadAllowed ? ' Téléchargez-le pour l\'ouvrir avec l\'application appropriée.' : ' Le téléchargement est désactivé par l\'administrateur.'}
          </p>
        </div>

        {downloadAllowed && onDownload && (
          <button
            onClick={onDownload}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Télécharger
          </button>
        )}
      </div>
    );
  };

  // Get icon based on file type
  const getFileIcon = () => {
    if (isImage) return <Image className="w-4 h-4" />;
    if (isVideo) return <Video className="w-4 h-4" />;
    if (isText) return <File className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  // Get icon color based on file type
  const getIconColorClass = () => {
    if (isImage) return 'bg-green-500/20 text-green-400';
    if (isVideo) return 'bg-purple-500/20 text-purple-400';
    if (isPdf) return 'bg-red-500/20 text-red-400';
    if (fileType === 'ppt') return 'bg-orange-500/20 text-orange-400';
    if (isText) return 'bg-gray-500/20 text-gray-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  // Show zoom controls for viewable content
  const showZoomControls = isImage || isPdf || isVideo || isText;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? '' : 'p-4 md:p-8'}`}
      style={{ backgroundColor: 'hsl(0 0% 0% / 0.9)' }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Viewer Container */}
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
          </div>

          <div className="flex items-center gap-1">
            {/* Zoom controls */}
            {showZoomControls && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Zoom arrière"
                  style={{ color: 'hsl(45 20% 85%)' }}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span 
                  className="text-xs w-12 text-center"
                  style={{ color: 'hsl(0 0% 55%)' }}
                >
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Zoom avant"
                  style={{ color: 'hsl(45 20% 85%)' }}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Réinitialiser zoom"
                  style={{ color: 'hsl(45 20% 85%)' }}
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <div className="w-px h-6 mx-1" style={{ background: 'hsl(0 0% 25%)' }} />
              </>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Plein écran"
              style={{ color: 'hsl(45 20% 85%)' }}
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {downloadAllowed && onDownload && (
              <button
                onClick={onDownload}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Télécharger"
                style={{ color: 'hsl(45 20% 85%)' }}
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-destructive/20 rounded-lg transition-colors ml-1"
              title="Fermer (Échap)"
              style={{ color: 'hsl(0 70% 55%)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto relative" style={{ background: 'hsl(0 0% 6%)' }}>
          {isLoading && fileData && (isImage || isPdf || isVideo) && (
            <div 
              className="absolute inset-0 flex items-center justify-center z-10"
              style={{ background: 'hsl(0 0% 6% / 0.9)' }}
            >
              <div className="flex flex-col items-center gap-3">
                <div 
                  className="w-8 h-8 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'hsl(42 75% 55% / 0.3)', borderTopColor: 'hsl(42 75% 55%)' }}
                />
                <span className="text-sm" style={{ color: 'hsl(0 0% 55%)' }}>Chargement...</span>
              </div>
            </div>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
});

LightweightFileViewer.displayName = 'LightweightFileViewer';

export default LightweightFileViewer;
