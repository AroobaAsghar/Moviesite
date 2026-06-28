const TMDB_API_KEY = '61db5b296256941da14e4121fcce0289';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const TMDB_CACHE_KEY = 'cv_tmdb_catalog_v2';
const TMDB_CACHE_TTL = 1000 * 60 * 60 * 6;
const PLAYER_PROGRESS_KEY = 'cv_player_progress';

const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';
const OWNER_EMAIL = 'aroobaasghar37@gmail.com';
const supabaseClient = window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const fallbackTitles = [
  {
    id: 'movie-1',
    tmdbId: 1,
    type: 'movie',
    title: 'CineVerse Preview',
    genre: 'Action',
    genreIds: [28],
    year: 2026,
    rating: 8.7,
    duration: '2h 04m',
    maturity: '13+',
    cast: ['CineVerse Studio'],
    description: 'A premium preview title that keeps the app usable when the live movie API is unavailable.',
    backdrop: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=1600&q=80',
    poster: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trending: true,
    popular: true,
    topRated: true,
    newRelease: true
  }
];

const demoUploadedMovies = [
  {
    id: 'uploaded-demo-big-buck-bunny',
    uploadedMovieId: 'demo-big-buck-bunny',
    isUploaded: true,
    tmdbId: null,
    type: 'movie',
    title: 'Big Buck Bunny',
    genre: 'Animation',
    genreIds: [],
    year: 2008,
    rating: 8.1,
    duration: '9m 56s',
    maturity: 'G',
    cast: ['Blender Foundation'],
    description: 'A gentle animated short used here as a legal demo stream for CineVerse playback.',
    backdrop: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1280&q=80',
    poster: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=600&q=80',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    trending: true,
    popular: true,
    topRated: true,
    newRelease: true
  },
  {
    id: 'uploaded-demo-sintel',
    uploadedMovieId: 'demo-sintel',
    isUploaded: true,
    tmdbId: null,
    type: 'movie',
    title: 'Sintel',
    genre: 'Fantasy',
    genreIds: [],
    year: 2010,
    rating: 8.0,
    duration: '14m 48s',
    maturity: '13+',
    cast: ['Blender Foundation'],
    description: 'A cinematic fantasy short included as a playable uploaded-movie demo.',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1280&q=80',
    poster: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    trending: true,
    popular: true,
    topRated: true,
    newRelease: false
  },
  {
    id: 'uploaded-demo-tears-of-steel',
    uploadedMovieId: 'demo-tears-of-steel',
    isUploaded: true,
    tmdbId: null,
    type: 'movie',
    title: 'Tears of Steel',
    genre: 'Sci-Fi',
    genreIds: [],
    year: 2012,
    rating: 7.7,
    duration: '12m 14s',
    maturity: '13+',
    cast: ['Blender Foundation'],
    description: 'A sci-fi short film available as a full HTML5 video stream inside CineVerse.',
    backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80',
    poster: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=600&q=80',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    trending: false,
    popular: true,
    topRated: false,
    newRelease: true
  }
];

const tmdbGenres = {
  movie: new Map(),
  tv: new Map()
};

let catalog = [...fallbackTitles];
let catalogReady = false;

const storage = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

const state = {
  watchlist: new Set(storage.get('cv_watchlist', [])),
  favorites: new Set(storage.get('cv_favorites', [])),
  history: storage.get('cv_history', []),
  user: storage.get('cv_user', null),
  heroIndex: 0
};

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function resolvePath(target) {
  const isInsidePages = window.location.pathname.includes('/pages/');
  return isInsidePages ? `../${target}` : target;
}

function pageHref(page) {
  return resolvePath(`pages/${page}`);
}

function imageUrl(path, size = 'w500') {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80';
}

function readTmdbCache() {
  const cached = storage.get(TMDB_CACHE_KEY, null);
  if (!cached || Date.now() - cached.createdAt > TMDB_CACHE_TTL) return null;
  return cached.catalog;
}

function writeTmdbCache(items) {
  storage.set(TMDB_CACHE_KEY, { createdAt: Date.now(), catalog: items });
}

function releaseYear(item) {
  const date = item.release_date || item.first_air_date || '';
  return date ? Number(date.slice(0, 4)) : 'N/A';
}

function genreName(type, ids = []) {
  return ids.map((id) => tmdbGenres[type]?.get(id)).filter(Boolean)[0] || 'Featured';
}

