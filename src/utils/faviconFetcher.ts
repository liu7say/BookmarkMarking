/**
 * Favicon 抓取工具
 * 通过 Vite dev server proxy 中转请求，彻底绕过浏览器 CORS 限制。
 *
 * 代理路径映射（配置在 vite.config.ts）：
 *   /api/favicon-ddg/{domain}.ico   → https://icons.duckduckgo.com/ip3/{domain}.ico
 *   /api/favicon-site/{proto}/{domain}/favicon.ico → https://{domain}/favicon.ico
 *   /api/favicon-google?domain=xxx  → https://www.google.com/s2/favicons?domain=xxx&sz=32
 */

/**
 * 从 URL 中提取域名
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * 构建 favicon 候选 URL 列表（走本地 proxy，无跨域问题）
 */
export function buildFaviconUrls(domain: string): string[] {
  return [
    // DuckDuckGo Favicon API（通过 proxy）
    `/api/favicon-ddg/${domain}.ico`,
    // Google Favicon API（通过 proxy）
    `/api/favicon-google?domain=${domain}&sz=32`,
  ];
}

/**
 * 将 Blob 转为 base64 DataURL
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 用 fetch 请求图片（走 proxy，无 CORS 问题）
 * - 检查 HTTP 状态码（排除 404）
 * - 检查 Content-Type（排除非图片响应）
 * - 检查 blob 大小（排除空数据）
 * - 成功后转为 base64 DataURL
 */
async function fetchAndValidateImage(
  url: string,
  externalSignal?: AbortSignal,
  timeoutMs = 8000
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal?.aborted) {
    clearTimeout(timer);
    return null;
  }

  // 联动外部 abort signal
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timer);

    // 严格检查 HTTP 状态码
    if (!response.ok) return null;

    // 检查 Content-Type 是否为图片
    const contentType = response.headers.get('content-type') || '';
    const isImage = contentType.startsWith('image/') ||
                    contentType.includes('icon') ||
                    contentType.includes('octet-stream');
    if (!isImage) return null;

    const blob = await response.blob();

    // 排除过小的响应（可能是空白占位）
    if (blob.size < 50) return null;

    // 转为 base64 DataURL（离线可用）
    const base64 = await blobToBase64(blob);
    return base64;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * 单条抓取结果
 */
export interface FetchResult {
  id: string;
  title: string;
  url: string;
  success: boolean;
  icon?: string;   // 成功时存储 base64 DataURL
  error?: string;
  source?: string;  // 成功时记录使用了哪个源
}

/**
 * 为单个书签抓取 favicon
 * 依次尝试候选 URL（全部走 proxy），直到找到有效的图标
 */
export async function fetchFaviconForBookmark(
  bookmark: { id: string; title: string; url?: string },
  signal?: AbortSignal
): Promise<FetchResult> {
  const result: FetchResult = {
    id: bookmark.id,
    title: bookmark.title,
    url: bookmark.url || '',
    success: false,
  };

  if (!bookmark.url) {
    result.error = '无 URL';
    return result;
  }

  const domain = extractDomain(bookmark.url);
  if (!domain) {
    result.error = 'URL 格式错误';
    return result;
  }

  const candidateUrls = buildFaviconUrls(domain);

  for (const candidateUrl of candidateUrls) {
    if (signal?.aborted) {
      result.error = '已取消';
      return result;
    }

    const base64 = await fetchAndValidateImage(candidateUrl, signal);
    if (base64) {
      result.success = true;
      result.icon = base64;
      result.source = candidateUrl;
      return result;
    }
  }

  result.error = '所有源均无法获取 favicon';
  return result;
}

/**
 * 并发池：控制同时进行的最大并发数
 */
export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
  onTaskDone?: (result: T, index: number) => void,
  signal?: AbortSignal
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      if (signal?.aborted) return;

      const currentIndex = nextIndex++;
      const task = tasks[currentIndex];
      try {
        if (task) {
          const result = await task();
          results[currentIndex] = result;
          onTaskDone?.(result, currentIndex);
        }
      } catch {
        results[currentIndex] = undefined as unknown as T;
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);

  return results;
}
