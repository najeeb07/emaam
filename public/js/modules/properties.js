// js/modules/properties.js
// Property CRUD + map + image upload (Backblaze B2)

import { showToast } from "../utils/toast.js";
import { uploadImages, uploadPDF } from "../utils/imageUpload.js";
import { updateAvailabilityChartForProperty } from "./dashboard.js";
import { showLoading, hideLoading, updateProgress } from "../utils/loading.js";
import { setupImagePreview, setupSingleImagePreview } from "../utils/imagePreview.js";

let createMapInstance = null;
let createMarkerInstance = null;
let editMapInstance = null;
let editMarkerInstance = null;

export function initProperties(firestore) {
  const addPropertyButton = document.getElementById("add-property-button");
  const propertyModal = document.getElementById("property-modal");
  const closeModalButton = propertyModal
    ? propertyModal.querySelector(".close-button")
    : null;
  const cancelEditPropertyButton = document.getElementById(
    "cancel-edit-property"
  );

  if (addPropertyButton) {
    addPropertyButton.addEventListener("click", () => openPropertyModal("create"));
  }

  const createForm = document.getElementById("create-property-form");
  if (createForm) {
    createForm.addEventListener("submit", (e) =>
      handleCreatePropertySubmit(e, firestore)
    );
  }

  const editForm = document.getElementById("edit-property-form");
  if (editForm) {
    editForm.addEventListener("submit", (e) =>
      handleEditPropertySubmit(e, firestore)
    );
  }

  if (closeModalButton) {
    closeModalButton.addEventListener("click", () => closePropertyModal());
  }
  if (cancelEditPropertyButton) {
    cancelEditPropertyButton.addEventListener("click", () => closePropertyModal());
  }

  window.addEventListener("click", (e) => {
    if (e.target === propertyModal) {
      closePropertyModal();
    }
  });

  initMaps();
  setupImagePreview("property-images", "property-images-preview", 10);
  setupSingleImagePreview("property-pdf", "property-pdf-preview");
  loadPropertiesTable(firestore);
}

