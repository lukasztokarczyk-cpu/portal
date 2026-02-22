const prisma = require('../prisma/client');
const { uploadFile, getSignedUrl, deleteFile } = require('../utils/supabaseStorage');

exports.getByWedding = async (req, res, next) => {
  try {
    const documents = await prisma.document.findMany({
      where: { weddingId: req.params.weddingId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(documents);
  } catch (err) {
    next(err);
  }
};

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Brak pliku' });
    const { title, type } = req.body;

    const storePath = await uploadFile(
      req.file.buffer,
      'documents',
      req.file.originalname,
      req.file.mimetype
    );

    const doc = await prisma.document.create({
      data: {
        weddingId: req.params.weddingId,
        title,
        type,
        filePath: storePath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user.id,
      },
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

exports.download = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Dokument nie istnieje' });

    if (req.user.role === 'couple') {
      const wedding = await prisma.wedding.findUnique({ where: { coupleId: req.user.id } });
      if (!wedding || wedding.id !== doc.weddingId) return res.status(403).json({ error: 'Brak dostępu' });
    }

    const signedUrl = await getSignedUrl('documents', doc.filePath, 3600);
    res.redirect(signedUrl);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Dokument nie istnieje' });
    await deleteFile('documents', doc.filePath);
    await prisma.document.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
