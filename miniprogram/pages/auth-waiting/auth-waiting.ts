const API_BASE_URL = 'http://127.0.0.1:8080'
const MOCK_NUMERO_CELULAR = '00000000000'

const POLL_INTERVAL_MS = 5000
const RESEND_COOLDOWN_SECONDS = 30

type AuthenticateResponse = {
  authentication_id?: number
}

type AuthenticationStatusResponse = {
  verified?: boolean
}

Page({
  data: {
    email: '',
    authenticationId: 0,
    resendDisabled: false,
    resendCountdown: 0,
  },

  pollTimer: null as ReturnType<typeof setInterval> | null,
  resendTimer: null as ReturnType<typeof setInterval> | null,

  onLoad(query: Record<string, string>) {
    const email = decodeURIComponent(query.email || '')
    this.setData({ email, MOCK_NUMERO_CELULAR })
    if (email && MOCK_NUMERO_CELULAR) {
      this.startPolling(email, MOCK_NUMERO_CELULAR)
    }
  },

  onShow() {
    if (this.data.email && this.MOCK_NUMERO_CELULAR) {
      this.checkVerificationStatus(this.data.email, this.MOCK_NUMERO_CELULAR)
    }
  },

  onUnload() {
    this.stopPolling()
    this.stopResendCooldown()
  },

  startPolling(email: string, numeroCelular: string) {
    this.stopPolling()
    this.pollTimer = setInterval(() => {
      this.checkVerificationStatus(email, numeroCelular)
    }, POLL_INTERVAL_MS)
  },

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  },

  checkVerificationStatus(email: string, numeroCelular: string) {
    pz.request({
      url: `${API_BASE_URL}/authentication-status`,
      method: 'GET',
      data: {
        email,
        numero_celular: numeroCelular,
      },
      success: (res) => {
        const body = res.data as AuthenticationStatusResponse
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

    const numeroCelular = getApp<IAppOption>().globalData.numeroCelular
    if (!numeroCelular) {
      pz.showToast({ title: 'Não foi possível identificar seu número Phiz.', icon: 'none' })
      return
    }

    pz.request({
      url: `${API_BASE_URL}/authenticate`,
      method: 'POST',
      data: {
        email,
        numero_celular: numeroCelular,
      },
      success: (res) => {
        const body = res.data as AuthenticateResponse
        if (res.statusCode === 200) {
          this.startPolling(email, MOCK_NUMERO_CELULAR)
          pz.showToast({ title: 'E-mail reenviado', icon: 'success' })
          this.startResendCooldown()
          return
        }

        pz.showToast({ title: 'Falha ao reenviar. Tente novamente.', icon: 'none' })
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
