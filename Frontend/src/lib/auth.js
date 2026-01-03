
export function setTokens(accessToken, refreshToken) {
  localStorage.setItem('accessToken', accessToken)
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken)
  }
}

export function getAccessToken() {
  return localStorage.getItem('accessToken')
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}

export function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

export function isAuthenticated() {
  return !!getAccessToken()
}

