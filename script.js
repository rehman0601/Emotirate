
// ====== Data Setup ======
const products = [
  { id: 1, name: "Social Media" },
  { id: 2, name: "Video Streaming" },
  { id: 3, name: "Online Shopping" },
  { id: 4, name: "Gaming" },
  { id: 5, name: "News Websites" }
];

const moods = [
  { emoji: "😡", phrase: "Frustrated" },
  { emoji: "😕", phrase: "Confused" },
  { emoji: "😐", phrase: "Neutral" },
  { emoji: "🙂", phrase: "Okay" },
  { emoji: "😄", phrase: "Happy" }
];

// ====== State & Storage ======
let ratings = JSON.parse(localStorage.getItem('ratings')) || [];
let undoStack = [];

const ITEMS_PER_PAGE = 5;
let currentPage = 1;
let filteredReviews = [];

const productListEl = document.getElementById('product-list');
const reviewsModal = document.getElementById('reviewsModal');
const reviewsListEl = document.getElementById('reviewsList');
const paginationEl = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const undoBtn = document.getElementById('undoBtn');
const themeToggleBtn = document.getElementById('themeToggle');
const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetBtn');

function saveRatings() {
  localStorage.setItem('ratings', JSON.stringify(ratings));
}

// ====== Render Products & Emoji Pickers ======
function renderProducts() {
  productListEl.innerHTML = '';
  products.forEach(product => {
    const existingRating = ratings.find(r => r.productId === product.id);
    const selectedMood = existingRating ? existingRating.mood : null;

    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product.id;

    card.innerHTML = `
      <div class="product-name">${product.name}</div>
      <div class="emoji-picker" role="radiogroup" aria-label="Select mood for ${product.name}">
        ${moods.map(mood => `
          <span class="emoji" role="radio" aria-checked="${selectedMood === mood.emoji}" tabindex="0"
            data-emoji="${mood.emoji}" title="${mood.phrase}" aria-label="${mood.phrase}">${mood.emoji}</span>
        `).join('')}
      </div>
      <div class="mood-phrase" aria-live="polite">${selectedMood ? moods.find(m => m.emoji === selectedMood).phrase : ''}</div>
      <button class="submit-btn" disabled>Submit Rating</button>
    `;

    productListEl.appendChild(card);
  });

  addEmojiListeners();
}

function addEmojiListeners() {
  document.querySelectorAll('.product-card').forEach(card => {
    const emojis = card.querySelectorAll('.emoji');
    const moodPhraseEl = card.querySelector('.mood-phrase');
    const submitBtn = card.querySelector('.submit-btn');
    let selectedEmoji = null;

    emojis.forEach(emoji => {
      emoji.addEventListener('click', () => {
        emojis.forEach(e => {
          e.classList.remove('selected');
          e.setAttribute('aria-checked', 'false');
        });
        emoji.classList.add('selected');
        emoji.setAttribute('aria-checked', 'true');
        selectedEmoji = emoji.dataset.emoji;
        moodPhraseEl.textContent = moods.find(m => m.emoji === selectedEmoji).phrase;
        submitBtn.disabled = false;
      });
      emoji.addEventListener('keydown', e => {
        if(e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          emoji.click();
        }
      });
    });

    submitBtn.addEventListener('click', () => {
      if(!selectedEmoji) return;

      const productId = parseInt(card.dataset.id);
      const timestamp = new Date().toISOString();

      // Prevent duplicate: remove previous rating for this product
      const existingIndex = ratings.findIndex(r => r.productId === productId);
      if(existingIndex !== -1) {
        // Save to undo stack
        undoStack.push(ratings[existingIndex]);
        ratings.splice(existingIndex, 1);
      } else {
        undoStack.push(null);
      }

      ratings.push({ productId, mood: selectedEmoji, timestamp });
      saveRatings();

      submitBtn.disabled = true;
      renderProducts();
      updateUndoBtn();
      updateMoodDistribution();
    });
  });
}

// ====== Reviews Modal ======
document.getElementById('viewReviewsBtn').addEventListener('click', () => {
  openReviewsModal();
});

