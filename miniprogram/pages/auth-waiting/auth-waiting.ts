const API_BASE_URL = 'http://127.0.0.1:8000'
const POLL_INTERVAL_MS = 5000
const RESEND_COOLDOWN_SECONDS = 30

Page({
  data: {
    email: '',
    resendDisabled: false,
    resendCountdown: 0,
  },

  pollTimer: null as ReturnType<typeof setInterval> | null,
  resendTimer: null as ReturnType<typeof setInterval> | null,

  onLoad(query: Record<string, string>) {
    const email = decodeURIComponent(query.email || '')
    this.setData({ email })
    this.startPolling(email)
  },

  onShow() {
    if (this.data.email) {
      this.checkVerificationStatus(this.data.email)
    }
  },

  onUnload() {
    this.stopPolling()
    this.stopResendCooldown()
  },

  startPolling(email: string) {
    this.pollTimer = setInterval(() => {
      this.checkVerificationStatus(email)
    }, POLL_INTERVAL_MS)
  },

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  },

  checkVerificationStatus(email: string) {
    pz.request({
      url: `${API_BASE_URL}/auth/email/verification-status`,
      method: 'GET',
      data: { email },
      success: (res) => {
        const body = res.data as { verified?: boolean }
        if (body?.verified) {
          this.stopPolling()
          pz.redirectTo({
            url: `../auth-success/auth-success?email=${encodeURIComponent(email)}`,
          })
        }
      },
      fail: () => {
        // O próximo ciclo do polling tentará novamente.
      },
    })
  },

  onResend() {
    const email = this.data.email
    if (!email || this.data.resendDisabled) {
      return
    }

    pz.request({
      url: `${API_BASE_URL}/auth/email/send-verification`,
      method: 'POST',
      data: { email },
      success: () => {
        pz.showToast({ title: 'E-mail reenviado', icon: 'success' })
        this.startResendCooldown()
      },
      fail: () => {
        pz.showToast({ title: 'Falha ao reenviar. Tente novamente.', icon: 'none' })
      },
    })
  },

  startResendCooldown() {
    this.setData({ resendDisabled: true, resendCountdown: RESEND_COOLDOWN_SECONDS })

    this.resendTimer = setInterval(() => {
      const next = this.data.resendCountdown - 1
      if (next <= 0) {
        this.stopResendCooldown()
      } else {
        this.setData({ resendCountdown: next })
      }
    }, 1000)
  },

  stopResendCooldown() {
    if (this.resendTimer) {
      clearInterval(this.resendTimer)
      this.resendTimer = null
    }
    this.setData({ resendDisabled: false, resendCountdown: 0 })
  },
})
