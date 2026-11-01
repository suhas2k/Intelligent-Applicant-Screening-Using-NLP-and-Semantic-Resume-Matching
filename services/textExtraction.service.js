const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
require('../utils/polyfills');

let pdfModule = null;
function getPdfModule() {
  if (!pdfModule) {
    try {
      require('../utils/polyfills');
      pdfModule = require('pdf-parse');
    } catch (err) {
      console.warn('[PDF Module Warning] Could not load pdf-parse:', err.message);
    }
  }
  return pdfModule;
}

/**
 * Clean and normalize extracted raw text
 */
function normalizeText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u0000/g, '') // remove null bytes
    .replace(/[ \t]+/g, ' ') // collapse horizontal spaces
    .replace(/\n{3,}/g, '\n\n') // collapse multiple blank lines
    .trim();
}

/**
 * Extract raw text from uploaded resume file (PDF, DOCX, TXT)
 * @param {string} filePath - Absolute path to uploaded file
 * @param {string} originalName - Original filename
 * @returns {Promise<string>}
 */
async function extractResumeText(filePath, originalName) {
  const ext = (path.extname(originalName || filePath) || '').toLowerCase();
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at: ${filePath}`);
  }

  const fileBuffer = await fs.promises.readFile(filePath);
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('The uploaded file is empty (0 bytes). Please upload a valid resume document.');
  }

  // Signature / Magic Bytes Validation
  if (ext === '.pdf') {
    const magic = fileBuffer.slice(0, 5).toString('ascii');
    if (!magic.startsWith('%PDF')) {
      throw new Error('Invalid PDF file signature. The uploaded file is corrupted or not a valid PDF document.');
    }
  } else if (ext === '.docx') {
    // DOCX is a zip archive starting with PK (0x50 0x4B 0x03 0x04)
    const isZip = fileBuffer.length > 4 && fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B;
    if (!isZip) {
      throw new Error('Invalid DOCX file signature. The uploaded file is corrupted or not a valid Microsoft Word document.');
    }
  }

  let extractedText = '';

  try {
    if (ext === '.pdf') {
      const pdf = getPdfModule();
      if (pdf && pdf.PDFParse) {
        const parser = new pdf.PDFParse({ data: fileBuffer });
        const res = await parser.getText();
        extractedText = res.text || '';
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      } else if (typeof pdf === 'function') {
        const res = await pdf(fileBuffer);
        extractedText = res.text || '';
      } else {
        // Resilient fallback for serverless environments:
        // Extract raw text streams and printable strings from PDF buffer directly
        const rawString = fileBuffer.toString('latin1');
        const textBlocks = [];
        const btRegex = /BT[\s\S]*?ET/g;
        let match;
        while ((match = btRegex.exec(rawString)) !== null) {
          const tjMatches = match[0].match(/\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g);
          if (tjMatches) {
            tjMatches.forEach(tj => {
              const cleaned = tj.replace(/^\[|\(?TJ\)?|\(?Tj\)?|\]$/g, '').replace(/\\([()\\])/g, '$1');
              textBlocks.push(cleaned);
            });
          }
        }
        if (textBlocks.length > 0) {
          extractedText = textBlocks.join(' ');
        } else {
          extractedText = rawString.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
        }
      }
    } else if (ext === '.docx' || ext === '.doc') {
      const res = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = res.value || '';
    } else if (ext === '.txt') {
      extractedText = fileBuffer.toString('utf8');
    } else {
      // Best effort fallback
      try {
        const res = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = res.value || '';
      } catch (err) {
        extractedText = fileBuffer.toString('utf8');
      }
    }
  } catch (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('password') || msg.includes('encrypt')) {
      throw new Error('This PDF resume is password-protected or encrypted. Please upload an unprotected copy.');
    }
    console.error(`[Text Extraction Error for ${originalName}]:`, error.message);
    throw new Error(`Failed to extract text from ${originalName}: ${error.message}`);
  }

  const cleaned = normalizeText(extractedText);
  if (!cleaned || cleaned.length < 20) {
    console.warn(`[Warning] Extracted text for ${originalName} is very short (${cleaned.length} chars). File may be scanned image.`);
  }

  return cleaned;
}

module.exports = {
  extractResumeText,
  normalizeText
};
