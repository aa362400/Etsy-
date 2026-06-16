export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '服务方中心', navigationStyle: 'custom' })
  : { navigationBarTitleText: '服务方中心', navigationStyle: 'custom' };
