// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCA9QG6uLwCB01kkMBUM64rfC1ARVHVnLE",
  authDomain: "emaamconstructions-e74eb.firebaseapp.com",
  projectId: "emaamconstructions-e74eb",
  storageBucket: "emaamconstructions-e74eb.firebasestorage.app",
  messagingSenderId: "740421773220",
  appId: "1:740421773220:web:3437e1411606fb94020331",
  measurementId: "G-C706BKR85T"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const firestore = firebase.firestore();

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.querySelector('.dashboard-container');
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginErrorMessage = document.getElementById('login-error-message');
const logoutButton = document.getElementById('logout-button');
const currentPageTitle = document.getElementById('current-page-title');

const navDashboard = document.getElementById('nav-dashboard');
const navProperties = document.getElementById('nav-properties');
const navAgents = document.getElementById('nav-agents');
const navClients = document.getElementById('nav-clients');

const dashboardContent = document.getElementById('dashboard-content');
const propertiesContent = document.getElementById('properties-content');
const agentsContent = document.getElementById('agents-content');
const clientsContent = document.getElementById('clients-content');

const createPropertyForm = document.getElementById('create-property-form');
const propertyNameInput = document.getElementById('property-name');
const propertyLocationInput = document.getElementById('property-location'); // Hidden input for location string
const createPropertyLatInput = document.getElementById('create-property-lat');
const createPropertyLonInput = document.getElementById('create-property-lon');
const propertyImagesInput = document.getElementById('property-images');
const propertyPlotsInput = document.getElementById('property-plots');
const plotPriceInput = document.getElementById('plot-price');
const propertiesTableBody = document.getElementById('properties-table-body');

const editPropertyContainer = document.getElementById('edit-property-container');
const editPropertyForm = document.getElementById('edit-property-form');
const editPropertyIdInput = document.getElementById('edit-property-id');
const editPropertyNameInput = document.getElementById('edit-property-name');
const editPropertyLocationInput = document.getElementById('edit-property-location'); // Hidden input for location string
const editPropertyLatInput = document.getElementById('edit-property-lat');
const editPropertyLonInput = document.getElementById('edit-property-lon');
const editPropertyImagesInput = document.getElementById('edit-property-images');
const currentPropertyImagesDiv = document.getElementById('current-property-images');
const editPropertyPlotsInput = document.getElementById('edit-property-plots');
const editPlotPriceInput = document.getElementById('edit-plot-price');
const cancelEditPropertyButton = document.getElementById('cancel-edit-property');

// Map instances
let createMap;
let createMarker;
let editMap;
let editMarker;

// Firebase Storage
const storage = firebase.storage();
const storageRef = storage.ref();

// --- Map Utility Functions ---
function initializeMap(mapId, latInput, lonInput, initialLat = 20.5937, initialLon = 78.9629) {
    const map = L.map(mapId).setView([initialLat, initialLon], 5); // Centered on India
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let marker = L.marker([initialLat, initialLon]).addTo(map);

    map.on('click', function(e) {
        const { lat, lng } = e.latlng;
        latInput.value = lat.toFixed(6);
        lonInput.value = lng.toFixed(6);
        marker.setLatLng([lat, lng]);
        // Optionally, reverse geocode to get a human-readable location
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
            .then(response => response.json())
            .then(data => {
                if (mapId === 'create-property-map') {
                    propertyLocationInput.value = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                } else if (mapId === 'edit-property-map') {
                    editPropertyLocationInput.value = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                }
            })
            .catch(error => console.error("Error during reverse geocoding:", error));
    });

    return { map, marker };
}

// --- Initialize Maps on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize create property map
    const createMapElements = initializeMap('create-property-map', createPropertyLatInput, createPropertyLonInput);
    createMap = createMapElements.map;
    createMarker = createMapElements.marker;

    // Initialize edit property map (initially hidden, so it might need a refresh when shown)
    const editMapElements = initializeMap('edit-property-map', editPropertyLatInput, editPropertyLonInput);
    editMap = editMapElements.map;
    editMarker = editMapElements.marker;

    // Existing auth state check and data loading
    auth.onAuthStateChanged(user => {
        console.log("Auth state changed. User:", user);
        if (user) {
            loginContainer.style.display = 'none';
            dashboardContainer.style.display = 'flex';
            try {
                loadDashboardData();
                loadProperties();
                loadAgents();
                loadClientsAndTransactions();
                showPage('dashboard-content'); // Ensure a default page is shown
            } catch (error) {
                console.error("Error loading dashboard data:", error);
                // Potentially log out or show an error message to the user
                auth.signOut(); 
            }
        } else {
            loginContainer.style.display = 'flex';
            dashboardContainer.style.display = 'none';
        }
    });
});

