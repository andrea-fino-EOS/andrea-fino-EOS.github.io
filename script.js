// ✅ METTI QUI L'URL DELL'APPS SCRIPT PUBBLICATO
const API_URL = "https://script.google.com/macros/s/AKfycbxSjgLskwkTDWvHNtIN0SY1X4E-wl_nF6cBGdaNLR_Dd_QtRdGW3m9VyU5qABhzgy6m/exec";

let currentUser = null;
let currentPass = null;
let myCourses = [];
let allCourses = [];

// DOM refs
const loginView = document.getElementById("login-view");
const dashView = document.getElementById("dashboard-view");

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

const userField = document.getElementById("user");
const passField = document.getElementById("pass");
const loginError = document.getElementById("login-error");

const usernameLabel = document.getElementById("username-label");

const badgeMieiCorsi = document.getElementById("badge-miei-corsi");

const myCoursesList = document.getElementById("my-courses-list");
const myCoursesEmpty = document.getElementById("my-courses-empty");

const availList = document.getElementById("available-courses-list");
const availEmpty = document.getElementById("available-courses-empty");

const catalogBody = document.getElementById("catalog-body");

const toastEl = document.getElementById("toast");

// Helpers UI
// COOKIE HELPERS
function setCookie(name, value) {
	localStorage.setItem(name, value);
}

function getCookie(name) {
  return localStorage.getItem(name);
}

function deleteCookie() {
	localStorage.clear();
}

function showLoader(message = "Caricamento in corso...") {
  const overlay = document.getElementById("loader-overlay");
  overlay.style.display = "flex";
  overlay.querySelector("p").textContent = message;
}

function hideLoader() {
  const overlay = document.getElementById("loader-overlay");
  overlay.style.display = "none";
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.style.display = "block";
  setTimeout(() => {
    toastEl.style.display = "none";
  }, 2500);
}

function formatDate(date) {
	var d = new Date(date),
		month = '' + (d.getMonth() + 1),
		day = '' + d.getDate(),
		year = d.getFullYear();

	if (month.length < 2) 
		month = '0' + month;
	if (day.length < 2) 
		day = '0' + day;

	return [year, month, day].join('-');
}

function renderDashboard() {
  // header
  usernameLabel.textContent = currentUser || "Utente";

  // My courses
  myCoursesList.innerHTML = "";
  if (myCourses.length === 0) {
    myCoursesEmpty.style.display = "block";
  } else {
    myCoursesEmpty.style.display = "none";
    myCourses.forEach(c => {
      const li = document.createElement("li");
      li.className = "course-item";

      li.innerHTML = `
        <div class="course-main">
          <div class="course-name">${c.description}</div>
        </div>
        <div class="course-meta">
          <div><strong>Iscrizione:</strong> ${c.type}</div>
          <div><strong>Data prenotazione:</strong> ${formatDate(c.bookingDate)}</div>
		  <div><strong>Stato:</strong> ${c.status}</div>
        </div>
      `;
      myCoursesList.appendChild(li);
    });
  }
  badgeMieiCorsi.textContent = myCourses.length;

  // Available courses = tutti i corsi meno quelli già presenti
  const mineNames = myCourses.map(c => c.corso);
  const availableCourses = allCourses.filter(name => !mineNames.includes(name));

  availList.innerHTML = "";
  if (availableCourses.length === 0) {
    availEmpty.style.display = "block";
  } else {
    availEmpty.style.display = "none";
    availableCourses.forEach(crs => {
	  let disabledButton = myCourses.filter(e => e.corseId === crs.id).length > 0;
	  
      const li = document.createElement("li");
      li.className = "course-item";

      li.innerHTML = `
        <div class="course-main">
          <div class="course-name">${crs.description}</div>
          <button class="book-btn" data-course-id="${crs.id}" data-course-name="${crs.description}" ${disabledButton ? "disabled" : ""}>Prenotati</button>
        </div>
        <div class="course-meta">
          <div>Richiedi iscrizione a questo corso</div>
        </div>
      `;
      availList.appendChild(li);
    });
  }

  // attach listeners ai bottoni Prenotati
  document.querySelectorAll(".book-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const courseName = btn.getAttribute("data-course-name");
      const courseId = btn.getAttribute("data-course-id");
      await prenotaCorso(currentUser, currentPass, courseId, courseName);
    });
  });
}

