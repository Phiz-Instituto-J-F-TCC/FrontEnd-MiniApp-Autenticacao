const app = getApp<IAppOption>()

Page({
  data: {
    motto: '',
  },
  // Event handlers
  bindViewTap() {
    pz.navigateTo({
      url: '../logs/logs',
    })
  },
  onLoad() {
    this.setData({
      motto: 'hello world'
    })
  }
})
