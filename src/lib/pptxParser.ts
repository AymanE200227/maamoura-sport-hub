/**
 * High-fidelity PPTX Parser
 * Extracts slides, images, shapes, charts, text with full styling
 * Works completely offline - no external services
 */

import JSZip from 'jszip';

export interface SlideElement {
  type: 'text' | 'image' | 'shape' | 'chart' | 'table' | 'group';
  content?: string;
  html?: string;
  src?: string; // For images - base64 data URL
  alt?: string;
  x: number; // Position in percentage
  y: number;
  width: number;
  height: number;
  rotation?: number;
  style?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
    borderColor?: string;
    borderWidth?: number;
    opacity?: number;
    gradient?: {
      type: 'linear' | 'radial';
      colors: string[];
      angle?: number;
    };
    shadow?: boolean;
  };
  children?: SlideElement[];
}

export interface ParsedSlide {
  index: number;
  elements: SlideElement[];
  background?: {
    color?: string;
    image?: string;
    gradient?: {
      type: 'linear' | 'radial';
      colors: string[];
      angle?: number;
    };
  };
  notes?: string;
  layoutName?: string;
}

export interface ParsedPresentation {
  slides: ParsedSlide[];
  title?: string;
  author?: string;
  slideWidth: number;
  slideHeight: number;
  theme?: {
    colors: Record<string, string>;
    fonts: {
      major: string;
      minor: string;
    };
  };
}

// EMU (English Metric Units) to pixels conversion
const EMU_PER_PIXEL = 9525;
const emuToPixel = (emu: number): number => Math.round(emu / EMU_PER_PIXEL);

// Parse color from various OOXML formats
const parseColor = (colorNode: Element | null, defaultColor = '#000000'): string => {
  if (!colorNode) return defaultColor;
  
  // srgbClr - direct RGB color
  const srgb = colorNode.querySelector('srgbClr');
  if (srgb) {
    const val = srgb.getAttribute('val');
    return val ? `#${val}` : defaultColor;
  }
  
  // schemeClr - theme color reference
  const scheme = colorNode.querySelector('schemeClr');
  if (scheme) {
    const val = scheme.getAttribute('val');
    // Map common scheme colors
    const schemeColors: Record<string, string> = {
      'dk1': '#000000', 'lt1': '#FFFFFF', 'dk2': '#1F497D', 'lt2': '#EEECE1',
      'accent1': '#4472C4', 'accent2': '#ED7D31', 'accent3': '#A5A5A5',
      'accent4': '#FFC000', 'accent5': '#5B9BD5', 'accent6': '#70AD47',
      'hlink': '#0563C1', 'folHlink': '#954F72', 'tx1': '#000000', 'bg1': '#FFFFFF',
      'tx2': '#44546A', 'bg2': '#E7E6E6'
    };
    return schemeColors[val || ''] || defaultColor;
  }
  
  return defaultColor;
};

// Parse font size from OOXML (hundredths of a point)
const parseFontSize = (sizeStr: string | null): number => {
  if (!sizeStr) return 18;
  const size = parseInt(sizeStr, 10);
  return Math.round(size / 100);
};

// Extract text runs with styling from a paragraph
const parseTextRun = (rNode: Element): { text: string; style: SlideElement['style'] } => {
  const tNode = rNode.querySelector('t');
  const text = tNode?.textContent || '';
  
  const rPr = rNode.querySelector('rPr');
  const style: SlideElement['style'] = {};
  
  if (rPr) {
    const sz = rPr.getAttribute('sz');
    if (sz) style.fontSize = parseFontSize(sz);
    
    if (rPr.getAttribute('b') === '1') style.bold = true;
    if (rPr.getAttribute('i') === '1') style.italic = true;
    if (rPr.getAttribute('u') === 'sng') style.underline = true;
    
    const solidFill = rPr.querySelector('solidFill');
    if (solidFill) {
      style.color = parseColor(solidFill);
    }
    
    const latin = rPr.querySelector('latin');
    if (latin) {
      style.fontFamily = latin.getAttribute('typeface') || undefined;
    }
  }
  
  return { text, style };
};

