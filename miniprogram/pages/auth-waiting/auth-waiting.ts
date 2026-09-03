const API_BASE_URL = 'https://authentication-api-h6wc.onrender.com'
const POLL_INTERVAL_MS = 5000
const RESEND_COOLDOWN_SECONDS = 30

type AuthenticationStatusResponse = {
  verified?: boolean
}

function getResponseData<T>(data: unknown): T {
  if (typeof data !== 'string') {
    return data as T
  }

  try {
    return JSON.parse(data) as T
  } catch {
    return {} as T
  }
}

Page({
  data: {
    email: '',
    resendDisabled: false,
    resendCountdown: 0,
  },

  pollTimer: null as ReturnType<typeof setInterval> | null,
  resendTimer: null as ReturnType<typeof setInterval> | null,
  pollingToken: '',

  onLoad(query: Record<string, string>) {
    const email = decodeURIComponent(query.email || '')
    const pollingToken = decodeURIComponent(query.polling_token || '')
    this.pollingToken = pollingToken
    this.setData({ email })
    if (email && pollingToken) {
      this.startPolling(pollingToken)
    }
  },

  onShow() {
    if (this.data.email && this.pollingToken) {
      this.checkVerificationStatus(this.pollingToken)
    }
  },

  onUnload() {
    this.stopPolling()
    this.stopResendCooldown()
  },

  startPolling(pollingToken: string) {
    this.stopPolling()
    this.pollTimer = setInterval(() => {
      this.checkVerificationStatus(pollingToken)
    }, POLL_INTERVAL_MS)
  },

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  },

  checkVerificationStatus(pollingToken: string) {
    pz.request({
      url: `${API_BASE_URL}/authentication_status`,
      method: 'GET',
      header: {
        'X-Authentication-Polling-Token': pollingToken,
      },
      success: (res) => {
        const body = getResponseData<AuthenticationStatusResponse>(res.data)
        if (res.statusCode === 200 && body?.verified === true) {
          this.stopPolling()
          pz.redirectTo({
            url: `../auth-success/auth-success?email=${encodeURIComponent(this.data.email)}`,
          })
        } else if (res.statusCode === 401) {
          this.stopPolling()
          pz.showToast({ title: 'Sua sessão expirou. Inicie novamente.', icon: 'none' })
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

    const pollingToken = this.pollingToken
    if (!pollingToken) {
      pz.showToast({ title: 'Sua sessão expirou. Inicie novamente.', icon: 'none' })
      return
    }

    pz.request({
      url: `${API_BASE_URL}/authentication_resend`,
      method: 'POST',
      header: {
        'X-Authentication-Polling-Token': pollingToken,
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.startPolling(pollingToken)
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
