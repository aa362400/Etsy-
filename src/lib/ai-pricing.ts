/**
 * AI 性价比助手 / AI 比价推荐官 - 规则引擎
 *
 * 纯前端规则函数，不依赖大模型接口。后续接入真实 AI 时，
 * 只需替换本文件中两个核心方法的实现：
 *   - estimateTaskPrice(): 任务估价
 *   - compareTaskQuotes(): 报价对比 / 比价推荐
 *
 * 设计原则：
 *   1. 完全本地计算，零网络依赖，永不阻塞用户提交
 *   2. 失败/数据不足时返回兜底建议，不抛错
 *   3. 文案温柔、给理由、不替用户做最终决定
 *   4. 不修改任务表/报价表已有字段，AI 字段仅前端展示
 */

// ============== 类型 ==============

export type CategoryId =
  | 'ticket' | 'errand' | 'home' | 'life'
  | 'clean' | 'moving' | 'business' | 'other'
  | 'game' | 'care';

export type UrgencyLevel = 'normal' | 'urgent' | 'immediate';

export interface EstimateInput {
  title: string;
  description: string;
  categoryId?: string;
  /** 单位：公里。未知传 undefined */
  distance?: number;
  /** 已上传图片数量，影响复杂度判断 */
  imageCount?: number;
  /** 用户当前填写的预算（元，可空） */
  userBudget?: number;
}

export interface EstimateResult {
  minPrice: number;
  maxPrice: number;
  recommendPrice: number;
  urgentMinPrice: number;
  urgentMaxPrice: number;
  /** 命中的分类 id（可能与传入不一致，AI 自动识别覆盖） */
  detectedCategoryId: CategoryId;
  detectedCategoryName: string;
  /** 0-1，识别置信度 */
  detectedCategoryConfidence: number;
  /** 任务紧急程度 */
  urgency: UrgencyLevel;
  /** 命中关键词，用于在前端展示徽章 */
  hitKeywords: string[];
  reason: string;
  /** 与用户预算的关系：too-low / fair / too-high / unknown */
  budgetHint: 'too-low' | 'fair' | 'too-high' | 'unknown';
  budgetHintText: string;
  /** 数据是否充足；不足时建议显示"暂无足够数据"兜底文案 */
  hasEnoughData: boolean;
  /** 引擎版本号，便于排查 */
  aiVersion: string;
}

export interface ReviewInput {
  title: string;
  description: string;
  imageCount?: number;
  budget?: number;
  hasDeadline?: boolean;
  hasRegion?: boolean;
  hasAcceptanceStandard?: boolean;
}

export interface ReviewResult {
  /** 缺失字段，给一键补充提示用 */
  missingFields: Array<'time' | 'location' | 'urgency' | 'images' | 'standard' | 'detail'>;
  tips: string[];
  /** 0-100 完整度评分 */
  completeness: number;
  /** 建议补充的提示文案，可直接粘贴到描述末尾 */
  suggestedAppendText: string;
}

export interface SensitiveResult {
  hit: boolean;
  hitWords: string[];
  message: string;
}

export interface QuoteInput {
  workerId: string;
  workerName?: string;
  quotePrice: number;
  /** 距离（公里） */
  distance?: number;
  /** 预计完成时长（分钟） */
  estimatedTime?: number;
  /** 平均响应时长（分钟），越小越快 */
  responseSpeed?: number;
  /** 0-1 完成率 */
  completionRate?: number;
  /** 0-1 好评率 */
  goodRate?: number;
  /** 完成过的同类任务数 */
  similarTaskCount?: number;
  /** 是否新人（无任何完成记录） */
  isNewbie?: boolean;
  /** 后台已标记的高风险用户 */
  hasRiskFlag?: boolean;
}

export type AiQuoteTag =
  | '性价比最高' | '价格最低' | '响应最快' | '经验更稳'
  | '距离最近' | '新人低价' | '谨慎选择' | '低价风险';

export interface QuoteScored extends QuoteInput {
  aiScore: number;
  aiTag: AiQuoteTag | '';
  riskTag: '' | '低价风险' | '新人无完成记录' | '距离过远' | '高风险用户';
  reason: string;
}

