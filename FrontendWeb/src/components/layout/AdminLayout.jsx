import React, { useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { getPageTitle } from '../../utils/helpers';
import { NavButton } from '../common/NavButton';

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("toeic_admin_token");
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("toeic_admin_token");
    localStorage.removeItem("toeic_admin_refresh_token");
    localStorage.setItem("toeic_admin_info", JSON.stringify({}));
    navigate("/login", { replace: true });
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <main className="page dashboard-page">
      <section className="dashboard-shell">
        <header className="dashboard-title">{pageTitle}</header>

        <div className="dashboard-layout">
          <aside className="sidebar">
            <div className="sidebar-brand">Hệ thống TOEIC</div>
            <nav className="sidebar-nav">
              <NavButton
                to="/admin/dashboard"
                label="Dashboard"
                active={location.pathname === "/admin/dashboard"}
              />
              <NavButton
                to="/admin/users"
                label="Quản lý người dùng"
                active={location.pathname === "/admin/users"}
              />
              <NavButton
                to="/admin/exams"
                label="Quản lý đề thi"
                active={location.pathname.startsWith("/admin/exams")}
              />
              <NavButton
                to="/admin/vocab"
                label="Quản lý Từ vựng"
                active={location.pathname.startsWith("/admin/vocab")}
              />
              <button
                className="sidebar-link sidebar-logout"
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </nav>
          </aside>

          <section className="dashboard-main">
            <div className="topbar">
              <div className="topbar-pill" />
            </div>
            <div className="dashboard-content">
              <Outlet />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