function initMaps() {
  const createLatInput = document.getElementById("create-property-lat");
  const createLonInput = document.getElementById("create-property-lon");
  const editLatInput = document.getElementById("edit-property-lat");
  const editLonInput = document.getElementById("edit-property-lon");

  if (document.getElementById("create-property-map") && !createMapInstance) {
    const center = [20.5937, 78.9629]; // India
    createMapInstance = L.map("create-property-map").setView(center, 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(createMapInstance);

    createMarkerInstance = L.marker(center).addTo(createMapInstance);

    createMapInstance.on("click", (e) => {
      const { lat, lng } = e.latlng;
      createLatInput.value = lat.toFixed(6);
      createLonInput.value = lng.toFixed(6);
      createMarkerInstance.setLatLng([lat, lng]);
    });
  }

  if (document.getElementById("edit-property-map") && !editMapInstance) {
    const center = [20.5937, 78.9629];
    editMapInstance = L.map("edit-property-map").setView(center, 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(editMapInstance);

    editMarkerInstance = L.marker(center).addTo(editMapInstance);

    editMapInstance.on("click", (e) => {
      const { lat, lng } = e.latlng;
      editLatInput.value = lat.toFixed(6);
      editLonInput.value = lng.toFixed(6);
      editMarkerInstance.setLatLng([lat, lng]);
    });
  }

  // Setup Location Search for Create
  setupLocationSearch(
    "create-location-query",
    "create-location-search",
    "create-location-suggestions",
    "create-property-lat",
    "create-property-lon",
    createMapInstance,
    createMarkerInstance,
    "property-location"
  );

  // Setup Location Search for Edit
  setupLocationSearch(
    "edit-location-query",
    "edit-location-search",
    "edit-location-suggestions",
    "edit-property-lat",
    "edit-property-lon",
    editMapInstance,
    editMarkerInstance,
    "edit-property-location"
  );
}

function setupLocationSearch(
  queryInputId,
  searchBtnId,
  suggestionsId,
  latInputId,
  lonInputId,
  mapInstance,
  markerInstance,
  hiddenLocationInputId
) {
  const queryInput = document.getElementById(queryInputId);
  const searchBtn = document.getElementById(searchBtnId);
  const suggestionsBox = document.getElementById(suggestionsId);
  const latInput = document.getElementById(latInputId);
  const lonInput = document.getElementById(lonInputId);
  const hiddenLocationInput = document.getElementById(hiddenLocationInputId);

  if (!queryInput || !searchBtn || !suggestionsBox) return;

  const performSearch = async () => {
    const query = queryInput.value.trim();
    if (!query) return;

    try {
      suggestionsBox.innerHTML =
        '<div class="autocomplete-item">Searching...</div>';
      suggestionsBox.style.display = "block";

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}`
      );
      const results = await response.json();

      suggestionsBox.innerHTML = "";

      if (results.length === 0) {
        suggestionsBox.innerHTML =
          '<div class="autocomplete-item">No results found</div>';
        return;
      }

      results.forEach((place) => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";
        item.textContent = place.display_name;

        item.addEventListener("click", () => {
          const lat = parseFloat(place.lat);
          const lon = parseFloat(place.lon);

          // Update inputs
          if (latInput) latInput.value = lat.toFixed(6);
          if (lonInput) lonInput.value = lon.toFixed(6);
          queryInput.value = place.display_name; // Show readable address
          if (hiddenLocationInput)
            hiddenLocationInput.value = place.display_name; // Store full address

          // Update Map
          if (mapInstance && markerInstance) {
            const newLatLng = new L.LatLng(lat, lon);
            markerInstance.setLatLng(newLatLng);
            mapInstance.setView(newLatLng, 16);
          }

          suggestionsBox.style.display = "none";
        });
        suggestionsBox.appendChild(item);
      });
    } catch (error) {
      console.error("Search error:", error);
      suggestionsBox.innerHTML =
        '<div class="autocomplete-item">Error searching</div>';
    }
  };

  searchBtn.addEventListener("click", performSearch);
  queryInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performSearch();
    }
  });

  // Sync manual typing to hidden input (fallback if no suggestion selected)
  queryInput.addEventListener("input", () => {
    if (hiddenLocationInput) hiddenLocationInput.value = queryInput.value;
  });

  // Close suggestions on click outside
  document.addEventListener("click", (e) => {
    if (
      !suggestionsBox.contains(e.target) &&
      e.target !== queryInput &&
      e.target !== searchBtn
    ) {
      suggestionsBox.style.display = "none";
    }
  });
}

async function handleCreatePropertySubmit(event, firestore) {
  event.preventDefault();

  const name = document.getElementById("property-name").value.trim();
  const location = document.getElementById("property-location").value.trim();
  const lat = parseFloat(
    document.getElementById("create-property-lat").value || "0"
  );
  const lon = parseFloat(
    document.getElementById("create-property-lon").value || "0"
  );
  const totalPlots = parseInt(
    document.getElementById("property-plots").value,
    10
  );
  const defaultPrice = parseInt(
    document.getElementById("plot-price").value,
    10
  );
  const imagesInput = document.getElementById("property-images");
  const pdfInput = document.getElementById("property-pdf");

  try {
    showLoading("Creating property...", "Uploading images");

    let imageUrls = [];
    if (imagesInput && imagesInput.files.length) {
      updateProgress(25, "Uploading " + imagesInput.files.length + " images");
      imageUrls = await uploadImages(imagesInput.files);
      updateProgress(60, "Uploading PDF");
    }

    let pdfUrl = null;
    if (pdfInput && pdfInput.files.length) {
      pdfUrl = await uploadPDF(pdfInput.files[0]);
      updateProgress(80, "Saving to database");
    }

    const propertyRef = await firestore.collection("properties").add({
      name,
      location,
      latitude: lat,
      longitude: lon,
      totalPlots,
      availablePlots: totalPlots,
      defaultPrice,
      imageUrls,
      pdfUrl,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    if (totalPlots > 0) {
      updateProgress(90, `Generating ${totalPlots} plots...`);
      // Batch create plots to avoid hitting rate limits or batch size limits
      const chunkSize = 400;
      for (let i = 1; i <= totalPlots; i += chunkSize) {
        const batch = firestore.batch();
        const end = Math.min(i + chunkSize - 1, totalPlots);
        for (let j = i; j <= end; j++) {
          const plotRef = propertyRef.collection("plots").doc();
          batch.set(plotRef, {
            plotNumber: String(j), // Store as string for consistency
            price: defaultPrice,
            type: "Standard",
            status: "Available",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }
        await batch.commit();
      }
    }

    updateProgress(100, "Done!");
    hideLoading();
    showToast("Property created successfully", "success");
    closePropertyModal();
  } catch (err) {
    hideLoading();
    console.error("Create property error:", err);
    showToast("Error creating property: " + err.message, "error");
  }
}

async function handleEditPropertySubmit(event, firestore) {
  event.preventDefault();

  const id = document.getElementById("edit-property-id").value;
  const name = document.getElementById("edit-property-name").value.trim();
  const location = document
    .getElementById("edit-property-location")
    .value.trim();
  const lat = parseFloat(
    document.getElementById("edit-property-lat").value || "0"
  );
  const lon = parseFloat(
    document.getElementById("edit-property-lon").value || "0"
  );
  const totalPlots = parseInt(
    document.getElementById("edit-property-plots").value,
    10
  );
  const defaultPrice = parseInt(
    document.getElementById("edit-property-plot-price").value,
    10
  );
  const newImagesInput = document.getElementById("edit-property-images");
  const newPdfInput = document.getElementById("edit-property-pdf");
  const removeCheckboxes = document.querySelectorAll(
    "#current-property-images input[type='checkbox']:checked"
  );
  const removePdfCheckbox = document.getElementById("current-property-pdf-checkbox");

  try {
    const docRef = firestore.collection("properties").doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      showToast("Property not found", "error");
      return;
    }

    let { imageUrls = [], availablePlots = totalPlots, pdfUrl = null } = existing.data();

    const toRemove = Array.from(removeCheckboxes).map(
      (cb) => cb.dataset.imageUrl
    );
    imageUrls = imageUrls.filter((url) => !toRemove.includes(url));

    if (newImagesInput && newImagesInput.files.length) {
      const newUrls = await uploadImages(newImagesInput.files);
      imageUrls = imageUrls.concat(newUrls);
    }

    // Handle PDF replacement
    if (removePdfCheckbox && removePdfCheckbox.checked) {
      pdfUrl = null;
    }

    if (newPdfInput && newPdfInput.files.length) {
      pdfUrl = await uploadPDF(newPdfInput.files[0]);
    }

    await docRef.update({
      name,
      location,
      latitude: lat,
      longitude: lon,
      totalPlots,
      availablePlots,
      defaultPrice,
      imageUrls,
      pdfUrl,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    showToast("Property updated successfully", "success");
    closePropertyModal();
  } catch (err) {
    console.error("Edit property error:", err);
    showToast("Error updating property: " + err.message, "error");
  }
}


function loadPropertiesTable(firestore) {
  const tbody = document.getElementById("properties-table-body");
  if (!tbody) return;

  firestore.collection("properties").onSnapshot(
    (snapshot) => {
      tbody.innerHTML = "";
      if (snapshot.empty) {
        tbody.innerHTML =
          '<tr><td colspan="7">No properties found. Create one to get started.</td></tr>';
        return;
      }

      snapshot.forEach((doc) => {
        const property = { id: doc.id, ...doc.data() };
        const row = tbody.insertRow();

        row.insertCell(0).textContent = property.name || "-";
        row.insertCell(1).textContent = property.location || "-";
        row.insertCell(2).textContent = property.totalPlots ?? "-";
        row.insertCell(3).textContent = property.availablePlots ?? "-";
        row.insertCell(4).textContent = property.defaultPrice ?? "-";

        const imagesCell = row.insertCell(5);
        if (property.imageUrls && property.imageUrls.length) {
          property.imageUrls.slice(0, 3).forEach((url) => {
            const img = document.createElement("img");
            img.src = url;
            img.alt = property.name;
            img.style.width = "40px";
            img.style.height = "40px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "3px";
            img.style.marginRight = "4px";
            imagesCell.appendChild(img);
          });
        } else {
          imagesCell.textContent = "No images";
        }

        const actionsCell = row.insertCell(6);
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.classList.add("action-button", "edit-button");
        editBtn.addEventListener("click", () =>
          openPropertyModal("edit", property)
        );

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.classList.add("action-button", "delete-button");
        deleteBtn.addEventListener("click", () => deleteProperty(firestore, property));

        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);

        // Update availability chart for last property drawn (simple but OK)
        updateAvailabilityChartForProperty(property);
      });
    },
    (err) => {
      console.error("loadPropertiesTable error:", err);
      showToast("Unable to load properties", "error");
    }
  );
}

function openPropertyModal(mode, property = null) {
  const modal = document.getElementById("property-modal");
  const createSection = document.getElementById("create-property-section");
  const editSection = document.getElementById("edit-property-section");

  if (!modal || !createSection || !editSection) return;

  modal.style.display = "flex";

  // Force map resize recalculation after modal is visible
  setTimeout(() => {
    if (mode === "create" && createMapInstance) {
      createMapInstance.invalidateSize();
    } else if (mode === "edit" && editMapInstance) {
      editMapInstance.invalidateSize();
    }
  }, 200);

  if (mode === "create") {
    createSection.style.display = "block";
    editSection.style.display = "none";
    const form = document.getElementById("create-property-form");
    if (form) form.reset();
  } else if (mode === "edit" && property) {
    createSection.style.display = "none";
    editSection.style.display = "block";

    document.getElementById("edit-property-id").value = property.id;
    document.getElementById("edit-property-name").value = property.name || "";
    document.getElementById("edit-property-location").value =
      property.location || "";
    document.getElementById("edit-property-lat").value =
      property.latitude || "";
    document.getElementById("edit-property-lon").value =
      property.longitude || "";
    document.getElementById("edit-property-plots").value =
      property.totalPlots ?? "";
    document.getElementById("edit-property-plot-price").value =
      property.defaultPrice ?? "";

    // Show readable address in search box if available (or duplicate location)
    const editSearchInput = document.getElementById("edit-location-query");
    if (editSearchInput) {
      editSearchInput.value = property.location || "";
    }

    const currentImagesDiv = document.getElementById(
      "current-property-images"
    );
    if (currentImagesDiv) {
      currentImagesDiv.innerHTML = "";
      if (property.imageUrls && property.imageUrls.length) {
        property.imageUrls.forEach((url) => {
          const wrapper = document.createElement("label");
          wrapper.style.display = "inline-flex";
          wrapper.style.alignItems = "center";
          wrapper.style.marginRight = "8px";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.dataset.imageUrl = url;
          checkbox.style.marginRight = "4px";

          const img = document.createElement("img");
          img.src = url;
          img.alt = property.name;
          img.style.width = "40px";
          img.style.height = "40px";
          img.style.objectFit = "cover";
          img.style.borderRadius = "3px";

          wrapper.appendChild(checkbox);
          wrapper.appendChild(img);
          currentImagesDiv.appendChild(wrapper);
        });
      } else {
        currentImagesDiv.textContent = "No images.";
      }
    }

    const currentPdfDiv = document.getElementById("current-property-pdf");
    if (currentPdfDiv) {
      currentPdfDiv.innerHTML = "";
      if (property.pdfUrl) {
        const wrapper = document.createElement("label");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.marginRight = "8px";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "current-property-pdf-checkbox";
        checkbox.style.marginRight = "8px";

        const link = document.createElement("a");
        link.href = property.pdfUrl;
        link.textContent = "View PDF";
        link.target = "_blank";
        link.style.textDecoration = "underline";
        link.style.color = "blue";

        wrapper.appendChild(checkbox);
        wrapper.appendChild(link);
        currentPdfDiv.appendChild(wrapper);
      } else {
        currentPdfDiv.textContent = "No PDF.";
      }
    }

    if (editMapInstance && property.latitude && property.longitude) {
      const lat = Number(property.latitude);
      const lon = Number(property.longitude);
      const center = [lat, lon];
      editMarkerInstance.setLatLng(center);
      editMapInstance.setView(center, 12);
    }
  }
}

function closePropertyModal() {
  const modal = document.getElementById("property-modal");
  if (modal) modal.style.display = "none";
}

async function deleteProperty(firestore, property) {
  if (
    !confirm(
      "Are you sure you want to delete this property? This action cannot be undone."
    )
  ) {
    return;
  }

  try {
    await firestore.collection("properties").doc(property.id).delete();
    showToast("Property deleted", "success");
  } catch (err) {
    console.error("Delete property error:", err);
    showToast("Error deleting property: " + err.message, "error");
  }
}