const API_BASE_URL = 'http://127.0.0.1:8000'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Page({
  data: {
    email: '',
    hasError: false,
    errorMessage: '',
    isLoading: false,
  },

  onEmailInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({
      email: e.detail.value,
      hasError: false,
      errorMessage: '',
    })
  },

  validateEmail(email: string): string | null {
    if (!email) {
      return 'Digite seu e-mail institucional.'
    }
    if (!EMAIL_REGEX.test(email)) {
      return 'E-mail inválido. Verifique o formato digitado.'
    }
    return null
  },

  onSubmit() {
    const email = this.data.email.trim()
    const validationError = this.validateEmail(email)

    if (validationError) {
      this.setData({ hasError: true, errorMessage: validationError })
      return
    }

    this.setData({ isLoading: true })

    pz.request({
      url: `${API_BASE_URL}/auth/email/send-verification`,
      method: 'POST',
      data: { email },
      success: (res) => {
        if (res.statusCode === 200) {
          pz.navigateTo({
            url: `../auth-waiting/auth-waiting?email=${encodeURIComponent(email)}`,
          })
        } else {
          this.setData({
            hasError: true,
            errorMessage: 'Não foi possível enviar a verificação. Tente novamente.',
          })
        }
      },
      fail: () => {
        pz.showToast({
          title: 'Falha de conexão. Verifique sua internet.',
          icon: 'none',
        })
      },
      complete: () => {
        this.setData({ isLoading: false })
      },
    })
  },
})
