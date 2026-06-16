export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '订单中心', navigationStyle: 'custom' })
  : { navigationBarTitleText: '订单中心', navigationStyle: 'custom' };
