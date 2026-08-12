Page({
  data: {
    email: '',
  },

  onLoad(query: Record<string, string>) {
    this.setData({ email: decodeURIComponent(query.email || '') })
  },

  onFinish() {
    pz.exitMiniProgram()
  },
})