function runtimeText(minutes) {
  if (!minutes) return 'Streaming';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${String(mins).padStart(2, '0')}m` : `${mins}m`;
}

function normalizeTitle(item, type, flags = {}) {
  const title = item.title || item.name || 'Untitled';
  const year = releaseYear(item);
  const genreIds = item.genre_ids || item.genres?.map((genre) => genre.id) || [];

  return {
    id: `${type}-${item.id}`,
    tmdbId: item.id,
    type,
    title,
    genre: item.genres?.[0]?.name || genreName(type, genreIds),
    genreIds,
    year,
    rating: Number((item.vote_average || 0).toFixed(1)),
    duration: runtimeText(item.runtime || item.episode_run_time?.[0]),
    maturity: item.adult ? '18+' : '13+',
    cast: [],
    description: item.overview || 'No description is available yet.',
    backdrop: imageUrl(item.backdrop_path, 'w1280'),
    poster: imageUrl(item.poster_path, 'w342'),
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trending: Boolean(flags.trending),
    popular: Boolean(flags.popular),
    topRated: Boolean(flags.topRated),
    newRelease: Boolean(flags.newRelease)
  };
}

function normalizeUploadedMovie(movie) {
  return {
    id: `uploaded-${movie.id}`,
    uploadedMovieId: movie.id,
    isUploaded: true,
    tmdbId: null,
    type: 'movie',
    title: movie.title,
    genre: movie.genre,
    genreIds: [],
    year: movie.release_year || 'N/A',
    rating: Number(movie.rating || 0),
    duration: movie.duration || 'Streaming',
    maturity: movie.maturity || '13+',
    cast: ['CineVerse Upload'],
    description: movie.description,
    backdrop: movie.backdrop_url || movie.poster_url || demoUploadedMovies[0].backdrop,
    poster: movie.poster_url || movie.backdrop_url || demoUploadedMovies[0].poster,
    video: movie.video_url,
    trending: true,
    popular: true,
    topRated: Number(movie.rating || 0) >= 8,
    newRelease: true
  };
}

async function loadUploadedMovies() {
  if (!supabaseClient) return [...demoUploadedMovies];
  try {
    const { data, error } = await supabaseClient
      .from('uploaded_movies')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data?.length ? data.map(normalizeUploadedMovie) : [...demoUploadedMovies];
  } catch (error) {
    console.warn('Uploaded movies load failed', error);
    return [...demoUploadedMovies];
  }
}

function mergeUploadedMovies(items, uploadedMovies) {
  return mergeTitles([uploadedMovies, items]);
}

async function tmdb(path, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'en-US');
  url.searchParams.set('include_adult', 'false');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`TMDB request failed: ${response.status}`);
  return response.json();
}

function mergeTitles(groups) {
  const merged = new Map();
  groups.flat().forEach((item) => {
    if (!merged.has(item.id)) {
      merged.set(item.id, item);
      return;
    }
    const existing = merged.get(item.id);
    merged.set(item.id, {
      ...existing,
      ...item,
      trending: existing.trending || item.trending,
      popular: existing.popular || item.popular,
      topRated: existing.topRated || item.topRated,
      newRelease: existing.newRelease || item.newRelease
    });
  });
  return [...merged.values()];
}

async function loadGenres() {
  const [movieGenres, tvGenres] = await Promise.all([
    tmdb('/genre/movie/list'),
    tmdb('/genre/tv/list')
  ]);
  movieGenres.genres.forEach((genre) => tmdbGenres.movie.set(genre.id, genre.name));
  tvGenres.genres.forEach((genre) => tmdbGenres.tv.set(genre.id, genre.name));
}

async function loadCatalog() {
  showLoading();
  const cachedCatalog = readTmdbCache();
  if (cachedCatalog?.length) {
    catalog = mergeUploadedMovies(cachedCatalog, await loadUploadedMovies());
    catalogReady = true;
    return;
  }

  try {
    await loadGenres();
    const [
      trending,
      popularMovies,
      popularTv,
      topRatedMovies,
      topRatedTv,
      newMovies
    ] = await Promise.all([
      tmdb('/trending/all/week', { page: '1' }),
      tmdb('/movie/popular', { page: '1' }),
      tmdb('/tv/popular', { page: '1' }),
      tmdb('/movie/top_rated', { page: '1' }),
      tmdb('/tv/top_rated', { page: '1' }),
      tmdb('/movie/now_playing', { page: '1' })
    ]);

    catalog = mergeUploadedMovies(mergeTitles([
      trending.results.map((item) => normalizeTitle(item, item.media_type === 'tv' ? 'tv' : 'movie', { trending: true })),
      popularMovies.results.map((item) => normalizeTitle(item, 'movie', { popular: true })),
      popularTv.results.map((item) => normalizeTitle(item, 'tv', { popular: true })),
      topRatedMovies.results.map((item) => normalizeTitle(item, 'movie', { topRated: true })),
      topRatedTv.results.map((item) => normalizeTitle(item, 'tv', { topRated: true })),
      newMovies.results.map((item) => normalizeTitle(item, 'movie', { newRelease: true }))
    ]).filter((item) => item.poster && item.backdrop), await loadUploadedMovies());
    catalogReady = true;
    writeTmdbCache(catalog);
    loadGenreCatalogInBackground();
  } catch (error) {
    console.warn(error);
    catalog = mergeUploadedMovies(fallbackTitles, demoUploadedMovies);
    catalogReady = true;
  }
}

async function loadGenreCatalogInBackground() {
  try {
    const [actionMovies, comedyMovies, horrorMovies, romanceMovies, sciFiMovies, animationMovies] = await Promise.all([
      tmdb('/discover/movie', { with_genres: '28', sort_by: 'popularity.desc', page: '1' }),
      tmdb('/discover/movie', { with_genres: '35', sort_by: 'popularity.desc', page: '1' }),
      tmdb('/discover/movie', { with_genres: '27', sort_by: 'popularity.desc', page: '1' }),
      tmdb('/discover/movie', { with_genres: '10749', sort_by: 'popularity.desc', page: '1' }),
      tmdb('/discover/movie', { with_genres: '878', sort_by: 'popularity.desc', page: '1' }),
      tmdb('/discover/movie', { with_genres: '16', sort_by: 'popularity.desc', page: '1' })
    ]);

    catalog = mergeTitles([
      catalog,
      actionMovies.results.map((item) => normalizeTitle(item, 'movie')),
      comedyMovies.results.map((item) => normalizeTitle(item, 'movie')),
      horrorMovies.results.map((item) => normalizeTitle(item, 'movie')),
      romanceMovies.results.map((item) => normalizeTitle(item, 'movie')),
      sciFiMovies.results.map((item) => normalizeTitle(item, 'movie')),
      animationMovies.results.map((item) => normalizeTitle(item, 'movie'))
    ]).filter((item) => item.poster && item.backdrop);
    writeTmdbCache(catalog);
    initPageContent();
  } catch (error) {
    console.warn('Genre catalog preload failed', error);
  }
}

async function enrichTitle(title) {
  try {
    const detail = await tmdb(`/${title.type}/${title.tmdbId}`, { append_to_response: 'credits,videos,recommendations' });
    const trailer = detail.videos?.results?.find((video) => video.site === 'YouTube' && video.type === 'Trailer');
    return {
      ...normalizeTitle(detail, title.type, title),
      cast: detail.credits?.cast?.slice(0, 8).map((person) => person.name) || [],
      trailerKey: trailer?.key,
      recommendations: detail.recommendations?.results?.slice(0, 10).map((item) => normalizeTitle(item, title.type)) || []
    };
  } catch {
    return title;
  }
}

async function notifyOwnerSignup(profile) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.functions.invoke('new-signup-notify', {
      body: {
        ownerEmail: OWNER_EMAIL,
        userEmail: profile.email,
        fullName: profile.name
      }
    });
  } catch (error) {
    console.warn('Signup notification failed', error);
  }
}

async function getSessionUser() {
  if (!supabaseClient) return;
  const { data } = await supabaseClient.auth.getUser();
  if (!data?.user) return;
  const { data: profile } = await supabaseClient.from('profiles').select('role, full_name').eq('id', data.user.id).single();
  state.user = {
    id: data.user.id,
    name: profile?.full_name || data.user.user_metadata?.full_name || data.user.email.split('@')[0],
    email: data.user.email,
    role: profile?.role || 'user',
    plan: profile?.role === 'admin' ? 'Admin' : 'Premium'
  };
  storage.set('cv_user', state.user);
}

async function loadUserCollections() {
  if (!supabaseClient || !state.user?.id) return;
  try {
    const [watchlistResult, favoritesResult, historyResult] = await Promise.all([
      supabaseClient.from('watchlist').select('media_type, tmdb_id, uploaded_movie_id').eq('user_id', state.user.id),
      supabaseClient.from('favorites').select('media_type, tmdb_id, uploaded_movie_id').eq('user_id', state.user.id),
      supabaseClient.from('watch_history').select('media_type, tmdb_id, uploaded_movie_id').eq('user_id', state.user.id).order('watched_at', { ascending: false })
    ]);
    const collectionId = (item) => item.uploaded_movie_id ? `uploaded-${item.uploaded_movie_id}` : `${item.media_type}-${item.tmdb_id}`;
    if (watchlistResult.data) state.watchlist = new Set(watchlistResult.data.map(collectionId));
    if (favoritesResult.data) state.favorites = new Set(favoritesResult.data.map(collectionId));
    if (historyResult.data) state.history = historyResult.data.map(collectionId);
    saveCollections();
  } catch (error) {
    console.warn('Collection load failed', error);
  }
}

async function syncCollection(action, titleId) {
  if (!supabaseClient || !state.user?.id) return;
  const title = catalog.find((item) => item.id === titleId);
  const [type, tmdbId] = titleId.split('-');
  const table = action === 'watchlist' ? 'watchlist' : 'favorites';
  const payload = title?.isUploaded
    ? { user_id: state.user.id, media_type: 'movie', tmdb_id: null, uploaded_movie_id: title.uploadedMovieId }
    : { user_id: state.user.id, media_type: type, tmdb_id: Number(tmdbId), uploaded_movie_id: null };
  try {
    if ((action === 'watchlist' && state.watchlist.has(titleId)) || (action === 'favorite' && state.favorites.has(titleId))) {
      if (title?.isUploaded) {
        await supabaseClient.from(table).delete().eq('user_id', state.user.id).eq('uploaded_movie_id', title.uploadedMovieId);
        await supabaseClient.from(table).insert(payload);
      } else {
        await supabaseClient.from(table).upsert(payload, { onConflict: 'user_id,media_type,tmdb_id' });
      }
    } else {
      const query = supabaseClient.from(table).delete().eq('user_id', state.user.id);
      if (title?.isUploaded) {
        await query.eq('uploaded_movie_id', title.uploadedMovieId);
      } else {
        await query.match({ media_type: type, tmdb_id: Number(tmdbId) });
      }
    }
  } catch (error) {
    console.warn('Collection sync failed', error);
  }
}

function saveCollections() {
  storage.set('cv_watchlist', [...state.watchlist]);
  storage.set('cv_favorites', [...state.favorites]);
  storage.set('cv_history', state.history);
}

function renderHeader() {
  const header = $('#siteHeader');
  if (!header) return;
  const page = document.body.dataset.page;
  const links = [
    ['home', resolvePath('index.html'), 'Home'],
    ['movies', pageHref('movies.html'), 'Movies'],
    ['tvshows', pageHref('tvshows.html'), 'TV Shows'],
    ['trending', pageHref('trending.html'), 'Trending'],
    ['my-list', pageHref('my-list.html'), 'My List']
  ];
  if (state.user?.role === 'admin') links.push(['admin', pageHref('admin.html'), 'Admin']);
  const signedIn = Boolean(state.user?.email);

  header.innerHTML = `
    <a class="brand" href="${resolvePath('index.html')}" aria-label="CineVerse home">
      <span class="brand-mark" aria-hidden="true">CV</span>
      <span>CineVerse</span>
    </a>
    <button class="mobile-toggle" type="button" aria-label="Open menu" aria-expanded="false">Menu</button>
    <nav class="nav-links" id="primaryNav" aria-label="Primary navigation">
      ${links.map(([key, href, label]) => `<a href="${href}" class="${page === key ? 'active' : ''}">${label}</a>`).join('')}
    </nav>
    <form class="search-box" id="navSearchForm" role="search">
      <label class="sr-only" for="siteSearch">Search CineVerse</label>
      <span aria-hidden="true">Search</span>
      <input type="search" placeholder="Search movies or series" id="siteSearch" autocomplete="off" />
      <div class="suggestions" id="searchSuggestions" role="listbox"></div>
    </form>
    ${signedIn
      ? `<a class="user-pill" href="${pageHref('profile.html')}" aria-label="Open profile"><span class="avatar">${state.user.name.charAt(0).toUpperCase()}</span><span>${state.user.name}</span></a>`
      : `<a class="btn btn-secondary nav-auth" href="${pageHref('login.html')}">Sign in</a>`}
  `;
}

function renderFooter() {
  const footer = $('#siteFooter');
  if (!footer) return;
  footer.innerHTML = `
    <div class="footer-grid">
      <a class="brand" href="${resolvePath('index.html')}"><span class="brand-mark">CV</span><span>CineVerse</span></a>
      <p>Powered by TMDB discovery, Supabase-ready authentication, watchlists, favorites, and history.</p>
      <p>&copy; 2026 CineVerse Technology.</p>
    </div>
  `;
}

function metaMarkup(title) {
  return `
    <span>Star ${title.rating || 'N/A'}</span>
    <span>${title.year}</span>
    <span>${title.duration}</span>
    <span>${title.type === 'tv' ? 'Series' : 'Movie'}</span>
  `;
}

function detailsUrl(title) {
  if (title.isUploaded) return pageHref(`details.html?upload=${encodeURIComponent(title.uploadedMovieId)}`);
  return pageHref(`details.html?id=${title.tmdbId}&type=${title.type}`);
}

function setMetaContent(selector, content) {
  const tag = document.head.querySelector(selector);
  if (tag && content) tag.setAttribute('content', content);
}

function updateDynamicSeo(title) {
  if (!title) return;
  const pageTitle = `${title.title} (${title.year}) | CineVerse`;
  document.title = pageTitle;
  setMetaContent('meta[name="description"]', title.description);
  setMetaContent('meta[property="og:title"]', pageTitle);
  setMetaContent('meta[property="og:description"]', title.description);
  setMetaContent('meta[property="og:image"]', title.backdrop);
  setMetaContent('meta[name="twitter:title"]', pageTitle);
  setMetaContent('meta[name="twitter:description"]', title.description);
  setMetaContent('meta[name="twitter:image"]', title.backdrop);
}

function createCard(title, compact = false) {
  const inList = state.watchlist.has(title.id);
  const liked = state.favorites.has(title.id);
  return `
    <article class="card reveal" data-card-id="${title.id}">
      <a class="card-media" href="${detailsUrl(title)}" aria-label="Open ${title.title}">
        <img src="${title.poster}" alt="${title.title} poster" loading="lazy" decoding="async" width="342" height="513" />
        <div class="card-overlay">
          <span class="play-chip" aria-hidden="true">Play</span>
          <div>
            <p class="eyebrow">${title.genre}</p>
            <h3 class="card-title">${title.title}</h3>
          </div>
        </div>
      </a>
      <div class="card-body">
        <h3 class="card-title">${title.title}</h3>
        <div class="meta">${metaMarkup(title)}</div>
        ${compact ? '' : `<p>${title.description}</p>`}
        <div class="card-actions">
          <a class="btn btn-primary" href="${detailsUrl(title)}">Play</a>
          <div class="icon-row">
            <button class="icon-btn ${inList ? 'is-active' : ''}" data-action="watchlist" data-id="${title.id}" aria-label="${inList ? 'Remove from My List' : 'Add to My List'}">${inList ? 'Added' : '+'}</button>
            <button class="icon-btn ${liked ? 'is-active' : ''}" data-action="favorite" data-id="${title.id}" aria-label="${liked ? 'Unlike' : 'Like'}">Like</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function skeletonCards(count = 8) {
  return Array.from({ length: count }, () => '<div class="card skeleton-card"><div></div><span></span><span></span></div>').join('');
}

function showLoading() {
  $$('.card-grid, .rail-grid, .stack-grid').forEach((grid) => {
    if (!grid.children.length) grid.innerHTML = skeletonCards(grid.classList.contains('stack-grid') ? 3 : 8);
  });
}

function renderSection(target, items, compact = false) {
  if (!target) return;
  target.innerHTML = items.length
    ? items.map((title) => createCard(title, compact)).join('')
    : `<div class="empty-state"><h3>No titles found</h3><p>Try another search or filter combination.</p></div>`;
  if (target.classList.contains('rail-grid')) setupRailControls(target);
}

function updateRailButtons(wrapper, rail) {
  const previous = $('.rail-arrow.prev', wrapper);
  const next = $('.rail-arrow.next', wrapper);
  if (!previous || !next) return;
  const maxScroll = rail.scrollWidth - rail.clientWidth;
  const hasOverflow = maxScroll > 8;
  previous.disabled = !hasOverflow || rail.scrollLeft <= 8;
  next.disabled = !hasOverflow || rail.scrollLeft >= maxScroll - 8;
  wrapper.classList.toggle('has-overflow', hasOverflow);
}

function setupRailControls(rail) {
  if (!rail || rail.dataset.controlsReady === 'true') {
    const wrapper = rail?.closest('.rail-shell');
    if (wrapper) requestAnimationFrame(() => updateRailButtons(wrapper, rail));
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'rail-shell';
  rail.parentNode.insertBefore(wrapper, rail);
  wrapper.appendChild(rail);

  const previous = document.createElement('button');
  previous.className = 'rail-arrow prev';
  previous.type = 'button';
  previous.setAttribute('aria-label', 'Scroll movies backward');
  previous.textContent = '‹';

  const next = document.createElement('button');
  next.className = 'rail-arrow next';
  next.type = 'button';
  next.setAttribute('aria-label', 'Scroll movies forward');
  next.textContent = '›';

  wrapper.append(previous, next);
  rail.dataset.controlsReady = 'true';

  const scrollRail = (direction) => {
    const firstCard = $('.card', rail);
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : rail.clientWidth * 0.75;
    const gap = parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap) || 16;
    const visibleCards = Math.max(1, Math.floor(rail.clientWidth / (cardWidth + gap)));
    rail.scrollBy({
      left: direction * (cardWidth + gap) * visibleCards,
      behavior: 'smooth'
    });
  };

  previous.addEventListener('click', () => scrollRail(-1));
  next.addEventListener('click', () => scrollRail(1));
  rail.addEventListener('scroll', () => updateRailButtons(wrapper, rail), { passive: true });
  window.addEventListener('resize', () => updateRailButtons(wrapper, rail));
  requestAnimationFrame(() => updateRailButtons(wrapper, rail));
}

function renderHero() {
  const heroSection = $('.hero-section');
  const heroContent = $('#heroContent');
  if (!heroSection || !heroContent) return;
  const featured = [
    ...catalog.filter((title) => title.isUploaded && title.backdrop),
    ...catalog.filter((title) => !title.isUploaded && title.backdrop)
  ].slice(0, 8);
  const title = featured[state.heroIndex % featured.length] || catalog[0];
  if (state.heroIndex === 0) {
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'image';
    preload.href = title.backdrop;
    document.head.append(preload);
  }
  heroSection.style.backgroundImage = `
    linear-gradient(90deg, rgba(2, 5, 12, 0.97) 0%, rgba(2, 5, 12, 0.6) 46%, rgba(2, 5, 12, 0.14) 100%),
    linear-gradient(0deg, #05070d 0%, rgba(5, 7, 13, 0) 38%),
    url('${title.backdrop}')
  `;
  heroContent.classList.remove('fade-in');
  void heroContent.offsetWidth;
  heroContent.classList.add('fade-in');
  heroContent.innerHTML = `
    <p class="eyebrow">Featured on CineVerse</p>
    <h1>${title.title}</h1>
    <p>${title.description}</p>
    <div class="meta hero-meta">${metaMarkup(title)}<span>${title.genre}</span></div>
    <div class="hero-actions">
      <a class="btn btn-primary" href="${detailsUrl(title)}">Play now</a>
      <a class="btn btn-secondary" href="${detailsUrl(title)}">More info</a>
    </div>
  `;
}

function byGenre(name) {
  return catalog.filter((title) => title.genre === name || title.genreIds.some((id) => genreName(title.type, [id]) === name));
}

function renderHomeRows() {
  const rowMap = {
    uploadedGrid: catalog.filter((title) => title.isUploaded).slice(0, 14),
    trendingGrid: catalog.filter((title) => title.trending).slice(0, 14),
    popularGrid: catalog.filter((title) => title.popular).slice(0, 14),
    topRatedGrid: catalog.filter((title) => title.topRated || title.rating >= 8).slice(0, 14),
    actionGrid: byGenre('Action').slice(0, 14),
    comedyGrid: byGenre('Comedy').slice(0, 14),
    horrorGrid: byGenre('Horror').slice(0, 14),
    romanceGrid: byGenre('Romance').slice(0, 14),
    sciFiGrid: byGenre('Science Fiction').slice(0, 14),
    animationGrid: byGenre('Animation').slice(0, 14),
    newReleaseGrid: catalog.filter((title) => title.newRelease || Number(title.year) >= new Date().getFullYear() - 1).slice(0, 14)
  };
  Object.entries(rowMap).forEach(([id, items]) => renderSection($(`#${id}`), items, true));
}

function populateFilters() {
  const genreValues = [...new Set(catalog.map((title) => title.genre).filter(Boolean))].sort();
  const yearValues = [...new Set(catalog.map((title) => title.year).filter((year) => Number(year)))].sort((a, b) => b - a);
  const ratingValues = ['8.0+', '7.0+', '6.0+'];

  $$('#genreFilter').forEach((select) => {
    const current = select.value;
    select.innerHTML = ['<option value="All">All genres</option>', ...genreValues.map((genre) => `<option value="${genre}">${genre}</option>`)].join('');
    if (current) select.value = current;
  });
  $$('#yearFilter').forEach((select) => {
    const current = select.value;
    select.innerHTML = ['<option value="Any">Any year</option>', ...yearValues.map((year) => `<option value="${year}">${year}</option>`)].join('');
    if (current) select.value = current;
  });
  $$('#ratingFilter').forEach((select) => {
    const current = select.value;
    select.innerHTML = ['<option value="All">Any rating</option>', ...ratingValues.map((rating) => `<option value="${rating}">${rating}</option>`)].join('');
    if (current) select.value = current;
  });
}

function filteredTitles(source = catalog) {
  const searchTerm = ($('#searchInput')?.value || '').trim().toLowerCase();
  const genre = $('#genreFilter')?.value || 'All';
  const year = $('#yearFilter')?.value || 'Any';
  const rating = $('#ratingFilter')?.value || 'All';

  return source.filter((title) => {
    const haystack = [title.title, title.genre, title.description, title.cast.join(' ')].join(' ').toLowerCase();
    const matchesSearch = !searchTerm || haystack.includes(searchTerm);
    const matchesGenre = genre === 'All' || title.genre === genre;
    const matchesYear = year === 'Any' || title.year === Number(year);
    const matchesRating = rating === 'All' || title.rating >= Number(rating.replace('+', ''));
    return matchesSearch && matchesGenre && matchesYear && matchesRating;
  });
}

function updateSearchResults(source = catalog) {
  renderSection($('#searchGrid'), filteredTitles(source));
}

function renderCatalog(pageName) {
  let items = catalog;
  if (pageName === 'movies') items = catalog.filter((title) => title.type === 'movie');
  if (pageName === 'tvshows') items = catalog.filter((title) => title.type === 'tv');
  if (pageName === 'trending') items = catalog.filter((title) => title.trending || title.popular);
  if (pageName === 'my-list') items = catalog.filter((title) => state.watchlist.has(title.id));
  renderSection($('#catalogGrid'), filteredTitles(items));
}

function addHistory(title) {
  state.history = [title.id, ...state.history.filter((id) => id !== title.id)].slice(0, 10);
  saveCollections();
  if (supabaseClient && state.user?.id) {
    const payload = {
      user_id: state.user.id,
      media_type: 'movie',
      tmdb_id: title.isUploaded ? null : title.tmdbId,
      uploaded_movie_id: title.isUploaded ? title.uploadedMovieId : null,
      watched_at: new Date().toISOString()
    };
    if (title.isUploaded) {
      supabaseClient.from('watch_history').delete().eq('user_id', state.user.id).eq('uploaded_movie_id', title.uploadedMovieId)
        .then(() => supabaseClient.from('watch_history').insert(payload));
    } else {
      supabaseClient.from('watch_history').upsert(payload, { onConflict: 'user_id,media_type,tmdb_id' }).then(() => null);
    }
  }
}

function getProgressMap() {
  return storage.get(PLAYER_PROGRESS_KEY, {});
}

function saveProgress(titleId, seconds) {
  const progressMap = getProgressMap();
  progressMap[titleId] = Math.floor(seconds);
  storage.set(PLAYER_PROGRESS_KEY, progressMap);
}

function getSavedProgress(titleId) {
  return getProgressMap()[titleId] || 0;
}

function youtubeTrailerEmbedUrl(key, autoplay = false) {
  const url = new URL(`https://www.youtube.com/embed/${encodeURIComponent(key)}`);
  url.searchParams.set('rel', '0');
  url.searchParams.set('modestbranding', '1');
  url.searchParams.set('playsinline', '1');
  if (window.location.origin.startsWith('http')) url.searchParams.set('origin', window.location.origin);
  if (autoplay) url.searchParams.set('autoplay', '1');
  return url.toString();
}

function youtubeTrailerWatchUrl(key) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(key)}`;
}

function renderVideoPlayer(title) {
  if (title.trailerKey && !title.isUploaded) {
    return `
      <div class="player-shell trailer-frame" id="player">
        <iframe title="${title.title} trailer" src="${youtubeTrailerEmbedUrl(title.trailerKey)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        <a class="trailer-fallback" href="${youtubeTrailerWatchUrl(title.trailerKey)}" target="_blank" rel="noopener">Open trailer on YouTube</a>
      </div>
    `;
  }
  return `
    <div class="player-shell" id="player" data-title-id="${title.id}">
      <video class="video-frame" id="cinePlayer" poster="${title.backdrop}" preload="metadata" playsinline>
        <source src="${title.video}" type="video/mp4" />
        <track label="English" kind="subtitles" srclang="en" src="${resolvePath('assets/sample.vtt')}" default />
      </video>
      <div class="player-controls" aria-label="Video controls">
        <button class="icon-btn" data-player="toggle" aria-label="Play or pause">Play</button>
        <input class="progress" data-player="seek" type="range" min="0" max="100" value="0" aria-label="Seek video" />
        <button class="icon-btn" data-player="mute" aria-label="Mute">Vol</button>
        <select data-player="speed" aria-label="Playback speed">
          <option value="0.75">0.75x</option>
          <option value="1" selected>1x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
        <button class="icon-btn" data-player="pip" aria-label="Picture in picture">PiP</button>
        <button class="icon-btn" data-player="fullscreen" aria-label="Fullscreen">Full</button>
      </div>
      <p class="resume-note" id="resumeNote" aria-live="polite"></p>
    </div>
  `;
}

async function renderDetails() {
  const detailsHero = $('#detailsHero');
  const detailsContent = $('#detailsContent');
  const similarGrid = $('#similarGrid');
  if (!detailsHero || !detailsContent || !similarGrid) return;

  const params = new URLSearchParams(window.location.search);
  const uploadId = params.get('upload');
  const tmdbId = Number(params.get('id'));
  const type = params.get('type') || 'movie';
  const baseTitle = uploadId
    ? catalog.find((item) => item.isUploaded && item.uploadedMovieId === uploadId)
    : catalog.find((item) => item.tmdbId === tmdbId && item.type === type);
  const title = baseTitle?.isUploaded ? baseTitle : await enrichTitle(baseTitle || catalog[0]);
  updateDynamicSeo(title);
  addHistory(title);

  detailsHero.style.backgroundImage = `
    linear-gradient(90deg, rgba(2, 5, 12, 0.95), rgba(2, 5, 12, 0.25)),
    linear-gradient(0deg, #05070d 0%, rgba(5, 7, 13, 0) 42%),
    url('${title.backdrop}')
  `;
  detailsHero.innerHTML = `
    <div class="hero-content detail-copy">
      <p class="eyebrow">Now streaming</p>
      <h1>${title.title}</h1>
      <p>${title.description}</p>
      <div class="meta hero-meta">${metaMarkup(title)}<span>${title.genre}</span></div>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#player"${title.trailerKey && !title.isUploaded ? ` data-trailer-play="${title.trailerKey}"` : ''}>${title.isUploaded ? 'Play movie' : 'Play trailer'}</a>
        <button class="btn btn-secondary" data-action="watchlist" data-id="${title.id}">+ My List</button>
      </div>
    </div>
  `;
  detailsContent.innerHTML = `
    <article class="details-card" data-title-id="${title.id}">
      ${renderVideoPlayer(title)}
      <div class="details-copy">
        <h2>Story</h2>
        <p>${title.description}</p>
        <h3>Cast</h3>
        <div class="tag-row">${(title.cast.length ? title.cast : ['Cast information loading']).map((person) => `<span>${person}</span>`).join('')}</div>
        <h3>Genre</h3>
        <div class="tag-row"><span>${title.genre}</span><span>${title.type === 'tv' ? 'Series' : 'Feature Film'}</span></div>
      </div>
    </article>
  `;
  const recommendations = title.recommendations?.length ? title.recommendations : catalog.filter((item) => item.id !== title.id && (item.genre === title.genre || item.type === title.type)).slice(0, 6);
  renderSection(similarGrid, recommendations, true);
  bindPlayer();
}

function renderProfile() {
  const profileName = $('#profileName');
  const profileList = $('#profileList');
  const historyList = $('#historyList');
  const favoritesList = $('#favoritesList');
  if (!profileName) return;

  const user = state.user || { name: 'Guest', plan: 'Demo', email: 'Not signed in' };
  profileName.textContent = `${user.name} - ${user.plan} access`;
  const listItems = catalog.filter((title) => state.watchlist.has(title.id));
  const historyItems = state.history.map((id) => catalog.find((title) => title.id === id)).filter(Boolean);
  const favoriteItems = catalog.filter((title) => state.favorites.has(title.id));
  const mini = (items, empty) => items.length
    ? items.map((title) => `<a class="mini-title" href="${detailsUrl(title)}"><strong>${title.title}</strong><span>${title.genre} - ${title.year}</span></a>`).join('')
    : `<p>${empty}</p>`;

  if (profileList) profileList.innerHTML = mini(listItems, 'No saved titles yet.');
  if (historyList) historyList.innerHTML = mini(historyItems, 'Start watching to build your history.');
  if (favoritesList) favoritesList.innerHTML = mini(favoriteItems, 'Liked movies will appear here.');
}

async function handleAuth(form, mode) {
  const data = new FormData(form);
  const email = data.get('email');
  const password = data.get('password');
  const fullName = data.get('fullName') || email.split('@')[0];
  const status = $('.form-status', form);
  if (status) status.textContent = 'Working...';

  if (supabaseClient) {
    const result = mode === 'signup'
      ? await supabaseClient.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      : await supabaseClient.auth.signInWithPassword({ email, password });

    if (result.error) {
      if (status) status.textContent = result.error.message;
      return;
    }

    const userId = result.data.user?.id;
    if (userId) {
      await supabaseClient.from('profiles').upsert({ id: userId, full_name: fullName, email });
    }
    if (mode === 'signup') await notifyOwnerSignup({ name: fullName, email });
  }

  state.user = { name: fullName, email, plan: 'Premium' };
  storage.set('cv_user', state.user);
  if (status) status.textContent = supabaseClient ? 'Success. Redirecting...' : `Demo account saved. Connect Supabase to email ${OWNER_EMAIL}.`;
  setTimeout(() => { window.location.href = 'profile.html'; }, 900);
}

function bindPlayer() {
  const video = $('#cinePlayer');
  const shell = $('#player');
  if (!video || !shell) return;
  const titleId = shell.dataset.titleId || $('.details-card')?.dataset.titleId;
  const playButton = $('[data-player="toggle"]', shell);
  const progress = $('[data-player="seek"]', shell);
  const resumeNote = $('#resumeNote', shell);
  const savedSeconds = titleId ? getSavedProgress(titleId) : 0;

  video.addEventListener('loadedmetadata', () => {
    if (savedSeconds > 10 && savedSeconds < video.duration - 10) {
      video.currentTime = savedSeconds;
      if (resumeNote) resumeNote.textContent = `Resumed at ${Math.floor(savedSeconds / 60)}m ${Math.floor(savedSeconds % 60)}s.`;
    }
  }, { once: true });

  $('[data-player="toggle"]', shell)?.addEventListener('click', () => {
    video.paused ? video.play() : video.pause();
  });
  video.addEventListener('play', () => { playButton.textContent = 'Pause'; });
  video.addEventListener('pause', () => { playButton.textContent = 'Play'; });
  video.addEventListener('timeupdate', () => {
    progress.value = video.duration ? (video.currentTime / video.duration) * 100 : 0;
    if (titleId && Math.floor(video.currentTime) % 5 === 0) saveProgress(titleId, video.currentTime);
  });
  progress?.addEventListener('input', () => {
    video.currentTime = (Number(progress.value) / 100) * video.duration;
  });
  $('[data-player="mute"]', shell)?.addEventListener('click', (event) => {
    video.muted = !video.muted;
    event.currentTarget.textContent = video.muted ? 'Muted' : 'Vol';
  });
  $('[data-player="speed"]', shell)?.addEventListener('change', (event) => {
    video.playbackRate = Number(event.target.value);
  });
  $('[data-player="pip"]', shell)?.addEventListener('click', async () => {
    if (document.pictureInPictureEnabled && !video.disablePictureInPicture) await video.requestPictureInPicture();
  });
  $('[data-player="fullscreen"]', shell)?.addEventListener('click', () => shell.requestFullscreen?.());
}

function safeFileName(file) {
  const extension = file.name.split('.').pop();
  const uniqueId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${uniqueId}.${extension}`;
}

