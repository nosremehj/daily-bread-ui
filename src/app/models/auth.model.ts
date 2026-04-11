export interface UserResponse {
  id: number;
  name: string;
  email: string;
  username: string;
}

/** Corpo de `PATCH /api/v1/auth/me` (três campos obrigatórios). */
export interface UpdateProfileBody {
  name: string;
  email: string;
  username: string;
}

/** Resposta de `PATCH /api/v1/auth/me` — ver `PROMPT_FRONT_PERFIL_E_SENHA.md`. */
export interface ProfileUpdateResponse {
  user: UserResponse;
  /** Presente quando o `username` mudou; substituir tokens como no login. */
  newSession?: AuthResponse;
}

/** Corpo de `POST /api/v1/auth/change-password` */
export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: UserResponse;
}
