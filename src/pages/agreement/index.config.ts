export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '用户协议与隐私政策' })
  : { navigationBarTitleText: '用户协议与隐私政策' };
