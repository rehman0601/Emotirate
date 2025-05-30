const products = [
  { id: 1, name: "Coffee", image: "img1.png" },
  { id: 2, name: "Headphones", image: "img2.jpg" },
  { id: 3, name: "Keyboard", image: "img3.jpeg" }
];

const moods = [
  { emoji: "😡", label: "Frustrated" },
  { emoji: "😕", label: "Confused" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "🙂", label: "Okay" },
  { emoji: "😄", label: "Happy" }
];

let ratings = JSON.parse(localStorage.getItem("ratings")) || [];
let undoStack = [];

const productList = document.getElementById("product-list");
const reviewsModal = document.getElementById("reviewsModal");
const reviewsList = document.getElementById("reviewsList");
const undoBtn = document.getElementById("undoBtn");

function saveRatings() {
  localStorage.setItem("ratings", JSON.stringify(ratings));
}

function renderProducts() {
  productList.innerHTML = "";
  products.forEach(product => {
    const existing = ratings.find(r => r.productId === product.id);
    const selectedMood = existing?.mood || null;

    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-image">
        <img src="assets/${product.image}" alt="${product.name}" class="product-img">
      </div>
      <h3>${product.name}</h3>
      <div class="emoji-picker">
        ${moods.map(m => `
          <span class="emoji ${selectedMood === m.emoji ? 'selected' : ''}" 
                data-id="${product.id}" 
                data-emoji="${m.emoji}" 
                title="${m.label}">${m.emoji}</span>
        `).join('')}
      </div>
      <div>${selectedMood ? moods.find(m => m.emoji === selectedMood).label : ''}</div>
      <button class="submitBtn" ${selectedMood ? '' : 'disabled'}>Submit</button>
    `;
    productList.appendChild(card);

    const emojis = card.querySelectorAll(".emoji");
    const btn = card.querySelector(".submitBtn");
    let selected = selectedMood;

    emojis.forEach(emoji => {
      emoji.addEventListener("click", () => {
        emojis.forEach(e => e.classList.remove("selected"));
        emoji.classList.add("selected");
        selected = emoji.dataset.emoji;
        btn.disabled = false;
      });
    });

    btn.addEventListener("click", () => {
      const productId = product.id;
      const existingIndex = ratings.findIndex(r => r.productId === productId);
      if (existingIndex !== -1) {
        undoStack.push(ratings[existingIndex]);
        ratings.splice(existingIndex, 1);
      } else {
        undoStack.push(null);
      }
      ratings.push({
        productId,
        mood: selected,
        timestamp: new Date().toISOString()
      });
      saveRatings();
      renderProducts();
      updateUndoBtn();
    });
  });
}

function updateUndoBtn() {
  undoBtn.disabled = undoStack.length === 0;
}

undoBtn.addEventListener("click", () => {
  const last = undoStack.pop();
  if (last === null) {
    ratings.pop();
  } else {
    const idx = ratings.findIndex(r => r.productId === last.productId);
    if (idx !== -1) ratings.splice(idx, 1);
    ratings.push(last);
  }
  saveRatings();
  renderProducts();
  updateUndoBtn();
});

document.getElementById("viewReviewsBtn").addEventListener("click", () => {
  reviewsModal.classList.remove("hidden");
  renderReviews();
});

document.getElementById("closeReviews").addEventListener("click", () => {
  reviewsModal.classList.add("hidden");
});

function renderReviews() {
  if (ratings.length === 0) {
    reviewsList.innerHTML = "<p>No reviews yet.</p>";
    return;
  }
  reviewsList.innerHTML = ratings.map(r => {
    const product = products.find(p => p.id === r.productId);
    const mood = moods.find(m => m.emoji === r.mood);
    return `<p><strong>${product.name}:</strong> ${mood.emoji} ${mood.label} <br/><small>${new Date(r.timestamp).toLocaleString()}</small></p>`;
  }).join('');
}

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(ratings, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ratings.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Reset all ratings?")) {
    ratings = [];
    undoStack = [];
    saveRatings();
    renderProducts();
    updateUndoBtn();
  }
});

document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
});

function loadTheme() {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }
}

loadTheme();
renderProducts();
updateUndoBtn();