async function uploadStorageFile(bucket, file) {
  if (!file) return { path: null, url: null };
  const path = safeFileName(file);
  const { error } = await supabaseClient.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    upsert: false
  });
  if (error) throw error;
  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

async function handleMovieUpload(form) {
  const status = $('#uploadStatus');
  if (!supabaseClient || state.user?.role !== 'admin') {
    status.textContent = 'Connect Supabase and sign in as an admin before uploading movies.';
    return;
  }

  const data = new FormData(form);
  const videoFile = data.get('videoFile');
  const posterFile = data.get('posterFile');
  const backdropFile = data.get('backdropFile');

  try {
    status.textContent = 'Uploading video...';
    const video = await uploadStorageFile('movie-videos', videoFile);
    status.textContent = 'Uploading images...';
    const poster = await uploadStorageFile('movie-images', posterFile?.size ? posterFile : null);
    const backdrop = await uploadStorageFile('movie-images', backdropFile?.size ? backdropFile : null);

    status.textContent = 'Saving movie metadata...';
    const { data: movie, error } = await supabaseClient.from('uploaded_movies').insert({
      title: data.get('title'),
      description: data.get('description'),
      genre: data.get('genre'),
      release_year: Number(data.get('releaseYear')) || null,
      duration: data.get('duration') || 'Streaming',
      rating: Number(data.get('rating')) || 0,
      video_path: video.path,
      video_url: video.url,
      poster_path: poster.path,
      poster_url: poster.url,
      backdrop_path: backdrop.path,
      backdrop_url: backdrop.url,
      is_published: data.get('isPublished') === 'on',
      uploaded_by: state.user.id
    }).select().single();
    if (error) throw error;

    const normalized = normalizeUploadedMovie(movie);
    catalog = mergeUploadedMovies(catalog, [normalized]);
    form.reset();
    status.textContent = 'Movie uploaded and published.';
    renderAdminDashboard();
    initPageContent();
  } catch (error) {
    status.textContent = error.message || 'Upload failed. Check your Supabase storage policies.';
  }
}

