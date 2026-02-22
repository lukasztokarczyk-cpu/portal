const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Zasób nie został znaleziony' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Zasób już istnieje (duplikat)' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Wewnętrzny błąd serwera',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const notFound = (req, res) => {
  res.status(404).json({ error: `Endpoint ${req.originalUrl} nie istnieje` });
};

module.exports = { errorHandler, notFound };
