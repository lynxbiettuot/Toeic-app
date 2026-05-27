import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

// Cấu trúc CSS theo từng module
import "./styles/base.css";
import "./styles/auth.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/dashboard.css";
import "./styles/exam.css";
import "./styles/vocab.css";

// Mount ứng dụng React vào root DOM và bọc bởi BrowserRouter.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
