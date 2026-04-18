// js/modules/commissions.js
import { showToast } from "../utils/toast.js";

export function initCommissions(firestore) {
    const agentSelect = document.getElementById("commission-agent");
    const propertySelect = document.getElementById("commission-property");
    const plotSelectHidden = document.getElementById("commission-plot"); // Hidden input to store selected plot IDs
    const plotDropdown = document.getElementById("commission-plot-dropdown");
    const plotDropdownToggle = document.getElementById("commission-plot-toggle");
    const plotDropdownMenu = document.getElementById("commission-plot-menu");
    const plotDropdownList = document.getElementById("commission-plot-list");
    const totalCommissionAmountInput = document.getElementById("total-commission-amount");
    const manageCommissionForm = document.getElementById("manage-commission-form");
    const commissionsTableBody = document.getElementById("commissions-table-body");

    const paymentModal = document.getElementById("payment-modal");
    const closePaymentModalButton = paymentModal ? paymentModal.querySelector(".close-button") : null;
    const recordPaymentForm = document.getElementById("record-payment-form");
    const paymentCommissionIdInput = document.getElementById("payment-commission-id");
    const paymentAgentNameInput = document.getElementById("payment-agent-name");
    const paymentPropertyNameInput = document.getElementById("payment-property-name");
    const paymentPlotNumberInput = document.getElementById("payment-plot-number");
    const paymentTotalCommissionInput = document.getElementById("payment-total-commission");
    const paymentPaidAmountInput = document.getElementById("payment-paid-amount");
    const paymentRemainingAmountInput = document.getElementById("payment-remaining-amount");
    const paymentAmountToPayInput = document.getElementById("payment-amount-to-pay");
    const paymentDateInput = document.getElementById("payment-date");

    // Update Commission Modal Elements
    const updateCommissionModal = document.getElementById("update-commission-modal");
    const closeUpdateModalButton = updateCommissionModal ? updateCommissionModal.querySelector(".close-button") : null;
    const updateCommissionForm = document.getElementById("update-commission-form");
    const updateCommissionIdInput = document.getElementById("update-commission-id");
    const updateCommissionPropertyIdInput = document.getElementById("update-commission-property-id");
    const updateCommissionAgentName = document.getElementById("update-commission-agent-name");
    const updateCommissionPropertyName = document.getElementById("update-commission-property-name");
    const updateCommissionCurrentPlots = document.getElementById("update-commission-current-plots");
    const updateCommissionPlotDropdown = document.getElementById("update-commission-plot-dropdown");
    const updateCommissionPlotToggle = document.getElementById("update-commission-plot-toggle");
    const updateCommissionPlotMenu = document.getElementById("update-commission-plot-menu");
    const updateCommissionPlotList = document.getElementById("update-commission-plot-list");
    const updateCommissionAmountInput = document.getElementById("update-commission-amount");

    let allAgents = [];
    let allProperties = [];
    let allPlots = {}; // Store plots by propertyId
    let selectedPlots = {}; // Track selected plots: { plotId: plotObject }
    let selectedUpdatePlots = {}; // Track selected plots for update modal

    // Helper to fetch agents
    async function fetchAgents() {
        try {
            const snapshot = await firestore.collection("agents").get();
            allAgents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            populateAgentSelect();
        } catch (err) {
            console.error("Error fetching agents:", err);
            showToast("Error loading agents", "error");
        }
    }

    // Helper to fetch properties
    async function fetchProperties() {
        try {
            const snapshot = await firestore.collection("properties").get();
            allProperties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // No need to populate propertySelect here, it depends on agent selection
        } catch (err) {
            console.error("Error fetching properties:", err);
            showToast("Error loading properties", "error");
        }
    }

    // Helper to fetch plots for a specific property
    async function fetchPlotsForProperty(propertyId, updateMainDropdown = true) {
        try {
            const snapshot = await firestore.collection("properties").doc(propertyId).collection("plots").get();
            allPlots[propertyId] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (updateMainDropdown) {
                populatePlotDropdown(propertyId);
            }
        } catch (err) {
            console.error(`Error fetching plots for property ${propertyId}:`, err);
            showToast("Error loading plots", "error");
        }
    }

    // Populate agent dropdown
    function populateAgentSelect() {
        if (agentSelect) {
            agentSelect.innerHTML = '<option value="">Select an agent</option>';
            allAgents.forEach(agent => {
                const option = document.createElement("option");
                option.value = agent.id;
                option.textContent = agent.name;
                agentSelect.appendChild(option);
            });
        }
    }

    // Populate property dropdown based on selected agent (currently all properties)
    function populatePropertySelect() {
        if (propertySelect) {
            propertySelect.innerHTML = '<option value="">Select a property</option>';
            allProperties.forEach(property => {
                const option = document.createElement("option");
                option.value = property.id;
                option.textContent = property.name;
                propertySelect.appendChild(option);
            });
            propertySelect.disabled = false;
        }
    }

    // Populate custom plot dropdown with checkboxes
    function populatePlotDropdown(propertyId) {
        const plots = allPlots[propertyId] || [];
        plotDropdownList.innerHTML = '';
        selectedPlots = {}; // Reset selected plots

        if (plots.length === 0) {
            const noItemDiv = document.createElement('div');
            noItemDiv.className = 'dropdown-item no-items';
            noItemDiv.textContent = 'No plots available';
            plotDropdownList.appendChild(noItemDiv);
            plotDropdownToggle.disabled = true;
        } else {
            plots.forEach(plot => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'dropdown-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = plot.id;
                checkbox.dataset.plotId = plot.id;
                checkbox.dataset.plotNumber = plot.plotNumber;

                const label = document.createElement('label');
                label.textContent = `Plot ${plot.plotNumber} (${plot.status})`;

                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedPlots[plot.id] = plot;
                        itemDiv.classList.add('selected');
                    } else {
                        delete selectedPlots[plot.id];
                        itemDiv.classList.remove('selected');
                    }
                    updatePlotToggleText();
                    updateHiddenInput();
                });

                itemDiv.appendChild(checkbox);
                itemDiv.appendChild(label);
                plotDropdownList.appendChild(itemDiv);
            });

            plotDropdownToggle.disabled = false;
        }

        updatePlotToggleText();
    }

    // Update toggle button text to show selected count
    function updatePlotToggleText() {
        const selectedCount = Object.keys(selectedPlots).length;
        if (selectedCount === 0) {
            plotDropdownToggle.textContent = 'Select plots...';
        } else {
            plotDropdownToggle.textContent = `${selectedCount} plot(s) selected`;
        }
    }

    // Update hidden input with selected plot IDs
    function updateHiddenInput() {
        const selectedIds = Object.keys(selectedPlots);
        plotSelectHidden.value = selectedIds.join(',');
    }

    // Handle dropdown toggle
    if (plotDropdownToggle) {
        plotDropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            plotDropdownMenu.classList.toggle('active');
            plotDropdownToggle.classList.toggle('active');
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!plotDropdown.contains(e.target)) {
            plotDropdownMenu.classList.remove('active');
            plotDropdownToggle.classList.remove('active');
        }
    });

    // Initial data load
    if (agentSelect) {
        fetchAgents();
        fetchProperties();
    }

    // Event Listeners
    if (agentSelect) {
        agentSelect.addEventListener("change", () => {
            if (agentSelect.value) {
                populatePropertySelect();
            } else {
                propertySelect.innerHTML = '<option value="">Select a property</option>';
                propertySelect.disabled = true;
                plotDropdownList.innerHTML = '<div class="dropdown-item no-items">Select a property first</div>';
                plotDropdownToggle.disabled = true;
                selectedPlots = {};
                updatePlotToggleText();
            }
        });
    }

    if (propertySelect) {
        propertySelect.addEventListener("change", () => {
            if (propertySelect.value) {
                fetchPlotsForProperty(propertySelect.value);
            } else {
                plotDropdownList.innerHTML = '<div class="dropdown-item no-items">No plots available</div>';
                plotDropdownToggle.disabled = true;
                selectedPlots = {};
                updatePlotToggleText();
            }
        });
    }

    if (manageCommissionForm) {
        manageCommissionForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const agentId = agentSelect.value;
            const agentName = agentSelect.options[agentSelect.selectedIndex].textContent;
            const propertyId = propertySelect.value;
            const propertyName = propertySelect.options[propertySelect.selectedIndex].textContent;

            const selectedPlotsArray = Object.values(selectedPlots).map(plot => ({
                id: plot.id,
                plotNumber: plot.plotNumber
            }));

            const totalCommission = parseFloat(totalCommissionAmountInput.value);

            if (!agentId || !propertyId || selectedPlotsArray.length === 0) {
                showToast("Please select agent, property, and at least one plot", "error");
                return;
            }
            if (isNaN(totalCommission) || totalCommission <= 0) {
                showToast("Please enter a valid total commission amount", "error");
                return;
            }

            try {
                await firestore.collection("commissions").add({
                    agentId,
                    agentName,
                    propertyId,
                    propertyName,
                    plots: selectedPlotsArray, // Store an array of selected plots
                    totalCommission,
                    paidAmount: 0,
                    remainingAmount: totalCommission,
                    lastPaymentDate: null,
                    paymentHistory: [], // Initialize payment history array
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                showToast("Commission details saved successfully", "success");
                manageCommissionForm.reset();
                propertySelect.disabled = true;
                plotDropdownToggle.disabled = true;
                plotDropdownList.innerHTML = '<div class="dropdown-item no-items">Select a property first</div>';
                selectedPlots = {};
                updatePlotToggleText();
            } catch (err) {
                console.error("Error saving commission details:", err);
                showToast("Error saving commission details: " + err.message, "error");
            }
        });
    }

    // Render commissions table
    function renderCommissionsTable() {
        if (commissionsTableBody) {
            firestore.collection('commissions').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
                commissionsTableBody.innerHTML = '';
                if (snapshot.empty) {
                    commissionsTableBody.innerHTML = '<tr><td colspan="8">No commissions found.</td></tr>';
                    return;
                }

                snapshot.forEach(doc => {
                    const commission = { id: doc.id, ...doc.data() };
                    const row = commissionsTableBody.insertRow();
                    const plotNumbers = commission.plots ? commission.plots.map(p => p.plotNumber).join(', ') : 'N/A';

                    row.insertCell(0).textContent = commission.agentName;
                    row.insertCell(1).textContent = commission.propertyName;
                    row.insertCell(2).textContent = plotNumbers; // Display multiple plot numbers
                    row.insertCell(3).textContent = commission.totalCommission.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
                    row.insertCell(4).textContent = commission.paidAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
                    row.insertCell(5).textContent = commission.remainingAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
                    row.insertCell(6).textContent = commission.lastPaymentDate ?
                        new Date(commission.lastPaymentDate.toDate()).toLocaleDateString() : 'N/A';

                    const actionsCell = row.insertCell(7);
                    const payButton = document.createElement("button");
                    payButton.textContent = "Record Payment";
                    payButton.classList.add("action-button", "small-button");
                    payButton.addEventListener("click", () => openPaymentModal(commission));
                    actionsCell.appendChild(payButton);


                    const viewHistoryButton = document.createElement("button");
                    viewHistoryButton.textContent = "View Payments";
                    viewHistoryButton.classList.add("action-button", "small-button", "secondary-button");
                    viewHistoryButton.style.marginLeft = "5px";
                    viewHistoryButton.addEventListener("click", () => openPaymentHistoryModal(commission));
                    actionsCell.appendChild(viewHistoryButton);

                    const addPlotButton = document.createElement("button");
                    addPlotButton.textContent = "Add Plot";
                    addPlotButton.classList.add("action-button", "small-button", "secondary-button");
                    addPlotButton.style.marginLeft = "5px";
                    addPlotButton.style.backgroundColor = "#10b981"; // Green color
                    addPlotButton.addEventListener("click", () => openUpdateCommissionModal(commission));
                    actionsCell.appendChild(addPlotButton);

                    const deleteButton = document.createElement("button");
                    deleteButton.textContent = "Delete";
                    deleteButton.classList.add("action-button", "small-button");
                    deleteButton.style.marginLeft = "5px";
                    deleteButton.style.backgroundColor = "#ef4444"; // Red color
                    deleteButton.addEventListener("click", async () => {
                        if (confirm(`Are you sure you want to delete the commission for Agent: ${commission.agentName}, Property: ${commission.propertyName}?`)) {
                            try {
                                await firestore.collection("commissions").doc(commission.id).delete();
                                showToast("Commission deleted successfully", "success");
                            } catch (err) {
                                console.error("Error deleting commission:", err);
                                showToast("Error deleting commission: " + err.message, "error");
                            }
                        }
                    });
                    actionsCell.appendChild(deleteButton);
                });
            }, err => {
                console.error("Error fetching commission history:", err);
                showToast("Error loading commission history", "error");
            });
        }
    }

    // Open payment modal
    function openPaymentModal(commission) {
        if (paymentModal) {
            paymentCommissionIdInput.value = commission.id;
            paymentAgentNameInput.value = commission.agentName;
            paymentPropertyNameInput.value = commission.propertyName;
            paymentPlotNumberInput.value = commission.plots ? commission.plots.map(p => p.plotNumber).join(', ') : 'N/A'; // Display multiple plot numbers
            paymentTotalCommissionInput.value = commission.totalCommission;
            paymentPaidAmountInput.value = commission.paidAmount;
            paymentRemainingAmountInput.value = commission.remainingAmount;
            paymentAmountToPayInput.max = commission.remainingAmount; // Set max amount to pay
            paymentAmountToPayInput.value = ''; // Clear previous input
            paymentDateInput.valueAsDate = new Date(); // Set current date

            paymentModal.style.display = "block";
        }
    }

    // Close payment modal
    if (closePaymentModalButton) {
        closePaymentModalButton.addEventListener("click", () => {
            paymentModal.style.display = "none";
        });
    }

    // Handle record payment form submission
    if (recordPaymentForm) {
        recordPaymentForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const commissionId = paymentCommissionIdInput.value;
            const amountToPay = parseFloat(paymentAmountToPayInput.value);
            const paymentDate = new Date(paymentDateInput.value);

            const currentRemaining = parseFloat(paymentRemainingAmountInput.value);
            const currentPaid = parseFloat(paymentPaidAmountInput.value);

            if (isNaN(amountToPay) || amountToPay <= 0) {
                showToast("Please enter a valid amount to pay", "error");
                return;
            }
            if (amountToPay > currentRemaining) {
                showToast("Amount to pay cannot exceed remaining amount", "error");
                return;
            }

            try {
                const commissionRef = firestore.collection("commissions").doc(commissionId);
                await commissionRef.update({
                    paidAmount: currentPaid + amountToPay,
                    remainingAmount: currentRemaining - amountToPay,
                    lastPaymentDate: firebase.firestore.Timestamp.fromDate(paymentDate),
                    paymentHistory: firebase.firestore.FieldValue.arrayUnion({
                        amount: amountToPay,
                        date: firebase.firestore.Timestamp.fromDate(paymentDate),
                    }),
                });
                showToast("Payment recorded successfully", "success");
                paymentModal.style.display = "none";
                recordPaymentForm.reset();
            } catch (err) {
                console.error("Error recording payment:", err);
                showToast("Error recording payment: " + err.message, "error");
            }
        });
    }

    // Payment History Modal elements
    const paymentHistoryModal = document.getElementById("payment-history-modal");
    const closePaymentHistoryModalButton = paymentHistoryModal ? paymentHistoryModal.querySelector(".close-button") : null;
    const historyAgentName = document.getElementById("history-agent-name");
    const historyPropertyName = document.getElementById("history-property-name");
    const historyPlotNumber = document.getElementById("history-plot-number");
    const historyTotalCommission = document.getElementById("history-total-commission");
    const paymentHistoryTableBody = document.getElementById("payment-history-table-body");

    // Open payment history modal
    function openPaymentHistoryModal(commission) {
        if (paymentHistoryModal) {
            historyAgentName.textContent = commission.agentName;
            historyPropertyName.textContent = commission.propertyName;
            historyPlotNumber.textContent = commission.plots ? commission.plots.map(p => p.plotNumber).join(', ') : 'N/A'; // Display multiple plot numbers
            historyTotalCommission.textContent = commission.totalCommission.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

            paymentHistoryTableBody.innerHTML = '';
            if (commission.paymentHistory && commission.paymentHistory.length > 0) {
                commission.paymentHistory.sort((a, b) => b.date.toDate() - a.date.toDate()); // Sort by date descending
                commission.paymentHistory.forEach(payment => {
                    const row = paymentHistoryTableBody.insertRow();
                    row.insertCell(0).textContent = payment.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
                    row.insertCell(1).textContent = payment.date ?
                        new Date(payment.date.toDate()).toLocaleDateString() : 'N/A';
                });
            } else {
                paymentHistoryTableBody.innerHTML = '<tr><td colspan="2">No payments recorded.</td></tr>';
            }

            paymentHistoryModal.style.display = "block";
        }
    }

    // Close payment history modal
    if (closePaymentHistoryModalButton) {
        closePaymentHistoryModalButton.addEventListener("click", () => {
            paymentHistoryModal.style.display = "none";
        });
    }

    // --- Update Commission Modal Logic ---

    // Open Update Modal
    async function openUpdateCommissionModal(commission) {
        if (updateCommissionModal) {
            updateCommissionIdInput.value = commission.id;
            updateCommissionPropertyIdInput.value = commission.propertyId;
            updateCommissionAgentName.value = commission.agentName;
            updateCommissionPropertyName.value = commission.propertyName;

            const currentPlotNumbers = commission.plots ? commission.plots.map(p => p.plotNumber).join(', ') : 'N/A';
            updateCommissionCurrentPlots.value = currentPlotNumbers;

            updateCommissionAmountInput.value = '';
            selectedUpdatePlots = {};
            updateUpdatePlotToggleText();

            // Fetch plots for this property if not already loaded (or reload to be safe and get latest status)
            // We need to fetch plots to show available ones.
            // Check if we have plots for this property, if not fetch them.
            if (!allPlots[commission.propertyId]) {
                await fetchPlotsForProperty(commission.propertyId, false);
            }
            // Even if we have them, we should populate the dropdown now.
            populateUpdatePlotDropdown(commission.propertyId, commission.plots || []);

            updateCommissionModal.style.display = "block";
        }
    }

    // Populate Update Plot Dropdown
    function populateUpdatePlotDropdown(propertyId, existingPlots) {
        const plots = allPlots[propertyId] || [];
        updateCommissionPlotList.innerHTML = '';
        selectedUpdatePlots = {};

        const existingPlotIds = new Set(existingPlots.map(p => p.id));

        if (plots.length === 0) {
            updateCommissionPlotList.innerHTML = '<div class="dropdown-item no-items">No plots available</div>';
            updateCommissionPlotToggle.disabled = true;
            return;
        }

        let availableCount = 0;
        plots.forEach(plot => {
            // Skip plots that are already part of this commission? Or show them disabled?
            // User wants to ADD plots. So we should show plots that are NOT in existingPlotIds.
            if (existingPlotIds.has(plot.id)) return;

            availableCount++;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = plot.id;
            checkbox.dataset.plotId = plot.id;
            checkbox.dataset.plotNumber = plot.plotNumber;

            const label = document.createElement('label');
            label.textContent = `Plot ${plot.plotNumber} (${plot.status})`;

            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedUpdatePlots[plot.id] = plot;
                    itemDiv.classList.add('selected');
                } else {
                    delete selectedUpdatePlots[plot.id];
                    itemDiv.classList.remove('selected');
                }
                updateUpdatePlotToggleText();
            });

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            updateCommissionPlotList.appendChild(itemDiv);
        });

        if (availableCount === 0) {
            updateCommissionPlotList.innerHTML = '<div class="dropdown-item no-items">No new plots available to add</div>';
            updateCommissionPlotToggle.disabled = true;
        } else {
            updateCommissionPlotToggle.disabled = false;
        }
        updateUpdatePlotToggleText();
    }

    function updateUpdatePlotToggleText() {
        const selectedCount = Object.keys(selectedUpdatePlots).length;
        if (selectedCount === 0) {
            updateCommissionPlotToggle.textContent = 'Select plots...';
        } else {
            updateCommissionPlotToggle.textContent = `${selectedCount} plot(s) selected`;
        }
    }

    // Toggle Update Dropdown
    if (updateCommissionPlotToggle) {
        updateCommissionPlotToggle.addEventListener('click', (e) => {
            e.preventDefault();
            updateCommissionPlotMenu.classList.toggle('active');
            updateCommissionPlotToggle.classList.toggle('active');
        });
    }

    // Close Update Dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (updateCommissionModal && updateCommissionModal.style.display === 'block') {
            if (updateCommissionPlotDropdown && !updateCommissionPlotDropdown.contains(e.target)) {
                updateCommissionPlotMenu.classList.remove('active');
                updateCommissionPlotToggle.classList.remove('active');
            }
        }
    });

    // Close Update Modal
    if (closeUpdateModalButton) {
        closeUpdateModalButton.addEventListener("click", () => {
            updateCommissionModal.style.display = "none";
        });
    }

    // Handle Update Form Submission
    if (updateCommissionForm) {
        updateCommissionForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const commissionId = updateCommissionIdInput.value;
            const additionalAmount = parseFloat(updateCommissionAmountInput.value);

            const selectedPlotsArray = Object.values(selectedUpdatePlots).map(plot => ({
                id: plot.id,
                plotNumber: plot.plotNumber
            }));

            if (selectedPlotsArray.length === 0) {
                showToast("Please select at least one plot to add", "error");
                return;
            }

            if (isNaN(additionalAmount) || additionalAmount < 0) {
                showToast("Please enter a valid amount", "error");
                return;
            }

            try {
                const commissionRef = firestore.collection("commissions").doc(commissionId);

                // Use arrayUnion to add new plots
                // Use increment to update amounts
                await commissionRef.update({
                    plots: firebase.firestore.FieldValue.arrayUnion(...selectedPlotsArray),
                    totalCommission: firebase.firestore.FieldValue.increment(additionalAmount),
                    remainingAmount: firebase.firestore.FieldValue.increment(additionalAmount)
                });

                showToast("Commission updated successfully", "success");
                updateCommissionModal.style.display = "none";
                updateCommissionForm.reset();
            } catch (err) {
                console.error("Error updating commission:", err);
                showToast("Error updating commission: " + err.message, "error");
            }
        });
    }

    // Initial render of the commissions table
    renderCommissionsTable();
}