export interface CompareResult {
  recommendedWorkerId: string;
  recommendReason: string;
  quoteList: QuoteScored[];
  /** 兜底场景：无报价 / 数据全空 */
  isEmpty: boolean;
  emptyMessage: string;
}

export interface AcceptAdviceInput {
  taskCategoryId?: string;
  budget: number;
  estimateMin?: number;
  estimateMax?: number;
  distance?: number;
  urgency?: UrgencyLevel;
  descriptionLength: number;
}

export interface AcceptAdviceResult {
  level: 'recommend' | 'caution' | 'avoid';
  title: string;
  reasons: string[];
}

const AI_VERSION = ['rule', '1', '0', '0'].join('-');

// ============== 分类规则表 ==============

interface CategoryRule {
  id: CategoryId;
  name: string;
  /** 关键词正则；命中即识别 */
  keywords: RegExp[];
  /** 普通完成基础价格区间 */
  baseMin: number;
  baseMax: number;
  /** 加急倍率 */
  urgentMultiplier: number;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    id: 'ticket', name: '代抢门票',
    keywords: [/演唱会/, /门票/, /抢票/, /开售/, /预约/, /大麦/, /猫眼/, /淘票/, /秒杀/],
    baseMin: 50, baseMax: 200, urgentMultiplier: 1.6,
  },
  {
    id: 'errand', name: '同城跑腿',
    keywords: [/跑腿/, /快递/, /代取/, /代送/, /代买/, /帮拿/, /帮送/, /取件/, /送件/, /排队/],
    baseMin: 15, baseMax: 50, urgentMultiplier: 1.5,
  },
  {
    id: 'home', name: '上门帮忙',
    keywords: [/上门/, /帮忙/, /组装/, /安装/, /维修/, /修理/, /换灯/, /通马桶/],
    baseMin: 50, baseMax: 200, urgentMultiplier: 1.4,
  },
  {
    id: 'clean', name: '家政清洁',
    keywords: [/清洁/, /打扫/, /保洁/, /擦/, /洗/, /拖地/, /收纳/, /整理/],
    baseMin: 80, baseMax: 300, urgentMultiplier: 1.3,
  },
  {
    id: 'moving', name: '搬运服务',
    keywords: [/搬/, /搬家/, /搬运/, /扛/, /楼层/, /电梯/, /家具/, /重物/],
    baseMin: 60, baseMax: 400, urgentMultiplier: 1.4,
  },
  {
    id: 'care', name: '照护陪伴',
    keywords: [/陪伴/, /陪同/, /老人/, /小孩/, /照看/, /看护/, /陪诊/, /陪聊/],
    baseMin: 80, baseMax: 250, urgentMultiplier: 1.5,
  },
  {
    id: 'life', name: '生活服务',
    keywords: [/代办/, /代购/, /日常/, /帮我/, /顺便/, /顺路/],
    baseMin: 20, baseMax: 80, urgentMultiplier: 1.3,
  },
  {
    id: 'business', name: '商务服务',
    keywords: [/写作/, /文案/, /资料/, /翻译/, /设计/, /排版/, /PPT/i, /Excel/i, /表格/, /报告/],
    baseMin: 50, baseMax: 500, urgentMultiplier: 1.5,
  },
  {
    id: 'game', name: '游戏陪玩',
    keywords: [/陪玩/, /上分/, /开黑/, /排位/, /代练/i, /带飞/],
    baseMin: 30, baseMax: 150, urgentMultiplier: 1.3,
  },
  {
    id: 'other', name: '平台帮我分',
    keywords: [], baseMin: 30, baseMax: 100, urgentMultiplier: 1.4,
  },
];

const URGENT_KEYWORDS = [/加急/, /马上/, /现在/, /今天/, /立刻/, /尽快/, /紧急/, /asap/i, /1小时内/, /半小时/];
const IMMEDIATE_KEYWORDS = [/立即/, /5分钟/, /10分钟/, /马上来/];
const COMPLEXITY_KEYWORDS = [/多次/, /持续/, /长期/, /复杂/, /多个/, /详细/, /专业/];

