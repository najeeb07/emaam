// Image preview utility for forms

export function setupImagePreview(inputId, previewContainerId, maxImages = 10) {
  const fileInput = document.getElementById(inputId);
  const previewContainer = document.getElementById(previewContainerId);

  if (!fileInput || !previewContainer) return;

  // Handle file input change
  fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files).slice(0, maxImages);
    previewContainer.innerHTML = "";

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const previewItem = document.createElement("div");
        previewItem.className = "preview-item";

        const img = document.createElement("img");
        img.src = event.target.result;

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.innerHTML = "✕";
        removeBtn.type = "button";
        removeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          previewItem.remove();

          // Remove from file input
          const dataTransfer = new DataTransfer();
          const newFiles = Array.from(fileInput.files).filter(
            (_, i) => i !== index
          );
          newFiles.forEach((f) => dataTransfer.items.add(f));
          fileInput.files = dataTransfer.files;
        });

        previewItem.appendChild(img);
        previewItem.appendChild(removeBtn);
        previewContainer.appendChild(previewItem);
      };
      reader.readAsDataURL(file);
    });
  });

  // Drag and drop support
  const label = document.querySelector(`label[for="${inputId}"]`);
  if (label) {
    label.addEventListener("dragover", (e) => {
      e.preventDefault();
      label.classList.add("active");
    });

    label.addEventListener("dragleave", () => {
      label.classList.remove("active");
    });

    label.addEventListener("drop", (e) => {
      e.preventDefault();
      label.classList.remove("active");
      fileInput.files = e.dataTransfer.files;

      // Trigger change event
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
}

export function setupSingleImagePreview(inputId, previewContainerId) {
  const fileInput = document.getElementById(inputId);
  const previewContainer = document.getElementById(previewContainerId);

  if (!fileInput || !previewContainer) return;

  fileInput.addEventListener("change", (e) => {
    previewContainer.innerHTML = "";

    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        const previewItem = document.createElement("div");
        previewItem.className = "preview-item";

        const img = document.createElement("img");
        img.src = event.target.result;

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.innerHTML = "✕";
        removeBtn.type = "button";
        removeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          previewItem.remove();
          fileInput.value = "";
        });

        previewItem.appendChild(img);
        previewItem.appendChild(removeBtn);
        previewContainer.appendChild(previewItem);
      };
      reader.readAsDataURL(file);
    }
  });

  // Drag and drop support
  const label = document.querySelector(`label[for="${inputId}"]`);
  if (label) {
    label.addEventListener("dragover", (e) => {
      e.preventDefault();
      label.classList.add("active");
    });

    label.addEventListener("dragleave", () => {
      label.classList.remove("active");
    });

    label.addEventListener("drop", (e) => {
      e.preventDefault();
      label.classList.remove("active");
      if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }
}
