// js/modules/navigation.js
// Handles sidebar navigation & page title

let currentPageTitleEl;
let sidebar;
let sidebarToggle;

export function initNavigation() {
  currentPageTitleEl = document.getElementById("current-page-title");
  sidebar = document.querySelector(".sidebar");
  sidebarToggle = document.getElementById("sidebar-toggle");

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      const isOpen = sidebar.classList.toggle("open");
      document.body.classList.toggle("sidebar-open", isOpen);
    });
  }

  document.addEventListener("click", (e) => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile || !sidebar || !sidebar.classList.contains("open")) return;

    const clickedInsideSidebar = sidebar.contains(e.target);
    const clickedToggle = sidebarToggle && sidebarToggle.contains(e.target);

    if (!clickedInsideSidebar && !clickedToggle) {
      sidebar.classList.remove("open");
      document.body.classList.remove("sidebar-open");
    }
  });

  const routes = [
    { navId: "nav-dashboard", pageId: "dashboard-content" },
    { navId: "nav-properties", pageId: "properties-content" },
    { navId: "nav-plots", pageId: "plots-content" }, // Added Plots navigation
    { navId: "nav-agents", pageId: "agents-content" },
    { navId: "nav-commissions", pageId: "commissions-content" },
    { navId: "nav-clients", pageId: "clients-content" },
    { navId: "nav-sliders", pageId: "sliders-content" },
    { navId: "nav-gallery", pageId: "gallery-content" }
  ];

  routes.forEach(({ navId, pageId }) => {
    const navEl = document.getElementById(navId);
    if (!navEl) return;
    navEl.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(pageId);
    });
  });
}

export function showPage(pageId) {
  const sections = document.querySelectorAll(".content-section");
  sections.forEach((section) => section.classList.remove("active"));

  const target = document.getElementById(pageId);
  if (target) target.classList.add("active");

  if (currentPageTitleEl && target) {
    const titleEl = target.querySelector(".section-title");
    currentPageTitleEl.textContent = titleEl
      ? titleEl.textContent
      : pageId.replace("-content", "").replace(/^\w/, (c) => c.toUpperCase());
  }

  const navLinks = document.querySelectorAll(".sidebar nav ul li a");
  navLinks.forEach((link) => link.classList.remove("active"));
  const navId = `nav-${pageId.replace("-content", "")}`;
  const activeNav = document.getElementById(navId);
  if (activeNav) activeNav.classList.add("active");
}