document.getElementById('closeReviews').addEventListener('click', () => {
  closeReviewsModal();
});

reviewsModal.addEventListener('click', e => {
  if(e.target === reviewsModal) closeReviewsModal();
});

function openReviewsModal() {
  searchInput.value = '';
  currentPage = 1;
  filteredReviews = [...ratings];
  renderReviewsPage();
  reviewsModal.classList.add('active');
  searchInput.focus();
}

function closeReviewsModal() {
  reviewsModal.classList.remove('active');
}

function renderReviewsPage() {
  let reviewsToShow = filteredReviews;

  const start = (currentPage -1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageReviews = reviewsToShow.slice(start, end);

  if(pageReviews.length === 0) {
    reviewsListEl.innerHTML = '<p>No reviews found.</p>';
  } else {
    reviewsListEl.innerHTML = pageReviews.map(r => {
      const product = products.find(p => p.id === r.productId);
      const mood = moods.find(m => m.emoji === r.mood);
      return `
        <div class="review-item" tabindex="0">
          <span class="review-emoji">${mood.emoji}</span>
          <strong>${product.name}:</strong> ${mood.phrase} 
          <br><small>${new Date(r.timestamp).toLocaleString()}</small>
        </div>
      `;
    }).join('');
  }

  renderPagination(reviewsToShow.length);
}

function renderPagination(totalItems) {
  const pages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if(pages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }
  let html = '';
  for(let i=1; i<=pages; i++) {
    html += `<button class="pagination-btn ${i===currentPage ? 'active' : ''}" aria-label="Go to page ${i}">${i}</button>`;
  }
  paginationEl.innerHTML = html;

  paginationEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.textContent);
      renderReviewsPage();
    });
  });
}

searchInput.addEventListener('input', () => {
  const term = searchInput.value.toLowerCase();
  filteredReviews = ratings.filter(r => {
    const product = products.find(p => p.id === r.productId).name.toLowerCase();
    const phrase = moods.find(m => m.emoji === r.mood).phrase.toLowerCase();
    return product.includes(term) || phrase.includes(term);
  });
  currentPage = 1;
  renderReviewsPage();
});

// ====== Undo Functionality ======
undoBtn.addEventListener('click', () => {
  if(undoStack.length === 0) return;

  const lastAction = undoStack.pop();
  if(lastAction === null) {
    // Last action was new rating, remove last rating
    ratings.pop();
  } else {
    // Last action was replacing a rating, restore it
    const replacedIndex = ratings.findIndex(r => r.productId === lastAction.productId);
    if(replacedIndex !== -1) ratings.splice(replacedIndex, 1);
    ratings.push(lastAction);
  }
  saveRatings();
  renderProducts();
  updateUndoBtn();
  updateMoodDistribution();
});

function updateUndoBtn() {
  undoBtn.disabled = undoStack.length === 0;
}

// ====== Export Data ======
exportBtn.addEventListener('click', () => {
  const dataStr = JSON.stringify(ratings, null, 2);
  const blob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'distraction-ratings.json';
  a.click();

  URL.revokeObjectURL(url);
});

// ====== Reset Data ======
resetBtn.addEventListener('click', () => {
  if(confirm('Are you sure you want to reset all ratings?')) {
    ratings = [];
    undoStack = [];
    saveRatings();
    renderProducts();
    updateUndoBtn();
    updateMoodDistribution();
  }
});

// ====== Theme Toggle ======
themeToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

function loadTheme() {
  const theme = localStorage.getItem('theme') || 'light';
  if(theme === 'dark') {
    document.body.classList.add('dark');
  }
}

// ====== Mood Distribution Chart (Bonus Visualization) ======
function updateMoodDistribution() {
  // You can implement chart updates here if you want to visualize mood counts
  // For now, we skip the chart but it’s ready for future enhancement
}

// ====== Initialization ======
function init() {
  loadTheme();
  renderProducts();
  updateUndoBtn();
  updateMoodDistribution();
}

init();
