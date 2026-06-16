/**
 * 隐私授权组件
 * 
 * 微信小程序隐私合规要求：
 * - 在调用需隐私授权的 API 前，必须调用 wx.requirePrivacyAuthorize 获取用户同意
 * - 在页面 onLoad/onShow 时调用 wx.getPrivacySetting 检查授权状态
 * 
 * 用法：
 *   import { usePrivacy } from '@/components/PrivacyAuth'
 *   const { privacyAuthorized, requestPrivacy } = usePrivacy()
 *   if (!privacyAuthorized) {
 *     await requestPrivacy()
 *   }
 */
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'

export function usePrivacy() {
  const [privacyAuthorized, setPrivacyAuthorized] = useState(true)
  const [privacyChecked, setPrivacyChecked] = useState(false)

  useEffect(() => {
    checkPrivacy()
  }, [])

  const checkPrivacy = async () => {
    const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
    if (!isWeapp) {
      // H5 无需隐私授权
      setPrivacyAuthorized(true)
      setPrivacyChecked(true)
      return
    }

    try {
      // 检查是否需要隐私授权
      if (typeof Taro.getPrivacySetting === 'function') {
        const res = await Taro.getPrivacySetting() as any;
        const needAuth = res?.needAuthorization;
        setPrivacyAuthorized(!needAuth)
        console.log('[Privacy] 需要隐私授权:', needAuth)
      } else {
        // 旧版基础库不支持，默认已授权
        setPrivacyAuthorized(true)
      }
    } catch (e) {
      console.warn('[Privacy] getPrivacySetting 失败:', e)
      setPrivacyAuthorized(true) // 降级处理
    }
    setPrivacyChecked(true)
  }

  const requestPrivacy = async (): Promise<boolean> => {
    const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
    if (!isWeapp) return true

    try {
      if (typeof Taro.requirePrivacyAuthorize === 'function') {
        await Taro.requirePrivacyAuthorize()
        setPrivacyAuthorized(true)
        return true
      }
    } catch (e: any) {
      console.warn('[Privacy] requirePrivacyAuthorize 失败:', e)
    }

    // 降级方案：弹窗提示
    const res = await Taro.showModal({
      title: '隐私协议',
      content: '在使用服务前，需要您同意《用户隐私协议》。我们承诺保护您的个人信息安全。',
      confirmText: '同意',
      cancelText: '暂不同意',
    })
    if (res.confirm) {
      setPrivacyAuthorized(true)
      return true
    }
    return false
  }

  const openPrivacyContract = () => {
    Taro.navigateTo({ url: '/pages/agreement/index?type=privacy' })
  }

  return {
    privacyAuthorized,
    privacyChecked,
    checkPrivacy,
    requestPrivacy,
    openPrivacyContract,
  }
}

/**
 * 隐私协议组件（可嵌入页面使用）
 */
export function PrivacyAgreementBar({
  onAgree,
  onViewPolicy,
}: {
  onAgree: () => void
  onViewPolicy: () => void
}) {
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP

  if (!isWeapp) return null

  return (
    <View
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '14px 16px',
        backgroundColor: '#FFFDF8',
        borderTop: '1px solid rgba(255, 184, 58, 0.26)',
        boxShadow: '0 -10px 30px rgba(109, 70, 16, 0.08)',
        zIndex: 1000,
      }}
    >
      <Text className="block text-xs" style={{ flex: 1, color: '#6F5A3C', lineHeight: 1.5 }}>
        在使用服务前，请阅读并同意
        <Text
          style={{ color: '#B87920', textDecoration: 'underline', fontWeight: 700 }}
          onClick={onViewPolicy}
        >
          《用户隐私协议》
        </Text>
      </Text>
      <View
        style={{
          marginLeft: 12,
          padding: '8px 18px',
          background: 'linear-gradient(135deg, #FFE66D 0%, #FF9F1F 100%)',
          borderRadius: 999,
        }}
        onClick={onAgree}
      >
        <Text className="block text-xs" style={{ color: '#211400', fontWeight: 800 }}>同意</Text>
      </View>
    </View>
  )
}
