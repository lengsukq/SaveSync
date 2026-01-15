import * as fs from 'fs/promises';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { createWriteStream } from 'fs';
import { WebDAVItem } from './types.js';

export async function uploadToWebDAV(
  filePath: string,
  url: string,
  username: string,
  password: string,
  remotePath: string
): Promise<void> {
  const fullUrl = url.endsWith('/') ? `${url}${remotePath}` : `${url}/${remotePath}`;
  const parsedUrl = new URL(fullUrl);
  const isHttps = parsedUrl.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  const fileContent = await fs.readFile(filePath);
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'PUT',
      headers: {
        'Content-Length': fileContent.length,
        'Authorization': `Basic ${auth}`,
      },
    };

    const req = (httpModule as typeof http).request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`WebDAV upload failed: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.write(fileContent);
    req.end();
  });
}

export async function listWebDAVDirectory(
  url: string,
  username: string,
  password: string,
  remotePath: string = '/'
): Promise<WebDAVItem[]> {
  try {
    // 确保路径格式正确
    let normalizedPath = remotePath;
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = `/${normalizedPath}`;
    }
    if (!normalizedPath.endsWith('/')) {
      normalizedPath = `${normalizedPath}/`;
    }

    const fullUrl = url.endsWith('/') 
      ? `${url}${normalizedPath.slice(1)}` 
      : `${url}${normalizedPath}`;
    const parsedUrl = new URL(fullUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    // PROPFIND 请求体
    const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:resourcetype/>
    <d:displayname/>
  </d:prop>
</d:propfind>`;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Depth': '1',
          'Content-Type': 'application/xml; charset="utf-8"',
          'Content-Length': Buffer.byteLength(propfindBody),
        },
        timeout: 10000,
      };

      const req = (httpModule as typeof http).request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          if (res.statusCode === 207 || res.statusCode === 200) {
            try {
              // 简单的 XML 解析（简化版）
              const items: WebDAVItem[] = [];
              
              // 解析 XML 响应
              // 查找所有 <d:response> 元素
              const responseRegex = /<d:response[^>]*>([\s\S]*?)<\/d:response>/g;
              let match;
              
              while ((match = responseRegex.exec(data)) !== null) {
                const responseContent = match[1];
                
                // 提取 href
                const hrefMatch = responseContent.match(/<d:href[^>]*>([^<]+)<\/d:href>/);
                if (!hrefMatch) continue;
                
                let href = decodeURIComponent(hrefMatch[1]);
                // 移除 URL 前缀，只保留路径部分
                const urlPath = new URL(url).pathname;
                if (href.startsWith(url)) {
                  href = href.substring(url.length);
                } else if (href.startsWith(urlPath)) {
                  href = href.substring(urlPath.length);
                }
                
                // 移除开头的斜杠（如果存在）
                if (href.startsWith('/')) {
                  href = href.substring(1);
                }
                
                // 跳过当前目录本身
                if (!href || href === normalizedPath.slice(1) || href === '') {
                  continue;
                }
                
                // 检查是否是目录
                const isDirectory = /<d:collection[^>]*\/>/.test(responseContent) || 
                                   /<d:resourcetype[^>]*>\s*<d:collection[^>]*\/>\s*<\/d:resourcetype>/.test(responseContent);
                
                // 获取显示名称
                const displayNameMatch = responseContent.match(/<d:displayname[^>]*>([^<]+)<\/d:displayname>/);
                const displayName = displayNameMatch ? decodeURIComponent(displayNameMatch[1]) : href.split('/').pop() || href;
                
                // 构建完整路径
                const fullPath = normalizedPath === '/' 
                  ? `/${href}` 
                  : `${normalizedPath}${href}`;
                
                items.push({
                  path: fullPath,
                  name: displayName,
                  isDirectory: isDirectory,
                });
              }
              
              // 排序：目录在前，然后按名称排序
              items.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
              });
              
              resolve(items);
            } catch (parseError) {
              reject(new Error(`解析 WebDAV 响应失败: ${parseError}`));
            }
          } else {
            reject(new Error(`列出目录失败: 状态码 ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error: any) => {
        reject(new Error(`请求失败: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      req.write(propfindBody);
      req.end();
    });
  } catch (error: any) {
    throw new Error(`列出目录失败: ${error.message}`);
  }
}

