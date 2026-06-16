/**
 * 微信小程序分享工具
 *
 * 使用方式（在各页面中使用 Taro 分享 Hook）：
 *
 * // 在页面组件中使用：
 * import { useShareAppMessage, useShareTimeline } from '@tarojs/taro'
 *
 * // 页面内：
 * useShareAppMessage(() => ({
 *   title: '来有应帮看看',
 *   path: '/pages/home/index',
 *   imageUrl: '',
 * }))
 *
 * useShareTimeline(() => ({
 *   title: '有应帮 - 让需求被看见，让技能被回应',
 * }))
 *
 * 本文件提供工具函数统一管理分享配置。
 */

import { Network } from '@/network'
import { getToken } from '@/lib/auth'

/** 默认分享标题 */
export const DEFAULT_SHARE_TITLE = '有应帮 - 让需求被看见，让技能被回应'

/** 默认分享图片（需要上传到 TOS 后替换） */
export const DEFAULT_SHARE_IMAGE = ''

/**
 * 生成首页分享配置
 */
export function getIndexShareConfig() {
  return {
    title: '有应帮 - 发需求，有人应',
    path: '/pages/home/index',
    imageUrl: DEFAULT_SHARE_IMAGE,
  }
}

/**
 * 生成任务详情分享配置
 */
export function getTaskDetailShareConfig(taskId: string, taskTitle: string) {
  return {
    title: taskTitle ? `【任务】${taskTitle.slice(0, 20)}` : '任务详情',
    path: `/pages/task-detail/index?id=${taskId}`,
    imageUrl: DEFAULT_SHARE_IMAGE,
  }
}

/**
 * 生成任务大厅分享配置
 */
export function getTasksShareConfig() {
  return {
    title: '任务大厅 - 海量任务等你来接',
    path: '/pages/tasks/index',
    imageUrl: DEFAULT_SHARE_IMAGE,
  }
}

/**
 * 分享给朋友（主动调用，用于按钮触发时先设置再唤起分享面板）
 * 注意：微信小程序中 onShareAppMessage 需在组件中定义，不能主动调用
 * 此函数仅用于记录分享事件
 */
export async function trackShare(scene: string, extra?: Record<string, any>) {
  console.log('[Share] 分享事件:', scene, extra)

  try {
    const token = getToken()
    await Network.request({
      url: '/api/share/track',
      method: 'POST',
      data: { scene, extra },
      header: { authorization: `Bearer ${token}` },
    })
  } catch {
    // 静默失败，分享统计不影响主流程
  }
}
