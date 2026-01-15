import * as fs from 'fs/promises';
import * as https from 'https';
import * as http from 'http';
import * as path from 'path';
import { URL } from 'url';
import { createWriteStream, createReadStream } from 'fs';
import { WebDAVItem } from './types.js';

/**
 * 编码 WebDAV 路径，确保中文字符和其他特殊字符被正确编码
 * 对路径的每个段进行编码，但保留斜杠
 * 某些 WebDAV 服务器需要路径段单独编码
 */
function encodeWebDAVPath(pathStr: string): string {
  // 规范化路径：移除多余的斜杠
  let normalized = pathStr.replace(/\/+/g, '/');
  
  // 确保以 / 开头
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  
  // 分割路径为段，对每个段进行编码
  const segments = normalized.split('/').filter(segment => segment.length > 0);
  const encodedSegments = segments.map(segment => {
    // 对每个段进行编码，但保留一些特殊字符（如 _ 和 -）不编码
    // 使用 encodeURIComponent 然后手动解码一些字符
    let encoded = encodeURIComponent(segment);
    // 某些服务器可能需要保留某些字符不编码，但通常 encodeURIComponent 是正确的
    return encoded;
  });
  
  // 重新组合路径
  return '/' + encodedSegments.join('/');
}

export async function uploadToWebDAV(
  filePath: string,
  url: string,
  username: string,
  password: string,
  remotePath: string,
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await uploadToWebDAVSingle(filePath, url, username, password, remotePath);
      return; // 成功则返回
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || String(error);
      
      // 如果是连接重置或超时错误，且还有重试机会，则重试
      if (
        (error.code === 'ECONNRESET' || 
         error.code === 'ETIMEDOUT' || 
         errorMessage.includes('ECONNRESET') ||
         errorMessage.includes('timeout')) &&
        attempt < maxRetries
      ) {
        const delay = attempt * 1000; // 递增延迟：1秒、2秒、3秒...
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[WebDAV Upload] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // 其他错误或已达到最大重试次数，直接抛出
      throw error;
    }
  }
  
  // 所有重试都失败
  throw lastError || new Error('Upload failed after all retries');
}

