import Taro from '@tarojs/taro';
import { Network } from '@/network';
import { getToken } from '@/lib/auth';
import { getAnonymousId } from '@/lib/anonymous';
import { getDeviceId } from '@/lib/device';

interface ApiRes<T> { code: number; msg: string; data: T; }

export async function uploadImage(filePath: string): Promise<{ url: string }> {
  const token = getToken();
  if (!token) throw new Error('请先登录后再上传图片');

  Taro.showLoading({ title: '上传中' });
  try {
    const uploadRes = await Network.uploadFile({
      url: '/api/uploads/task-image',
      filePath,
      name: 'file',
      header: { authorization: `Bearer ${token}` },
    });

    let parsed: any;
    try {
      parsed = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;
    } catch {
      parsed = {};
    }

    if (uploadRes.statusCode && uploadRes.statusCode >= 400) {
      throw new Error(parsed?.msg || '图片上传失败');
    }

    const fileUrl = parsed?.data?.file_url || parsed?.data?.url || parsed?.url || parsed?.fileID;
    if (!fileUrl) throw new Error(parsed?.msg || '图片上传失败，未获取到图片链接');

    return { url: fileUrl };
  } finally {
    Taro.hideLoading();
  }
}

export async function createTask(data: {
  title: string;
  category: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  expectedTime: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  images: string[];
  anonymous?: boolean;
}) {
  const token = getToken();
  const budgetMinCents = Math.round(Number(data.budgetMin || 0) * 100);
  const budgetMaxCents = Math.round(Number(data.budgetMax || 0) * 100);
  const budgetAmountCents = budgetMaxCents || budgetMinCents;
  const res = await Network.request({
    url: '/api/tasks',
    method: 'POST',
    header: { authorization: `Bearer ${token}` },
    data: {
      title: data.title,
      category_id: data.category,
      description: data.description,
      budget_amount: String(budgetAmountCents),
      budget_min: budgetMinCents,
      budget_max: budgetMaxCents,
      deadline: data.expectedTime,
      region: data.location || '',
      latitude: data.latitude,
      longitude: data.longitude,
      images: data.images,
      files: data.images.map((url) => ({ file_url: url, file_type: 'image' })),
      anonymous: data.anonymous || false,
      deviceId: getDeviceId(),
    },
  });
  return res.data as ApiRes<any>;
}

export async function getTaskList(params: {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  sort?: string;
  keyword?: string;
  cityName?: string;
}) {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const res = await Network.request({ url: `/api/tasks?${query}` });
  return res.data as ApiRes<{ items: any[]; total: number; page?: number; limit?: number; hasMore?: boolean }>;
}

export async function getTaskDetail(id: string) {
  const token = getToken();
  const res = await Network.request({
    url: `/api/tasks/${id}`,
    header: token ? { authorization: `Bearer ${token}` } : undefined,
  });
  return res.data as ApiRes<any>;
}

export async function applyTask(taskId: string, data?: { message?: string }) {
  const token = getToken();
  const res = await Network.request({
    url: `/api/tasks/${taskId}/apply`,
    method: 'POST',
    header: { authorization: `Bearer ${token}` },
    data: {
      message: data?.message || '我希望能接这个任务，会按要求完成并保持沟通。',
      deviceId: getDeviceId(),
    },
  });
  return res.data as ApiRes<any>;
}

export async function getMessages(params?: { page?: number; limit?: number }) {
  const token = getToken();
  const query = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
  const res = await Network.request({
    url: `/api/messages${query}`,
    header: { authorization: `Bearer ${token}` },
  });
  return res.data as ApiRes<any>;
}

export async function getConversations() {
  const token = getToken();
  const anonymousId = getAnonymousId();
  const res = await Network.request({
    url: '/api/ai/conversations',
    header: token ? { Authorization: `Bearer ${token}` } : { 'x-anonymous-id': anonymousId },
  });
  return res.data as ApiRes<any>;
}

export async function getChatMessages(conversationId: string, params?: { page?: number }) {
  const token = getToken();
  const anonymousId = getAnonymousId();
  const query = params?.page ? `?page=${params.page}` : '';
  const res = await Network.request({
    url: `/api/ai/conversations/${conversationId}/messages${query}`,
    header: token ? { Authorization: `Bearer ${token}` } : { 'x-anonymous-id': anonymousId },
  });
  return res.data as ApiRes<any>;
}

export async function sendMessage(data: {
  conversationId: string;
  type: 'text' | 'image';
  content?: string;
  imageUrl?: string;
}) {
  if (data.type === 'image') {
    throw new Error('当前 AI 会话暂不支持直接发送图片，请先用文字描述图片内容');
  }
  const token = getToken();
  const anonymousId = getAnonymousId();
  const res = await Network.request({
    url: '/api/ai/chat',
    method: 'POST',
    header: token ? { Authorization: `Bearer ${token}` } : { 'x-anonymous-id': anonymousId },
    data: {
      message: data.content,
      scene: 'order_support',
      conversation_id: data.conversationId || undefined,
      anonymous_id: token ? undefined : anonymousId,
    },
  });
  return res.data as ApiRes<any>;
}

export async function getUserProfile() {
  const token = getToken();
  const res = await Network.request({
    url: '/api/user/me',
    header: { authorization: `Bearer ${token}` },
  });
  return res.data as ApiRes<any>;
}

export async function getMyTasks(params: {
  status?: string;
  page?: number;
  limit?: number;
  role?: 'publisher' | 'worker';
}) {
  const token = getToken();
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const res = await Network.request({
    url: `/api/my-tasks?${query}`,
    header: { authorization: `Bearer ${token}` },
  });
  return res.data as ApiRes<{ items: any[]; total: number; page?: number; limit?: number; hasMore?: boolean }>;
}

export async function getApplicationDetail(taskId: string, applicationId: string) {
  const token = getToken();
  const res = await Network.request({
    url: `/api/tasks/${taskId}/applications/${applicationId}`,
    header: { authorization: `Bearer ${token}` },
  });
  return res.data as ApiRes<any>;
}

export async function acceptApplication(taskId: string, applicationId: string) {
  const token = getToken();
  const res = await Network.request({
    url: `/api/tasks/${taskId}/applications/${applicationId}/accept`,
    method: 'POST',
    header: { authorization: `Bearer ${token}` },
  });
  return res.data as ApiRes<any>;
}

export async function rejectApplication(taskId: string, applicationId: string) {
  const token = getToken();
  const res = await Network.request({
    url: `/api/tasks/${taskId}/applications/${applicationId}/reject`,
    method: 'POST',
    header: { authorization: `Bearer ${token}` },
  });
  return res.data as ApiRes<any>;
}

export function extractImages(task: any): string[] {
  if (Array.isArray(task.images)) return task.images;
  if (Array.isArray(task.task_files)) {
    return task.task_files.map((f: any) => f.file_url || f.url).filter(Boolean);
  }
  return [];
}
