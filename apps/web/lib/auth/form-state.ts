export type AuthFormState = {
  error: string | null;
  notice: string | null;
};

export const EMPTY_AUTH_STATE: AuthFormState = { error: null, notice: null };
