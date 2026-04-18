// js/utils/toast.js
// Lightweight toast helper. Usage: showToast("Saved!", "success");

let toastContainer = null;

export function initToast() {
  toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    document.body.appendChild(toastContainer);
  }
}

export function showToast(message, type = "info", title = "") {
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const titleSpan = document.createElement("span");
  titleSpan.className = "title";

  if (!title) {
    titleSpan.textContent =
      type === "success" ? "Success" :
      type === "error" ? "Error" : "Info";
  } else {
    titleSpan.textContent = title;
  }

  const msgSpan = document.createElement("span");
  msgSpan.className = "message";
  msgSpan.textContent = message;

  toast.appendChild(titleSpan);
  toast.appendChild(msgSpan);
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toast-out 0.25s forwards";
    setTimeout(() => toast.remove(), 260);
  }, 3500);
}