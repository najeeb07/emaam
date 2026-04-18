// js/modules/clients.js
// Manage Clients & Record Sales (Complex Flow similar to Agent App)

import { showToast } from "../utils/toast.js";
import { showLoading, hideLoading } from "../utils/loading.js";
import { firebaseConfig } from "../firebaseConfig.js"; // Import config for secondary app

export function initClients(firestore) {
  initClientsDirectory(firestore);
  initTransactionsLog(firestore);
  initCreateClientModal(firestore);
  initEditClientModal(firestore);
}

// --- Clients Directory (Read Only List) ---

function initClientsDirectory(firestore) {
  const tbody = document.getElementById("clients-directory-table-body");
  if (!tbody) return;

  firestore.collection("clients").orderBy("createdAt", "desc").onSnapshot(
    (snapshot) => {
      tbody.innerHTML = "";
      if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="5">No clients found.</td></tr>';
        return;
      }

      snapshot.forEach((doc) => {
        const client = doc.data();
        const row = tbody.insertRow();
        row.insertCell(0).textContent = client.name || "-";
        row.insertCell(1).textContent = client.phone || client.contact || "-";
        row.insertCell(2).textContent = client.email || "-";
        row.insertCell(3).textContent = formatDate(client.createdAt || client.addedDate);

        // Actions
        const actionsCell = row.insertCell(4);

        // Edit Button
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.className = "action-button";
        editBtn.style.marginRight = "5px";
        editBtn.style.padding = "4px 8px";
        editBtn.style.fontSize = "0.85em";
        editBtn.onclick = () => openEditClientModal(doc.id, client);
        actionsCell.appendChild(editBtn);

        // Delete Button
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "action-button";
        deleteBtn.style.backgroundColor = "#d9534f"; // Red color
        deleteBtn.style.padding = "4px 8px";
        deleteBtn.style.fontSize = "0.85em";
        deleteBtn.onclick = () => deleteClient(firestore, doc.id, client);
        actionsCell.appendChild(deleteBtn);
      });
    },
    (err) => {
      console.error("Load clients error:", err);
    }
  );
}

// --- Edit Client Modal ---

function initEditClientModal(firestore) {
  const modal = document.getElementById("edit-client-modal");
  const closeBtn = modal ? modal.querySelector(".close-button") : null;
  const form = document.getElementById("edit-client-form");

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.style.display = "none");
  }

  // Close when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const clientId = document.getElementById("edit-client-id").value;
      const name = document.getElementById("edit-client-name").value;
      const phone = document.getElementById("edit-client-phone").value;
      const address = document.getElementById("edit-client-address").value;

      try {
        showLoading("Updating client...");
        await firestore.collection("clients").doc(clientId).update({
          name: name,
          phone: phone,
          contact: phone, // keep consistent with flutter
          address: address
        });

        // Also update name/phone in transactions if possible
        // This is a bit heavier, let's just do client for now or simple update
        // Searching all transactions for this client might be good practice
        const tQuery = await firestore.collection("transactions").where("clientId", "==", clientId).get();
        if (!tQuery.empty) {
          const batch = firestore.batch();
          tQuery.forEach(doc => {
            batch.update(doc.ref, { clientName: name, clientMobile: phone });
          });
          await batch.commit();
        }

        // Also update property/plot metadata if clientId is stored there?
        // Plot has clientName, property doesn't.
        // We'd need to find the plot. Client doc has plotId/propertyId.
        const clientDoc = await firestore.collection("clients").doc(clientId).get();
        if (clientDoc.exists) {
          const cData = clientDoc.data();
          if (cData.plots && cData.plots.length > 0) {
            for (let p of cData.plots) {
              if (p.propertyId && p.plotId) {
                await firestore.collection("properties").doc(p.propertyId)
                  .collection("plots").doc(p.plotId)
                  .update({ clientName: name });
              }
            }
          } else if (cData.propertyId && cData.plotId) {
            await firestore.collection("properties").doc(cData.propertyId)
              .collection("plots").doc(cData.plotId)
              .update({ clientName: name });
          }
        }

        showToast("Client updated successfully!", "success");
        modal.style.display = "none";
      } catch (err) {
        console.error("Error updating client:", err);
        showToast("Error updating client: " + err.message, "error");
      } finally {
        hideLoading();
      }
    });
  }
}