const createAgentForm = document.getElementById('create-agent-form');
const agentNameInput = document.getElementById('agent-name');
const agentEmailInput = document.getElementById('agent-email');
const agentPasswordInput = document.getElementById('agent-password');
const agentsTableBody = document.getElementById('agents-table-body');

const clientsTransactionsTableBody = document.getElementById('clients-transactions-table-body');

// --- Utility Functions ---
function showPage(pageId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    currentPageTitle.textContent = document.getElementById(pageId).querySelector('.section-title') ? document.getElementById(pageId).querySelector('.section-title').textContent : pageId.replace('-content', '').replace(/^\w/, (c) => c.toUpperCase());

    const navLinks = document.querySelectorAll('.sidebar nav ul li a');
    navLinks.forEach(link => link.classList.remove('active'));
    document.getElementById(`nav-${pageId.replace('-content', '')}`).classList.add('active');
}


if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;

        try {
            await auth.signInWithEmailAndPassword(email, password);
            loginErrorMessage.textContent = '';
        } catch (error) {
            loginErrorMessage.textContent = error.message;
        }
    });
}


if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            await auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    });
}

// --- Navigation ---
if (navDashboard) navDashboard.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('dashboard-content');
});
if (navProperties) navProperties.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('properties-content');
    // Invalidate map size to ensure it renders correctly when the tab becomes active
    if (createMap) {
        setTimeout(() => {
            createMap.invalidateSize();
            // Center map and marker if no coordinates are set
            if (!createPropertyLatInput.value || !createPropertyLonInput.value) {
                createMap.setView([20.5937, 78.9629], 5);
                createMarker.setLatLng([20.5937, 78.9629]);
            }
        }, 100); // Small delay to ensure the div is visible
    }
});
if (navAgents) navAgents.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('agents-content');
});
if (navClients) navClients.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('clients-content');
});

// --- Dashboard Data Loading ---
async function loadDashboardData() {
    // Total Properties
    firestore.collection('properties').onSnapshot(snapshot => {
        let totalProperties = 0;
        let totalPlots = 0;
        let availablePlots = 0;
        snapshot.forEach(doc => {
            const prop = doc.data();
            totalProperties++;
            totalPlots += prop.totalPlots;
            availablePlots += prop.availablePlots;
        });
        document.getElementById('total-properties').textContent = totalProperties;
    });

    // Total Agents
    firestore.collection('agents').onSnapshot(snapshot => {
        document.getElementById('total-agents').textContent = snapshot.size;
    });

    // Total Clients
    firestore.collection('clients').onSnapshot(snapshot => {
        document.getElementById('total-clients').textContent = snapshot.size;
    });

    // Plots Sold and Recent Activity
    firestore.collection('transactions').onSnapshot(snapshot => {
        const transactions = [];
        snapshot.forEach(doc => {
            transactions.push(doc.data());
        });
        document.getElementById('plots-sold').textContent = transactions.length;
        displayRecentActivity(transactions);
    });
}

function displayRecentActivity(transactions) {
    const activityBody = document.getElementById('recent-activity-body');
    activityBody.innerHTML = '';
    if (!transactions) {
        activityBody.innerHTML = '<tr><td colspan="3">No recent activity.</td></tr>';
        return;
    }

    const sortedTransactions = Object.values(transactions).sort((a, b) => new Date(b.dateSold) - new Date(a.dateSold));
    const recentFive = sortedTransactions.slice(0, 5); // Display up to 5 recent activities

    if (recentFive.length === 0) {
        activityBody.innerHTML = '<tr><td colspan="3">No recent activity.</td></tr>';
        return;
    }

    recentFive.forEach(transaction => {
        const row = activityBody.insertRow();
        row.insertCell(0).textContent = new Date(transaction.dateSold).toLocaleDateString();
        row.insertCell(1).textContent = `Plot ${transaction.plotNumber} sold in ${transaction.propertyName}`;
        row.insertCell(2).textContent = transaction.agentName;
    });
}


// --- Image Upload Utility ---
async function uploadImages(files, propertyId) {
    const imageUrls = [];
    for (const file of files) {
        const imageRef = storageRef.child(`property_images/${propertyId}/${file.name}`);
        await imageRef.put(file);
        const url = await imageRef.getDownloadURL();
        imageUrls.push(url);
    }
    return imageUrls;
}

