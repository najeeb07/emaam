// js/modules/sliders.js
// Homepage sliders CRUD (title + description + single image)

import { showToast } from "../utils/toast.js";
import { uploadImages } from "../utils/imageUpload.js";
import { showLoading, hideLoading, updateProgress } from "../utils/loading.js";
import { setupSingleImagePreview } from "../utils/imagePreview.js";

export function initSliders(firestore) {
  const sliderModal = document.getElementById("slider-modal");
  const addSliderButton = document.getElementById("add-slider-button");
  const closeSliderModalButton = sliderModal
    ? sliderModal.querySelector(".close-button")
    : null;
  const cancelEditSliderButton = document.getElementById("cancel-edit-slider");

  const createSection = document.getElementById("create-slider-section");
  const editSection = document.getElementById("edit-slider-section");

  const createForm = document.getElementById("create-slider-form");
  const editForm = document.getElementById("edit-slider-form");

  if (addSliderButton) {
    addSliderButton.addEventListener("click", () =>
      openSliderModal("create")
    );
  }

  if (closeSliderModalButton) {
    closeSliderModalButton.addEventListener("click", () =>
      closeSliderModal()
    );
  }
  if (cancelEditSliderButton) {
    cancelEditSliderButton.addEventListener("click", () =>
      closeSliderModal()
    );
  }

  window.addEventListener("click", (e) => {
    if (e.target === sliderModal) {
      closeSliderModal();
    }
  });

  if (createForm) {
    createForm.addEventListener("submit", (e) =>
      handleCreateSliderSubmit(e, firestore)
    );
  }

  if (editForm) {
    editForm.addEventListener("submit", (e) =>
      handleEditSliderSubmit(e, firestore)
    );
  }

  setupSingleImagePreview("slider-image", "slider-image-preview");
  setupSingleImagePreview("edit-slider-image", "edit-slider-image-preview");
  loadSlidersTable(firestore);

  function openSliderModal(mode, slider = null) {
    if (!sliderModal || !createSection || !editSection) return;
    sliderModal.style.display = "flex";

    if (mode === "create") {
      createSection.style.display = "block";
      editSection.style.display = "none";
      createForm && createForm.reset();
    } else if (mode === "edit" && slider) {
      createSection.style.display = "none";
      editSection.style.display = "block";
      populateEditSliderForm(slider);
    }
  }

  function closeSliderModal() {
    if (sliderModal) sliderModal.style.display = "none";
  }

  async function handleCreateSliderSubmit(event, firestore) {
    event.preventDefault();
    const title = document.getElementById("slider-title").value.trim();
    const description = document
      .getElementById("slider-description")
      .value.trim();
    const imageInput = document.getElementById("slider-image");
    const link = document.getElementById("slider-link").value.trim();

    try {
      showLoading("Creating slider...", "Uploading image");

      let imageUrl = "";
      if (imageInput && imageInput.files.length) {
        updateProgress(50, "Processing image");
        const [url] = await uploadImages(imageInput.files);
        imageUrl = url;
        updateProgress(80, "Saving to database");
      }

      await firestore.collection("sliders").add({
        title,
        description,
        imageUrl,
        link,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      updateProgress(100, "Done!");
      hideLoading();
      showToast("Slider created successfully", "success");
      closeSliderModal();
    } catch (err) {
      hideLoading();
      console.error("Create slider error:", err);
      showToast("Error creating slider: " + err.message, "error");
    }
  }

  async function handleEditSliderSubmit(event, firestore) {
    event.preventDefault();
    const id = document.getElementById("edit-slider-id").value;
    const title = document.getElementById("edit-slider-title").value.trim();
    const description = document
      .getElementById("edit-slider-description")
      .value.trim();
    const imageInput = document.getElementById("edit-slider-image");
    const currentImgDiv = document.getElementById("current-slider-image");
    const link = document.getElementById("edit-slider-link").value.trim();

    try {
      showLoading("Updating slider...", "Processing");

      const docRef = firestore.collection("sliders").doc(id);
      const existing = await docRef.get();
      if (!existing.exists) {
        hideLoading();
        showToast("Slider not found", "error");
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
      showToast("Slider updated successfully", "success");
      closeSliderModal();
    } catch (err) {
      hideLoading();
      console.error("Edit slider error:", err);
      showToast("Error updating slider: " + err.message, "error");
    }
  }

  function populateEditSliderForm(slider) {
    document.getElementById("edit-slider-id").value = slider.id;
    document.getElementById("edit-slider-title").value = slider.title || "";
    document.getElementById("edit-slider-description").value =
      slider.description || "";
    document.getElementById("edit-slider-link").value = slider.link || "";

    const currentImgDiv = document.getElementById("current-slider-image");
    if (currentImgDiv) {
      currentImgDiv.innerHTML = "";
      if (slider.imageUrl) {
        const img = document.createElement("img");
        img.src = slider.imageUrl;
        img.alt = slider.title || "Slider";
        img.style.maxWidth = "100px";
        img.style.maxHeight = "100px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "4px";
        currentImgDiv.appendChild(img);
      } else {
        currentImgDiv.textContent = "No image uploaded.";
      }
    }
  }

  function loadSlidersTable(firestore) {
    const tbody = document.getElementById("sliders-table-body");
    if (!tbody) return;

    firestore.collection("sliders").onSnapshot(
      (snapshot) => {
        tbody.innerHTML = "";
        if (snapshot.empty) {
          tbody.innerHTML =
            '<tr><td colspan="5">No sliders found. Create one to get started.</td></tr>';
          return;
        }

        snapshot.forEach((doc) => {
          const slider = { id: doc.id, ...doc.data() };
          const row = tbody.insertRow();

          row.insertCell(0).textContent = slider.title || "-";
          row.insertCell(1).textContent = slider.description || "-";

          const imageCell = row.insertCell(2);
          if (slider.imageUrl) {
            const img = document.createElement("img");
            img.src = slider.imageUrl;
            img.alt = slider.title || "Slider";
            img.style.width = "50px";
            img.style.height = "50px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "4px";
            imageCell.appendChild(img);
          } else {
            imageCell.textContent = "No image";
          }

          const linkCell = row.insertCell(3);
          if (slider.link) {
            const a = document.createElement("a");
            a.href = slider.link;
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
            openSliderModal("edit", slider)
          );

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "Delete";
          deleteBtn.classList.add("action-button", "delete-button");
          deleteBtn.addEventListener("click", () =>
            deleteSlider(firestore, slider)
          );

          actionsCell.appendChild(editBtn);
          actionsCell.appendChild(deleteBtn);
        });
      },
      (err) => {
        console.error("Load sliders error:", err);
        showToast("Unable to load sliders", "error");
      }
    );
  }

  async function deleteSlider(firestore, slider) {
    if (!confirm(`Delete slider "${slider.title}"?`)) return;

    try {
      await firestore.collection("sliders").doc(slider.id).delete();
      showToast("Slider deleted", "success");
    } catch (err) {
      console.error("Delete slider error:", err);
      showToast("Error deleting slider: " + err.message, "error");
    }
  }

}
