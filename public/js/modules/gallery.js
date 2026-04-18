// js/modules/gallery.js
// Simple image gallery CRUD

import { showToast } from "../utils/toast.js";
import { uploadImages } from "../utils/imageUpload.js";
import { showLoading, hideLoading, updateProgress } from "../utils/loading.js";
import { setupSingleImagePreview } from "../utils/imagePreview.js";

export function initGallery(firestore) {
  const galleryModal = document.getElementById("gallery-modal");
  const addGalleryBtn = document.getElementById("add-gallery-item-button");
  const closeBtn = galleryModal
    ? galleryModal.querySelector(".close-button")
    : null;
  const cancelEditBtn = document.getElementById("cancel-edit-gallery-item");

  const createSection = document.getElementById("create-gallery-item-section");
  const editSection = document.getElementById("edit-gallery-item-section");

  const createForm = document.getElementById("create-gallery-item-form");
  const editForm = document.getElementById("edit-gallery-item-form");

  if (addGalleryBtn) {
    addGalleryBtn.addEventListener("click", () =>
      openGalleryModal("create")
    );
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeGalleryModal());
  }
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => closeGalleryModal());
  }

  window.addEventListener("click", (e) => {
    if (e.target === galleryModal) {
      closeGalleryModal();
    }
  });

  if (createForm) {
    createForm.addEventListener("submit", (e) =>
      handleCreateGallerySubmit(e, firestore)
    );
  }

  if (editForm) {
    editForm.addEventListener("submit", (e) =>
      handleEditGallerySubmit(e, firestore)
    );
  }

  setupSingleImagePreview("gallery-item-image", "gallery-item-image-preview");
  setupSingleImagePreview("edit-gallery-item-image", "edit-gallery-item-image-preview");
  loadGalleryTable(firestore);

  function openGalleryModal(mode, item = null) {
    if (!galleryModal || !createSection || !editSection) return;
    galleryModal.style.display = "flex";

    if (mode === "create") {
      createSection.style.display = "block";
      editSection.style.display = "none";
      createForm && createForm.reset();
    } else if (mode === "edit" && item) {
      createSection.style.display = "none";
      editSection.style.display = "block";
      populateEditForm(item);
    }
  }

  function closeGalleryModal() {
    if (galleryModal) galleryModal.style.display = "none";
  }

  async function handleCreateGallerySubmit(event, firestore) {
    event.preventDefault();
    const title = document.getElementById("gallery-item-title").value.trim();
    const description = document
      .getElementById("gallery-item-description")
      .value.trim();
    const imageInput = document.getElementById("gallery-item-image");
    const link = document.getElementById("gallery-item-link").value.trim();

    try {
      showLoading("Adding gallery item...", "Uploading image");

      let imageUrl = "";
      if (imageInput && imageInput.files.length) {
        updateProgress(50, "Processing image");
        const [url] = await uploadImages(imageInput.files);
        imageUrl = url;
        updateProgress(80, "Saving to database");
      }

      await firestore.collection("gallery").add({
        title,
        description,
        imageUrl,
        link,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      updateProgress(100, "Done!");
      hideLoading();
      showToast("Gallery item created successfully", "success");
      closeGalleryModal();
    } catch (err) {
      hideLoading();
      console.error("Create gallery item error:", err);
      showToast("Error creating gallery item: " + err.message, "error");
    }
  }

  async function handleEditGallerySubmit(event, firestore) {
    event.preventDefault();
    const id = document.getElementById("edit-gallery-item-id").value;
    const title = document
      .getElementById("edit-gallery-item-title")
      .value.trim();
    const description = document
      .getElementById("edit-gallery-item-description")
      .value.trim();
    const imageInput = document.getElementById("edit-gallery-item-image");
    const link = document.getElementById("edit-gallery-item-link").value.trim();

    try {
      showLoading("Updating gallery item...", "Processing");

      const docRef = firestore.collection("gallery").doc(id);
      const existing = await docRef.get();
      if (!existing.exists) {
        hideLoading();
        showToast("Gallery item not found", "error");
        return;
      }

      let { imageUrl = "" } = existing.data();

      if (imageInput && imageInput.files.length) {
        updateProgress(50, "Uploading image");
        const [url] = await uploadImages(imageInput.files);
        imageUrl = url;
        updateProgress(80, "Saving changes");
      }

      await docRef.update({
        title,
        description,
        imageUrl,
        link,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      updateProgress(100, "Done!");
      hideLoading();
      showToast("Gallery item updated successfully", "success");
      closeGalleryModal();
    } catch (err) {
      hideLoading();
      console.error("Edit gallery item error:", err);
      showToast("Error updating gallery item: " + err.message, "error");
    }
  }

  function populateEditForm(item) {
    document.getElementById("edit-gallery-item-id").value = item.id;
    document.getElementById("edit-gallery-item-title").value =
      item.title || "";
    document.getElementById("edit-gallery-item-description").value =
      item.description || "";
    document.getElementById("edit-gallery-item-link").value = item.link || "";

    const currentDiv = document.getElementById("current-gallery-item-image");
    if (currentDiv) {
      currentDiv.innerHTML = "";
      if (item.imageUrl) {
        const img = document.createElement("img");
        img.src = item.imageUrl;
        img.alt = item.title || "Gallery item";
        img.style.maxWidth = "100px";
        img.style.maxHeight = "100px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "4px";
        currentDiv.appendChild(img);
      } else {
        currentDiv.textContent = "No image uploaded.";
      }
    }
  }

  function loadGalleryTable(firestore) {
    const tbody = document.getElementById("gallery-table-body");
    if (!tbody) return;

    firestore.collection("gallery").onSnapshot(
      (snapshot) => {
        tbody.innerHTML = "";
        if (snapshot.empty) {
          tbody.innerHTML =
            '<tr><td colspan="5">No gallery items found.</td></tr>';
          return;
        }

        snapshot.forEach((doc) => {
          const item = { id: doc.id, ...doc.data() };
          const row = tbody.insertRow();

          row.insertCell(0).textContent = item.title || "-";
          row.insertCell(1).textContent = item.description || "-";

          const imgCell = row.insertCell(2);
          if (item.imageUrl) {
            const img = document.createElement("img");
            img.src = item.imageUrl;
            img.alt = item.title || "Gallery item";
            img.style.width = "50px";
            img.style.height = "50px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "4px";
            imgCell.appendChild(img);
          } else {
            imgCell.textContent = "No image";
          }

          const linkCell = row.insertCell(3);
          if (item.link) {
            const a = document.createElement("a");
            a.href = item.link;
            a.textContent = "View Link";
            a.target = "_blank";
            linkCell.appendChild(a);
          } else {
            linkCell.textContent = "-";
          }

          const actionsCell = row.insertCell(4);

          const editBtn = document.createElement("button");
          editBtn.textContent = "Edit";
          editBtn.classList.add("action-button", "edit-button");
          editBtn.addEventListener("click", () =>
            openGalleryModal("edit", item)
          );

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "Delete";
          deleteBtn.classList.add("action-button", "delete-button");
          deleteBtn.addEventListener("click", () =>
            deleteGalleryItem(firestore, item)
          );

          actionsCell.appendChild(editBtn);
          actionsCell.appendChild(deleteBtn);
        });
      },
      (err) => {
        console.error("Load gallery error:", err);
        showToast("Unable to load gallery items", "error");
      }
    );
  }

  async function deleteGalleryItem(firestore, item) {
    if (!confirm(`Delete gallery item "${item.title}"?`)) return;

    try {
      await firestore.collection("gallery").doc(item.id).delete();
      showToast("Gallery item deleted", "success");
    } catch (err) {
      console.error("Delete gallery item error:", err);
      showToast("Error deleting gallery item: " + err.message, "error");
    }
  }

}