// --- Property Management ---
if (createPropertyForm) {
    createPropertyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = propertyNameInput.value;
        const location = propertyLocationInput.value;
        const lat = parseFloat(createPropertyLatInput.value);
        const lon = parseFloat(createPropertyLonInput.value);
        const totalPlots = parseInt(propertyPlotsInput.value);
        const defaultPrice = parseFloat(plotPriceInput.value);
        const images = propertyImagesInput.files;

        // Basic validation for map coordinates
        if (isNaN(lat) || isNaN(lon) || !location) {
            alert('Please select a location on the map.');
            return;
        }

        try {
            const newPropertyRef = await firestore.collection('properties').add({
                name,
                location,
                latitude: lat,
                longitude: lon,
                totalPlots,
                availablePlots: totalPlots,
                defaultPrice,
                imageUrls: [], // Initialize with empty array
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const propertyId = newPropertyRef.id;

            // Upload images if any
            if (images.length > 0) {
                const imageUrls = await uploadImages(images, propertyId);
                await newPropertyRef.update({ imageUrls });
            }

            const plotsBatch = firestore.batch();
            for (let i = 1; i <= totalPlots; i++) {
                const plotRef = firestore.collection('properties').doc(propertyId).collection('plots').doc(String(i));
                plotsBatch.set(plotRef, {
                    plotNumber: i,
                    price: defaultPrice,
                    status: 'available', // 'available', 'sold'
                    clientId: null,
                    agentId: null
                });
            }
            await plotsBatch.commit();

            alert('Property created successfully!');
            createPropertyForm.reset();
            createMarker.setLatLng([20.5937, 78.9629]); // Reset map marker
            createPropertyLatInput.value = '';
            createPropertyLonInput.value = '';
            propertyLocationInput.value = '';
            propertyImagesInput.value = ''; // Clear file input
        } catch (error) {
            alert('Error creating property: ' + error.message);
            console.error("Error creating property:", error);
        }
    });
}

function loadProperties() {
    firestore.collection('properties').onSnapshot(snapshot => {
        propertiesTableBody.innerHTML = '';
        if (snapshot.empty) {
            propertiesTableBody.innerHTML = '<tr><td colspan="6">No properties found.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const property = doc.data();
            const row = propertiesTableBody.insertRow();
            row.insertCell(0).textContent = property.name;
            row.insertCell(1).textContent = property.location;
            row.insertCell(2).textContent = property.totalPlots;
            row.insertCell(3).textContent = property.availablePlots;
            row.insertCell(4).textContent = property.defaultPrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
            const actionsCell = row.insertCell(5);

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.classList.add('action-button', 'edit-button');
            editButton.addEventListener('click', () => editProperty(doc.id, property));
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('action-button', 'delete-button');
            deleteButton.addEventListener('click', () => deleteProperty(doc.id, property.imageUrls));
            actionsCell.appendChild(deleteButton);
        });
    });
}

async function editProperty(propertyId, property) {
    // Hide create form, show edit form
    createPropertyForm.parentElement.style.display = 'none';
    editPropertyContainer.style.display = 'block';

    // Populate form fields
    editPropertyIdInput.value = propertyId;
    editPropertyNameInput.value = property.name;
    editPropertyLocationInput.value = property.location || '';
    editPropertyLatInput.value = property.latitude || '';
    editPropertyLonInput.value = property.longitude || '';
    editPropertyPlotsInput.value = property.totalPlots;
    editPlotPriceInput.value = property.defaultPrice;

    // Clear previous images and display current ones
    currentPropertyImagesDiv.innerHTML = '';
    if (property.imageUrls && property.imageUrls.length > 0) {
        property.imageUrls.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.style.maxWidth = '100px';
            img.style.maxHeight = '100px';
            img.style.margin = '5px';
            currentPropertyImagesDiv.appendChild(img);
        });
    } else {
        currentPropertyImagesDiv.textContent = 'No images uploaded.';
    }

    // Update map
    const lat = property.latitude || 20.5937;
    const lon = property.longitude || 78.9629;
    editMap.setView([lat, lon], 10); // Zoom in a bit for editing
    editMarker.setLatLng([lat, lon]);
    editMap.invalidateSize(); // Important for hidden maps

    // Scroll to the edit form
    editPropertyContainer.scrollIntoView({ behavior: 'smooth' });
}

if (cancelEditPropertyButton) {
    cancelEditPropertyButton.addEventListener('click', () => {
        editPropertyContainer.style.display = 'none';
        createPropertyForm.parentElement.style.display = 'block';
        editPropertyForm.reset();
        currentPropertyImagesDiv.innerHTML = '';
        editMarker.setLatLng([20.5937, 78.9629]); // Reset map marker
        editPropertyLatInput.value = '';
        editPropertyLonInput.value = '';
        editPropertyLocationInput.value = '';
        editPropertyImagesInput.value = ''; // Clear file input
    });
}

