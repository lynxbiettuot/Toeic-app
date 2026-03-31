import React from 'react';
import { Link } from 'react-router-dom';

export function NavButton({ to, label, active }) {
  return (
    <Link className={`sidebar-link ${active ? "is-active" : ""}`} to={to}>
      {label}
    </Link>
  );
}