// Parse a text frame (txBody)
const parseTextBody = (txBody: Element): { html: string; plainText: string } => {
  const paragraphs: string[] = [];
  const plainTexts: string[] = [];
  
  txBody.querySelectorAll('p').forEach(p => {
    const pPr = p.querySelector('pPr');
    let align = 'left';
    if (pPr) {
      const algn = pPr.getAttribute('algn');
      if (algn === 'ctr') align = 'center';
      else if (algn === 'r') align = 'right';
      else if (algn === 'just') align = 'justify';
    }
    
    const runs: string[] = [];
    const texts: string[] = [];
    
    p.querySelectorAll('r').forEach(r => {
      const { text, style } = parseTextRun(r);
      texts.push(text);
      
      let styledText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      if (style.bold) styledText = `<strong>${styledText}</strong>`;
      if (style.italic) styledText = `<em>${styledText}</em>`;
      if (style.underline) styledText = `<u>${styledText}</u>`;
      
      const inlineStyles: string[] = [];
      if (style.color) inlineStyles.push(`color:${style.color}`);
      if (style.fontSize) inlineStyles.push(`font-size:${style.fontSize}pt`);
      if (style.fontFamily) inlineStyles.push(`font-family:${style.fontFamily}`);
      
      if (inlineStyles.length > 0) {
        styledText = `<span style="${inlineStyles.join(';')}">${styledText}</span>`;
      }
      
      runs.push(styledText);
    });
    
    if (runs.length > 0 || texts.length > 0) {
      paragraphs.push(`<p style="text-align:${align};margin:0.25em 0">${runs.join('')}</p>`);
      plainTexts.push(texts.join(''));
    }
  });
  
  return {
    html: paragraphs.join(''),
    plainText: plainTexts.join('\n')
  };
};

// Parse shape position and size
const parseTransform = (xfrmNode: Element | null, slideWidth: number, slideHeight: number): {
  x: number; y: number; width: number; height: number; rotation?: number;
} => {
  if (!xfrmNode) {
    return { x: 0, y: 0, width: 50, height: 20 };
  }
  
  const off = xfrmNode.querySelector('off');
  const ext = xfrmNode.querySelector('ext');
  
  const x = off ? emuToPixel(parseInt(off.getAttribute('x') || '0', 10)) : 0;
  const y = off ? emuToPixel(parseInt(off.getAttribute('y') || '0', 10)) : 0;
  const width = ext ? emuToPixel(parseInt(ext.getAttribute('cx') || '0', 10)) : 100;
  const height = ext ? emuToPixel(parseInt(ext.getAttribute('cy') || '0', 10)) : 50;
  
  const rot = xfrmNode.getAttribute('rot');
  const rotation = rot ? parseInt(rot, 10) / 60000 : undefined; // Convert to degrees
  
  // Convert to percentage of slide
  return {
    x: (x / slideWidth) * 100,
    y: (y / slideHeight) * 100,
    width: (width / slideWidth) * 100,
    height: (height / slideHeight) * 100,
    rotation
  };
};

// Parse fill (solid, gradient, image)
const parseFill = (spPr: Element | null): SlideElement['style'] => {
  if (!spPr) return {};
  
  const style: SlideElement['style'] = {};
  
  // Solid fill
  const solidFill = spPr.querySelector('solidFill');
  if (solidFill) {
    style.backgroundColor = parseColor(solidFill, 'transparent');
  }
  
  // Gradient fill
  const gradFill = spPr.querySelector('gradFill');
  if (gradFill) {
    const gsLst = gradFill.querySelectorAll('gs');
    const colors: string[] = [];
    gsLst.forEach(gs => {
      colors.push(parseColor(gs, '#FFFFFF'));
    });
    if (colors.length >= 2) {
      const lin = gradFill.querySelector('lin');
      const angle = lin ? parseInt(lin.getAttribute('ang') || '0', 10) / 60000 : 90;
      style.gradient = { type: 'linear', colors, angle };
    }
  }
  
  // Border/line
  const ln = spPr.querySelector('ln');
  if (ln) {
    const w = ln.getAttribute('w');
    if (w) style.borderWidth = emuToPixel(parseInt(w, 10));
    const lnFill = ln.querySelector('solidFill');
    if (lnFill) style.borderColor = parseColor(lnFill);
  }
  
  return style;
};

