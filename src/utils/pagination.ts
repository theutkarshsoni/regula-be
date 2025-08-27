export function paging(qparams: any) {
  const page = Math.max(1, parseInt(qparams.page ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(qparams.pageSize ?? '20', 10)));
  const offset = (page - 1) * pageSize;

  return { limit: pageSize, offset };
}