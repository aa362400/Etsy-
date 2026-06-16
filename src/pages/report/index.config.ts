export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '举报' })
  : { navigationBarTitleText: '举报' };
