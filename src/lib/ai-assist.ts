import { Network } from '@/network';
import { getAnonymousId } from '@/lib/anonymous';
import { getToken } from '@/lib/auth';

export type AiAssistIntent =
  | 'write'
  | 'complete'
  | 'category'
  | 'estimate'
  | 'compare'
  | 'order_followup'
  | 'human_service';

export interface AiAssistContext {
  scene: string;
  title?: string;
  description?: string;
  category?: string;
  budget?: string;
  status?: string;
  orderId?: string;
  taskId?: string;
  imageCount?: number;
}

export interface AiAssistResult {
  conversationId?: string;
  reply: string;
  intent?: string;
  cards?: any[];
  actions?: any[];
}

const AI_REQUEST_TIMEOUT_MS = 25_000;

const getAiIdentity = () => {
  const token = getToken();
  if (token) {
    return {
      header: { authorization: `Bearer ${token}` },
      anonymousId: '',
    };
  }
  const anonymousId = getAnonymousId();
  return {
    header: { 'x-anonymous-id': anonymousId },
    anonymousId,
  };
};

export const buildAiPrompt = (intent: AiAssistIntent, context: AiAssistContext, userText = '') => {
  const lines = [
    `AI辅助场景：${context.scene}`,
    `用户意图：${intent}`,
    context.title ? `标题：${context.title}` : '',
    context.description ? `描述：${context.description}` : '',
    context.category ? `分类：${context.category}` : '',
    context.budget ? `预算：${context.budget}` : '',
    context.status ? `当前状态：${context.status}` : '',
    context.orderId ? `订单ID：${context.orderId}` : '',
    context.taskId ? `任务ID：${context.taskId}` : '',
    context.imageCount !== undefined ? `图片数量：${context.imageCount}` : '',
    userText ? `用户补充：${userText}` : '',
    '请只做辅助建议，不承诺最终价格、退款结果、到账时效或订单状态变更；资金、退款、验收和结算必须以后端订单规则为准。',
  ].filter(Boolean);
  return lines.join('\n');
};

export async function requestAiAssist(params: {
  intent: AiAssistIntent;
  context: AiAssistContext;
  message?: string;
  conversationId?: string;
}): Promise<AiAssistResult> {
  const identity = getAiIdentity();
  const res: any = await Network.request({
    url: '/api/ai/chat',
    method: 'POST',
    header: identity.header,
    timeout: AI_REQUEST_TIMEOUT_MS,
    data: {
      message: buildAiPrompt(params.intent, params.context, params.message),
      scene: params.context.scene,
      conversation_id: params.conversationId || undefined,
      anonymous_id: identity.anonymousId || undefined,
    },
  });
  const data = res?.data?.data || {};
  return {
    conversationId: data.conversation_id,
    reply: data.reply || '',
    intent: data.intent,
    cards: data.cards || [],
    actions: data.actions || [],
  };
}

export async function requestTaskDraft(message: string) {
  const identity = getAiIdentity();
  const res: any = await Network.request({
    url: '/api/ai/task-draft',
    method: 'POST',
    header: identity.header,
    timeout: AI_REQUEST_TIMEOUT_MS,
    data: { message },
  });
  return res?.data?.data?.draft || null;
}

export async function requestPriceCompare(keyword: string) {
  const identity = getAiIdentity();
  const res: any = await Network.request({
    url: '/api/ai/price-compare',
    method: 'POST',
    header: identity.header,
    timeout: AI_REQUEST_TIMEOUT_MS,
    data: { keyword },
  });
  return res?.data?.data || null;
}

export async function requestHumanHandoff(conversationId: string, reason: string) {
  if (!conversationId) {
    throw new Error('请先和 AI 助手说一句需求，再转人工客服。');
  }
  const identity = getAiIdentity();
  const res: any = await Network.request({
    url: '/api/ai/handoff',
    method: 'POST',
    header: identity.header,
    timeout: AI_REQUEST_TIMEOUT_MS,
    data: {
      conversation_id: conversationId,
      reason,
    },
  });
  return res?.data?.data?.ticket || null;
}