if (editPropertyForm) {
    editPropertyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const propertyId = editPropertyIdInput.value;
        const name = editPropertyNameInput.value;
        const location = editPropertyLocationInput.value;
        const lat = parseFloat(editPropertyLatInput.value);
        const lon = parseFloat(editPropertyLonInput.value);
        const totalPlots = parseInt(editPropertyPlotsInput.value);
        const defaultPrice = parseFloat(editPlotPriceInput.value);
        const newImages = editPropertyImagesInput.files;

        try {
            let imageUrls = [];
            // Retain existing images if no new images are uploaded
            const existingProperty = await firestore.collection('properties').doc(propertyId).get();
            if (existingProperty.exists) {
                imageUrls = existingProperty.data().imageUrls || [];
            }

            // Upload new images
            if (newImages.length > 0) {
                const uploadedUrls = await uploadImages(newImages, propertyId);
                imageUrls = [...imageUrls, ...uploadedUrls];
            }

            await firestore.collection('properties').doc(propertyId).update({
                name,
                location,
                latitude: lat,
                longitude: lon,
                totalPlots,
                defaultPrice,
                imageUrls,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert('Property updated successfully!');
            cancelEditPropertyButton.click(); // Simulate click to reset form and hide
        } catch (error) {
            alert('Error updating property: ' + error.message);
            console.error("Error updating property:", error);
        }
    });
}

async function deleteProperty(propertyId, imageUrls) {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
        return;
    }

    try {
        // Delete images from storage
        if (imageUrls && imageUrls.length > 0) {
            for (const url of imageUrls) {
                const imageRef = storage.refFromURL(url);
                await imageRef.delete().catch(error => console.warn("Error deleting image from storage:", error));
            }
        }

        // Delete all plots subcollection
        const plotsSnapshot = await firestore.collection('properties').doc(propertyId).collection('plots').get();
        const deletePlotsBatch = firestore.batch();
        plotsSnapshot.forEach(doc => {
            deletePlotsBatch.delete(doc.ref);
        });
        await deletePlotsBatch.commit();

        // Delete the property document
        await firestore.collection('properties').doc(propertyId).delete();

        alert('Property deleted successfully!');
    } catch (error) {
        alert('Error deleting property: ' + error.message);
        console.error("Error deleting property:", error);
    }
}

// --- Agent Management ---
if (createAgentForm) {
    createAgentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = agentNameInput.value;
        const email = agentEmailInput.value;
        const password = agentPasswordInput.value;

        try {
            // Create user in Firebase Authentication
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const uid = userCredential.user.uid;

            // Store agent details in Firestore
            await firestore.collection('users').doc(uid).set({
                name,
                email,
                role: 'agent', // Assign a role for differentiation
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await firestore.collection('agents').doc(uid).set({
                name,
                email,
                uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert('Agent created successfully!');
            createAgentForm.reset();
        } catch (error) {
            alert('Error creating agent: ' + error.message);
            console.error("Error creating agent:", error);
        }
    });
}

function loadAgents() {
    firestore.collection('agents').onSnapshot(snapshot => {
        agentsTableBody.innerHTML = '';
        if (snapshot.empty) {
            agentsTableBody.innerHTML = '<tr><td colspan="4">No agents found.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const agent = doc.data();
            const row = agentsTableBody.insertRow();
            row.insertCell(0).textContent = agent.name;
            row.insertCell(1).textContent = agent.email;
            // Placeholder for properties managed - requires more complex logic
            row.insertCell(2).textContent = 'N/A';
            const actionsCell = row.insertCell(3);
            actionsCell.textContent = 'No actions yet';
        });
    });
}

// --- Clients and Transactions Viewing ---
function loadClientsAndTransactions() {
    firestore.collection('transactions').onSnapshot(snapshot => {
        clientsTransactionsTableBody.innerHTML = '';
        if (snapshot.empty) {
            clientsTransactionsTableBody.innerHTML = '<tr><td colspan="6">No clients or transactions found.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const transaction = doc.data();
            const row = clientsTransactionsTableBody.insertRow();
            row.insertCell(0).textContent = transaction.clientName || 'N/A';
            row.insertCell(1).textContent = transaction.agentName || 'N/A';
            row.insertCell(2).textContent = transaction.propertyName || 'N/A';
            row.insertCell(3).textContent = transaction.plotNumber || 'N/A';
            row.insertCell(4).textContent = transaction.price ? transaction.price.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : 'N/A';
            row.insertCell(5).textContent = transaction.dateSold ? new Date(transaction.dateSold.toDate()).toLocaleDateString() : 'N/A';
        });
    });
}
