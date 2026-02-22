/**
 * Upload middleware – pliki trafiają do pamięci (memoryStorage),
 * a następnie są wysyłane do Supabase Storage przez supabaseStorage.js.
 * Render.com ma efemeryczny filesystem, więc dysk lokalny odpada.
 */
const multer = require('multer');
const path = require('path');

const memStorage = multer.memoryStorage();

const documentUpload = multer({
  storage: memStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Dozwolone tylko pliki PDF i Word'));
  },
});

const invoiceUpload = multer({
  storage: memStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.pdf') cb(null, true);
    else cb(new Error('Dozwolone tylko pliki PDF'));
  },
});

const attachmentUpload = multer({
  storage: memStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

module.exports = { documentUpload, invoiceUpload, attachmentUpload };
