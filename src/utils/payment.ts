/**
 * 微信支付工具 — Taro 小程序端
 *
 * 使用方式：
 *   import { requestPayOrder, queryPayStatus } from '@/utils/payment'
 *   const result = await requestPayOrder({ orderType: 'task', businessId: taskId, amount: 99.9, description: '任务支付' })
 *   // 返回 result 包含 wx.requestPayment 所需参数
 */
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { getToken } from '@/lib/auth'

export interface PayOrderInput {
  orderType: 'task' | 'wallet_recharge' | 'virtual_product'
  businessId?: string
  amount: number
  description?: string
}

export interface PayOrderResult {
  orderId: string
  outTradeNo: string
  payment: {
    timeStamp: string
    nonceStr: string
    package: string
    signType: 'RSA'
    paySign: string
  }
}

export interface PayStatusResult {
  orderId: string
  outTradeNo: string
  payStatus: string
  orderStatus: string
  amount: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getAuthHeader = () => {
  const token = getToken()
  if (!token) {
    throw new Error('请先登录后再发起支付')
  }
  return { authorization: `Bearer ${token}` }
}

/**
 * 发起支付（创建支付订单 → 调起微信支付）
 */
export async function requestPay(input: PayOrderInput): Promise<{
  success: boolean
  orderId?: string
  outTradeNo?: string
  errorMsg?: string
}> {
  // 1. 创建支付订单
  let payData: PayOrderResult
  try {
    const authHeader = getAuthHeader()
    const res = await Network.request({
      url: '/api/pay/create',
      method: 'POST',
      header: authHeader,
      data: {
        orderType: input.orderType,
        businessId: input.businessId || '',
        amount: input.amount,
        description: input.description || '',
      },
    })
    if (res.data?.code !== 200 || !res.data?.data) {
      return { success: false, errorMsg: res.data?.msg || '创建支付订单失败' }
    }
    payData = res.data.data
  } catch (e: any) {
    return { success: false, errorMsg: e.message || '网络错误' }
  }

  // 2. 调起微信支付
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
  if (!isWeapp) {
    // H5 降级：提示请在微信中打开
    return {
      success: false,
      orderId: payData.orderId,
      outTradeNo: payData.outTradeNo,
      errorMsg: '请在微信小程序中完成真实支付',
    }
  }

  try {
    const wxRes = await Taro.requestPayment({
      timeStamp: payData.payment.timeStamp,
      nonceStr: payData.payment.nonceStr,
      package: payData.payment.package,
      signType: payData.payment.signType,
      paySign: payData.payment.paySign,
    })
    console.log('[Payment] 支付成功', wxRes)
    return {
      success: true,
      orderId: payData.orderId,
      outTradeNo: payData.outTradeNo,
    }
  } catch (e: any) {
    console.error('[Payment] 支付失败或取消', e)
    if (e.errMsg?.includes('cancel')) {
      return { success: false, errorMsg: '用户取消支付' }
    }
    return { success: false, errorMsg: e.errMsg || '支付失败' }
  }
}

/**
 * 查询支付订单状态
 */
export async function queryPayStatus(orderId: string): Promise<{
  orderId: string
  outTradeNo: string
  payStatus: string
  orderStatus: string
  amount: number
} | null> {
  try {
    const authHeader = getAuthHeader()
    const res = await Network.request({
      url: `/api/pay/status?orderId=${encodeURIComponent(orderId)}&sync=1`,
      method: 'GET',
      header: authHeader,
    })
    if (res.data?.code === 200 && res.data?.data) {
      return res.data.data
    }
    return null
  } catch {
    return null
  }
}

/**
 * 轮询支付状态（用于 H5 端支付后查询）
 */
/**
 * 等待服务端微信支付回调确认。只有后端返回 paid 才算支付成功。
 */
export async function waitForPayPaid(orderId: string, maxAttempts = 10, intervalMs = 1000): Promise<PayStatusResult | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await queryPayStatus(orderId)
    if (status?.payStatus === 'paid') {
      return status
    }
    if (attempt < maxAttempts - 1) {
      await sleep(intervalMs)
    }
  }
  return null
}

export function pollPayStatus(
  orderId: string,
  onSuccess: (data: any) => void,
  onFail?: () => void,
  maxAttempts = 30,
  intervalMs = 2000,
) {
  let attempts = 0
  const timer = setInterval(async () => {
    attempts++
    const status = await queryPayStatus(orderId)
    if (status?.payStatus === 'paid') {
      clearInterval(timer)
      onSuccess(status)
    } else if (attempts >= maxAttempts) {
      clearInterval(timer)
      onFail?.()
    }
  }, intervalMs)
  return () => clearInterval(timer)
}
