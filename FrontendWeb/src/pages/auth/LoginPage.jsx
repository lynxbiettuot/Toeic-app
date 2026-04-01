import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_ACCOUNTS } from '../../api/apiClient';

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: ADMIN_ACCOUNTS[0].email,
    password: ADMIN_ACCOUNTS[0].password,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const helperText = useMemo(
    () =>
      ADMIN_ACCOUNTS.map(
        (account) => `${account.name}: ${account.email} / ${account.password}`,
      ).join("\n"),
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3000/auth/login/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Đăng nhập thất bại.");
      }

      // Save token and admin info
      localStorage.setItem("toeic_admin_token", result.accessToken);
      localStorage.setItem("toeic_admin_refresh_token", result.refreshToken || "");
      localStorage.setItem("toeic_admin_info", JSON.stringify(result.adminData || {}));
      
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi đăng nhập.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page login-page">
      <section className="login-card">
        <div className="login-visual">
          <div className="login-title-wrap">
            <p className="eyebrow">Màn hình đăng nhập Admin</p>
            <h1>Login</h1>
            <span className="title-underline" />
          </div>

          <div className="sheet-illustration">
            <div className="sheet-grid" />
            <div className="sheet-shadow" />
            <div className="pencil" />
            <div className="pencil-tip" />
          </div>
        </div>

        <div className="login-panel">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form-shell">
              <input
                className="login-input"
                type="email"
                name="email"
                placeholder="Username"
                value={form.email}
                onChange={handleChange}
              />

              <input
                className="login-input"
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
              />

              <button className="login-button" type="submit" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </button>

              <p className="login-helper">{helperText}</p>
              {error ? <p className="login-error">{error}</p> : null}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
