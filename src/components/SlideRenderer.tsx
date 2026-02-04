/**
 * High-fidelity Slide Renderer
 * Renders PPTX slides with proper positioning, styling, images, shapes
 */

import { memo, useMemo } from 'react';
import type { ParsedSlide, SlideElement } from '@/lib/pptxParser';

interface SlideRendererProps {
  slide: ParsedSlide;
  slideWidth: number;
  slideHeight: number;
  scale: number;
}

const ElementRenderer = memo(({ 
  element, 
  scale 
}: { 
  element: SlideElement; 
  scale: number;
}) => {
  const style = useMemo(() => {
    const s: React.CSSProperties = {
      position: 'absolute',
      left: `${element.x}%`,
      top: `${element.y}%`,
      width: `${element.width}%`,
      height: `${element.height}%`,
      overflow: 'hidden',
      boxSizing: 'border-box'
    };
    
    if (element.rotation) {
      s.transform = `rotate(${element.rotation}deg)`;
    }
    
    if (element.style) {
      if (element.style.backgroundColor) {
        s.backgroundColor = element.style.backgroundColor;
      }
      
      if (element.style.gradient) {
        const { type, colors, angle = 90 } = element.style.gradient;
        if (type === 'linear') {
          s.background = `linear-gradient(${angle}deg, ${colors.join(', ')})`;
        } else {
          s.background = `radial-gradient(circle, ${colors.join(', ')})`;
        }
      }
      
      if (element.style.borderColor && element.style.borderWidth) {
        s.border = `${element.style.borderWidth}px solid ${element.style.borderColor}`;
      }
      
      if (element.style.opacity !== undefined) {
        s.opacity = element.style.opacity;
      }
      
      if (element.style.shadow) {
        s.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }
      
      // Text alignment
      if (element.style.textAlign) {
        s.textAlign = element.style.textAlign;
      }
      
      if (element.style.verticalAlign) {
        s.display = 'flex';
        s.alignItems = element.style.verticalAlign === 'top' ? 'flex-start' 
          : element.style.verticalAlign === 'bottom' ? 'flex-end' 
          : 'center';
      }
    }
    
    return s;
  }, [element]);
  
  // Render image
  if (element.type === 'image' && element.src) {
    return (
      <div style={style}>
        <img 
          src={element.src} 
          alt={element.alt || 'Slide image'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
          loading="lazy"
        />
      </div>
    );
  }
  
  // Render text/shape with HTML content
  if ((element.type === 'text' || element.type === 'shape') && element.html) {
    return (
      <div 
        style={{
          ...style,
          padding: '4px 8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: element.style?.verticalAlign === 'bottom' ? 'flex-end' 
            : element.style?.verticalAlign === 'middle' ? 'center' 
            : 'flex-start'
        }}
      >
        <div 
          dangerouslySetInnerHTML={{ __html: element.html }}
          style={{
            fontSize: `${12 * scale}px`,
            lineHeight: 1.4
          }}
        />
      </div>
    );
  }
  
  // Render chart placeholder
  if (element.type === 'chart') {
    return (
      <div 
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          border: '1px dashed #ccc',
          borderRadius: '4px'
        }}
      >
        <div style={{ textAlign: 'center', color: '#666', fontSize: '12px' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>📊</div>
          <div>Chart</div>
        </div>
      </div>
    );
  }
  
  // Render group
  if (element.type === 'group' && element.children) {
    return (
      <div style={style}>
        {element.children.map((child, idx) => (
          <ElementRenderer key={idx} element={child} scale={scale} />
        ))}
      </div>
    );
  }
  
  // Render empty shape
  if (element.type === 'shape') {
    return <div style={style} />;
  }
  
  return null;
});

ElementRenderer.displayName = 'ElementRenderer';

const SlideRenderer = memo(({ 
  slide, 
  slideWidth, 
  slideHeight, 
  scale 
}: SlideRendererProps) => {
  const aspectRatio = slideWidth / slideHeight;
  
  const backgroundStyle = useMemo((): React.CSSProperties => {
    const bg: React.CSSProperties = {
      width: '100%',
      paddingBottom: `${(1 / aspectRatio) * 100}%`,
      position: 'relative',
      backgroundColor: '#FFFFFF',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
    };
    
    if (slide.background) {
      if (slide.background.color) {
        bg.backgroundColor = slide.background.color;
      }
      if (slide.background.image) {
        bg.backgroundImage = `url(${slide.background.image})`;
        bg.backgroundSize = 'cover';
        bg.backgroundPosition = 'center';
      }
      if (slide.background.gradient) {
        const { type, colors, angle = 90 } = slide.background.gradient;
        if (type === 'linear') {
          bg.background = `linear-gradient(${angle}deg, ${colors.join(', ')})`;
        } else {
          bg.background = `radial-gradient(circle, ${colors.join(', ')})`;
        }
      }
    }
    
    return bg;
  }, [slide.background, aspectRatio]);
  
  return (
    <div style={backgroundStyle}>
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      >
        {slide.elements.map((element, idx) => (
          <ElementRenderer key={idx} element={element} scale={scale} />
        ))}
      </div>
    </div>
  );
});

SlideRenderer.displayName = 'SlideRenderer';

export default SlideRenderer;