function openEditClientModal(id, client) {
  const modal = document.getElementById("edit-client-modal");
  if (!modal) return;

  document.getElementById("edit-client-id").value = id;
  document.getElementById("edit-client-name").value = client.name || "";
  document.getElementById("edit-client-phone").value = client.phone || client.contact || "";
  document.getElementById("edit-client-email").value = client.email || "";
  document.getElementById("edit-client-address").value = client.address || "";

  modal.style.display = "flex";
}

// --- Delete Client Logic ---

async function deleteClient(firestore, clientId, clientData) {
  const clientName = clientData.name || "Unknown Client";
  if (!confirm(`Are you sure you want to delete client "${clientName}"? This will revert the plot to Available and remove the sale record.`)) {
    return;
  }

  showLoading("Deleting client and reverting sale...");

  try {
    const batch = firestore.batch();

    // 1. Delete Client Document
    const clientRef = firestore.collection("clients").doc(clientId);
    batch.delete(clientRef);

    // 2. Revert Plot Status
    if (clientData.plots && clientData.plots.length > 0) {
      for (let p of clientData.plots) {
        if (p.propertyId && p.plotId) {
          const plotRef = firestore.collection("properties").doc(p.propertyId)
            .collection("plots").doc(p.plotId);

          batch.update(plotRef, {
            status: "Available",
            clientId: firebase.firestore.FieldValue.delete(),
            clientName: firebase.firestore.FieldValue.delete(),
            agentId: firebase.firestore.FieldValue.delete()
          });

          const propRef = firestore.collection("properties").doc(p.propertyId);
          batch.update(propRef, {
            availablePlots: firebase.firestore.FieldValue.increment(1)
          });
        }
      }
    } else if (clientData.propertyId && clientData.plotId) {
      const plotRef = firestore.collection("properties").doc(clientData.propertyId)
        .collection("plots").doc(clientData.plotId);

      // Update to Available
      batch.update(plotRef, {
        status: "Available", // Case sensitive based on loadPlots check
        clientId: firebase.firestore.FieldValue.delete(),
        clientName: firebase.firestore.FieldValue.delete(),
        agentId: firebase.firestore.FieldValue.delete()
      });

      // 3. Increment Available Plots Count
      const propRef = firestore.collection("properties").doc(clientData.propertyId);
      batch.update(propRef, {
        availablePlots: firebase.firestore.FieldValue.increment(1)
      });
    }

    // 4. Delete/Cancel Transaction
    let tQuery = firestore.collection("transactions").where("clientId", "==", clientId);

    const tSnap = await tQuery.get();

    tSnap.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    showToast("Client deleted and plot reverted to Available.", "success");

  } catch (err) {
    console.error("Error deleting client:", err);
    showToast("Error deleting client: " + err.message, "error");
  } finally {
    hideLoading();
  }
}

// --- Create Client & Record Sale Modal ---

function initCreateClientModal(firestore) {
  const addClientBtn = document.getElementById("add-client-button");
  const modal = document.getElementById("create-client-modal");
  const closeBtn = modal ? modal.querySelector(".close-button") : null;
  const form = document.getElementById("create-client-form");

  // Inputs
  const agentSelect = document.getElementById("client-select-agent");
  const propertySelect = document.getElementById("client-select-property");
  const plotSelect = document.getElementById("client-select-plot");
  const plotPriceDisplay = document.getElementById("plot-price-display");
  const totalAmountInput = document.getElementById("client-total-amount");

  if (addClientBtn && modal) {
    addClientBtn.addEventListener("click", () => {
      form.reset();
      modal.style.display = "flex";
      loadAgents(firestore, agentSelect);
      loadProperties(firestore, propertySelect);
      // Set today as default date
      document.getElementById("client-purchase-date").valueAsDate = new Date();
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.style.display = "none");
  }

  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // Property Change -> Load Plots
  if (propertySelect) {
    propertySelect.addEventListener("change", (e) => {
      const propertyId = e.target.value;
      loadPlots(firestore, propertyId, plotSelect, plotPriceDisplay, totalAmountInput);
    });
  }

  // Plot Change -> Update Price
  if (plotSelect) {
    plotSelect.addEventListener("change", (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption && selectedOption.dataset.price) {
        const price = Number(selectedOption.dataset.price);
        if (plotPriceDisplay) {
          plotPriceDisplay.textContent = `List Price: ${formatCurrency(price)}`;
          plotPriceDisplay.style.display = "block";
        }
        if (totalAmountInput) {
          totalAmountInput.value = price;
        }
      }
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleCreateClientSubmit(e, firestore);
    });
  }
}

