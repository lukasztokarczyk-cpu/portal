const prisma = require('../prisma/client');
const { uploadFile, getSignedUrl } = require('../utils/supabaseStorage');
const { sendMessageNotification } = require('../utils/email');
const { uploadFile, getSignedUrl } = require('../utils/supabaseStorage');

exports.getByWedding = async (req, res, next) => {
  try {
    const messages = await prisma.message.findMany({
      where: { weddingId: req.params.weddingId },
      include: { sender: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const unreadCount = messages.filter((m) => !m.isRead && m.senderId !== req.user.id).length;
    res.json({ messages, unreadCount });
  } catch (err) {
    next(err);
  }
};

exports.send = async (req, res, next) => {
  try {
    const { content } = req.body;
    let attachment = null;
    if (req.file) {
      attachment = await uploadFile(
        req.file.buffer,
        'attachments',
        req.file.originalname,
        req.file.mimetype
      );
    }
    const message = await prisma.message.create({
      data: {
        weddingId: req.params.weddingId,
        senderId: req.user.id,
        content,
        attachment, // storePath in Supabase
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });
    // Wyślij email z powiadomieniem (nie czekaj — async w tle)
    const wedding = await prisma.wedding.findUnique({
      where: { id: req.params.weddingId },
      include: { couple: { select: { name: true, email: true } } }
    });
    sendMessageNotification({
      senderName: req.user.name || req.user.login,
      senderRole: req.user.role,
      coupleName: wedding?.couple?.name || wedding?.couple?.email || '',
      content: content.length > 200 ? content.substring(0, 200) + '...' : content,
      weddingId: req.params.weddingId,
    }).catch(err => console.error('[EMAIL] Błąd:', err.message));

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};

exports.getAttachmentUrl = async (req, res, next) => {
  try {
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message || !message.attachment) return res.status(404).json({ error: 'Brak załącznika' });
    const signedUrl = await getSignedUrl('attachments', message.attachment, 3600);
    res.redirect(signedUrl);
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await prisma.message.updateMany({
      where: { weddingId: req.params.weddingId, senderId: { not: req.user.id }, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'Oznaczono jako przeczytane' });
  } catch (err) {
    next(err);
  }
};