// 敏感词 / 隐私词
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b1[3-9]\d{9}\b/, label: '手机号' },
  { pattern: /\b\d{17}[\dXx]\b/, label: '身份证号' },
  { pattern: /\b\d{16,19}\b/, label: '银行卡号' },
  { pattern: /验证码|短信码|动态码/, label: '验证码' },
  { pattern: /密码|登录密码|支付密码/, label: '密码' },
  { pattern: /账号密码|账户密码/, label: '账号密码' },
  { pattern: /支付码|付款码/, label: '支付码' },
  { pattern: /银行卡号/, label: '银行卡' },
];

// ============== 公共工具 ==============

const round = (n: number) => Math.max(1, Math.round(n));

function detectCategory(text: string, hint?: string): { rule: CategoryRule; confidence: number; hits: string[] } {
  const hitsMap: Record<string, { rule: CategoryRule; hits: string[] }> = {};
  for (const rule of CATEGORY_RULES) {
    const hits: string[] = [];
    for (const re of rule.keywords) {
      const m = text.match(re);
      if (m) hits.push(m[0]);
    }
    if (hits.length) hitsMap[rule.id] = { rule, hits };
  }
  // 用户显式选择优先
  if (hint && hitsMap[hint as CategoryId]) {
    const { rule, hits } = hitsMap[hint as CategoryId];
    return { rule, confidence: 0.95, hits };
  }
  // 命中最多者
  const sorted = Object.values(hitsMap).sort((a, b) => b.hits.length - a.hits.length);
  if (sorted.length) {
    const top = sorted[0];
    const confidence = Math.min(0.9, 0.5 + top.hits.length * 0.15);
    return { rule: top.rule, confidence, hits: top.hits };
  }
  // 兜底
  return { rule: CATEGORY_RULES.find((r) => r.id === 'other')!, confidence: 0.3, hits: [] };
}

function detectUrgency(text: string): UrgencyLevel {
  if (IMMEDIATE_KEYWORDS.some((re) => re.test(text))) return 'immediate';
  if (URGENT_KEYWORDS.some((re) => re.test(text))) return 'urgent';
  return 'normal';
}

function complexityFactor(text: string, imageCount = 0): number {
  let factor = 1;
  const len = text.length;
  if (len > 80) factor += 0.1;
  if (len > 200) factor += 0.15;
  if (imageCount >= 3) factor += 0.1;
  if (imageCount >= 6) factor += 0.1;
  for (const re of COMPLEXITY_KEYWORDS) {
    if (re.test(text)) { factor += 0.08; break; }
  }
  return Math.min(factor, 1.6);
}

function distanceFactor(km?: number): number {
  if (typeof km !== 'number' || km <= 0) return 1;
  if (km <= 3) return 1;
  if (km <= 8) return 1.1;
  if (km <= 15) return 1.25;
  return 1.4;
}

// ============== 1) AI 估价 ==============

