const API_BASE_URL = 'https://authentication-api-h6wc.onrender.com'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AuthenticateResponse = {
  polling_token?: string
  detail?: string
}

type AuthenticationEmailStatusResponse = {
  eligible?: boolean
  detail?: string
}

Page({
  data: {
    email: '',
    hasError: false,
    errorMessage: '',
    isLoading: false,
    canRequestPhone: false,
    emailIsEligible: false,
  },

  onEmailInput(e: WechatMiniprogram.CustomEvent) {
    const email = e.detail.value
    this.setData({
      email,
      hasError: false,
      errorMessage: '',
      canRequestPhone: EMAIL_REGEX.test(email.trim()),
      emailIsEligible: false,
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

  onVerifyEmail() {
    const email = this.data.email.trim()
    const validationError = this.validateEmail(email)

    if (validationError) {
      this.setData({ hasError: true, errorMessage: validationError })
      return
    }

    this.setData({ isLoading: true })

    pz.request({
      url: `${API_BASE_URL}/authentication_email_status`,
      method: 'POST',
      data: { email },
      success: (res) => {
        const body = res.data as AuthenticationEmailStatusResponse
        if (res.statusCode === 200 && body.eligible) {
          this.setData({ hasError: false, errorMessage: '', emailIsEligible: true })
          return
        }

        this.setData({
          hasError: true,
          emailIsEligible: false,
          errorMessage:
            res.statusCode === 404 && body.detail === 'E-mail não encontrado ou está inativo.'
              ? 'E-mail não encontrado ou está inativo.'
              : body.detail || 'Não foi possível validar o e-mail. Tente novamente.',
        })
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

  onGetPhoneNumber(e: WechatMiniprogram.ButtonGetPhoneNumber) {
    const email = this.data.email.trim()
    const validationError = this.validateEmail(email)

    if (validationError) {
      this.setData({ hasError: true, errorMessage: validationError })
      return
    }

    if (!this.data.emailIsEligible) {
      this.setData({
        hasError: true,
        errorMessage: 'Verifique seu e-mail antes de autorizar o número pelo Phiz.',
      })
      return
    }

    const phoneCode = e.detail.code
    if (typeof phoneCode !== 'string' || !phoneCode) {
      this.setData({
        hasError: true,
        errorMessage: 'Para continuar, autorize o acesso ao seu número pelo Phiz.',
      })
      return
    }

    this.setData({ isLoading: true })

    pz.request({
      url: `${API_BASE_URL}/authenticate`,
      method: 'POST',
      data: {
        email,
        phone_code: phoneCode,
      },
      success: (res) => {
        const body = res.data as AuthenticateResponse
        const pollingToken = body?.polling_token
        if (res.statusCode === 200 && typeof pollingToken === 'string' && pollingToken) {
          pz.navigateTo({
            url: `/pages/auth-waiting/auth-waiting?email=${encodeURIComponent(email)}&polling_token=${encodeURIComponent(pollingToken)}`,
            fail: () => {
              this.setData({
                hasError: true,
                errorMessage: 'A autenticação foi iniciada, mas não foi possível abrir a próxima tela. Tente novamente.',
              })
            },
          })
        } else {
          this.setData({
            hasError: true,
            errorMessage:
              res.statusCode === 404
                ? 'E-mail não encontrado ou está inativo.'
                : body.detail || 'Não foi possível enviar a verificação. Tente novamente.',
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