/**
 * High-fidelity DOCX Parser
 * Uses mammoth.js with custom image and style handling
 * Preserves images as inline base64, maintains formatting
 */

import mammoth from 'mammoth';
import JSZip from 'jszip';

export interface ParsedDocument {
  html: string;
  plainText: string;
  title?: string;
  images: Array<{
    src: string;
    alt?: string;
  }>;
  styles?: string;
}

// Extract images from DOCX and create base64 data URLs
async function extractImages(arrayBuffer: ArrayBuffer): Promise<Record<string, string>> {
  const images: Record<string, string> = {};
  
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const mediaFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('word/media/') && !name.endsWith('/')
    );
    
    for (const filePath of mediaFiles) {
      const file = zip.file(filePath);
      if (file) {
        const data = await file.async('base64');
        const fileName = filePath.split('/').pop() || '';
        const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
        
        const mimeTypes: Record<string, string> = {
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'bmp': 'image/bmp',
          'tiff': 'image/tiff',
          'emf': 'image/emf',
          'wmf': 'image/wmf',
          'svg': 'image/svg+xml'
        };
        
        const mime = mimeTypes[ext] || 'image/png';
        images[fileName] = `data:${mime};base64,${data}`;
      }
    }
  } catch (e) {
    console.error('Error extracting images from DOCX:', e);
  }
  
  return images;
}

// Custom image converter for mammoth
function createImageConverter() {
  return mammoth.images.imgElement(function(image: any) {
    return image.readAsBase64String().then(function(imageBuffer: string) {
      const contentType = image.contentType || 'image/png';
      return {
        src: `data:${contentType};base64,${imageBuffer}`
      };
    });
  });
}

export async function parseDOCX(arrayBuffer: ArrayBuffer): Promise<ParsedDocument> {
  // Configure mammoth with custom styling
  const options = {
    arrayBuffer,
    convertImage: createImageConverter(),
    styleMap: [
      // Headings
      "p[style-name='Heading 1'] => h1.doc-h1:fresh",
      "p[style-name='Heading 2'] => h2.doc-h2:fresh",
      "p[style-name='Heading 3'] => h3.doc-h3:fresh",
      "p[style-name='Heading 4'] => h4.doc-h4:fresh",
      "p[style-name='Title'] => h1.doc-title:fresh",
      "p[style-name='Subtitle'] => h2.doc-subtitle:fresh",
      
      // Text styles
      "p[style-name='Quote'] => blockquote.doc-quote:fresh",
      "p[style-name='Intense Quote'] => blockquote.doc-quote-intense:fresh",
      
      // Lists
      "p[style-name='List Paragraph'] => li.doc-list-item:fresh",
      
      // Character styles
      "r[style-name='Strong'] => strong",
      "r[style-name='Emphasis'] => em",
      "r[style-name='Intense Emphasis'] => em.doc-intense",
      
      // Tables
      "table => table.doc-table",
      "tr => tr.doc-row",
      "td => td.doc-cell",
      "th => th.doc-header-cell"
    ]
  };
  
  try {
    const result = await mammoth.convertToHtml(options);
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    
    // Enhanced CSS for document styling
    const documentStyles = `
      <style>
        .doc-container {
          font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #1a1a1a;
          max-width: 100%;
          word-wrap: break-word;
        }
        .doc-container h1, .doc-h1, .doc-title {
          font-size: 2em;
          font-weight: 600;
          color: #2b579a;
          margin: 1em 0 0.5em;
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 0.3em;
        }
        .doc-container h2, .doc-h2, .doc-subtitle {
          font-size: 1.5em;
          font-weight: 600;
          color: #2b579a;
          margin: 1em 0 0.5em;
        }
        .doc-container h3, .doc-h3 {
          font-size: 1.25em;
          font-weight: 600;
          color: #404040;
          margin: 1em 0 0.5em;
        }
        .doc-container h4, .doc-h4 {
          font-size: 1.1em;
          font-weight: 600;
          color: #404040;
          margin: 1em 0 0.5em;
        }
        .doc-container p {
          margin: 0.5em 0;
          text-align: justify;
        }
        .doc-container ul, .doc-container ol {
          margin: 0.5em 0;
          padding-left: 2em;
        }
        .doc-container li {
          margin: 0.25em 0;
        }
        .doc-container .doc-quote {
          border-left: 4px solid #2b579a;
          padding: 0.5em 1em;
          margin: 1em 0;
          background: #f8f9fa;
          font-style: italic;
          color: #555;
        }
        .doc-container .doc-quote-intense {
          border-left: 4px solid #c00000;
          background: #fff5f5;
        }
        .doc-container .doc-table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
          font-size: 0.95em;
        }
        .doc-container .doc-table th,
        .doc-container .doc-table td {
          border: 1px solid #d0d0d0;
          padding: 0.5em 0.75em;
          text-align: left;
        }
        .doc-container .doc-table th,
        .doc-container .doc-header-cell {
          background: #f0f0f0;
          font-weight: 600;
          color: #2b579a;
        }
        .doc-container .doc-table tr:nth-child(even) td {
          background: #fafafa;
        }
        .doc-container img {
          max-width: 100%;
          height: auto;
          margin: 1em 0;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .doc-container a {
          color: #2b579a;
          text-decoration: underline;
        }
        .doc-container strong {
          font-weight: 600;
          color: #000;
        }
        .doc-container em {
          font-style: italic;
        }
        .doc-container .doc-intense {
          font-weight: 600;
          color: #2b579a;
        }
        .doc-container sup {
          font-size: 0.75em;
          vertical-align: super;
        }
        .doc-container sub {
          font-size: 0.75em;
          vertical-align: sub;
        }
        .doc-container hr {
          border: none;
          border-top: 1px solid #e0e0e0;
          margin: 1.5em 0;
        }
      </style>
    `;
    
    const fullHtml = `${documentStyles}<div class="doc-container">${result.value}</div>`;
    
    // Extract image sources for reference
    const imageSources: Array<{ src: string; alt?: string }> = [];
    const imgMatches = result.value.matchAll(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g);
    for (const match of imgMatches) {
      imageSources.push({ src: match[1], alt: match[2] || undefined });
    }
    
    return {
      html: fullHtml,
      plainText: textResult.value,
      images: imageSources,
      styles: documentStyles
    };
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
