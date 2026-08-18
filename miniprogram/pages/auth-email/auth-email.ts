const API_BASE_URL = 'http://127.0.0.1:8080'
const MOCK_NUMERO_CELULAR = '00000000000'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AuthenticateResponse = {
  authentication_id?: number
  detail?: string
}

Page({
  data: {
    email: '',
    hasError: false,
    errorMessage: '',
    isLoading: false,
  },

  onLoad(query: Record<string, string>) {
    getApp<IAppOption>().globalData.numeroCelular = decodeURIComponent(query.numero_celular || '')
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

    const numeroCelular = getApp<IAppOption>().globalData.numeroCelular
    if (!numeroCelular) {
      this.setData({
        hasError: true,
        errorMessage: 'Não foi possível identificar seu número Phiz. Abra o MiniApp pelo fluxo de autenticação.',
      })
      return
    }

    this.setData({ isLoading: true })

    pz.request({
      url: `${API_BASE_URL}/authenticate`,
      method: 'POST',
      data: {
        email,
        numero_celular: numeroCelular,
      },
      success: (res) => {
        const body = res.data as AuthenticateResponse
        if (res.statusCode === 200 && typeof body.authentication_id === 'number') {
          pz.navigateTo({
            url: `../auth-waiting/auth-waiting?email=${encodeURIComponent(email)}&authentication_id=${body.authentication_id}`,
          })
        } else {
          this.setData({
            hasError: true,
            errorMessage: body.detail || 'Não foi possível enviar a verificação. Tente novamente.',
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
