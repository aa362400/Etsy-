export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '发布任务', navigationStyle: 'custom' })
  : { navigationBarTitleText: '发布任务', navigationStyle: 'custom' };
