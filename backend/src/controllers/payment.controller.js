const prisma = require('../prisma/client');
const { uploadFile, getSignedUrl } = require('../utils/supabaseStorage');

exports.getByWedding = async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { weddingId: req.params.weddingId },
      orderBy: { dueDate: 'asc' },
    });
    const total = payments.reduce((s, p) => s + Number(p.amount), 0);
    const paid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
    res.json({ payments, summary: { total, paid, balance: total - paid } });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { title, amount, dueDate, notes } = req.body;
    const payment = await prisma.payment.create({
      data: { weddingId: req.params.weddingId, title, amount, dueDate: dueDate ? new Date(dueDate) : null, notes },
    });
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { title, amount, dueDate, notes, status } = req.body;
    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(amount && { amount }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(notes !== undefined && { notes }),
        ...(status && { status, paidAt: status === 'paid' ? new Date() : null }),
      },
    });
    res.json(payment);
  } catch (err) { next(err); }
};

exports.markPaid = async (req, res, next) => {
  try {
    const { paid } = req.body;
    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: { status: paid !== false ? 'paid' : 'unpaid', paidAt: paid !== false ? new Date() : null },
    });
    res.json(payment);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.payment.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.uploadInvoice = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Brak pliku faktury' });
    const storePath = await uploadFile(
      req.file.buffer,
      'invoices',
      req.file.originalname,
      req.file.mimetype
    );
    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: { invoicePath: storePath },
    });
    res.json(payment);
  } catch (err) {
    next(err);
  }
};

exports.getInvoiceUrl = async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment || !payment.invoicePath) return res.status(404).json({ error: 'Brak faktury' });
    const signedUrl = await getSignedUrl('invoices', payment.invoicePath, 3600);
    res.json({ url: signedUrl });
  } catch (err) {
    next(err);
  }
};
