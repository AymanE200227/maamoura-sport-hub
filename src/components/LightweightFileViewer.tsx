import { memo, useState, useCallback, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Maximize2, FileText, Video, AlertCircle } from 'lucide-react';
import { isDownloadEnabled } from '@/lib/storage';

interface LightweightFileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileData: string | null;
  fileName: string;
  fileType: 'pdf' | 'ppt' | 'word' | 'video';
  onDownload?: () => void;
}

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
  const downloadAllowed = isDownloadEnabled();

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Reset zoom when opening new file
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

  const renderContent = () => {
    if (!fileData) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
          <AlertCircle className="w-16 h-16" />
          <p>Fichier non disponible</p>
        </div>
      );
    }

    // PDF viewer
    if (fileType === 'pdf') {
      return (
        <iframe
          src={fileData}
          className="w-full h-full border-0 bg-white"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          onLoad={() => setIsLoading(false)}
          title={fileName}
        />
      );
    }

    // Video viewer
    if (fileType === 'video') {
      return (
        <div className="flex items-center justify-center h-full bg-black">
          <video
            src={fileData}
            controls
            autoPlay={false}
            className="max-w-full max-h-full"
            style={{ transform: `scale(${zoom / 100})` }}
            onLoadedData={() => setIsLoading(false)}
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        </div>
      );
    }

    // PPT/Word - Show download prompt with preview info
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center"
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

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? '' : 'p-4 md:p-8'}`}
      style={{ backgroundColor: 'hsl(var(--background) / 0.95)' }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Viewer Container */}
      <div 
        className={`relative bg-card border border-border rounded-xl overflow-hidden shadow-2xl flex flex-col ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[85vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              fileType === 'pdf' ? 'bg-red-500/20 text-red-400' :
              fileType === 'ppt' ? 'bg-orange-500/20 text-orange-400' :
              fileType === 'video' ? 'bg-purple-500/20 text-purple-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {fileType === 'video' ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <span className="font-medium truncate">{fileName}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Zoom controls - only for PDF and video */}
            {(fileType === 'pdf' || fileType === 'video') && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Zoom arrière"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground w-12 text-center">{zoom}%</span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Zoom avant"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Réinitialiser zoom"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-border mx-1" />
              </>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Plein écran"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {downloadAllowed && onDownload && (
              <button
                onClick={onDownload}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Télécharger"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-destructive/20 hover:text-destructive rounded-lg transition-colors ml-1"
              title="Fermer (Échap)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-muted/30 relative">
          {isLoading && fileData && (fileType === 'pdf' || fileType === 'video') && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Chargement...</span>
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