function renderAdminDashboard() {
  const list = $('#adminMovieList');
  if (!list) return;
  const uploaded = catalog.filter((title) => title.isUploaded);
  list.innerHTML = uploaded.length
    ? uploaded.map((title) => `<a class="mini-title" href="${detailsUrl(title)}"><strong>${title.title}</strong><span>${title.genre} - ${title.duration}</span></a>`).join('')
    : '<p>No uploaded movies yet.</p>';
}

function renderSuggestions(term) {
  const box = $('#searchSuggestions');
  if (!box) return;
  if (!term) {
    box.classList.remove('is-open');
    box.innerHTML = '';
    return;
  }
  const results = catalog.filter((title) => [title.title, title.genre, title.description].join(' ').toLowerCase().includes(term.toLowerCase())).slice(0, 6);
  box.innerHTML = results.map((title) => `<a href="${detailsUrl(title)}" role="option">${title.title}<span>${title.type === 'tv' ? 'Series' : 'Movie'}</span></a>`).join('');
  box.classList.toggle('is-open', results.length > 0);
}

function bindEvents() {
  document.addEventListener('click', async (event) => {
    const toggle = event.target.closest('.mobile-toggle');
    if (toggle) {
      const nav = $('#primaryNav');
      nav?.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(nav?.classList.contains('is-open')));
    }

    const trailerLink = event.target.closest('[data-trailer-play]');
    if (trailerLink) {
      event.preventDefault();
      const player = $('#player');
      const iframe = $('.trailer-frame iframe');
      const trailerKey = trailerLink.dataset.trailerPlay;
      player?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (iframe && trailerKey) iframe.src = youtubeTrailerEmbedUrl(trailerKey, true);
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    const id = actionButton.dataset.id;
    if (actionButton.dataset.action === 'watchlist') {
      state.watchlist.has(id) ? state.watchlist.delete(id) : state.watchlist.add(id);
      await syncCollection('watchlist', id);
    }
    if (actionButton.dataset.action === 'favorite') {
      state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
      await syncCollection('favorite', id);
    }
    saveCollections();
    initPageContent();
  });

  $('#navSearchForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const term = $('#siteSearch')?.value.trim();
    if (term) window.location.href = `${pageHref('search.html')}?q=${encodeURIComponent(term)}`;
  });
  $('#siteSearch')?.addEventListener('input', (event) => renderSuggestions(event.target.value));

  ['searchInput', 'genreFilter', 'yearFilter', 'ratingFilter'].forEach((id) => {
    $(`#${id}`)?.addEventListener('input', () => initPageContent());
    $(`#${id}`)?.addEventListener('change', () => initPageContent());
  });

  $('#loginForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleAuth(event.currentTarget, 'login');
  });
  $('#signupForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleAuth(event.currentTarget, 'signup');
  });
  $('#forgotPasswordLink')?.addEventListener('click', async (event) => {
    event.preventDefault();
    const form = $('#loginForm');
    const email = new FormData(form).get('email');
    const status = $('.form-status', form);
    if (!email) {
      status.textContent = 'Enter your email first.';
      return;
    }
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href
      });
      status.textContent = error ? error.message : 'Password reset email sent.';
    } else {
      status.textContent = 'Connect Supabase to send password reset emails.';
    }
  });
  $('#logoutBtn')?.addEventListener('click', async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    state.user = null;
    storage.remove('cv_user');
    window.location.href = 'login.html';
  });

  $('#movieUploadForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleMovieUpload(event.currentTarget);
  });
}

function hydrateSearchPage() {
  const query = new URLSearchParams(window.location.search).get('q') || '';
  const input = $('#searchInput');
  if (input && query && !input.value) input.value = query;
}

function initPageContent() {
  if (!catalogReady) return;
  populateFilters();
  const page = document.body.dataset.page;
  if (page === 'home') {
    renderHero();
    renderHomeRows();
    updateSearchResults();
  }
  if (['movies', 'tvshows', 'trending', 'my-list'].includes(page)) renderCatalog(page);
  if (page === 'search') updateSearchResults();
  if (page === 'details') renderDetails();
  if (page === 'profile') renderProfile();
  if (page === 'admin') renderAdminDashboard();
}

async function init() {
  await getSessionUser();
  await loadUserCollections();
  renderHeader();
  renderFooter();
  hydrateSearchPage();
  bindEvents();
  await loadCatalog();
  initPageContent();

  if (document.body.dataset.page === 'home') {
    setInterval(() => {
      state.heroIndex += 1;
      renderHero();
    }, 6500);
  }
}

document.addEventListener('DOMContentLoaded', init);