async function loadAgents(firestore, selectElement) {
  if (!selectElement) return;
  selectElement.innerHTML = '<option value="">Loading agents...</option>';
  try {
    const snapshot = await firestore.collection("agents").get();
    selectElement.innerHTML = '<option value="">Select Agent</option>';

    // Add "Admin" option optionally? For now, list agents.
    // Assuming the admin might want to assign themselves if they have an agent record, 
    // or we just show all users in 'agents' collection.

    snapshot.forEach(doc => {
      const agent = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = agent.name || "Unknown Agent";
      selectElement.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading agents", err);
    selectElement.innerHTML = '<option value="">Error loading agents</option>';
  }
}

async function loadProperties(firestore, selectElement) {
  if (!selectElement) return;
  selectElement.innerHTML = '<option value="">Loading...</option>';
  try {
    const snapshot = await firestore.collection("properties").get();
    selectElement.innerHTML = '<option value="">Select Property</option>';
    snapshot.forEach(doc => {
      const p = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = p.name;
      selectElement.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading properties", err);
  }
}

async function loadPlots(firestore, propertyId, selectElement, priceDisplay, amountInput) {
  if (!selectElement) return;

  selectElement.disabled = true;
  selectElement.innerHTML = '<option value="">Loading plots...</option>';
  if (priceDisplay) priceDisplay.style.display = 'none';
  if (amountInput) amountInput.value = '';

  if (!propertyId) {
    selectElement.innerHTML = '<option value="">Select Property First</option>';
    return;
  }

  try {
    // Only load Available plots
    const snapshot = await firestore.collection("properties").doc(propertyId)
      .collection("plots")
      .where("status", "==", "Available")
      .get();

    selectElement.innerHTML = '<option value="">Select Plot</option>';

    if (snapshot.empty) {
      selectElement.innerHTML = '<option value="">No available plots</option>';
      return;
    }

    // Sort naturally if possible, or just list
    const plots = [];
    snapshot.forEach(doc => plots.push({ id: doc.id, ...doc.data() }));

    // Simple sort by number/string
    plots.sort((a, b) => {
      return a.plotNumber.localeCompare(b.plotNumber, undefined, { numeric: true });
    });

    plots.forEach(plot => {
      const option = document.createElement("option");
      option.value = plot.id;
      // Store raw details for submission
      option.dataset.number = plot.plotNumber;
      option.dataset.price = plot.price;
      option.textContent = `Plot ${plot.plotNumber} (${formatCurrency(plot.price)})`;
      selectElement.appendChild(option);
    });

    selectElement.disabled = false;

  } catch (err) {
    console.error("Error loading plots", err);
    selectElement.innerHTML = '<option value="">Error loading plots</option>';
  }
}

async function handleCreateClientSubmit(event, firestore) {
  const name = document.getElementById("client-name").value.trim();
  const phone = document.getElementById("client-phone").value.trim();
  const email = document.getElementById("client-email").value.trim();
  const password = document.getElementById("client-password").value;
  const address = document.getElementById("client-address").value.trim();

  const agentSelect = document.getElementById("client-select-agent");
  const agentId = agentSelect.value;
  const agentName = agentSelect.options[agentSelect.selectedIndex].text;

  const propertySelect = document.getElementById("client-select-property");
  const propertyId = propertySelect.value;
  const propertyName = propertySelect.options[propertySelect.selectedIndex].text;

  const plotSelect = document.getElementById("client-select-plot");
  const plotId = plotSelect.value;
  const plotOption = plotSelect.options[plotSelect.selectedIndex];
  const plotNumber = plotOption ? plotOption.dataset.number : "";

  const purchaseDateVal = document.getElementById("client-purchase-date").value;
  const purchaseDate = purchaseDateVal ? new Date(purchaseDateVal) : new Date();

  const totalAmount = Number(document.getElementById("client-total-amount").value);
  const advanceAmount = Number(document.getElementById("client-advance-amount").value);

  // Validation
  if (!name || !email || !password || !propertyId || !plotId || !agentId) {
    showToast("Please fill all required fields.", "error");
    return;
  }

  if (advanceAmount > totalAmount) {
    showToast("Advance amount cannot be greater than total amount.", "error");
    return;
  }

  showLoading("Creating account and recording sale...");

  // 1. Create User in Secondary App
  let secondaryApp;
  let newUserId;

  try {
    // Initialize secondary app to avoid logging out the admin
    // Note: Using "Secondary" as app name
    secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = secondaryApp.auth();

    const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    newUserId = userCredential.user.uid;

    // Log out quickly from secondary to be clean, though secondary instance helps isolate
    await secondaryAuth.signOut();

  } catch (authErr) {
    hideLoading();
    console.error("Auth Error:", authErr);
    if (authErr.code === 'auth/email-already-in-use') {
      showToast("Email already associated with an account.", "error");
    } else {
      showToast("Error creating user: " + authErr.message, "error");
    }
    if (secondaryApp) secondaryApp.delete();
    return;
  }

  // 2. Perform DB Operations (Batch is safer)
  try {
    const batch = firestore.batch();
    const pendingPayment = totalAmount - advanceAmount;

    // A. Create Client Doc
    const clientRef = firestore.collection("clients").doc(newUserId);
    batch.set(clientRef, {
      name,
      phone,  // mapped from 'contact' in flutter? flutter uses 'contact', web usually 'phone'
      contact: phone,
      email,
      address,
      agentId,
      agentName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      addedDate: firebase.firestore.FieldValue.serverTimestamp(), // Flutter compatibility
      // Sale Snapshot in Client Doc
      propertyId,
      propertyName,
      plotId,
      plotNumber,
      totalPayment: totalAmount,
      advancePayment: advanceAmount,
      pendingPayment: pendingPayment,
      purchaseDate: purchaseDate
    });

    // B. Update Plot Status
    const plotRef = firestore.collection("properties").doc(propertyId).collection("plots").doc(plotId);
    batch.update(plotRef, {
      status: "sold",
      clientId: newUserId,
      clientName: name,
      agentId: agentId
    });

    // C. Update Property Available Count
    // Increment/Decrement cannot be in batch if we don't have the doc ref readily available for update usage with FieldValue? 
    // actually batch.update works with FieldValue.increment
    const propRef = firestore.collection("properties").doc(propertyId);
    batch.update(propRef, {
      availablePlots: firebase.firestore.FieldValue.increment(-1)
    });

    // D. Create Transaction Record
    const transactionRef = firestore.collection("transactions").doc();
    batch.set(transactionRef, {
      clientId: newUserId,
      clientName: name,
      clientMobile: phone,
      propertyId,
      propertyName,
      plotId,
      plotNumber,
      price: totalAmount, // for list view compatibility
      totalAmount,
      advancePaid: advanceAmount,
      pendingAmount: pendingPayment,
      dateSold: purchaseDate,
      agentId,
      agentName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Commit Batch first
    await batch.commit();

    // E. Add Initial Payment Subcollection (cannot serve in batch easily as it needs parent doc existence logic sometimes, but strictly it's fine. 
    // However, batch adds for subcollections work. Separating it for simplicity or doing it after.)
    if (advanceAmount > 0) {
      await transactionRef.collection("payments").add({
        amount: advanceAmount,
        date: purchaseDate,
        notes: "Initial Advance Payment (at creation)",
        addedByAgentId: agentId, // or Admin ID? keeping agentId for attribution
        addedDate: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    showToast("Client created and Sale recorded successfully!", "success");
    document.getElementById("create-client-modal").style.display = "none";

    // Reload transactions/clients listeners will auto-update UI

  } catch (dbErr) {
    console.error("Database Error:", dbErr);
    showToast("Account created but failed to save data: " + dbErr.message, "error");
    // In a real production app, we might want to delete the auth user here to rollback
  } finally {
    hideLoading();
    if (secondaryApp) secondaryApp.delete();
  }
}


// --- Transactions Log (Existing logic maintained) ---

function initTransactionsLog(firestore) {
  const tbody = document.getElementById("clients-transactions-table-body");
  if (!tbody) return;

  firestore.collection("transactions").orderBy("dateSold", "desc").onSnapshot(
    (snapshot) => {
      tbody.innerHTML = "";
      if (snapshot.empty) {
        tbody.innerHTML =
          '<tr><td colspan="7">No transactions found.</td></tr>';
        return;
      }

      snapshot.forEach((doc) => {
        const t = doc.data();
        const row = tbody.insertRow();
        row.insertCell(0).textContent = t.clientName || "N/A";
        row.insertCell(1).textContent = t.agentName || "N/A";
        row.insertCell(2).textContent = t.propertyName || "N/A";
        const plotNumbers = t.plots ? t.plots.map(p => p.plotNumber).join(', ') : (t.plotNumber || "N/A");
        row.insertCell(3).textContent = plotNumbers;
        row.insertCell(4).textContent = formatCurrency(t.totalAmount || t.price);
        row.insertCell(5).textContent = formatDate(t.dateSold);

        // Action: View Details
        const actionsCell = row.insertCell(6);
        const viewBtn = document.createElement("button");
        viewBtn.textContent = "View Details";
        viewBtn.className = "action-button";
        viewBtn.style.padding = "4px 8px";
        viewBtn.style.fontSize = "0.85em";
        viewBtn.onclick = () => openTransactionDetails(t, doc.id);
        actionsCell.appendChild(viewBtn);
      });
    },
    (err) => {
      console.error("Load transactions error:", err);
    }
  );
}

function openTransactionDetails(transaction, id) {
  const modal = document.getElementById("transaction-details-modal");
  const content = document.getElementById("transaction-details-content");
  const closeBtn = modal.querySelector(".close-button");

  if (!modal || !content) return;

  // Use transaction ID if available
  const txnId = id || transaction.id || "N/A";

  // Build the details HTML
  let html = `<p><strong>Transaction ID:</strong> ${txnId}</p>`;
  html += `<p><strong>Date Sold:</strong> ${formatDate(transaction.dateSold)}</p>`;
  html += `<hr style="margin: 10px 0; border: 0; border-top: 1px solid #ccc;">`;

  html += `<p><strong>Property:</strong> ${transaction.propertyName || 'N/A'}</p>`;
  const plotNumbers = transaction.plots ? transaction.plots.map(p => p.plotNumber).join(', ') : (transaction.plotNumber || 'N/A');
  html += `<p><strong>Plot Number(s):</strong> ${plotNumbers}</p>`;
  html += `<p><strong>Total Price:</strong> ${formatCurrency(transaction.totalAmount || transaction.price)}</p>`;
  html += `<p><strong>Advance Paid:</strong> ${formatCurrency(transaction.advancePaid)}</p>`;
  html += `<p><strong>Remaining:</strong> ${formatCurrency(transaction.pendingAmount)}</p>`;

  html += `<hr style="margin: 10px 0; border: 0; border-top: 1px solid #ccc;">`;
  html += `<p><strong>Client Name:</strong> ${transaction.clientName || 'N/A'}</p>`;
  html += `<p><strong>Client Contact:</strong> ${transaction.clientMobile || transaction.contact || 'N/A'}</p>`;
  html += `<p><strong>Sold By (Agent):</strong> ${transaction.agentName || 'N/A'}</p>`;

  content.innerHTML = html;
  modal.style.display = "flex";

  if (closeBtn) {
    closeBtn.onclick = () => modal.style.display = "none";
  }

  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
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