// public/js/modules/plots.js

import { showToast } from "../utils/toast.js";
import { showLoading, hideLoading } from "../utils/loading.js";

let firestore;
let currentPropertyId = null;

const plotsContent = document.getElementById("plots-content");
const selectPropertyForPlots = document.getElementById("select-property-for-plots");
const plotsManagementArea = document.getElementById("plots-management-area");
const plotsTableBody = document.getElementById("plots-table-body");
const addPlotButton = document.getElementById("add-plot-button");

// Plot Modal Elements
const plotModal = document.getElementById("plot-modal");
const closePlotModalButton = plotModal ? plotModal.querySelector(".close-button") : null;
const createPlotSection = document.getElementById("create-plot-section");
const createPlotForm = document.getElementById("create-plot-form");
const createPlotPropertyId = document.getElementById("create-plot-property-id");
const createPlotNumberInput = document.getElementById("create-plot-number");
const createPlotPriceInput = document.getElementById("create-plot-price");
const createPlotTypeCheckboxes = document.querySelectorAll('#create-plot-section input[name="plot-type"]');

const editPlotSection = document.getElementById("edit-plot-section");
const editPlotForm = document.getElementById("edit-plot-form");
const editPlotIdInput = document.getElementById("edit-plot-id");
const editPlotPropertyIdInput = document.getElementById("edit-plot-property-id");
const editPlotNumberInput = document.getElementById("edit-plot-number");
const editPlotPriceInput = document.getElementById("edit-plot-price");
const editPlotTypeCommercial = document.getElementById("edit-plot-type-commercial");
const editPlotTypePremium = document.getElementById("edit-plot-type-premium");
const editPlotTypeCorner = document.getElementById("edit-plot-type-corner");
const cancelEditPlotButton = document.getElementById("cancel-edit-plot");


export function initPlots(db) {
    firestore = db;
    if (plotsContent) {
        selectPropertyForPlots.addEventListener("change", handlePropertySelection);
        addPlotButton.addEventListener("click", openAddPlotModal);
        loadPropertiesForSelection();

        // Modal event listeners
        if (closePlotModalButton) closePlotModalButton.addEventListener("click", closePlotModal);
        if (plotModal) plotModal.addEventListener("click", (e) => {
            if (e.target === plotModal) closePlotModal();
        });
        if (createPlotForm) createPlotForm.addEventListener("submit", addPlot);
        if (editPlotForm) editPlotForm.addEventListener("submit", updatePlot);
        if (cancelEditPlotButton) cancelEditPlotButton.addEventListener("click", closePlotModal);
    }
}

