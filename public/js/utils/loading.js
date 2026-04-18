// Loading overlay utilities

export function showLoading(message = "Processing...", progressText = "") {
  const overlay = document.getElementById("loading-overlay");
  const text = document.getElementById("loading-text");
  const progressBar = document.getElementById("progress-bar");
  const progress = document.getElementById("progress-text");

  if (overlay) {
    text.textContent = message;
    overlay.classList.add("active");
    progressBar.style.width = "0%";
    if (progress) progress.textContent = progressText;
  }
}

export function updateProgress(percentage, text = "") {
  const progressBar = document.getElementById("progress-bar");
  const progress = document.getElementById("progress-text");

  if (progressBar) {
    progressBar.style.width = percentage + "%";
  }
  if (progress && text) {
    progress.textContent = text;
  }
}

export function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.classList.remove("active");
  }
}

export function simulateProgress(duration = 3000) {
  const startTime = Date.now();
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min((elapsed / duration) * 100, 90);
    updateProgress(progress);

    if (elapsed >= duration) {
      clearInterval(interval);
      updateProgress(100);
    }
  }, 100);
}
