import cloudbase from '@cloudbase/js-sdk';

const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'cloud1-d8g2l931c5a5311ea';
const REGION = import.meta.env.VITE_CLOUDBASE_REGION || 'ap-shanghai';
const ACCESS_KEY = import.meta.env.VITE_CLOUDBASE_ACCESS_KEY || '';

const initOptions = { env: ENV_ID, region: REGION };
if (ACCESS_KEY) initOptions.accessKey = ACCESS_KEY;

export const cloudbaseApp = cloudbase.init(initOptions);

let authReadyPromise;

function cloudbaseError(error, fallback = 'CloudBase 请求失败') {
  let raw = error?.error || error;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { /* keep original string */ }
  }
  let message = raw?.message || raw?.msg || raw?.error_description || error?.message || error?.msg || error?.error_description;
  if (typeof message === 'string' && message.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      raw = parsed;
      message = parsed.message || parsed.msg || message;
    } catch { /* keep original message */ }
  }
  const code = raw?.code || raw?.status || error?.code || error?.status;
  if (code === 'login_type_disabled' || raw?.errorCode === 4045) {
    return new Error('当前 CloudBase 环境尚未开启“匿名登录”。请在云开发控制台的“登录授权”中开启后重试。');
  }
  if (code === 'PERMISSION_DENIED' || message?.includes('PERMISSION_DENIED')) {
    return new Error('CloudBase 已完成匿名登录，但当前网页还没有调用 mcloud 云函数的权限。请在云开发控制台放行当前 Web 域名，并确认 mcloud 允许匿名/未登录用户调用。');
  }
  if (code === 'unauthenticated' || raw === 'unauthenticated' || message === 'credentials not found') {
    return new Error('CloudBase 网页身份认证失败，请确认已开启“匿名登录”并允许当前网页域名访问。');
  }
  return new Error(message || fallback);
}

function unwrapAuthResult(result) {
  if (result?.error) throw cloudbaseError(result.error, 'CloudBase 匿名认证失败');
  if (result?.data && !result.data.user && !result.data.session) {
    throw new Error('CloudBase 匿名认证未返回有效会话');
  }
  return result;
}

export function ensureCloudbaseAuth() {
  if (!authReadyPromise) {
    authReadyPromise = (async () => {
      const auth = typeof cloudbaseApp.auth === 'function' ? cloudbaseApp.auth() : cloudbaseApp.auth;
      if (!auth) return;
      if (typeof auth.getLoginState === 'function') {
        const state = await auth.getLoginState().catch(() => null);
        if (state) return state;
      }
      if (typeof auth.signInAnonymously === 'function') {
        return unwrapAuthResult(await auth.signInAnonymously());
      }
      if (typeof auth.anonymousAuthProvider === 'function') {
        return unwrapAuthResult(await auth.anonymousAuthProvider().signIn());
      }
      throw new Error('当前 CloudBase SDK 不支持匿名认证');
    })().catch((error) => {
      authReadyPromise = null;
      throw cloudbaseError(error, 'CloudBase 网页身份认证失败');
    });
  }
  return authReadyPromise;
}

export function getAdminSession() {
  try {
    return JSON.parse(localStorage.getItem('weculture-admin') || 'null');
  } catch {
    return null;
  }
}

export function setAdminSession(session) {
  if (session) localStorage.setItem('weculture-admin', JSON.stringify(session));
  else localStorage.removeItem('weculture-admin');
  window.dispatchEvent(new CustomEvent('weculture-auth-change'));
}

export async function callCloud(route, params = {}, options = {}) {
  let response;
  try {
    await ensureCloudbaseAuth();
    const admin = getAdminSession();
    response = await cloudbaseApp.callFunction({
      name: 'mcloud',
      parse: true,
      data: {
        route,
        params,
        token: options.token ?? admin?.token ?? '',
        PID: 'culture',
        client: 'web-admin',
      },
    });
  } catch (error) {
    throw cloudbaseError(error, '调用 CloudBase 云函数失败');
  }

  let result = response?.result ?? response;
  if (typeof result === 'string') {
    try { result = JSON.parse(result); } catch { /* keep original */ }
  }
  if (result?.error) throw cloudbaseError(result.error, '云函数调用失败');
  if (!result || typeof result.code === 'undefined') throw new Error('云函数返回数据为空');
  if (result.code === 2401) {
    setAdminSession(null);
    throw new Error(result.msg || '登录已过期，请重新登录');
  }
  if (result.code !== 200) throw new Error(result.msg || `请求失败（${result.code}）`);
  return result.data;
}

export async function loginAdmin(name, pwd) {
  const data = await callCloud('admin/login', { name, pwd }, { token: '' });
  const session = { ...data, loginAt: Date.now() };
  setAdminSession(session);
  return session;
}

export async function uploadFile(file, folder = 'backend') {
  await ensureCloudbaseAuth();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cloudPath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const result = await cloudbaseApp.uploadFile({ cloudPath, filePath: file });
  return result.fileID;
}

export { ENV_ID };
