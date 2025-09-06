export function errorHandler(err: any, _req: any, res: any, _next: any) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
}
