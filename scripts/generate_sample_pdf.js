const fs = require('fs');
const path = require('path');
const { DEMO_RESUMES } = require('./seed');

/**
 * Generate a valid, parseable PDF 1.4 file containing the specified text lines
 */
function createSimplePdf(textContent) {
  // Split into lines and escape parentheses
  const lines = textContent
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, 45); // fit on page

  let streamContent = 'BT\n/F1 10 Tf\n14 TL\n50 750 Td\n';
  for (const line of lines) {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    streamContent += `(${escaped}) '\n`;
  }
  streamContent += 'ET\n';

  const streamLength = Buffer.byteLength(streamContent, 'utf-8');

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  // Object 1: Catalog
  offsets.push(pdf.length);
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // Object 2: Pages
  offsets.push(pdf.length);
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  // Object 3: Page
  offsets.push(pdf.length);
  pdf += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';

  // Object 4: Contents Stream
  offsets.push(pdf.length);
  pdf += `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}endstream\nendobj\n`;

  // Object 5: Font
  offsets.push(pdf.length);
  pdf += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  // Cross-reference table
  const startXref = pdf.length;
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  }

  // Trailer
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf-8');
}

// Generate sample PDF resumes
const resumesDir = path.join(__dirname, '..', 'sample_resumes');

const alexPdf = createSimplePdf(DEMO_RESUMES.alexMorgan);
fs.writeFileSync(path.join(resumesDir, 'Alex_Morgan_Senior_FullStack.pdf'), alexPdf);

const priyaPdf = createSimplePdf(DEMO_RESUMES.priyaSharma);
fs.writeFileSync(path.join(resumesDir, 'Priya_Sharma_Lead_NLP.pdf'), priyaPdf);

const davidPdf = createSimplePdf(DEMO_RESUMES.davidKim);
fs.writeFileSync(path.join(resumesDir, 'David_Kim_Frontend_Dev.pdf'), davidPdf);

console.log('[PDF Generator] Created 3 valid sample PDF resumes in sample_resumes/');
