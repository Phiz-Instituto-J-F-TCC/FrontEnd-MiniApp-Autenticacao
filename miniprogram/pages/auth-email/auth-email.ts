const API_BASE_URL = 'https://authentication-api-h6wc.onrender.com'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AuthenticationEmailStatusResponse = {
  eligible?: boolean
  detail?: string
}

type AuthenticateResponse = {
  polling_token?: string
  detail?: string
}

type PhizUserInfoResponse = {
  userId?: string
  userInfo?: {
    userId?: string
  }
}

function getPhizId(response: PhizUserInfoResponse): string {
  const userId = response.userId || response.userInfo?.userId
  return typeof userId === 'string' ? userId.trim() : ''
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
    hasError: false,
    errorMessage: '',
    isLoading: false,
    canSubmitEmail: false,
    emailIsEligible: false,
  },

  onEmailInput(e: WechatMiniprogram.CustomEvent) {
    const email = e.detail.value
    this.setData({
      email,
      hasError: false,
      errorMessage: '',
      canSubmitEmail: EMAIL_REGEX.test(email.trim()),
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
      dataType: 'json',
      data: { email },
      success: (res) => {
        const body = getResponseData<AuthenticationEmailStatusResponse>(res.data)
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

  onLinkPhizIdentity() {
    const email = this.data.email.trim()
    const validationError = this.validateEmail(email)

    if (validationError) {
      this.setData({ hasError: true, errorMessage: validationError })
      return
    }

    if (!this.data.emailIsEligible) {
      this.setData({
        hasError: true,
        errorMessage: 'Verifique seu e-mail antes de vincular sua conta Phiz.',
      })
      return
    }

    this.setData({ isLoading: true, hasError: false, errorMessage: '' })

    pz.getUserInfo({
      success: (userInfoResult: PhizUserInfoResponse) => {
        const phizId = getPhizId(userInfoResult)

        if (!phizId) {
          this.setData({
            isLoading: false,
            hasError: true,
            errorMessage: 'Não foi possível obter seu identificador no Phiz. Tente novamente.',
          })
          return
        }

        this.startAuthentication(email, phizId)
      },
      fail: () => {
        this.setData({
          isLoading: false,
          hasError: true,
          errorMessage: 'Não foi possível obter seu identificador no Phiz. Tente novamente.',
        })
      },
    })
  },

  startAuthentication(email: string, phizId: string) {
    pz.request({
      url: `${API_BASE_URL}/authenticate`,
      method: 'POST',
      dataType: 'json',
      data: { email, phiz_id: phizId },
      success: (res) => {
        const body = getResponseData<AuthenticateResponse>(res.data)
        const pollingToken = body.polling_token

        if (res.statusCode === 200 && typeof pollingToken === 'string' && pollingToken) {
          pz.navigateTo({
            url: `../auth-waiting/auth-waiting?email=${encodeURIComponent(email)}&polling_token=${encodeURIComponent(pollingToken)}`,
            fail: () => {
              this.setData({
                hasError: true,
                errorMessage: 'A confirmação foi iniciada, mas não foi possível abrir a próxima tela. Tente novamente.',
              })
            },
          })
          return
        }

        this.setData({
          hasError: true,
          errorMessage: body.detail || 'Não foi possível iniciar a confirmação. Tente novamente.',   })
      },
      fail: () => {
        this.setData({
          hasError: true,
          errorMessage: 'Falha de conexão. Verifique sua internet.',
        })
      },
      complete: () => {
        this.setData({ isLoading: false })
      },
    })
  }
})
