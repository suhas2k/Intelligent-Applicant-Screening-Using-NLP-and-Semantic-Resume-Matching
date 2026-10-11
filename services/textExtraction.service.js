const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfModule = require('pdf-parse');

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
  const fileBuffer = await fs.promises.readFile(filePath);

  let extractedText = '';

  try {
    if (ext === '.pdf') {
      // Check for pdf-parse v2 class structure
      if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: fileBuffer });
        const res = await parser.getText();
        extractedText = res.text || '';
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      } else if (typeof pdfModule === 'function') {
        // Fallback for pdf-parse v1
        const res = await pdfModule(fileBuffer);
        extractedText = res.text || '';
      } else {
        throw new Error('Incompatible pdf-parse library structure');
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
