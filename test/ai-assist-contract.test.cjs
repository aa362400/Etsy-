const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const aiAssistPath = path.join(root, 'src', 'lib', 'ai-assist.ts');
const publishPath = path.join(root, 'src', 'pages', 'publish', 'index.tsx');
const tasksPath = path.join(root, 'src', 'pages', 'tasks', 'index.tsx');
const taskDetailPath = path.join(root, 'src', 'pages', 'task-detail', 'index.tsx');
const ordersPath = path.join(root, 'src', 'pages', 'orders', 'index.tsx');
const orderDetailPath = path.join(root, 'src', 'pages', 'order-detail', 'index.tsx');
const walletPath = path.join(root, 'src', 'pages', 'wallet', 'index.tsx');
const messagesPath = path.join(root, 'src', 'pages', 'messages', 'index.tsx');
const widgetPath = path.join(root, 'src', 'components', 'ai-chat-widget', 'index.tsx');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('AI assist helper routes every AI workflow through backend endpoints', () => {
  const source = read(aiAssistPath);

  assert.match(source, /export async function requestAiAssist/);
  assert.match(source, /\/api\/ai\/chat/);
  assert.match(source, /export async function requestHumanHandoff/);
  assert.match(source, /\/api\/ai\/handoff/);
  assert.match(source, /buildAiPrompt/);
  assert.match(source, /scene/);
  assert.match(source, /context/);
  assert.doesNotMatch(source, /refund\s*[:=]\s*true|paymentStatus\s*[:=]|orderStatus\s*[:=]/);
});

test('publish flow applies AI draft and calls backend task draft helper', () => {
  const source = read(publishPath);

  assert.match(source, /requestTaskDraft/);
  assert.match(source, /applyAiDraft/);
  assert.match(source, /ai_publish_draft/);
  assert.match(source, /AI.*草稿|AI.*需求|AI.*填/);
});

test('task and order pages expose AI follow-up help without bypassing Network', () => {
  const tasks = read(tasksPath);
  const orders = read(ordersPath);
  const orderDetail = read(orderDetailPath);

  assert.match(tasks, /AiChatWidget/);
  assert.match(tasks, /scene:\s*['"]tasks/);
  assert.match(orders, /AiChatWidget/);
  assert.match(orders, /scene:\s*['"]orders/);
  assert.match(orderDetail, /AiChatWidget/);
  assert.match(orderDetail, /scene:\s*['"]order_detail/);
});

test('AI chat widget supports backend handoff to human service', () => {
  const source = read(widgetPath);

  assert.match(source, /requestHumanHandoff/);
  assert.match(source, /转人工|人工客服|human_service/);
  assert.match(source, /conversationId/);
});

test('task detail, wallet, and messages keep AI help in the current flow', () => {
  const taskDetail = read(taskDetailPath);
  const wallet = read(walletPath);
  const messages = read(messagesPath);

  assert.match(taskDetail, /AiChatWidget/);
  assert.match(taskDetail, /scene:\s*['"]task_detail/);
  assert.match(wallet, /AiChatWidget/);
  assert.match(wallet, /scene:\s*['"]wallet/);
  assert.match(messages, /AiChatWidget/);
  assert.match(messages, /scene:\s*['"]messages/);
});
