// script.js — multi-user versie voor jouw flashcards

const USERS_KEY = "flashcards_users_v1";
const CURRENT_USER_KEY = "flashcards_current_user";
const CURRENT_DECK_KEY = "flashcards_current_deck";

let currentUser = null; // object
let decks = []; // verwijzing naar currentUser.decks
let currentDeckId = null;
let studyIndex = 0;
let flipped = false;
let editCardId = null;
let studyMode = "all"; // all | fav | hard

// ---------- USER STORAGE ----------
function loadUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setCurrentUser(username) {
  if (username) {
    localStorage.setItem(CURRENT_USER_KEY, username);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

function getCurrentUserFromStorage() {
  const username = localStorage.getItem(CURRENT_USER_KEY);
  if (!username) return null;
  const users = loadUsers();
  return users.find((u) => u.username === username) || null;
}

// ---------- AUTH LOGIC ----------
function signup(username, password) {
  const users = loadUsers();
  if (users.some((u) => u.username === username)) {
    alert("Bestaat al.");
    return false;
  }
  const newUser = {
    username,
    password, // plaintext is ok voor local demo
    decks: [
      {
        id: "voorbeeld",
        name: "Oud boek voorbeeld",
        cards: [
          { id: "c1", q: "Wat is HTML?", a: "HyperText Markup Language", fav: false, hard: false },
          { id: "c2", q: "Hoofdstad van Italië?", a: "Rome", fav: true, hard: false },
          { id: "c3", q: "7 × 8 = ?", a: "56", fav: false, hard: true }
        ]
      }
    ]
  };
  users.push(newUser);
  saveUsers(users);
  currentUser = newUser;
  setCurrentUser(username);
  return true;
}

function login(username, password) {
  const users = loadUsers();
  const u = users.find((u) => u.username === username);
  if (!u) {
    alert("Onbekende gebruiker.");
    return false;
  }
  if (u.password !== password) {
    alert("Wachtwoord klopt niet.");
    return false;
  }
  currentUser = u;
  setCurrentUser(username);
  return true;
}

function logout() {
  currentUser = null;
  setCurrentUser(null);
  decks = [];
  currentDeckId = null;
  renderDeckList();
  renderStudy();
  renderCards();
  renderStats();
  renderAuthBox();
}

// ---------- DECK OPSLAAN VOOR USER ----------
function saveCurrentUser() {
  if (!currentUser) return;
  const users = loadUsers();
  const idx = users.findIndex((u) => u.username === currentUser.username);
  if (idx !== -1) {
    users[idx] = currentUser;
    saveUsers(users);
  }
}

// ---------- HELPERS ----------
function getDeck(id) {
  return decks.find((d) => d.id === id) || null;
}

function calcStats() {
  const totalDecks = decks ? decks.length : 0;
  let totalCards = 0;
  (decks || []).forEach((d) => (totalCards += d.cards.length));
  return { totalDecks, totalCards };
}

function renderStats() {
  const { totalDecks, totalCards } = calcStats();
  const elDecks = document.getElementById("stat-decks");
  const elCards = document.getElementById("stat-cards");
  const elLast = document.getElementById("stat-last");

  if (elDecks) elDecks.textContent = totalDecks;
  if (elCards) elCards.textContent = totalCards;
  if (elLast) {
    const deck = getDeck(currentDeckId);
    elLast.textContent = deck ? deck.name : "-";
  }
}

// ---------- AUTH UI ----------
function renderAuthBox() {
  const authBox = document.getElementById("user-auth");
  const infoBox = document.getElementById("user-info");
  const nameLabel = document.getElementById("user-name-label");

  if (!authBox || !infoBox) return;

  if (!currentUser) {
    authBox.classList.remove("hidden");
    infoBox.classList.add("hidden");
  } else {
    authBox.classList.add("hidden");
    infoBox.classList.remove("hidden");
    if (nameLabel) nameLabel.textContent = currentUser.username;
  }
}

// ---------- DECKLIST ----------
function renderDeckList() {
  const list = document.getElementById("deck-list");
  if (!list) return;

  list.innerHTML = "";
  if (!decks || decks.length === 0) {
    const li = document.createElement("li");
    li.textContent = currentUser ? "Geen decks" : "Login eerst";
    li.className = "deck-item";
    list.appendChild(li);
    return;
  }

  decks.forEach((deck) => {
    const li = document.createElement("li");
    li.className = "deck-item" + (deck.id === currentDeckId ? " active" : "");
    const nameSpan = document.createElement("span");
    nameSpan.textContent = deck.name;
    const countSpan = document.createElement("span");
    countSpan.textContent = deck.cards.length;
    countSpan.style.fontSize = ".6rem";

    li.appendChild(nameSpan);
    li.appendChild(countSpan);

    li.addEventListener("click", () => {
      currentDeckId = deck.id;
      localStorage.setItem(CURRENT_DECK_KEY, currentDeckId);
      studyIndex = 0;
      flipped = false;
      renderDeckList();
      renderStudy();
      renderCards();
      renderStats();
    });

    list.appendChild(li);
  });
}

// ---------- EDIT PAGINA LIST ----------
function renderCards() {
  const container = document.getElementById("card-list");
  if (!container) return;
  container.innerHTML = "";

  if (!currentUser) {
    container.innerHTML = "<p>Login om decks te bewerken.</p>";
    return;
  }

  const deck = getDeck(currentDeckId);
  if (!deck) {
    container.innerHTML = "<p>Geen deck gekozen.</p>";
    return;
  }

  deck.cards.forEach((card) => {
    const row = document.createElement("div");
    row.className = "card-row";

    const p = document.createElement("p");
    p.textContent = card.q;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const favBtn = document.createElement("button");
    favBtn.textContent = card.fav ? "★" : "☆";
    favBtn.className = "btn small";
    favBtn.addEventListener("click", () => {
      card.fav = !card.fav;
      saveCurrentUser();
      renderCards();
      renderStudy();
    });

    const hardBtn = document.createElement("button");
    hardBtn.textContent = card.hard ? "H" : "h";
    hardBtn.className = "btn small";
    hardBtn.addEventListener("click", () => {
      card.hard = !card.hard;
      saveCurrentUser();
      renderCards();
      renderStudy();
    });

    const editBtn = document.createElement("button");
    editBtn.textContent = "✎";
    editBtn.className = "btn small";
    editBtn.addEventListener("click", () => {
      openCardModal(deck.id, card.id);
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑";
    delBtn.className = "btn small btn-danger";
    delBtn.addEventListener("click", () => {
      deck.cards = deck.cards.filter((c) => c.id !== card.id);
      saveCurrentUser();
      renderCards();
      renderStudy();
      renderDeckList();
      renderStats();
    });

    actions.appendChild(favBtn);
    actions.appendChild(hardBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    row.appendChild(p);
    row.appendChild(actions);
    container.appendChild(row);
  });

  const editTitle = document.getElementById("edit-title");
  if (editTitle) {
    editTitle.textContent = deck ? "Deck: " + deck.name : "Deck";
  }
}

// ---------- STUDY ----------
function renderStudy() {
  const cardElem = document.getElementById("flip-card");
  const inner = document.getElementById("flip-card-inner");
  const title = document.getElementById("current-deck-title");

  if (!cardElem || !inner) return;

  if (!currentUser) {
    if (title) title.textContent = "Login om te oefenen";
    inner.querySelector(".flip-card-front").innerHTML =
      "<p class='question-text'>Geen gebruiker ingelogd.</p>";
    inner.querySelector(".flip-card-back").innerHTML =
      "<p class='answer-text'>---</p>";
    cardElem.classList.remove("flipped");
    renderStudy._lastList = [];
    return;
  }

  const deck = getDeck(currentDeckId);

  if (!deck || deck.cards.length === 0) {
    if (title) title.textContent = "Kies of maak een deck";
    inner.querySelector(".flip-card-front").innerHTML =
      "<p class='question-text'>Geen kaarten.</p>";
    inner.querySelector(".flip-card-back").innerHTML =
      "<p class='answer-text'>---</p>";
    cardElem.classList.remove("flipped");
    renderStudy._lastList = [];
    return;
  }

  const filtered = deck.cards.filter((c) => {
    if (studyMode === "fav") return c.fav === true;
    if (studyMode === "hard") return c.hard === true;
    return true;
  });

  if (filtered.length === 0) {
    if (title) title.textContent = "Geen kaarten in deze selectie";
    inner.querySelector(".flip-card-front").innerHTML =
      "<p class='question-text'>Maak eerst een kaart met dit label.</p>";
    inner.querySelector(".flip-card-back").innerHTML =
      "<p class='answer-text'>---</p>";
    cardElem.classList.remove("flipped");
    renderStudy._lastList = [];
    return;
  }

  if (studyIndex >= filtered.length) studyIndex = 0;
  const card = filtered[studyIndex];

  if (title) title.textContent = "Deck: " + deck.name + " (" + filtered.length + ")";

  inner.querySelector(".flip-card-front").innerHTML =
    "<p class='question-text'>" + card.q + "</p>";
  inner.querySelector(".flip-card-back").innerHTML =
    "<p class='answer-text'>" + card.a + "</p>";

  if (flipped) cardElem.classList.add("flipped");
  else cardElem.classList.remove("flipped");

  renderStudy._lastList = filtered;
}

// ---------- MODAL ----------
function openCardModal(deckId, cardId) {
  const backdrop = document.getElementById("modal-backdrop");
  if (!backdrop) return;

  if (deckId) currentDeckId = deckId;
  const deck = getDeck(currentDeckId);
  if (!deck) return;

  const qEl = document.getElementById("q");
  const aEl = document.getElementById("a");
  editCardId = null;

  if (cardId) {
    const card = deck.cards.find((c) => c.id === cardId);
    if (card) {
      qEl.value = card.q;
      aEl.value = card.a;
      editCardId = cardId;
    }
  } else {
    qEl.value = "";
    aEl.value = "";
  }

  backdrop.classList.remove("hidden");
}

function closeCardModal() {
  const backdrop = document.getElementById("modal-backdrop");
  if (backdrop) backdrop.classList.add("hidden");
}

// ---------- SETUP ----------
function setup() {
  // probeer user uit opslag
  currentUser = getCurrentUserFromStorage();

  if (currentUser) {
    decks = currentUser.decks || [];
    const savedDeck = localStorage.getItem(CURRENT_DECK_KEY);
    if (savedDeck) currentDeckId = savedDeck;
    else if (decks[0]) currentDeckId = decks[0].id;
  } else {
    decks = [];
  }

  renderAuthBox();
  renderDeckList();
  renderStudy();
  renderCards();
  renderStats();

  // auth knoppen
  const btnLogin = document.getElementById("btn-login");
  const btnSignup = document.getElementById("btn-signup");
  const btnLogout = document.getElementById("btn-logout");

  if (btnLogin) {
    btnLogin.addEventListener("click", () => {
      const user = document.getElementById("auth-username").value.trim();
      const pass = document.getElementById("auth-password").value.trim();
      if (!user || !pass) return;
      if (login(user, pass)) {
        decks = currentUser.decks || [];
        if (decks[0]) currentDeckId = decks[0].id;
        renderAuthBox();
        renderDeckList();
        renderStudy();
        renderCards();
        renderStats();
      }
    });
  }

  if (btnSignup) {
    btnSignup.addEventListener("click", () => {
      const user = document.getElementById("auth-username").value.trim();
      const pass = document.getElementById("auth-password").value.trim();
      if (!user || !pass) return;
      if (signup(user, pass)) {
        decks = currentUser.decks || [];
        if (decks[0]) currentDeckId = decks[0].id;
        renderAuthBox();
        renderDeckList();
        renderStudy();
        renderCards();
        renderStats();
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      logout();
      renderAuthBox();
    });
  }

  // deck toevoegen
  const deckAddBtn = document.getElementById("deck-add");
  if (deckAddBtn) {
    deckAddBtn.addEventListener("click", () => {
      if (!currentUser) {
        alert("Login eerst.");
        return;
      }
      const inp = document.getElementById("deck-name");
      const name = inp.value.trim();
      if (!name) return;
      const newDeck = {
        id: "deck-" + Date.now(),
        name,
        cards: []
      };
      decks.push(newDeck);
      currentDeckId = newDeck.id;
      inp.value = "";
      saveCurrentUser();
      renderDeckList();
      renderStudy();
      renderCards();
      renderStats();
    });
  }

  // nieuwe kaart
  const addBtn = document.getElementById("btn-add");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      if (!currentUser) {
        alert("Login eerst.");
        return;
      }
      if (!currentDeckId && decks.length > 0) currentDeckId = decks[0].id;
      openCardModal(currentDeckId, null);
    });
  }

  // modal knoppen
  const modalCancel = document.getElementById("modal-cancel");
  if (modalCancel) modalCancel.addEventListener("click", closeCardModal);

  const modalBackdrop = document.getElementById("modal-backdrop");
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target.id === "modal-backdrop") closeCardModal();
    });
  }

  const modalSave = document.getElementById("modal-save");
  if (modalSave) {
    modalSave.addEventListener("click", () => {
      if (!currentUser) return;
      const deck = getDeck(currentDeckId);
      if (!deck) return;

      const q = document.getElementById("q").value.trim();
      const a = document.getElementById("a").value.trim();
      if (!q || !a) return;

      if (editCardId) {
        const card = deck.cards.find((c) => c.id === editCardId);
        if (card) {
          card.q = q;
          card.a = a;
        }
      } else {
        deck.cards.push({
          id: "card-" + Date.now(),
          q,
          a,
          fav: false,
          hard: false
        });
      }

      saveCurrentUser();
      renderCards();
      renderStudy();
      renderDeckList();
      renderStats();
      closeCardModal();
    });
  }

  // study controls
  const nextBtn = document.getElementById("study-next");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const list = renderStudy._lastList || [];
      if (list.length === 0) return;
      studyIndex = (studyIndex + 1) % list.length;
      flipped = false;
      renderStudy();
    });
  }

  const prevBtn = document.getElementById("study-prev");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const list = renderStudy._lastList || [];
      if (list.length === 0) return;
      studyIndex = (studyIndex - 1 + list.length) % list.length;
      flipped = false;
      renderStudy();
    });
  }

  const flipBtn = document.getElementById("study-flip");
  if (flipBtn) {
    flipBtn.addEventListener("click", () => {
      flipped = !flipped;
      const cardElem = document.getElementById("flip-card");
      if (cardElem) cardElem.classList.toggle("flipped", flipped);
    });
  }

  const cardElem = document.getElementById("flip-card");
  if (cardElem) {
    cardElem.addEventListener("click", () => {
      flipped = !flipped;
      cardElem.classList.toggle("flipped", flipped);
    });
  }

  // filters
  document.querySelectorAll(".study-mode").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".study-mode").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      studyMode = btn.dataset.mode;
      studyIndex = 0;
      flipped = false;
      renderStudy();
    });
  });

  // alles wissen
  const clearBtn = document.getElementById("btn-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!currentUser) return;
      if (!confirm("Alles verwijderen voor deze gebruiker?")) return;
      currentUser.decks = [];
      decks = currentUser.decks;
      currentDeckId = null;
      saveCurrentUser();
      renderDeckList();
      renderStudy();
      renderCards();
      renderStats();
    });
  }

  // “bewerk dit deck”
  const btnEditDeck = document.getElementById("btn-edit-deck");
  if (btnEditDeck) {
    btnEditDeck.addEventListener("click", () => {
      if (!currentUser) {
        alert("Login eerst.");
        return;
      }
      if (!currentDeckId) {
        alert("Kies eerst een deck.");
        return;
      }
      localStorage.setItem(CURRENT_DECK_KEY, currentDeckId);
      window.location.href = "edit.html";
    });
  }

  const linkEdit = document.getElementById("link-edit");
  if (linkEdit) {
    linkEdit.addEventListener("click", (e) => {
      e.preventDefault();
      if (!currentUser) {
        alert("Login eerst.");
        return;
      }
      if (!currentDeckId) {
        alert("Kies eerst een deck.");
        return;
      }
      localStorage.setItem(CURRENT_DECK_KEY, currentDeckId);
      window.location.href = "edit.html";
    });
  }
}

document.addEventListener("DOMContentLoaded", setup);