// API calls
async function getCourses(user, pass) {
const url = `${API_URL}?username=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&action=courses`;
  let resp;
  try {
      const requestOptions = {
        method: "GET"
      };
      resp = await fetch(url, requestOptions);
  } catch (err) {
    return [];
  }

  const data = await resp.json();
  return data.allCourses;
}

async function getBookings(user, pass) {
const url = `${API_URL}?username=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&action=bookings`;
  let resp;
  try {
      const requestOptions = {
        method: "GET"
      };
	  
      resp = await fetch(url, requestOptions);
  } catch (err) {
    return [];
  }

  const data = await resp.json();
  return  data.myBookings;
}

async function doLogin() {
  const user = userField.value.trim();
  const pass = passField.value.trim();

  if (!user || !pass) {
    loginError.textContent = "Inserisci user e password.";
    return;
  }
  
  showLoader("Autenticazione in corso...");

  // chiamata GET allo script
  const url = `${API_URL}?username=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&action=login`;
  let resp;
  try {
      const requestOptions = {
        method: "GET"
      };
      resp = await fetch(url, requestOptions);
	  data = await resp.json();
	  if (data.error)
		throw data.error;
  } catch (err) {
	hideLoader();
    loginError.textContent = "Connessione non riuscita.";
    return;
  }

  // salviamo stato locale
  currentUser = user;
  currentPass = pass;
  myCourses = await getBookings(user, pass);
  allCourses = await getCourses(user, pass);
  
  setCookie("user", user);
  setCookie("pass", pass);
  
  hideLoader();
  // mostra dashboard
  loginView.style.display = "none";
  dashView.style.display = "flex";

  // render contenuti
  renderDashboard();
  showToast("Accesso effettuato");
}

async function prenotaCorso(user, pass, courseId, corsoName) {
  showLoader("Prenotazione in corso...");
  
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        user: user,
		pass: pass,
        courseId: courseId,
      })
    });
    const out = await res.json();
    if (out.ok) {
      showToast(`Prenotazione registrata per "${corsoName}"`);

      // ricarichiamo i dati utente per riflettere subito la prenotazione
      await refreshUserData(user, pass);
    } else {
	  hideLoader();
      showToast("Errore nella prenotazione");
    }
  } catch (err) {
	hideLoader();
    showToast("Errore interno del server, contattare amministratore");
  }
}

async function refreshUserData(user, pass) {
  if (!currentUser) return;
  // Re-effettua la GET login con password vuota? -> No, ci serve ancora la password.
  // Semplice: conserviamo l'ultima password usata.
  // (Per semplicità la tengo in memoria JS)
  myCourses = await getBookings(user, pass);
  allCourses = await getCourses(user, pass);
  hideLoader();
  renderDashboard();
}

// event listeners
loginBtn.addEventListener("click", doLogin);
logoutBtn.addEventListener("click", () => {
  deleteCookie();
  currentUser = null;
  currentPass = null;
  myCourses = [];
  allCourses = [];
  passField.value = "";
  loginError.textContent = "";
  dashView.style.display = "none";
  loginView.style.display = "flex";
});

window.addEventListener("DOMContentLoaded", async () => {
  const savedUser = getCookie("user");
  const savedPass = getCookie("pass");

  if (savedUser && savedPass) {
    showLoader("Autenticazione in corso...");
    try {
      const url = `${API_URL}?username=${encodeURIComponent(savedUser)}&pass=${encodeURIComponent(savedPass)}&action=login`;
	  let resp;

	  const requestOptions = {
		method: "GET"
	  };
	  resp = await fetch(url, requestOptions);
	  data = await resp.json();
	  if (data.error)
		throw data.error;

	  // salviamo stato locale
	  currentUser = savedUser;
	  currentPass = savedPass;
	  myCourses = await getBookings(savedUser, savedPass);
	  allCourses = await getCourses(savedUser, savedPass);
	  
	  hideLoader();
	  // mostra dashboard
	  loginView.style.display = "none";
	  dashView.style.display = "flex";

	  // render contenuti
	  renderDashboard();
	  showToast("Bentornato 👋");
	} catch (err) {
      hideLoader();
    }
  }
});