export async function parsePPTX(arrayBuffer: ArrayBuffer): Promise<ParsedPresentation> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // Default slide dimensions (standard 16:9)
  let slideWidth = 960;
  let slideHeight = 540;
  
  // Try to get actual slide dimensions from presentation.xml
  const presXml = zip.file('ppt/presentation.xml');
  if (presXml) {
    const presContent = await presXml.async('text');
    const presDoc = new DOMParser().parseFromString(presContent, 'application/xml');
    const sldSz = presDoc.querySelector('sldSz');
    if (sldSz) {
      slideWidth = emuToPixel(parseInt(sldSz.getAttribute('cx') || '9144000', 10));
      slideHeight = emuToPixel(parseInt(sldSz.getAttribute('cy') || '5143500', 10));
    }
  }
  
  // Extract media files (images)
  const mediaFiles: Record<string, string> = {};
  const mediaFolder = zip.folder('ppt/media');
  if (mediaFolder) {
    const files = Object.keys(zip.files).filter(name => name.startsWith('ppt/media/'));
    for (const filePath of files) {
      const file = zip.file(filePath);
      if (file) {
        const data = await file.async('base64');
        const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
        const mimeTypes: Record<string, string> = {
          'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
          'gif': 'image/gif', 'svg': 'image/svg+xml', 'emf': 'image/emf',
          'wmf': 'image/wmf', 'tiff': 'image/tiff', 'bmp': 'image/bmp'
        };
        const mime = mimeTypes[ext] || 'image/png';
        const fileName = filePath.split('/').pop() || '';
        mediaFiles[fileName] = `data:${mime};base64,${data}`;
      }
    }
  }
  
  // Parse relationships for each slide
  const slideRels: Record<number, Record<string, string>> = {};
  
  // Find all slide files
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0', 10);
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0', 10);
      return numA - numB;
    });
  
  const slides: ParsedSlide[] = [];
  
  for (let i = 0; i < slideFiles.length; i++) {
    const slideFile = slideFiles[i];
    const slideNum = parseInt(slideFile.match(/slide(\d+)/)?.[1] || '1', 10);
    
    // Load slide relationships
    const relsPath = slideFile.replace('slides/', 'slides/_rels/').replace('.xml', '.xml.rels');
    const relsFile = zip.file(relsPath);
    const rels: Record<string, string> = {};
    
    if (relsFile) {
      const relsContent = await relsFile.async('text');
      const relsDoc = new DOMParser().parseFromString(relsContent, 'application/xml');
      relsDoc.querySelectorAll('Relationship').forEach(rel => {
        const rId = rel.getAttribute('Id') || '';
        const target = rel.getAttribute('Target') || '';
        rels[rId] = target;
      });
    }
    
    // Parse slide content
    const slideContent = await zip.file(slideFile)?.async('text');
    if (!slideContent) continue;
    
    const slideDoc = new DOMParser().parseFromString(slideContent, 'application/xml');
    const elements: SlideElement[] = [];
    
    // Parse background
    let background: ParsedSlide['background'] = undefined;
    const cSld = slideDoc.querySelector('cSld');
    if (cSld) {
      const bg = cSld.querySelector('bg');
      if (bg) {
        const bgPr = bg.querySelector('bgPr');
        if (bgPr) {
          const solidFill = bgPr.querySelector('solidFill');
          if (solidFill) {
            background = { color: parseColor(solidFill, '#FFFFFF') };
          }
          const gradFill = bgPr.querySelector('gradFill');
          if (gradFill) {
            const gsLst = gradFill.querySelectorAll('gs');
            const colors: string[] = [];
            gsLst.forEach(gs => colors.push(parseColor(gs, '#FFFFFF')));
            if (colors.length >= 2) {
              background = { gradient: { type: 'linear', colors, angle: 90 } };
            }
          }
        }
      }
    }
    
    // Parse all shapes in spTree
    const spTree = slideDoc.querySelector('spTree');
    if (spTree) {
      // Parse shapes (sp)
      spTree.querySelectorAll(':scope > sp').forEach(sp => {
        const nvSpPr = sp.querySelector('nvSpPr');
        const spPr = sp.querySelector('spPr');
        const txBody = sp.querySelector('txBody');
        
        const xfrm = spPr?.querySelector('xfrm');
        const transform = parseTransform(xfrm || null, slideWidth, slideHeight);
        const fillStyle = parseFill(spPr || null);
        
        const element: SlideElement = {
          type: 'shape',
          ...transform,
          style: fillStyle
        };
        
        if (txBody) {
          const { html, plainText } = parseTextBody(txBody);
          element.html = html;
          element.content = plainText;
          if (plainText.trim()) {
            element.type = 'text';
          }
        }
        
        elements.push(element);
      });
      
      // Parse pictures (pic)
      spTree.querySelectorAll(':scope > pic').forEach(pic => {
        const blipFill = pic.querySelector('blipFill');
        const spPr = pic.querySelector('spPr');
        
        const xfrm = spPr?.querySelector('xfrm');
        const transform = parseTransform(xfrm || null, slideWidth, slideHeight);
        
        let imageSrc = '';
        const blip = blipFill?.querySelector('blip');
        if (blip) {
          // Get embed reference
          const embedAttr = blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') 
            || blip.getAttribute('r:embed');
          if (embedAttr && rels[embedAttr]) {
            const mediaPath = rels[embedAttr].replace('../media/', '');
            imageSrc = mediaFiles[mediaPath] || '';
          }
        }
        
        if (imageSrc) {
          elements.push({
            type: 'image',
            src: imageSrc,
            alt: 'Slide image',
            ...transform,
            style: parseFill(spPr || null)
          });
        }
      });
      
      // Parse group shapes (grpSp)
      spTree.querySelectorAll(':scope > grpSp').forEach(grpSp => {
        const grpSpPr = grpSp.querySelector('grpSpPr');
        const xfrm = grpSpPr?.querySelector('xfrm');
        const transform = parseTransform(xfrm || null, slideWidth, slideHeight);
        
        const groupElement: SlideElement = {
          type: 'group',
          ...transform,
          children: []
        };
        
        // Parse nested shapes
        grpSp.querySelectorAll(':scope > sp').forEach(sp => {
          const spPr = sp.querySelector('spPr');
          const txBody = sp.querySelector('txBody');
          const innerXfrm = spPr?.querySelector('xfrm');
          const innerTransform = parseTransform(innerXfrm || null, slideWidth, slideHeight);
          
          const child: SlideElement = {
            type: 'text',
            ...innerTransform,
            style: parseFill(spPr || null)
          };
          
          if (txBody) {
            const { html, plainText } = parseTextBody(txBody);
            child.html = html;
            child.content = plainText;
          }
          
          groupElement.children?.push(child);
        });
        
        elements.push(groupElement);
      });
      
      // Parse charts (graphicFrame)
      spTree.querySelectorAll(':scope > graphicFrame').forEach(gf => {
        const xfrm = gf.querySelector('xfrm');
        const transform = parseTransform(xfrm || null, slideWidth, slideHeight);
        
        elements.push({
          type: 'chart',
          content: 'Chart (complex rendering not supported)',
          ...transform,
          style: {
            backgroundColor: '#f0f0f0',
            borderColor: '#cccccc',
            borderWidth: 1
          }
        });
      });
    }
    
    slides.push({
      index: i,
      elements,
      background
    });
  }
  
  return {
    slides,
    slideWidth,
    slideHeight
  };
}
