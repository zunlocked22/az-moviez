const API_KEY = 'e388f63b7dffb7485770ed8445c1f4a6';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';

const tvGrid = document.getElementById('tv-grid');
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
const tvTitle = document.getElementById('tv-title');
const genreSelect = document.getElementById('genre-select');

const seasonEpisodeDiv = document.getElementById('season-episode-select');
const seasonSelect = document.getElementById('season-select');
const episodeSelect = document.getElementById('episode-select');

const sortTopRatedBtn = document.getElementById('sort-top-rated');

let genres = [];
let selectedGenre = '';


let currentPage = 1;
let totalPages = 1;
let sortBy = 'popularity.desc'; // or 'first_air_date.asc'
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

// Fetch TV shows
async function fetchTV(page = 1, sort = 'popularity.desc') {
  try {
    showLoading();
    let url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=${sort}&page=${page}`;
    if (sort === 'first_air_date.asc') url += '&first_air_date.lte=2024-12-31';
    if (selectedGenre) url += `&with_genres=${selectedGenre}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch TV shows');
    const data = await res.json();
    totalPages = Math.min(data.total_pages, 500);
    displayTV(data.results);
    pageInfo.textContent = `Page ${currentPage}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    if (data.results.length === 0) showToast('No TV shows found.');
  } catch (err) {
    showToast('Error loading TV shows.');
    tvGrid.innerHTML = '<p style="color:#b3b3b3;">Failed to load TV shows.</p>';
  } finally {
    hideLoading();
  }
}


async function fetchGenres() {
  try {
    const url = `${BASE_URL}/genre/tv/list?api_key=${API_KEY}`;
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


function displayTV(items) {
  tvGrid.innerHTML = '';
  if (!items || items.length === 0) {
    tvGrid.innerHTML = '<p style="color:#b3b3b3;">No TV shows found.</p>';
    return;
  }
  items.forEach(item => {
    const title = item.name || item.title;
    const poster = item.poster_path ? IMG_URL + item.poster_path : 'https://via.placeholder.com/300x450?text=No+Image';
    const year = (item.first_air_date || '').slice(0,4);
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
    tvGrid.appendChild(card);
  });
}

// Modal logic (same as index)
async function openModal(item) {
  currentItem = item;
  modalTitle.textContent = item.name || item.title;
  document.getElementById('modal-description').textContent = item.overview || 'No description available.';

  // Set genres
  let genreNames = [];
  if (item.genre_ids && genres.length > 0) {
    genreNames = item.genre_ids.map(id => {
      const genre = genres.find(g => g.id === id);
      return genre ? genre.name : '';
    }).filter(Boolean);
  } else if (item.genres && Array.isArray(item.genres)) {
    genreNames = item.genres.map(g => g.name);
  }
  document.getElementById('modal-genres').textContent = genreNames.length > 0 ? `Genres: ${genreNames.join(', ')}` : 'No genres available.';

  // If it's a TV show, fetch seasons and episodes
  if (item.media_type === "tv" || item.first_air_date) {
    await setupSeasonsAndEpisodes(item.id);
    seasonEpisodeDiv.style.display = '';
  } else {
    seasonEpisodeDiv.style.display = 'none';
  }

  serverSelect.value = "vidsrc.cc";
  changeServer();
  modal.style.display = 'flex';
  closeModalBtn.focus();
}

let currentSeason = 1;
let currentEpisode = 1;
let totalSeasons = 1;
let episodesList = [];

async function setupSeasonsAndEpisodes(tvId) {
  // Fetch TV show details to get seasons
  const url = `${BASE_URL}/tv/${tvId}?api_key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  totalSeasons = data.seasons.length;
  // Populate season select
  seasonSelect.innerHTML = '';
  data.seasons.forEach(season => {
    if (season.season_number === 0) return; // skip specials
    const opt = document.createElement('option');
    opt.value = season.season_number;
    opt.textContent = `Season ${season.season_number}`;
    seasonSelect.appendChild(opt);
  });
  currentSeason = data.seasons[0].season_number;
  await setupEpisodes(tvId, currentSeason);
}

async function setupEpisodes(tvId, seasonNumber) {
  // Fetch episodes for the selected season
  const url = `${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  episodesList = data.episodes || [];
  episodeSelect.innerHTML = '';
  episodesList.forEach(ep => {
    const opt = document.createElement('option');
    opt.value = ep.episode_number;
    opt.textContent = `Ep ${ep.episode_number}: ${ep.name}`;
    episodeSelect.appendChild(opt);
  });
  currentEpisode = episodesList[0]?.episode_number || 1;
  changeServer(); // Update player for first episode
}

function closeModal() {
  modal.style.display = 'none';
  modalVideo.src = '';
  currentItem = null;
}
function changeServer() {
  if (!currentItem) return;
  const server = serverSelect.value;
  let embedURL = "";

  if ((currentItem.media_type === "tv" || currentItem.first_air_date) && seasonEpisodeDiv.style.display !== 'none') {
    // TV show with season/episode
    const tvId = currentItem.id;
    const seasonNum = parseInt(seasonSelect.value) || 1;
    const episodeNum = parseInt(episodeSelect.value) || 1;
    if (server === "vidsrc.cc") {
      embedURL = `https://vidsrc.cc/v2/embed/tv/${tvId}/${seasonNum}/${episodeNum}`;
    } else if (server === "vidsrc.me") {
      embedURL = `https://vidsrc.net/embed/tv/?tmdb=${tvId}&season=${seasonNum}&episode=${episodeNum}`;
    } else if (server === "player.videasy.net") {
      embedURL = `https://player.videasy.net/tv/${tvId}-${seasonNum}-${episodeNum}`;
    }
  } else {
    // Movie or TV show without season/episode
    const type = currentItem.media_type === "movie" ? "movie" : "tv";
    if (server === "vidsrc.cc") {
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
    } else if (server === "vidsrc.me") {
      embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
    } else if (server === "player.videasy.net") {
      embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
    }
  }

  modalVideo.src = embedURL;
}


