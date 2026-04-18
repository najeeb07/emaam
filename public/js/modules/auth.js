// js/modules/auth.js
// Simple email/password login using Firebase Auth v8

import { showToast } from "../utils/toast.js";
import { showPage } from "./navigation.js";

export function initAuth(auth) {
  const loginForm = document.getElementById("login-form");
  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");
  const loginErrorMessage = document.getElementById("login-error-message");
  const logoutButton = document.getElementById("logout-button");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = loginEmailInput.value.trim();
      const password = loginPasswordInput.value;

      loginErrorMessage.textContent = "";

      try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast("Logged in successfully", "success");
      } catch (err) {
        console.error("Login error:", err);
        loginErrorMessage.textContent = err.message;
        showToast("Login failed: " + err.message, "error");
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        await auth.signOut();
        showToast("Logged out", "info");
        showPage("dashboard-content");
      } catch (err) {
        console.error("Logout error:", err);
        showToast("Logout failed: " + err.message, "error");
      }
    });
  }
}