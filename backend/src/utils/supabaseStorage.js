/**
 * Supabase Storage helper
 * Obsługuje upload i usuwanie plików z Supabase Storage.
 * Buckety: documents, invoices, attachments (ustawione jako non-public w Supabase,
 * dostęp tylko przez signed URL generowany tu).
 */
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

let supabase;
const getClient = () => {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // service role – tylko backend!
    );
  }
  return supabase;
};

/**
 * Wgrywa plik z req.file.buffer do Supabase Storage.
 * @param {Buffer} buffer     - bufor pliku (multer memoryStorage)
 * @param {string} bucket     - nazwa bucketu: 'documents' | 'invoices' | 'attachments'
 * @param {string} originalname - oryginalna nazwa pliku
 * @param {string} mimetype   - typ MIME
 * @returns {string} ścieżka w buckecie (storePath)
 */
const uploadFile = async (buffer, bucket, originalname, mimetype) => {
  const sb = getClient();
  const ext = path.extname(originalname).toLowerCase();
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  const { data, error } = await sb.storage.from(bucket).upload(filename, buffer, {
    contentType: mimetype,
    upsert: false,
  });

  if (error) throw new Error(`Supabase Storage upload error: ${error.message}`);
  return data.path; // np. "1234567890-123456789.pdf"
};

/**
 * Generuje tymczasowy signed URL (60 minut).
 * @param {string} bucket
 * @param {string} storePath
 * @returns {string} signedUrl
 */
const getSignedUrl = async (bucket, storePath, expiresIn = 3600) => {
  const sb = getClient();
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(storePath, expiresIn);
  if (error) throw new Error(`Supabase signed URL error: ${error.message}`);
  return data.signedUrl;
};

/**
 * Usuwa plik z bucketu.
 * @param {string} bucket
 * @param {string} storePath
 */
const deleteFile = async (bucket, storePath) => {
  const sb = getClient();
  const { error } = await sb.storage.from(bucket).remove([storePath]);
  if (error) console.error(`Supabase delete error: ${error.message}`);
};

module.exports = { uploadFile, getSignedUrl, deleteFile };
