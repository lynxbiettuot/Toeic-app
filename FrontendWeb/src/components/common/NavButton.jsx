import React from 'react';
import { Link } from 'react-router-dom';

// Nút điều hướng trong sidebar admin, có trạng thái đang active.
export function NavButton({ to, label, active }) {
  return (
    <Link className={`sidebar-link ${active ? "is-active" : ""}`} to={to}>
      {label}
    </Link>
  );
}
