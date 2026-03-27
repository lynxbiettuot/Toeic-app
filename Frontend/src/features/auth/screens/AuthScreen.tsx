import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  loginUser,
  requestPasswordOtp,
  resetPasswordUser,
  signupUser
} from '../services/authService';
import { ActionButton } from '../components/ActionButton';
import { FieldRow } from '../components/FieldRow';
import { AUTH_ACTION_COLOR } from '../constants/theme';
import type {
  AuthScreenName,
  Feedback,
  LoginForm,
  RecoveryForm,
  RegisterForm
} from '../types/auth';
import { saveAuthTokens } from '../../../shared/storage/tokenStorage';

const INITIAL_REGISTER: RegisterForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
};

const INITIAL_LOGIN: LoginForm = {
  email: '',
  password: ''
};

const INITIAL_RECOVERY: RecoveryForm = {
  email: '',
  otp: '',
  newPassword: '',
  confirmNewPassword: ''
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isEmailValid = (value: string) => emailPattern.test(value.trim());
const isPasswordValid = (value: string) => value.length >= 8;

type AuthScreenProps = {
  onLoginSuccess?: (payload?: { displayName?: string; userId?: number }) => void;
};

const extractDisplayName = (userData?: Record<string, unknown>) => {
  const nameCandidate = userData?.full_name ?? userData?.name ?? userData?.email;
  return typeof nameCandidate === 'string' ? nameCandidate : undefined;
};

const extractUserId = (userData?: Record<string, unknown>) => {
  const idCandidate = userData?.id;
  return typeof idCandidate === 'number' && Number.isInteger(idCandidate) ? idCandidate : undefined;
};

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [screen, setScreen] = useState<AuthScreenName>('login');
  const [registerForm, setRegisterForm] = useState<RegisterForm>(INITIAL_REGISTER);
  const [loginForm, setLoginForm] = useState<LoginForm>(INITIAL_LOGIN);
  const [recoveryForm, setRecoveryForm] = useState<RecoveryForm>(INITIAL_RECOVERY);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const canRegister = useMemo(
    () =>
      registerForm.name.trim().length > 0 &&
      isEmailValid(registerForm.email) &&
      isPasswordValid(registerForm.password) &&
      registerForm.password === registerForm.confirmPassword,
    [registerForm]
  );

  const canLogin = useMemo(
    () => isEmailValid(loginForm.email) && loginForm.password.length > 0,
    [loginForm]
  );

  const canSendOtp = useMemo(() => isEmailValid(recoveryForm.email), [recoveryForm.email]);
  const canConfirmOtp = useMemo(() => recoveryForm.otp.trim().length >= 4, [recoveryForm.otp]);

  const canResetPassword = useMemo(
    () =>
      isEmailValid(recoveryForm.email) &&
      recoveryForm.otp.trim().length >= 4 &&
      isPasswordValid(recoveryForm.newPassword) &&
      recoveryForm.newPassword === recoveryForm.confirmNewPassword,
    [recoveryForm]
  );

  const changeScreen = (nextScreen: AuthScreenName, clearFeedback = true) => {
    setScreen(nextScreen);
    if (clearFeedback) {
      setFeedback(null);
    }
  };

  const updateRegister = (field: keyof RegisterForm, value: string) => {
    setRegisterForm((prev) => ({ ...prev, [field]: value }));
    setFeedback(null);
  };

  const updateLogin = (field: keyof LoginForm, value: string) => {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
    setFeedback(null);
  };

  const updateRecovery = (field: keyof RecoveryForm, value: string) => {
    setRecoveryForm((prev) => ({ ...prev, [field]: value }));
    setFeedback(null);
  };

  const runAction = async (action: () => Promise<void>) => {
    setSubmitting(true);
    setFeedback(null);

    try {
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn.';
      setFeedback({ type: 'error', text: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!canRegister) {
      setFeedback({ type: 'error', text: 'Vui lòng nhập đầy đủ và đúng thông tin đăng ký.' });
      return;
    }

    await runAction(async () => {
      const response = await signupUser({
        name: registerForm.name.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        confirmPassword: registerForm.confirmPassword
      });

      setFeedback({ type: 'success', text: response.message ?? 'Đăng ký thành công.' });
      setRegisterForm(INITIAL_REGISTER);
      changeScreen('login', false);
    });
  };

  const handleLogin = async () => {
    if (!canLogin) {
      setFeedback({ type: 'error', text: 'Vui lòng nhập email và mật khẩu hợp lệ.' });
      return;
    }

    await runAction(async () => {
      const response = await loginUser({
        email: loginForm.email.trim(),
        password: loginForm.password
      });

      await saveAuthTokens(response.accessToken, response.refreshToken);
      setFeedback({ type: 'success', text: response.message ?? 'Đăng nhập thành công.' });
      onLoginSuccess?.({
        displayName: extractDisplayName(response.userData),
        userId: extractUserId(response.userData)
      });
    });
  };

  const handleSendOtp = async () => {
    if (!canSendOtp) {
      setFeedback({ type: 'error', text: 'Vui lòng nhập email hợp lệ trước khi lấy mã OTP.' });
      return;
    }

    await runAction(async () => {
      const response = await requestPasswordOtp({
        email: recoveryForm.email.trim()
      });

      setFeedback({ type: 'success', text: response.message ?? 'Đã gửi mã OTP thành công.' });
      changeScreen('forgot-otp', false);
    });
  };

  const handleOtpContinue = () => {
    if (!canConfirmOtp) {
      setFeedback({ type: 'error', text: 'Vui lòng nhập mã OTP bạn đã nhận được.' });
      return;
    }

    setFeedback({
      type: 'success',
      text: 'Đã xác nhận OTP. Tiếp tục tạo mật khẩu mới.'
    });
    changeScreen('reset-password', false);
  };

  const handleResetPassword = async () => {
    if (!canResetPassword) {
      setFeedback({ type: 'error', text: 'Vui lòng nhập đúng thông tin để đặt lại mật khẩu.' });
      return;
    }

    await runAction(async () => {
      const response = await resetPasswordUser({
        email: recoveryForm.email.trim(),
        otpVerify: recoveryForm.otp.trim(),
        newPassword: recoveryForm.newPassword,
        confirmNewPassword: recoveryForm.confirmNewPassword
      });

      setFeedback({ type: 'success', text: response.message ?? 'Đặt lại mật khẩu thành công.' });
      setRecoveryForm(INITIAL_RECOVERY);
      setLoginForm(INITIAL_LOGIN);
      changeScreen('login', false);
    });
  };

  const handleCancelRecovery = () => {
    setRecoveryForm(INITIAL_RECOVERY);
    changeScreen('login');
  };

  const panelTitle =
    screen === 'register'
      ? 'Đăng ký'
      : screen === 'login'
        ? 'Đăng nhập'
        : screen === 'reset-password'
          ? 'Nhập lại mật khẩu'
          : 'Khôi phục mật khẩu';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.frame}>
            <View style={styles.card}>
              <Text style={styles.heading}>{panelTitle}</Text>
              <View style={styles.banner} />

              {feedback && (
                <View
                  style={[
                    styles.feedback,
                    feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError
                  ]}
                >
                  <Text style={styles.feedbackText}>{feedback.text}</Text>
                </View>
              )}

              {screen === 'register' && (
                <View style={styles.formBlock}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>ĐĂNG KÝ</Text>
                  </View>
                  <FieldRow label="Tên" value={registerForm.name} onChangeText={(text) => updateRegister('name', text)} />
                  <FieldRow
                    label="Email"
                    value={registerForm.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={(text) => updateRegister('email', text)}
                  />
                  <FieldRow
                    label="Mật khẩu"
                    value={registerForm.password}
                    secureTextEntry
                    onChangeText={(text) => updateRegister('password', text)}
                  />
                  <FieldRow
                    label="Xác nhận"
                    value={registerForm.confirmPassword}
                    secureTextEntry
                    onChangeText={(text) => updateRegister('confirmPassword', text)}
                  />
                  <View style={styles.actionGroup}>
                    <ActionButton
                      label="Đăng ký"
                      enabled={canRegister}
                      loading={submitting}
                      onPress={handleRegister}
                      compact
                    />
                    <ActionButton label="Đăng nhập" enabled={true} onPress={() => changeScreen('login')} compact />
                  </View>
                </View>
              )}

              {screen === 'login' && (
                <View style={styles.formBlock}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>ĐĂNG NHẬP</Text>
                  </View>
                  <FieldRow
                    label="Email"
                    value={loginForm.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={(text) => updateLogin('email', text)}
                  />
                  <FieldRow
                    label="Mật khẩu"
                    value={loginForm.password}
                    secureTextEntry
                    onChangeText={(text) => updateLogin('password', text)}
                  />
                  <View style={styles.actionGroup}>
                    <ActionButton
                      label="Đăng nhập"
                      enabled={canLogin}
                      loading={submitting}
                      onPress={handleLogin}
                      compact
                    />
                    <ActionButton label="Đăng ký" enabled={true} onPress={() => changeScreen('register')} compact />
                    <ActionButton
                      label="Quên mật khẩu?"
                      enabled={true}
                      onPress={() => changeScreen('forgot-email')}
                      compact
                    />
                  </View>
                </View>
              )}

              {screen === 'forgot-email' && (
                <View style={styles.formBlock}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>KHÔI PHỤC MẬT KHẨU</Text>
                  </View>
                  <FieldRow
                    label="Email"
                    value={recoveryForm.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={(text) => updateRecovery('email', text)}
                  />
                  <View style={styles.actionGroup}>
                    <ActionButton
                      label="Lấy mã OTP"
                      enabled={canSendOtp}
                      loading={submitting}
                      onPress={handleSendOtp}
                      compact
                    />
                    <ActionButton label="Hủy" enabled={true} onPress={handleCancelRecovery} compact variant="danger" />
                  </View>
                </View>
              )}

              {screen === 'forgot-otp' && (
                <View style={styles.formBlock}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>KHÔI PHỤC MẬT KHẨU</Text>
                  </View>
                  <FieldRow
                    label="OTP"
                    value={recoveryForm.otp}
                    keyboardType="number-pad"
                    onChangeText={(text) => updateRecovery('otp', text)}
                  />
                  <View style={styles.actionGroup}>
                    <ActionButton label="Xác nhận" enabled={canConfirmOtp} onPress={handleOtpContinue} compact />
                    <ActionButton label="Hủy" enabled={true} onPress={handleCancelRecovery} compact variant="danger" />
                  </View>
                </View>
              )}

              {screen === 'reset-password' && (
                <View style={styles.formBlock}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>KHÔI PHỤC MẬT KHẨU</Text>
                  </View>
                  <FieldRow
                    label="Mật khẩu mới"
                    value={recoveryForm.newPassword}
                    secureTextEntry
                    onChangeText={(text) => updateRecovery('newPassword', text)}
                  />
                  <FieldRow
                    label="Xác nhận"
                    value={recoveryForm.confirmNewPassword}
                    secureTextEntry
                    onChangeText={(text) => updateRecovery('confirmNewPassword', text)}
                  />
                  <View style={styles.actionGroup}>
                    <ActionButton
                      label="Xác nhận"
                      enabled={canResetPassword}
                      loading={submitting}
                      onPress={handleResetPassword}
                      compact
                    />
                    <ActionButton label="Hủy" enabled={true} onPress={handleCancelRecovery} compact variant="danger" />
                  </View>
                </View>
              )}

              <View style={styles.footerBar} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#edf7f3'
  },
  keyboard: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24
  },
  frame: {
    borderRadius: 24,
    padding: 14,
    backgroundColor: '#f4fbf8',
    borderWidth: 1,
    borderColor: '#dbe9e4'
  },
  card: {
    backgroundColor: '#f8f8f8',
    borderRadius: 18,
    overflow: 'hidden'
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#707070',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10
  },
  banner: {
    height: 32,
    backgroundColor: AUTH_ACTION_COLOR
  },
  formBlock: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: '#cdeaf6'
  },
  sectionBadge: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#d1d1d1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18
  },
  sectionBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
    textDecorationLine: 'underline'
  },
  actionGroup: {
    marginTop: 18,
    gap: 10,
    alignItems: 'center'
  },
  feedback: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  feedbackSuccess: {
    backgroundColor: '#e9f8f6'
  },
  feedbackError: {
    backgroundColor: '#f2f2f2'
  },
  feedbackText: {
    color: '#3f4f49',
    fontSize: 12,
    lineHeight: 18
  },
  footerBar: {
    height: 28,
    backgroundColor: AUTH_ACTION_COLOR
  }
});
