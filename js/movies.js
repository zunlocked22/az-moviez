const API_KEY = 'e388f63b7dffb7485770ed8445c1f4a6';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';

const moviesGrid = document.getElementById('movies-grid');
const loading = document.getElementById('loading');
const toast = document.getElementById('toast');
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalVideo = document.getElementById('modal-video');
const serverSelect = document.getElementById('server');
const pageInfo = document.getElementById('page-info');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const sortPopularBtn = document.getElementById('sort-popular');
const sortOldestBtn = document.getElementById('sort-oldest');
const moviesTitle = document.getElementById('movies-title');
const genreSelect = document.getElementById('genre-select');

const sortTopRatedBtn = document.getElementById('sort-top-rated');

let genres = [];
let selectedGenre = '';


let currentPage = 1;
let totalPages = 1;
let sortBy = 'popularity.desc'; // or 'release_date.asc'
let currentItem = null;

// Toast
function showToast(msg, duration = 2500) {
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// Loading
function showLoading() { loading.style.display = 'block'; }
function hideLoading() { loading.style.display = 'none'; }

// Fetch movies
async function fetchMovies(page = 1, sort = 'popularity.desc') {
  try {
    showLoading();
    let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=${sort}&page=${page}`;
    if (sort === 'release_date.asc') url += '&primary_release_date.lte=2024-12-31';
    if (selectedGenre) url += `&with_genres=${selectedGenre}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch movies');
    const data = await res.json();
    totalPages = Math.min(data.total_pages, 500);
    displayMovies(data.results);
    pageInfo.textContent = `Page ${currentPage}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    if (data.results.length === 0) showToast('No movies found.');
  } catch (err) {
    showToast('Error loading movies.');
    moviesGrid.innerHTML = '<p style="color:#b3b3b3;">Failed to load movies.</p>';
  } finally {
    hideLoading();
  }
}


async function fetchGenres() {
  try {
    const url = `${BASE_URL}/genre/movie/list?api_key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch genres');
    const data = await res.json();
    genres = data.genres;
    genreSelect.innerHTML = `<option value="">All</option>` + 
      genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
  } catch (err) {
    showToast('Error loading genres.');
  }
}


function displayMovies(items) {
  moviesGrid.innerHTML = '';
  if (!items || items.length === 0) {
    moviesGrid.innerHTML = '<p style="color:#b3b3b3;">No movies found.</p>';
    return;
  }
  items.forEach(item => {
    const title = item.title || item.name;
    const poster = item.poster_path ? IMG_URL + item.poster_path : 'https://via.placeholder.com/300x450?text=No+Image';
    const year = (item.release_date || '').slice(0,4);
    const vote = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', title);
    card.innerHTML = `
      <img class="movie-poster" src="${poster}" alt="${title}" loading="lazy">
      <div class="movie-info">
        <div class="movie-title">${title}</div>
        <div class="movie-meta">${year} &middot; ⭐ ${vote}</div>
      </div>
    `;
    card.onclick = () => openModal(item);
    card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') openModal(item); };
    moviesGrid.appendChild(card);
  });
}

// Modal logic (same as index)
function openModal(item) {
  currentItem = item;
  modalTitle.textContent = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview || 'No description available.';
  
  // Set genres
  const genreNames = item.genre_ids.map(id => {
    const genre = genres.find(g => g.id === id);
    return genre ? genre.name : '';
  }).filter(Boolean);
  document.getElementById('modal-genres').textContent = genreNames.length > 0 ? `Genres: ${genreNames.join(', ')}` : 'No genres available.';

  serverSelect.value = "vidsrc.cc";
  changeServer();
  modal.style.display = 'flex';
  closeModalBtn.focus();
}

function closeModal() {
  modal.style.display = 'none';
  modalVideo.src = '';
  currentItem = null;
}
function changeServer() {
  if (!currentItem) return;
  const server = serverSelect.value;
  const type = "movie";
  let embedURL = "";
  if (server === "vidsrc.cc") {
    embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
  } else if (server === "vidsrc.me") {
    embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
  } else if (server === "player.videasy.net") {
    embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
  }
  modalVideo.src = embedURL;
}

// Event listeners
prevPageBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    fetchMovies(currentPage, sortBy);
    window.scrollTo({top:0,behavior:'smooth'});
  }
};
nextPageBtn.onclick = () => {
  if (currentPage < totalPages) {
    currentPage++;
    fetchMovies(currentPage, sortBy);
    window.scrollTo({top:0,behavior:'smooth'});
  }
};
sortPopularBtn.onclick = () => {
  sortBy = 'popularity.desc';
  moviesTitle.textContent = 'Popular Movies';
  currentPage = 1;
  fetchMovies(currentPage, sortBy);
  sortPopularBtn.classList.add('active');
  sortOldestBtn.classList.remove('active');
};

//top rated button
sortTopRatedBtn.onclick = async () => {
  const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=vote_average.desc&primary_release_date.gte=2000-01-01&page=1`;
  try {
    showLoading();
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch movies');
    const data = await res.json();
    const randomMovies = getRandomItems(data.results, 10); // Get 10 random movies
    displayMovies(randomMovies);
    moviesTitle.textContent = 'Top Rated Movies)';
    currentPage = 1; // Reset to first page
  } catch (err) {
    showToast('Error loading movies.');
    moviesGrid.innerHTML = '<p style="color:#b3b3b3;">Failed to load movies.</p>';
  } finally {
    hideLoading();
  }
};

function getRandomItems(arr, count) {
  const shuffled = arr.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}



closeModalBtn.onclick = closeModal;
closeModalBtn.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') closeModal(); };
window.onclick = (e) => { if (e.target === modal) closeModal(); };
window.addEventListener('keydown', (e) => {
  if (modal.style.display === 'flex' && e.key === 'Escape') closeModal();
});
serverSelect.onchange = changeServer;

genreSelect.onchange = () => {
  selectedGenre = genreSelect.value;
  currentPage = 1;
  fetchMovies(currentPage, sortBy);
};

// Initial load
sortPopularBtn.classList.add('active');
fetchMovies(currentPage, sortBy);

sortPopularBtn.classList.add('active');
fetchGenres();
fetchMovies(currentPage, sortBy);

