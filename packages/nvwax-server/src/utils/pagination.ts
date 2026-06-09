/**
 * 分页参数验证工具
 */

/** 默认每页数量 */
export const DEFAULT_PAGE_SIZE = 20;

/** 每页最大数量 */
export const MAX_PAGE_SIZE = 100;

/**
 * 验证并规范化分页参数
 * @param page 页码（从1开始）
 * @param limit 每页数量
 * @returns 规范化后的分页参数
 */
export function normalizePagination(page?: number, limit?: number): { page: number; limit: number; offset: number } {
  // 规范化页码
  const normalizedPage = Math.max(1, Math.floor(page ?? 1));
  
  // 规范化每页数量，限制在合理范围内
  const normalizedLimit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(limit ?? DEFAULT_PAGE_SIZE))
  );
  
  // 计算偏移量
  const offset = (normalizedPage - 1) * normalizedLimit;
  
  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset
  };
}

/**
 * 获取带分页的查询参数
 * @param page 页码
 * @param pageLimit 每页数量
 * @param baseParams 基础参数
 * @returns 带有 LIMIT 和 OFFSET 的参数数组
 */
export function buildPaginatedQuery(
  page?: number,
  pageLimit?: number,
  baseParams: any[] = []
): { params: any[]; limitParamIndex: number; offsetParamIndex: number } {
  const { limit: normalizedLimit, offset } = normalizePagination(page, pageLimit);
  const params = [...baseParams];
  const limitParamIndex = params.length + 1;
  const offsetParamIndex = params.length + 2;
  
  return {
    params: [...params, normalizedLimit, offset],
    limitParamIndex,
    offsetParamIndex
  };
}
