export interface CheckUrlResult {
  url: string;
  is404: boolean;
  statusCode?: number;
  message?: string;
}

/**
 * Pings a URL to check if it returns a 404 Not Found error.
 * Uses a multi-tiered approach:
 * 1. Direct fetch (HEAD / GET) with timeout.
 * 2. Fallback check via CORS proxy if direct fetch is blocked by CORS.
 */
export async function checkSingleUrlStatus(url: string): Promise<CheckUrlResult> {
  const cleanUrl = url ? url.trim() : '';
  if (!cleanUrl || (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://'))) {
    return { url: cleanUrl, is404: true, statusCode: 400, message: 'URL Format Tidak Valid' };
  }

  // 1. Direct fetch attempt with HEAD method
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(cleanUrl, {
      method: 'HEAD',
      mode: 'cors',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 404) {
      return { url: cleanUrl, is404: true, statusCode: 404, message: '404 Not Found' };
    } else if (res.status === 410) {
      return { url: cleanUrl, is404: true, statusCode: 410, message: '410 Gone' };
    } else if (res.ok || (res.status >= 200 && res.status < 400)) {
      return { url: cleanUrl, is404: false, statusCode: res.status, message: 'Aktif' };
    }
  } catch {
    // Attempt direct GET fetch if HEAD method fails
    try {
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), 5000);

      const res = await fetch(cleanUrl, {
        method: 'GET',
        signal: getController.signal,
      });
      clearTimeout(getTimeoutId);

      if (res.status === 404) {
        return { url: cleanUrl, is404: true, statusCode: 404, message: '404 Not Found' };
      } else if (res.status === 410) {
        return { url: cleanUrl, is404: true, statusCode: 410, message: '410 Gone' };
      } else if (res.ok || (res.status >= 200 && res.status < 400)) {
        return { url: cleanUrl, is404: false, statusCode: res.status, message: 'Aktif' };
      }
    } catch {
      // 2. Direct fetch was blocked or failed. Try public proxy fallback for 404 status check
      try {
        const proxyController = new AbortController();
        const proxyTimeoutId = setTimeout(() => proxyController.abort(), 6000);

        const proxyRes = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`,
          {
            signal: proxyController.signal,
          }
        );
        clearTimeout(proxyTimeoutId);

        if (proxyRes.ok) {
          const data = await proxyRes.json();
          const httpCode = data?.status?.http_code;
          if (httpCode === 404) {
            return { url: cleanUrl, is404: true, statusCode: 404, message: '404 Not Found' };
          } else if (httpCode === 410) {
            return { url: cleanUrl, is404: true, statusCode: 410, message: '410 Gone' };
          } else if (httpCode && httpCode >= 200 && httpCode < 400) {
            return { url: cleanUrl, is404: false, statusCode: httpCode, message: 'Aktif' };
          }
        }
      } catch {
        // Fallthrough if proxy also times out or fails
      }
    }
  }

  // Default fallback assuming reachable/opaque if no explicit 404 is received
  return { url: cleanUrl, is404: false, message: 'Aktif / Opaque' };
}
