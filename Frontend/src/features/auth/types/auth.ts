export type AuthScreenName =
  | 'register'
  | 'login'
  | 'forgot-email'
  | 'forgot-otp'
  | 'reset-password';

export type Feedback = {
  type: 'error' | 'success';
  text: string;
} | null;

export type RegisterForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginForm = {
  email: string;
  password: string;
};

export type RecoveryForm = {
  email: string;
  otp: string;
  newPassword: string;
  confirmNewPassword: string;
};
