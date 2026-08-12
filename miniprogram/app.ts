App<IAppOption>({
  globalData: {},
  onLaunch() {
    const logs = pz.getStorageSync('logs') || []
    logs.unshift(Date.now())
    pz.setStorageSync('logs', logs)
  },
})