export function estimateTaskPrice(input: EstimateInput): EstimateResult {
  const text = `${input.title || ''} ${input.description || ''}`.trim();
  const hasEnoughData = text.length >= 4;

  const { rule, confidence, hits } = detectCategory(text, input.categoryId);
  const urgency = detectUrgency(text);
  const cFactor = complexityFactor(text, input.imageCount);
  const dFactor = distanceFactor(input.distance);

  const minPrice = round(rule.baseMin * cFactor * dFactor);
  const maxPrice = round(rule.baseMax * cFactor * dFactor);
  const recommendPrice = round((minPrice + maxPrice) / 2 * 0.92);
  const urgentMinPrice = round(minPrice * rule.urgentMultiplier);
  const urgentMaxPrice = round(maxPrice * rule.urgentMultiplier);

  let reason = `根据「${rule.name}」类目和任务描述长度`;
  if (hits.length) reason += `，识别到「${hits.slice(0, 2).join('、')}」等关键词`;
  if (typeof input.distance === 'number' && input.distance > 3) reason += `，距离约 ${input.distance} 公里`;
  if (urgency !== 'normal') reason += '，属于加急任务';
  reason += `，${recommendPrice} 元更容易被靠谱接单者看到。`;

  // 与用户填写预算比对
  let budgetHint: EstimateResult['budgetHint'] = 'unknown';
  let budgetHintText = '';
  const ub = input.userBudget;
  if (typeof ub === 'number' && ub > 0) {
    const refMin = urgency !== 'normal' ? urgentMinPrice : minPrice;
    const refMax = urgency !== 'normal' ? urgentMaxPrice : maxPrice;
    if (ub < refMin * 0.6) {
      budgetHint = 'too-low';
      budgetHintText = `这个预算可能接单速度较慢，建议提高到 ${recommendPrice} 元左右，更容易被靠谱接单者看到。`;
    } else if (ub > refMax * 1.3) {
      budgetHint = 'too-high';
      budgetHintText = '这个预算吸引力较高，适合加急或高要求任务。';
    } else {
      budgetHint = 'fair';
      budgetHintText = '这个价格比较合理，预计更容易被接单。';
    }
  }

  return {
    minPrice, maxPrice, recommendPrice,
    urgentMinPrice, urgentMaxPrice,
    detectedCategoryId: rule.id,
    detectedCategoryName: rule.name,
    detectedCategoryConfidence: confidence,
    urgency,
    hitKeywords: hits.slice(0, 4),
    reason: hasEnoughData ? reason : '暂无足够内容判断，先按平台基础规则参考。',
    budgetHint,
    budgetHintText,
    hasEnoughData,
    aiVersion: AI_VERSION,
  };
}

// ============== 2) 需求完整度审查 ==============

export function reviewTaskDraft(input: ReviewInput): ReviewResult {
  const text = `${input.title || ''} ${input.description || ''}`;
  const missing: ReviewResult['missingFields'] = [];
  const tips: string[] = [];

  if (!/今天|明天|后天|周末|早上|下午|晚上|前|点|时|号|日/.test(text)) {
    missing.push('time'); tips.push('补充明确时间，例如「今天下午 3 点前」更容易被接单');
  }
  if (!input.hasRegion && !/[省市区县街道路号]/.test(text)) {
    missing.push('location'); tips.push('补充地点或地区，跑腿/上门类任务尤其关键');
  }
  if (!/加急|马上|今天|尽快|普通|不急|周末/.test(text)) {
    missing.push('urgency'); tips.push('说明是否加急，方便接单者评估');
  }
  if (!input.imageCount || input.imageCount === 0) {
    missing.push('images'); tips.push('上传 1-2 张参考图，让接单者看得更清楚');
  }
  if (!input.hasAcceptanceStandard) {
    missing.push('standard'); tips.push('补充验收标准，减少完成后扯皮');
  }
  if ((input.description || '').length < 15) {
    missing.push('detail'); tips.push('描述太短，建议补充任务细节和完成要求');
  }

  const completeness = Math.max(0, 100 - missing.length * 16);
  const suggestedAppendText = missing.length
    ? `\n补充信息：\n时间：\n地点：\n是否加急：\n完成标准：`
    : '';

  return { missingFields: missing, tips, completeness, suggestedAppendText };
}

// ============== 3) 敏感词检测 ==============

export function detectSensitiveInfo(text: string): SensitiveResult {
  const hits: string[] = [];
  for (const item of SENSITIVE_PATTERNS) {
    if (item.pattern.test(text)) hits.push(item.label);
  }
  const unique = Array.from(new Set(hits));
  return {
    hit: unique.length > 0,
    hitWords: unique,
    message: unique.length
      ? `请勿在公开内容中填写${unique.join('、')}等敏感信息，涉及账号或验证码请通过平台安全沟通。`
      : '',
  };
}

// ============== 4) 比价 / 性价比评分 ==============

