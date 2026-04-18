// js/app.js
// Main entry: init firebase, auth, navigation & feature modules

import { initFirebase } from "./firebaseConfig.js";
import { initToast } from "./utils/toast.js";

import { initNavigation, showPage } from "./modules/navigation.js";
import { initAuth } from "./modules/auth.js";
import { initDashboard } from "./modules/dashboard.js";
import { initProperties } from "./modules/properties.js";
import { initPlots } from "./modules/plots.js"; // New import for plots module
import { initAgents } from "./modules/agents.js";
import { initClients } from "./modules/clients.js";
import { initSliders } from "./modules/sliders.js";
import { initGallery } from "./modules/gallery.js";
import { initCommissions } from "./modules/commissions.js";


document.addEventListener("DOMContentLoaded", () => {
  const { auth, firestore, storage } = initFirebase();
  initToast();
  initNavigation();
  initAuth(auth);

  const loginContainer = document.getElementById("login-container");
  const dashboardContainer = document.querySelector(".dashboard-container");

  auth.onAuthStateChanged((user) => {
    if (user) {
      if (loginContainer) loginContainer.style.display = "none";
      if (dashboardContainer) dashboardContainer.style.display = "flex";



      initDashboard(firestore);
      initProperties(firestore);
      initPlots(firestore); // Initialize plots module
      initAgents(firestore, auth);
      initClients(firestore);
      initSliders(firestore);
      initGallery(firestore);
      initCommissions(firestore);

      showPage("dashboard-content");
    } else {
      if (loginContainer) loginContainer.style.display = "flex";
      if (dashboardContainer) dashboardContainer.style.display = "none";
    }
  });
});
