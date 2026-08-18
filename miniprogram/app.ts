App<IAppOption>({
  globalData: {
    numeroCelular: '',
  },
  onLaunch() {
    const logs = pz.getStorageSync('logs') || []
    logs.unshift(Date.now())
    pz.setStorageSync('logs', logs)
  },
})