export function compareTaskQuotes(
  quotes: QuoteInput[],
  task: { estimateMin?: number; estimateMax?: number; estimateRecommend?: number; urgency?: UrgencyLevel },
): CompareResult {
  if (!quotes || quotes.length === 0) {
    return {
      recommendedWorkerId: '',
      recommendReason: '',
      quoteList: [],
      isEmpty: true,
      emptyMessage: '还没有报价，先等等看，平台会优先把任务推给合适的接单者。',
    };
  }

  const refMin = task.estimateMin ?? Math.min(...quotes.map((q) => q.quotePrice));
  const refMax = task.estimateMax ?? Math.max(...quotes.map((q) => q.quotePrice));
  const refRecommend = task.estimateRecommend ?? (refMin + refMax) / 2;
  const isUrgent = task.urgency && task.urgency !== 'normal';

  // 极值参考（用于打"价格最低/响应最快/距离最近"标签）
  const minQuote = Math.min(...quotes.map((q) => q.quotePrice));
  const fastestSpeed = Math.min(...quotes.map((q) => q.responseSpeed ?? Infinity));
  const nearestDist = Math.min(...quotes.map((q) => q.distance ?? Infinity));

  const scored: QuoteScored[] = quotes.map((q) => {
    let score = 60;
    let riskTag: QuoteScored['riskTag'] = '';

    // 价格契合度（越接近 recommend 越高，过低惩罚）
    if (q.quotePrice < refMin * 0.6) {
      score -= 18; riskTag = '低价风险';
    } else if (q.quotePrice <= refRecommend) {
      score += 10;
    } else if (q.quotePrice <= refMax) {
      score += 4;
    } else {
      score -= 6;
    }

    // 完成率
    if (typeof q.completionRate === 'number') score += Math.round((q.completionRate - 0.7) * 50);
    // 好评率
    if (typeof q.goodRate === 'number') score += Math.round((q.goodRate - 0.7) * 30);
    // 响应速度（分钟，越小越好）
    if (typeof q.responseSpeed === 'number') {
      if (q.responseSpeed <= 5) score += 8;
      else if (q.responseSpeed <= 15) score += 4;
      else if (q.responseSpeed >= 60) score -= 6;
    }
    // 距离
    if (typeof q.distance === 'number') {
      if (q.distance <= 3) score += 6;
      else if (q.distance > 15) { score -= 5; if (isUrgent) riskTag = riskTag || '距离过远'; }
    }
    // 同类任务经验
    if (typeof q.similarTaskCount === 'number') score += Math.min(8, q.similarTaskCount);
    // 新人惩罚（轻）
    if (q.isNewbie) { score -= 5; if (!riskTag) riskTag = '新人无完成记录'; }
    // 风险标记
    if (q.hasRiskFlag) { score -= 25; riskTag = '高风险用户'; }
    // 加急偏好响应快
    if (isUrgent && typeof q.responseSpeed === 'number' && q.responseSpeed <= 10) score += 6;

    score = Math.max(0, Math.min(100, score));

    // 标签
    let aiTag: QuoteScored['aiTag'] = '';
    if (q.hasRiskFlag || riskTag === '低价风险') aiTag = '谨慎选择';
    else if (q.isNewbie && q.quotePrice <= refMin) aiTag = '新人低价';
    else if (q.quotePrice === minQuote && quotes.length > 1) aiTag = '价格最低';
    else if (q.responseSpeed === fastestSpeed && fastestSpeed !== Infinity) aiTag = '响应最快';
    else if (q.distance === nearestDist && nearestDist !== Infinity) aiTag = '距离最近';
    else if ((q.similarTaskCount ?? 0) >= 5) aiTag = '经验更稳';

    const reason = buildQuoteReason(q, refMin, refMax, refRecommend);
    return { ...q, aiScore: score, aiTag, riskTag, reason };
  });

  // 排序：score 降序
  const sortedScored = [...scored].sort((a, b) => b.aiScore - a.aiScore);
  // 不允许"低价风险/高风险用户"成为首推
  const topSafe = sortedScored.find((q) => !q.hasRiskFlag && q.riskTag !== '低价风险') || sortedScored[0];

  // 给推荐者补"性价比最高"标签
  const indexInScored = scored.findIndex((q) => q.workerId === topSafe.workerId);
  if (indexInScored >= 0 && !scored[indexInScored].hasRiskFlag && scored[indexInScored].riskTag !== '低价风险') {
    scored[indexInScored].aiTag = '性价比最高';
  }

  return {
    recommendedWorkerId: topSafe.workerId,
    recommendReason: buildRecommendReason(topSafe, refMin, refMax),
    quoteList: scored,
    isEmpty: false,
    emptyMessage: '',
  };
}