export async function testWebDAVConnection(
  url: string,
  username: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    return new Promise((resolve) => {
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname || '/',
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Depth': '0',
          'Content-Length': '0',
        },
        timeout: 10000, // 10秒超时
      };

      const req = (httpModule as typeof http).request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          // 207 Multi-Status 表示成功（WebDAV 标准响应）
          // 200 OK 也表示成功
          // 401 Unauthorized 表示认证失败
          // 403 Forbidden 表示权限不足
          if (res.statusCode === 207 || res.statusCode === 200) {
            resolve({ success: true, message: '连接成功！WebDAV 服务器可访问。' });
          } else if (res.statusCode === 401) {
            resolve({ success: false, message: '认证失败：用户名或密码错误。' });
          } else if (res.statusCode === 403) {
            resolve({ success: false, message: '权限不足：无法访问此 WebDAV 服务器。' });
          } else if (res.statusCode === 404) {
            resolve({ success: false, message: '路径不存在：请检查 WebDAV URL 是否正确。' });
          } else {
            resolve({ success: false, message: `连接失败：服务器返回状态码 ${res.statusCode}。` });
          }
        });
      });

      req.on('error', (error: any) => {
        if (error.code === 'ENOTFOUND') {
          resolve({ success: false, message: '无法解析主机名：请检查 URL 是否正确。' });
        } else if (error.code === 'ECONNREFUSED') {
          resolve({ success: false, message: '连接被拒绝：服务器可能未运行或端口不正确。' });
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
          resolve({ success: false, message: '连接超时：请检查网络连接和服务器地址。' });
        } else {
          resolve({ success: false, message: `连接错误：${error.message || '未知错误'}` });
        }
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, message: '连接超时：服务器响应时间过长。' });
      });

      req.end();
    });
  } catch (error: any) {
    return { success: false, message: `测试失败：${error.message || '未知错误'}` };
  }
}

export async function createWebDAVDirectory(
  url: string,
  username: string,
  password: string,
  remotePath: string
): Promise<void> {
  // 确保路径以 / 开头
  const normalizedPath = remotePath.startsWith('/') ? remotePath : `/${remotePath}`;
  // 确保路径以 / 结尾（WebDAV 目录需要）
  const dirPath = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`;
  
  const fullUrl = url.endsWith('/') ? `${url}${dirPath}` : `${url}${dirPath}`;
  const parsedUrl = new URL(fullUrl);
  const isHttps = parsedUrl.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'MKCOL',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Length': '0',
      },
    };

    const req = (httpModule as typeof http).request(options, (res) => {
      // 201 Created 表示成功创建，409 Conflict 表示已存在（也算成功）
      if (res.statusCode === 201 || res.statusCode === 409) {
        resolve();
      } else if (res.statusCode === 404) {
        // 如果父目录不存在，尝试创建父目录
        const parentPath = dirPath.split('/').slice(0, -2).join('/') + '/';
        if (parentPath && parentPath !== '/') {
          createWebDAVDirectory(url, username, password, parentPath)
            .then(() => createWebDAVDirectory(url, username, password, dirPath))
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error(`WebDAV directory creation failed: ${res.statusCode}`));
        }
      } else {
        reject(new Error(`WebDAV directory creation failed: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.end();
  });
}

export async function downloadFromWebDAV(
  url: string,
  username: string,
  password: string,
  remotePath: string,
  localPath: string
): Promise<void> {
  const fullUrl = url.endsWith('/') ? `${url}${remotePath}` : `${url}/${remotePath}`;
  const parsedUrl = new URL(fullUrl);
  const isHttps = parsedUrl.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    };

    const req = (httpModule as typeof http).request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        const fileStream = createWriteStream(localPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
        fileStream.on('error', reject);
      } else {
        reject(new Error(`WebDAV download failed: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.end();
  });
}