async function loadPropertiesForSelection() {
    try {
        const propertiesSnapshot = await firestore.collection("properties").get();
        selectPropertyForPlots.innerHTML = '<option value="">Select a property to manage plots</option>';
        propertiesSnapshot.forEach((doc) => {
            const property = doc.data();
            const option = document.createElement("option");
            option.value = doc.id;
            option.textContent = property.name;
            selectPropertyForPlots.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading properties for plots:", error);
        showToast("Error loading properties.", "error");
    }
}

async function handlePropertySelection(event) {
    currentPropertyId = event.target.value;
    if (currentPropertyId) {
        plotsManagementArea.style.display = "block";
        loadPlots(currentPropertyId);
    } else {
        plotsManagementArea.style.display = "none";
        plotsTableBody.innerHTML = '<tr><td colspan="5">No plots found for this property.</td></tr>';
    }
}

async function loadPlots(propertyId) {
    showLoading("Loading plots...");
    try {
        const plotsSnapshot = await firestore.collection("properties").doc(propertyId).collection("plots").orderBy("plotNumber").get();
        plotsTableBody.innerHTML = "";
        if (plotsSnapshot.empty) {
            plotsTableBody.innerHTML = '<tr><td colspan="5">No plots found for this property.</td></tr>';
        } else {
            plotsSnapshot.forEach((doc) => {
                const plot = doc.data();
                const isSold = plot.status && plot.status.toLowerCase() === 'sold';

                const row = plotsTableBody.insertRow();
                row.innerHTML = `
                    <td>${plot.plotNumber}</td>
                    <td>${plot.price}</td>
                    <td>${plot.type || 'Standard'}</td>
                    <td>${plot.status || 'Available'}</td>
                    <td style="white-space: nowrap;">
                         ${isSold
                        ? `<button class="action-button view-details-button" data-id="${doc.id}" style="margin-right: 5px; background-color: #10b981;">View Details</button>`
                        : ''}
                        <button class="action-button edit-plot-button" data-id="${doc.id}">Edit</button>
                        <button class="action-button delete-plot-button" data-id="${doc.id}">Delete</button>
                    </td>
                `;

                if (isSold) {
                    row.querySelector(".view-details-button").addEventListener("click", () => viewPlotDetails(propertyId, doc.id, plot));
                }

                row.querySelector(".edit-plot-button").addEventListener("click", () => openEditPlotModal(doc.id, plot));
                row.querySelector(".delete-plot-button").addEventListener("click", () => deletePlot(propertyId, doc.id));
            });
        }
    } catch (error) {
        console.error("Error loading plots:", error);
        showToast("Error loading plots.", "error");
    } finally {
        hideLoading();
    }
}

async function viewPlotDetails(propertyId, plotId, plotData) {
    const modal = document.getElementById("transaction-details-modal");
    const content = document.getElementById("transaction-details-content");
    const closeBtn = modal ? modal.querySelector(".close-button") : null;

    if (!modal || !content) {
        showToast("Details modal not found", "error");
        return;
    }

    showLoading("Fetching transaction details...");

    try {
        // Find transaction for this property/plot
        // Note: There might be multiple transactions if re-sold, but usually one valid current one.
        // We look for one that matches or the latest one.
        const snapshot = await firestore.collection("transactions")
            .where("propertyId", "==", propertyId)
            .where("plotId", "==", plotId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            // Fallback if no transaction record but plot is marked sold (legacy or data sync issue)
            content.innerHTML = `<p>Plot <strong>${plotData.plotNumber}</strong> is marked as SOLD.</p>
                                  <p>However, no detailed transaction record was found.</p>
                                  <p><strong>Sold to Client ID:</strong> ${plotData.clientId || 'N/A'}</p>
                                  <p><strong>Agent ID:</strong> ${plotData.agentId || 'N/A'}</p>`;
        } else {
            const t = snapshot.docs[0].data();
            const txnId = snapshot.docs[0].id;

            let html = `<p><strong>Transaction ID:</strong> ${txnId}</p>`;
            html += `<p><strong>Date Sold:</strong> ${formatDate(t.dateSold)}</p>`;
            html += `<hr style="margin: 10px 0; border: 0; border-top: 1px solid #ccc;">`;

            html += `<p><strong>Property:</strong> ${t.propertyName || 'N/A'}</p>`;
            html += `<p><strong>Plot Number:</strong> ${t.plotNumber || 'N/A'}</p>`;
            html += `<p><strong>Total Price:</strong> ${formatCurrency(t.totalAmount || t.price)}</p>`;
            html += `<p><strong>Advance Paid:</strong> ${formatCurrency(t.advancePaid)}</p>`;
            html += `<p><strong>Remaining:</strong> ${formatCurrency(t.pendingAmount)}</p>`;

            html += `<hr style="margin: 10px 0; border: 0; border-top: 1px solid #ccc;">`;
            html += `<p><strong>Client Name:</strong> ${t.clientName || 'N/A'}</p>`;
            html += `<p><strong>Client Contact:</strong> ${t.clientMobile || t.contact || 'N/A'}</p>`;
            html += `<p><strong>Sold By (Agent):</strong> ${t.agentName || 'N/A'}</p>`;

            content.innerHTML = html;
        }

        modal.style.display = "flex";

        if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";

        // Re-bind window click to close since it might be overwritten by other modules 
        // or just let the global one handle it if properly set up in unique way
        window.addEventListener("click", (e) => {
            if (e.target === modal) modal.style.display = "none";
        });

    } catch (err) {
        console.error("Error fetching transaction details:", err);
        showToast("Failed to fetch details", "error");
    } finally {
        hideLoading();
    }
}

function formatDate(timestamp) {
    if (!timestamp) return "-";
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatCurrency(amount) {
    if (amount == null) return "N/A";
    return Number(amount).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    });
}

function openPlotModal() {
    if (plotModal) plotModal.style.display = "block";
}

function closePlotModal() {
    if (plotModal) plotModal.style.display = "none";
    createPlotForm.reset();
    editPlotForm.reset();
    createPlotSection.style.display = "block";
    editPlotSection.style.display = "none";
}

function openAddPlotModal() {
    if (!currentPropertyId) {
        showToast("Please select a property first.", "error");
        return;
    }
    createPlotForm.reset();
    createPlotPropertyId.value = currentPropertyId;
    createPlotSection.style.display = "block";
    editPlotSection.style.display = "none";
    openPlotModal();
}

async function addPlot(event) {
    event.preventDefault();
    showLoading("Adding plot...");

    const propertyId = createPlotPropertyId.value;
    const plotNumber = createPlotNumberInput.value;
    const priceValue = createPlotPriceInput.value.trim();
    const price = priceValue ? Number(priceValue) : 0;
    const plotTypes = Array.from(createPlotTypeCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    if (!propertyId || !plotNumber || isNaN(price) || price <= 0) {
        showToast("Please fill all required fields with valid values.", "error");
        hideLoading();
        return;
    }

    try {
        await firestore.collection("properties").doc(propertyId).collection("plots").add({
            plotNumber,
            price,
            type: plotTypes.length > 0 ? plotTypes.join(", ") : "Standard",
            status: "Available", // Default status
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        showToast("Plot added successfully!", "success");
        closePlotModal();
        loadPlots(propertyId);
    } catch (error) {
        console.error("Error adding plot:", error);
        showToast("Error adding plot.", "error");
    } finally {
        hideLoading();
    }
}

function openEditPlotModal(plotId, plotData) {
    editPlotIdInput.value = plotId;
    editPlotPropertyIdInput.value = currentPropertyId;
    editPlotNumberInput.value = plotData.plotNumber;
    editPlotPriceInput.value = plotData.price || "";

    // Set plot types
    const types = plotData.type ? plotData.type.split(", ").map(t => t.trim()) : [];
    editPlotTypeCommercial.checked = types.includes("Commercial");
    editPlotTypePremium.checked = types.includes("Premium");
    editPlotTypeCorner.checked = types.includes("Corner");

    createPlotSection.style.display = "none";
    editPlotSection.style.display = "block";
    openPlotModal();
}

async function updatePlot(event) {
    event.preventDefault();
    showLoading("Updating plot...");

    const plotId = editPlotIdInput.value;
    const propertyId = editPlotPropertyIdInput.value;
    const plotNumber = editPlotNumberInput.value;
    const priceValue = editPlotPriceInput.value.trim();
    const price = priceValue ? Number(priceValue) : 0;
    const plotTypes = [];
    if (editPlotTypeCommercial.checked) plotTypes.push("Commercial");
    if (editPlotTypePremium.checked) plotTypes.push("Premium");
    if (editPlotTypeCorner.checked) plotTypes.push("Corner");

    if (!propertyId || !plotId || !plotNumber || isNaN(price) || price <= 0) {
        showToast("Please fill all required fields with valid values.", "error");
        hideLoading();
        return;
    }

    try {
        await firestore.collection("properties").doc(propertyId).collection("plots").doc(plotId).update({
            plotNumber,
            price,
            type: plotTypes.length > 0 ? plotTypes.join(", ") : "Standard",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        showToast("Plot updated successfully!", "success");
        closePlotModal();
        loadPlots(propertyId);
    } catch (error) {
        console.error("Error updating plot:", error);
        showToast("Error updating plot.", "error");
    } finally {
        hideLoading();
    }
}

async function deletePlot(propertyId, plotId) {
    if (!confirm("Are you sure you want to delete this plot?")) {
        return;
    }
    showLoading("Deleting plot...");
    try {
        await firestore.collection("properties").doc(propertyId).collection("plots").doc(plotId).delete();
        showToast("Plot deleted successfully!", "success");
        loadPlots(propertyId); // Reload plots after deletion
    } catch (error) {
        console.error("Error deleting plot:", error);
        showToast("Error deleting plot.", "error");
    } finally {
        hideLoading();
    }
}
