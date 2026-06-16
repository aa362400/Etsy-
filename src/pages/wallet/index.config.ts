export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '我的钱包', navigationStyle: 'custom' })
  : { navigationBarTitleText: '我的钱包', navigationStyle: 'custom' };
