export function validatePassword(password: string): string {
  if (password.length < 8) throw new Error('Password must be at least 8 characters')
  if (!/[A-Z]/.test(password)) throw new Error('Password must contain at least one uppercase letter')
  if (!/[a-z]/.test(password)) throw new Error('Password must contain at least one lowercase letter')
  if (!/\d/.test(password)) throw new Error('Password must contain at least one digit')
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/]/.test(password)) throw new Error('Password must contain at least one special character')
  return password
}
