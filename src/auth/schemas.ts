export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  user?: Record<string, unknown>
}

export interface RefreshRequest {
  refresh_token: string
}

export interface RefreshResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface MessageResponse {
  message: string
}

export interface ProfileUpdate {
  username?: string
  email?: string
  full_name?: string
  avatar_url?: string
  old_password?: string
  new_password?: string
}