function buildQuoteReason(q: QuoteInput, refMin: number, refMax: number, refRec: number): string {
  const parts: string[] = [];
  if (q.quotePrice < refMin * 0.6) parts.push('报价偏低，建议先沟通确认服务内容');
  else if (q.quotePrice <= refRec) parts.push('报价在合理区间内');
  else if (q.quotePrice > refMax) parts.push('报价偏高，可对比其他选项');
  if (typeof q.distance === 'number' && q.distance <= 3) parts.push('距离较近');
  if (typeof q.responseSpeed === 'number' && q.responseSpeed <= 10) parts.push('响应较快');
  if (typeof q.completionRate === 'number' && q.completionRate >= 0.9) parts.push('完成率高');
  if ((q.similarTaskCount ?? 0) >= 5) parts.push('做过同类任务');
  if (q.isNewbie) parts.push('新人无历史完成记录');
  return parts.length ? parts.join('，') + '。' : '综合表现一般，仅供参考。';
}

function buildRecommendReason(q: QuoteScored, refMin: number, refMax: number): string {
  const bits: string[] = [];
  if (q.quotePrice >= refMin && q.quotePrice <= refMax) bits.push('报价在合理区间内');
  if (typeof q.distance === 'number' && q.distance <= 5) bits.push('距离较近');
  if (typeof q.responseSpeed === 'number' && q.responseSpeed <= 15) bits.push('响应较快');
  if (typeof q.completionRate === 'number' && q.completionRate >= 0.85) bits.push('完成率高');
  if (!bits.length) bits.push('综合性价比相对更稳');
  return `建议优先考虑${q.workerName ? '「' + q.workerName + '」' : '这位接单者'}：${bits.join('，')}。最终选择仍由你决定。`;
}

// ============== 5) 接单者建议 ==============

export function buildAcceptAdvice(input: AcceptAdviceInput): AcceptAdviceResult {
  const reasons: string[] = [];
  let level: AcceptAdviceResult['level'] = 'recommend';

  if (typeof input.estimateMin === 'number' && input.budget < input.estimateMin * 0.5) {
    reasons.push('该任务预算明显偏低于市场参考价，存在低价拉单风险');
    level = 'avoid';
  } else if (typeof input.estimateMin === 'number' && input.budget < input.estimateMin * 0.7) {
    reasons.push('该任务预算偏低，建议先沟通服务内容');
    level = 'caution';
  } else if (typeof input.estimateMax === 'number' && input.budget >= input.estimateMax * 0.9) {
    reasons.push('该任务预算合理偏上，适合接单');
  }
  if (typeof input.distance === 'number') {
    if (input.distance <= 3) reasons.push('距离较近');
    else if (input.distance > 15) { reasons.push('距离较远，注意时间成本'); if (level === 'recommend') level = 'caution'; }
  }
  if (input.urgency && input.urgency !== 'normal') reasons.push('该任务为加急，接单前请确认时间');
  if (input.descriptionLength < 15) {
    reasons.push('需求描述较少，建议先和客户确认细节');
    if (level === 'recommend') level = 'caution';
  }

  const finalLevel = level as AcceptAdviceResult['level'];
  const title =
    finalLevel === 'avoid' ? 'AI 提醒：暂不建议接单' :
    finalLevel === 'caution' ? 'AI 提醒：可接，但建议先沟通' :
    'AI 提醒：该任务适合接单';

  return { level: finalLevel, title, reasons };
}

// 免责文案（统一出口，方便后台改）
export const AI_DISCLAIMER = 'AI 推荐仅供参考，最终选择由你决定，平台会结合人工审核继续保障交易安全。';
