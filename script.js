"use strict";

// Only product IDs are stored: no names, email addresses, or allergy notes.
const products = [
  { id: "signature-loaf", name: "Signature Loaf" },
  { id: "pastries", name: "Pastries" },
  { id: "cakes", name: "Celebration Cakes" }
];
const storageKey = "northStarBakeryFavorites";
let favorites = [];
let storageAvailable = true;

function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(saved)) throw new Error("Invalid saved favorites");
    favorites = [...new Set(saved.filter(id => products.some(product => product.id === id)))];
  } catch (error) {
    favorites = [];
    // A damaged value can be replaced by the next save. Blocked storage cannot.
    storageAvailable = !(error instanceof DOMException);
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(favorites));
    storageAvailable = true;
  } catch (error) {
    storageAvailable = false;
  }
}

function selectedProducts() {
  return products.filter(product => favorites.includes(product.id));
}

function renderFavorites(message = "") {
  const options = document.getElementById("favorite-options");
  if (!options) return;
  options.replaceChildren();
  products.forEach(product => {
    const selected = favorites.includes(product.id);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.product = product.id;
    button.setAttribute("aria-pressed", String(selected));
    button.textContent = `${selected ? "Remove" : "Save"} ${product.name}`;
    button.addEventListener("click", () => toggleFavorite(product.id));
    options.append(button);
  });
  const list = document.getElementById("favorites-list");
  list.replaceChildren();
  const names = selectedProducts().map(product => product.name);
  (names.length ? names : ["No favorites saved yet."]).forEach(name => {
    const item = document.createElement("li");
    item.textContent = name;
    list.append(item);
  });
  document.getElementById("clear-favorites").disabled = favorites.length === 0;
  document.getElementById("favorites-status").textContent = storageAvailable
    ? (message || (names.length ? `Restored ${names.length} saved favorite${names.length === 1 ? "" : "s"} from this browser.` : "Choose a product to start your favorites."))
    : "Browser storage is unavailable. Favorites can be used on this page but may not be remembered.";
}

function toggleFavorite(id) {
  if (!products.some(product => product.id === id)) return;
  const exists = favorites.includes(id);
  favorites = exists ? favorites.filter(item => item !== id) : [...favorites, id];
  saveFavorites();
  renderFavorites(`${products.find(product => product.id === id).name} ${exists ? "removed from" : "added to"} your favorites.`);
  // Replacing the buttons must not lose the keyboard user's focus.
  document.querySelector(`[data-product="${id}"]`).focus();
}

function clearFavorites() {
  favorites = [];
  saveFavorites();
  renderFavorites("Your favorites have been cleared.");
  document.querySelector("[data-product]").focus();
}

function renderContactFavorites() {
  const summary = document.getElementById("saved-favorites");
  if (!summary) return;
  const names = selectedProducts().map(product => product.name);
  summary.textContent = names.length ? `Remembered from your Products page: ${names.join(", ")}.` : "No favorites saved yet. Visit the Products page to choose products.";
  const button = document.getElementById("use-favorites");
  button.hidden = names.length === 0;
  button.onclick = () => {
    const details = document.getElementById("details");
    const line = `Interested in: ${names.join(", ")}.`;
    if (!details.value.includes(line)) {
      const combined = details.value ? `${details.value}\n${line}` : line;
      if (combined.length > 1000) {
        setFieldError("details", "Shorten your details before adding favorites; the maximum is 1000 characters.");
        details.focus();
        return;
      }
      details.value = combined;
    }
    validateField("details");
    details.focus();
  };
}

const validators = {
  name: value => !value.trim() ? "Enter your name." : value.trim().length > 100 ? "Keep your name within 100 characters." : "",
  email: value => !value.trim() ? "Enter your email address." : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? "Enter an email address like name@example.com." : "",
  "request-type": value => !["pre-order", "question"].includes(value) ? "Choose a request type." : "",
  "pickup-date": value => {
    if (!value && document.getElementById("request-type").value === "pre-order") return "Choose a pickup date for your pre-order.";
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (Number.isNaN(date.getTime()) || date < today) return "Choose today or a future pickup date.";
    return date.getDay() === 1 ? "The bakery is closed on Mondays. Choose another day." : "";
  },
  details: value => value.trim().length < 10 ? "Enter at least 10 characters describing your request." : value.length > 1000 ? "Keep your request within 1000 characters." : "",
  allergies: value => value.length > 500 ? "Keep allergy notes within 500 characters." : ""
};

function setFieldError(id, message) {
  document.getElementById(`${id}-error`).textContent = message;
  document.getElementById(id).setAttribute("aria-invalid", String(Boolean(message)));
}

function validateField(id) {
  const message = validators[id](document.getElementById(id).value);
  setFieldError(id, message);
  return !message;
}

function initializeForm() {
  const form = document.getElementById("practice-form");
  if (!form) return;
  // Disable browser popups only after the custom feedback handlers are installed.
  Object.keys(validators).forEach(id => {
    const input = document.getElementById(id);
    const describedBy = input.getAttribute("aria-describedby") || "";
    input.setAttribute("aria-describedby", `${describedBy} ${id}-error`.trim());
    input.addEventListener("input", () => {
      document.getElementById("form-status").textContent = "";
      if (input.hasAttribute("aria-invalid")) validateField(id);
    });
    input.addEventListener("blur", () => validateField(id));
  });
  document.getElementById("request-type").addEventListener("change", () => validateField("pickup-date"));
  form.addEventListener("submit", event => {
    event.preventDefault();
    const invalid = Object.keys(validators).filter(id => !validateField(id));
    const status = document.getElementById("form-status");
    if (invalid.length) {
      status.textContent = "Please correct the marked fields. Your entries have been kept.";
      document.getElementById(invalid[0]).focus();
    } else {
      status.textContent = "Practice request validated. This demonstration does not send an order to the bakery.";
      status.focus();
    }
  });
  form.noValidate = true;
}

loadFavorites();
renderFavorites();
renderContactFavorites();
initializeForm();
document.getElementById("clear-favorites")?.addEventListener("click", clearFavorites);
window.addEventListener("storage", event => {
  if (event.key === storageKey || event.key === null) {
    loadFavorites();
    renderFavorites();
    // Update choices without changing in-progress form text.
    renderContactFavorites();
  }
});