async function uploadToWebDAVSingle(
  filePath: string,
  url: string,
  username: string,
  password: string,
  remotePath: string
): Promise<void> {
  // 规范化路径：移除多余的斜杠，确保以 / 开头
  let normalizedPath = remotePath.replace(/\/+/g, '/');
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = `/${normalizedPath}`;
  }
  // 确保文件路径不以 / 结尾（文件路径不应该以斜杠结尾）
  if (normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1);
  }
  
  // 编码路径以确保中文字符被正确处理
  const encodedPath = encodeWebDAVPath(normalizedPath);
  
  // 规范化URL：移除末尾斜杠，避免双斜杠
  const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  
  // 构建完整 URL - 注意：某些 WebDAV 服务器可能需要直接拼接而不是使用 URL 构造函数
  // 因为 URL 构造函数可能会对已编码的路径进行二次编码
  const fullUrl = `${normalizedUrl}${encodedPath}`;
  
  // 解析 URL 以获取主机名和端口
  const baseUrl = new URL(normalizedUrl);
  const isHttps = baseUrl.protocol === 'https:';
  const httpModule = isHttps ? https : http;
  
  // 手动构建路径，避免 URL 构造函数对已编码路径的二次编码
  // 路径部分应该使用编码后的路径
  const requestPath = encodedPath + (baseUrl.search || '');

  // 获取文件大小用于 Content-Length
  const fileStats = await fs.stat(filePath);
  const fileSize = fileStats.size;
  
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  // 根据文件扩展名确定 Content-Type
  const fileExtension = path.extname(remotePath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (fileExtension === '.zip') {
    contentType = 'application/zip';
  } else if (fileExtension === '.json') {
    contentType = 'application/json';
  } else if (fileExtension === '.xml') {
    contentType = 'application/xml';
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: baseUrl.hostname,
      port: baseUrl.port || (isHttps ? 443 : 80),
      path: requestPath,
      method: 'PUT',
      headers: {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Authorization': `Basic ${auth}`,
        // 某些 WebDAV 服务器可能需要这些头部
        'User-Agent': 'SaveSync/1.0',
        // 对于某些服务器（如坚果云），使用 close 可能更稳定
        'Connection': 'close',
      },
      timeout: 120000, // 120秒超时，因为文件可能较大且网络可能较慢
    };
    
    // 调试日志（仅在开发环境）
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[WebDAV Upload] Original path: ${normalizedPath}`);
      console.log(`[WebDAV Upload] Encoded path: ${encodedPath}`);
      console.log(`[WebDAV Upload] Request path: ${requestPath}`);
      console.log(`[WebDAV Upload] Full URL: ${fullUrl}`);
      console.log(`[WebDAV Upload] File size: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    }

    const req = (httpModule as typeof http).request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk.toString();
      });
      
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[WebDAV Upload] Success: ${res.statusCode}`);
          }
          resolve();
        } else if (res.statusCode === 403) {
          reject(new Error(`WebDAV upload failed: ${res.statusCode} - Permission denied. Please check your WebDAV credentials and write permissions for path: ${normalizedPath}`));
        } else if (res.statusCode === 404) {
          reject(new Error(`WebDAV upload failed: ${res.statusCode} - Path not found. The directory may not exist: ${normalizedPath}`));
        } else if (res.statusCode === 401) {
          reject(new Error(`WebDAV upload failed: ${res.statusCode} - Authentication failed. Please check your username and password.`));
        } else if (res.statusCode === 405) {
          reject(new Error(`WebDAV upload failed: ${res.statusCode} - Method Not Allowed. The server may not support PUT method, or the path format is incorrect. Path: ${normalizedPath} (encoded: ${encodedPath})`));
        } else {
          reject(new Error(`WebDAV upload failed: ${res.statusCode} - ${responseData || 'Unknown error'}`));
        }
      });
    });

    req.on('error', (error: any) => {
      // 提供更详细的错误信息
      let errorMessage = `WebDAV upload request failed: ${error.message}`;
      if (error.code === 'ECONNRESET') {
        errorMessage += '. Connection was reset by the server. This may happen if the file is too large or the server has connection limits.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage += '. Request timed out. The file may be too large or the network connection is slow.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage += '. Connection refused. Please check the WebDAV server URL and port.';
      }
      reject(new Error(errorMessage));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`WebDAV upload request timeout after ${options.timeout}ms. The file may be too large.`));
    });

    // 使用流式上传而不是一次性读取整个文件到内存
    // 这样可以避免大文件占用过多内存
    const fileStream = createReadStream(filePath);
    
    fileStream.on('error', (error: any) => {
      req.destroy();
      reject(new Error(`Failed to read file: ${error.message}`));
    });
    
    // 将文件流管道到请求，pipe 会自动处理流的结束
    fileStream.pipe(req);
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

    // 编码路径以确保中文字符被正确处理
    // 对于目录路径，我们需要保留末尾的斜杠
    const encodedPath = encodeWebDAVPath(normalizedPath.slice(0, -1)) + '/';

    const fullUrl = url.endsWith('/') 
      ? `${url}${encodedPath.slice(1)}` 
      : `${url}${encodedPath}`;
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
  // 规范化路径：移除多余的斜杠，确保以 / 开头
  let normalizedPath = remotePath.replace(/\/+/g, '/');
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = `/${normalizedPath}`;
  }
  // 确保路径以 / 结尾（WebDAV 目录需要）
  const dirPath = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`;
  
  // 编码路径以确保中文字符被正确处理
  // 注意：对于目录路径，我们需要保留末尾的斜杠
  const encodedPath = encodeWebDAVPath(dirPath.slice(0, -1)) + '/';
  
  // 规范化URL：移除末尾斜杠，避免双斜杠
  const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const fullUrl = `${normalizedUrl}${encodedPath}`;
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
      timeout: 10000,
    };

    const req = (httpModule as typeof http).request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk.toString();
      });
      
      res.on('end', () => {
        // 201 Created 表示成功创建
        // 409 Conflict 表示已存在（也算成功）
        // 405 Method Not Allowed 可能表示目录已存在或服务器不支持MKCOL，先检查目录是否存在
        if (res.statusCode === 201 || res.statusCode === 409) {
          resolve();
        } else if (res.statusCode === 405) {
          // 某些服务器不支持MKCOL，尝试使用PROPFIND检查目录是否存在
          listWebDAVDirectory(url, username, password, dirPath)
            .then(() => resolve()) // 目录存在，视为成功
            .catch(() => {
              // 如果目录不存在且不支持MKCOL，尝试创建父目录
              const parentPath = dirPath.split('/').slice(0, -2).join('/') + '/';
              if (parentPath && parentPath !== '/') {
                createWebDAVDirectory(url, username, password, parentPath)
                  .then(() => createWebDAVDirectory(url, username, password, dirPath))
                  .then(resolve)
                  .catch(() => {
                    // 如果MKCOL不支持，可能服务器需要不同的方法，或者目录创建不是必需的
                    // 对于某些服务器，可以直接上传文件，目录会自动创建
                    resolve(); // 允许继续，让上传操作决定是否成功
                  });
              } else {
                // 根目录，如果MKCOL不支持，可能服务器不需要显式创建目录
                resolve(); // 允许继续
              }
            });
        } else if (res.statusCode === 404) {
          // 如果父目录不存在，尝试创建父目录
          const parentPath = dirPath.split('/').slice(0, -2).join('/') + '/';
          if (parentPath && parentPath !== '/') {
            createWebDAVDirectory(url, username, password, parentPath)
              .then(() => createWebDAVDirectory(url, username, password, dirPath))
              .then(resolve)
              .catch(reject);
          } else {
            reject(new Error(`WebDAV directory creation failed: ${res.statusCode} - ${responseData || 'Parent directory not found'}`));
          }
        } else if (res.statusCode === 403) {
          reject(new Error(`WebDAV directory creation failed: ${res.statusCode} - Permission denied. Please check your WebDAV credentials and permissions.`));
        } else {
          reject(new Error(`WebDAV directory creation failed: ${res.statusCode} - ${responseData || 'Unknown error'}`));
        }
      });
    });

    req.on('error', (error: any) => {
      reject(new Error(`WebDAV directory creation request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('WebDAV directory creation request timeout'));
    });

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
  // 规范化路径
  let normalizedPath = remotePath.replace(/\/+/g, '/');
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = `/${normalizedPath}`;
  }
  // 确保文件路径不以 / 结尾
  if (normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1);
  }
  
  // 编码路径以确保中文字符被正确处理
  const encodedPath = encodeWebDAVPath(normalizedPath);
  
  const fullUrl = url.endsWith('/') ? `${url}${encodedPath.slice(1)}` : `${url}${encodedPath}`;
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

/**
 * 递归上传整个文件夹到 WebDAV
 * @param localDirPath 本地文件夹路径
 * @param url WebDAV 服务器 URL
 * @param username 用户名
 * @param password 密码
 * @param remoteBasePath 远程基础路径（文件夹将上传到此路径下）
 */
export async function uploadDirectoryToWebDAV(
  localDirPath: string,
  url: string,
  username: string,
  password: string,
  remoteBasePath: string
): Promise<void> {
  // 规范化远程基础路径
  let normalizedBasePath = remoteBasePath.replace(/\/+/g, '/');
  if (!normalizedBasePath.startsWith('/')) {
    normalizedBasePath = `/${normalizedBasePath}`;
  }
  if (!normalizedBasePath.endsWith('/')) {
    normalizedBasePath = `${normalizedBasePath}/`;
  }

  // 递归上传函数
  async function uploadRecursive(localPath: string, remotePath: string): Promise<void> {
    const stats = await fs.stat(localPath);
    
    if (stats.isDirectory()) {
      // 创建远程目录
      try {
        await createWebDAVDirectory(url, username, password, remotePath);
      } catch (error: any) {
        // 如果目录已存在或服务器不支持 MKCOL，继续执行
        const errorMessage = error?.message || String(error);
        if (!errorMessage.includes('409') && !errorMessage.includes('405')) {
          console.warn(`Failed to create directory ${remotePath}: ${errorMessage}`);
        }
      }

      // 遍历目录内容
      const entries = await fs.readdir(localPath);
      for (const entry of entries) {
        const localEntryPath = path.join(localPath, entry);
        const remoteEntryPath = `${remotePath}${entry}`;
        await uploadRecursive(localEntryPath, remoteEntryPath);
      }
    } else {
      // 上传文件
      const remoteFilePath = remotePath;
      await uploadToWebDAV(localPath, url, username, password, remoteFilePath);
    }
  }

  // 获取本地文件夹的基础名称
  const baseName = path.basename(localDirPath);
  const targetRemotePath = `${normalizedBasePath}${baseName}/`;

  // 开始递归上传
  await uploadRecursive(localDirPath, targetRemotePath);
}

/**
 * 递归下载整个文件夹从 WebDAV
 * @param url WebDAV 服务器 URL
 * @param username 用户名
 * @param password 密码
 * @param remoteDirPath 远程文件夹路径
 * @param localDirPath 本地目标文件夹路径
 */
export async function downloadDirectoryFromWebDAV(
  url: string,
  username: string,
  password: string,
  remoteDirPath: string,
  localDirPath: string
): Promise<void> {
  // 规范化远程路径
  let normalizedRemotePath = remoteDirPath.replace(/\/+/g, '/');
  if (!normalizedRemotePath.startsWith('/')) {
    normalizedRemotePath = `/${normalizedRemotePath}`;
  }
  if (!normalizedRemotePath.endsWith('/')) {
    normalizedRemotePath = `${normalizedRemotePath}/`;
  }

  // 确保本地目录存在
  await fs.mkdir(localDirPath, { recursive: true });

  // 递归下载函数
  async function downloadRecursive(remotePath: string, localPath: string): Promise<void> {
    // 列出当前远程目录
    const dirItems = await listWebDAVDirectory(url, username, password, remotePath);

    for (const item of dirItems) {
      // item.path 已经是完整路径，我们需要提取相对于 remotePath 的部分
      // 或者直接使用 item.name 构建本地路径
      const localItemPath = path.join(localPath, item.name);

      if (item.isDirectory) {
        // 创建本地目录
        await fs.mkdir(localItemPath, { recursive: true });
        // 递归下载子目录 - 使用 item.path 作为远程路径
        await downloadRecursive(item.path, localItemPath);
      } else {
        // 下载文件 - item.path 是完整的远程文件路径
        await downloadFromWebDAV(url, username, password, item.path, localItemPath);
      }
    }
  }

  // 开始递归下载
  await downloadRecursive(normalizedRemotePath, localDirPath);
}
