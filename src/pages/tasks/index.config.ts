export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '需求广场', navigationStyle: 'custom' })
  : { navigationBarTitleText: '需求广场', navigationStyle: 'custom' };