// Event listeners
prevPageBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    fetchTV(currentPage, sortBy);
    window.scrollTo({top:0,behavior:'smooth'});
  }
};
nextPageBtn.onclick = () => {
  if (currentPage < totalPages) {
    currentPage++;
    fetchTV(currentPage, sortBy);
    window.scrollTo({top:0,behavior:'smooth'});
  }
};
sortPopularBtn.onclick = () => {
  sortBy = 'popularity.desc';
  tvTitle.textContent = 'Popular TV Shows';
  currentPage = 1;
  fetchTV(currentPage, sortBy);
  sortPopularBtn.classList.add('active');
  sortOldestBtn.classList.remove('active');
};


function getRandomItems(arr, count) {
  const shuffled = arr.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Event listeners
sortTopRatedBtn.onclick = async () => {
  const url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=vote_average.desc&page=1`;
  try {
    showLoading();
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch TV shows');
    const data = await res.json();
    const randomTVShows = getRandomItems(data.results, 10); // Get 10 random TV shows
    displayTV(randomTVShows);
    tvTitle.textContent = 'Top Rated TV Shows';
    currentPage = 1; // Reset to first page
  } catch (err) {
    console.error('Error:', err); // Log the error
    showToast('Error loading TV shows.');
    tvGrid.innerHTML = '<p style="color:#b3b3b3;">Failed to load TV shows.</p>';
  } finally {
    hideLoading();
  }
};



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
  fetchTV(currentPage, sortBy);
};

seasonSelect.onchange = async function() {
  currentSeason = parseInt(this.value);
  await setupEpisodes(currentItem.id, currentSeason);
};

episodeSelect.onchange = function() {
  currentEpisode = parseInt(this.value);
  changeServer();
};


// Initial load
sortPopularBtn.classList.add('active');
fetchTV(currentPage, sortBy);

sortPopularBtn.classList.add('active');
fetchGenres();
fetchTV(currentPage, sortBy);

