const AUTH_PATH = '/api/auth'

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${AUTH_PATH}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Could not connect to the authentication server.')
  }

  if (response.status === 204) {
    return null
  }

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(result.error ?? 'The request could not be completed.')
    error.status = response.status
    throw error
  }
  return result
}

function getCurrentUser() {
  return request('/me').then(({ user }) => user)
}

function login({ email, password, role }) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  }).then(({ user }) => user)
}

function register({ displayName, email, password, role, inviteCode }) {
  return request(`/register/${role}`, {
    method: 'POST',
    body: JSON.stringify({ displayName, email, password, inviteCode }),
  }).then(({ user }) => user)
}

function logout() {
  return request('/logout', { method: 'POST' })
}

const authApi = { getCurrentUser, login, register, logout }

export default authApi
