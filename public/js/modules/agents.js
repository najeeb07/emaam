// js/modules/agents.js
// Manage agents list + simple creation

import { showToast } from "../utils/toast.js";

export function initAgents(firestore, auth) {
  const form = document.getElementById("create-agent-form");
  const tbody = document.getElementById("agents-table-body");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("agent-name").value.trim();
      const email = document.getElementById("agent-email").value.trim();
      const phone = document.getElementById("agent-phone").value.trim();
      const password = document.getElementById("agent-password").value;

      if (!password || password.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        return;
      }

      try {
        // First, create the Firebase Authentication user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        // Then, create the agent document in Firestore with the UID
        await firestore.collection("agents").doc(uid).set({
          name,
          email,
          phone,
          uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        showToast("Agent created successfully", "success");
        form.reset();
      } catch (err) {
        console.error("Create agent error:", err);
        let errorMessage = "Error creating agent: " + err.message;

        // Handle specific Firebase Auth errors
        if (err.code === 'auth/email-already-in-use') {
          errorMessage = "This email is already registered";
        } else if (err.code === 'auth/invalid-email') {
          errorMessage = "Invalid email address";
        } else if (err.code === 'auth/weak-password') {
          errorMessage = "Password is too weak";
        }

        showToast(errorMessage, "error");
      }
    });
  }

  if (tbody) {
    firestore.collection("agents").onSnapshot(
      (snapshot) => {
        tbody.innerHTML = "";
        if (snapshot.empty) {
          tbody.innerHTML = '<tr><td colspan="5">No agents found.</td></tr>';
          return;
        }

        snapshot.forEach((doc) => {
          const agent = { id: doc.id, ...doc.data() };
          const row = tbody.insertRow();

          row.insertCell(0).textContent = agent.name || "-";
          row.insertCell(1).textContent = agent.email || "-";
          row.insertCell(2).textContent = agent.phone || "-";
          row.insertCell(3).textContent =
            agent.propertiesCount != null ? agent.propertiesCount : "-";

          const actionsCell = row.insertCell(4);

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "Delete";
          deleteBtn.classList.add("action-button", "delete-button");
          deleteBtn.addEventListener("click", () =>
            deleteAgent(firestore, agent)
          );

          actionsCell.appendChild(deleteBtn);
        });
      },
      (err) => {
        console.error("Load agents error:", err);
        showToast("Unable to load agents", "error");
      }
    );
  }
}

async function deleteAgent(firestore, agent) {
  if (!confirm(`Delete agent "${agent.name}"?`)) return;

  try {
    // Delete the Firestore document
    await firestore.collection("agents").doc(agent.id).delete();
    showToast("Agent deleted", "success");

    // Note: Deleting Firebase Auth users requires admin SDK
    // This should ideally be done via Cloud Functions
    // For now, we're only deleting the Firestore document
    console.warn("Firebase Auth user not deleted - requires admin SDK");
  } catch (err) {
    console.error("Delete agent error:", err);
    showToast("Error deleting agent: " + err.message, "error");
  }
}