import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Compass,
  Info,
  ListFilter,
  Menu,
  Play,
  Plus,
  Search,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import "./App.css";

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "")}/api`;
const STORAGE_KEY = "streamflix.preferences";

function readPreferences() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch (error) {
    console.error("Could not read saved StreamFlix preferences:", error);
    return {};
  }
}

function writePreferences(preferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error("Could not save StreamFlix preferences:", error);
  }
}

function Navbar({
  page,
  setPage,
  query,
  setQuery,
  profile,
  profiles,
  onProfileChange,
  onCreateProfile,
  mobileOpen,
  setMobileOpen,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navigate = (destination) => {
    setPage(destination);
    setMobileOpen(false);
    if (destination !== "search") setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); navigate("home"); }} aria-label="StreamFlix home">
        <span className="brand-symbol" aria-hidden="true"><Clapperboard size={20} /></span>
        <span>STREAM<span className="brand-accent">FLIX</span></span>
      </a>
      <button className="mobile-menu-toggle icon-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileOpen}>
        {mobileOpen ? <X size={21} /> : <Menu size={21} />}
      </button>
      <nav className={`main-nav ${mobileOpen ? "mobile-open" : ""}`} aria-label="Main navigation">
        <button className={page === "home" ? "nav-active" : ""} onClick={() => navigate("home")}>Home</button>
        <button className={page === "tv" ? "nav-active" : ""} onClick={() => navigate("tv")}>TV Shows</button>
        <button className={page === "movies" ? "nav-active" : ""} onClick={() => navigate("movies")}>Movies</button>
        <button className={page === "list" ? "nav-active" : ""} onClick={() => navigate("list")}>My List</button>
        <button className={page === "browse" ? "nav-active" : ""} onClick={() => navigate("browse")}>Browse by Genre</button>
      </nav>
      <div className="header-tools">
        <SearchBar query={query} setQuery={(value) => { setQuery(value); setPage(value ? "search" : "home"); }} />
        <div className="menu-anchor">
          <button className="icon-button notification-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}>
            <Bell size={19} />
            <span className="notification-dot" />
          </button>
          {notificationsOpen && (
            <div className="popover notification-popover">
              <strong>You’re all caught up</strong>
              <p>New picks will show up here.</p>
            </div>
          )}
        </div>
        <div className="menu-anchor">
          <button className="profile-trigger" onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }} aria-expanded={profileOpen} aria-label="Open profile menu">
            <span className="avatar">{profile?.initials || profile?.name?.[0] || "S"}</span>
            <ChevronDown size={14} className={profileOpen ? "chevron-up" : ""} />
          </button>
          {profileOpen && (
            <ProfileMenu
              profiles={profiles}
              profile={profile}
              onProfileChange={(nextProfile) => { onProfileChange(nextProfile); setProfileOpen(false); }}
              onCreateProfile={(nextProfile) => { onCreateProfile(nextProfile); setProfileOpen(false); }}
            />
          )}
        </div>
      </div>
    </header>
  );
}

function SearchBar({ query, setQuery }) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  return (
    <form className={`search-control ${expanded || query ? "search-expanded" : ""}`} role="search" onSubmit={(event) => event.preventDefault()}>
      <button type="button" className="search-icon-button" aria-label={expanded ? "Close search" : "Open search"} onClick={() => { setExpanded(!expanded); if (expanded) setQuery(""); }}>
        {expanded || query ? <X size={19} /> : <Search size={19} />}
      </button>
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setExpanded(true)}
        onKeyDown={(event) => { if (event.key === "Escape") { setQuery(""); setExpanded(false); inputRef.current?.blur(); } }}
        placeholder="Titles, genres, people"
        aria-label="Search titles, genres, cast, and descriptions"
        tabIndex={expanded || query ? 0 : -1}
      />
    </form>
  );
}

function ProfileMenu({ profiles, profile, onProfileChange, onCreateProfile }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [kids, setKids] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [saving, setSaving] = useState(false);

  const createProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setProfileError("");
    try {
      const response = await axios.post(`${API}/profiles`, { name: name.trim(), kids });
      onCreateProfile(response.data);
      setName("");
      setKids(false);
      setCreating(false);
    } catch (requestError) {
      setProfileError(requestError.response?.data?.detail || "Could not create this profile. Please try again.");
      console.error("Failed to create a StreamFlix profile:", requestError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="popover profile-popover">
      {!creating ? (
        <>
          <div className="popover-heading">Who’s watching?</div>
          {profiles.map((item) => (
            <button key={item.id} className={`profile-option ${item.id === profile?.id ? "selected" : ""}`} onClick={() => onProfileChange(item)}>
              <span className={`avatar ${item.kids ? "avatar-kids" : ""}`}>{item.initials || item.name?.[0]}</span>
              <span>{item.name}{item.kids ? <small>Kids profile</small> : null}</span>
              {item.id === profile?.id && <Check size={16} />}
            </button>
          ))}
          <button className="add-profile-button" onClick={() => setCreating(true)}><Plus size={15} /> Add profile</button>
          <div className="profile-menu-note">Profile preferences are saved on this device.</div>
        </>
      ) : (
        <form className="profile-create-form" onSubmit={createProfile}>
          <strong>Create profile</strong>
          <input autoFocus required maxLength={24} value={name} onChange={(event) => setName(event.target.value)} placeholder="Profile name" aria-label="New profile name" />
          <label><input type="checkbox" checked={kids} onChange={(event) => setKids(event.target.checked)} /> Kids profile</label>
          {profileError && <span className="profile-form-error" role="alert">{profileError}</span>}
          <div><button type="button" onClick={() => { setCreating(false); setProfileError(""); }}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving…" : "Create"}</button></div>
        </form>
      )}
    </div>
  );
}

function HeroBanner({ movie, onPlay, onDetails, saved, onToggle }) {
  if (!movie) return null;
  return (
    <section className="hero-banner" style={{ "--hero-image": `url("${movie.backdrop}")` }} aria-labelledby="hero-title">
      <div className="hero-copy">
        <span className="hero-kicker"><span className="kicker-rule" /> STREAMFLIX PICKS</span>
        <h1 id="hero-title">{movie.title}</h1>
        <div className="hero-meta">
          <span className="match-score">{movie.match} match</span>
          <span>{movie.year}</span>
          <span className="rating-chip">★ {movie.rating}</span>
          <span>{movie.genre}</span>
          <span>{movie.runtime}</span>
        </div>
        <p>{movie.description}</p>
        <div className="hero-actions">
          <button className="button button-light" onClick={() => onPlay(movie)}><Play size={19} fill="currentColor" /> Play Now</button>
          <button className="button button-glass" onClick={() => onDetails(movie)}><Info size={19} /> More Info</button>
          <button className="button button-outline" onClick={() => onToggle(movie)} aria-label={saved ? `Remove ${movie.title} from My List` : `Add ${movie.title} to My List`}>
            {saved ? <Check size={19} /> : <Plus size={19} />}
            <span>{saved ? "In My List" : "My List"}</span>
          </button>
        </div>
        <p className="demo-disclaimer">Catalog details are supplied by your StreamFlix API.</p>
      </div>
      <div className="hero-side-label"><span>FEATURED</span><span>{movie.type || "Movie"}</span></div>
      <div className="hero-bottom-fade" />
    </section>
  );
}

function MovieCard({ movie, saved, progress, reaction, onToggle, onPlay, onDetails, onReact }) {
  const [showActions, setShowActions] = useState(false);
  return (
    <article className={`movie-card ${showActions ? "card-actions-open" : ""}`} onFocus={() => setShowActions(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setShowActions(false); }}>
      <div className="poster-wrap">
        <img src={movie.poster} alt={`${movie.title} poster`} loading="lazy" />
        {progress?.duration > 0 && progress.percent > 0 && (
          <div className="watch-progress" aria-label={`${progress.percent}% watched`}><span style={{ width: `${progress.percent}%` }} /></div>
        )}
        <div className="card-actions">
          <button className="card-play" onClick={() => onPlay(movie)} aria-label={`Play ${movie.title}`}><Play size={17} fill="currentColor" /></button>
          <button className="card-icon" onClick={() => onToggle(movie)} aria-label={saved ? `Remove ${movie.title} from My List` : `Add ${movie.title} to My List`}>{saved ? <Check size={17} /> : <Plus size={17} />}</button>
          <button className={`card-icon ${reaction === "like" ? "reacted" : ""}`} onClick={() => onReact(movie, "like")} aria-label={`Like ${movie.title}`} aria-pressed={reaction === "like"}><ThumbsUp size={16} /></button>
          <button className={`card-icon ${reaction === "dislike" ? "reacted" : ""}`} onClick={() => onReact(movie, "dislike")} aria-label={`Dislike ${movie.title}`} aria-pressed={reaction === "dislike"}><ThumbsDown size={16} /></button>
          <button className="card-icon card-info" onClick={() => onDetails(movie)} aria-label={`More information about ${movie.title}`}><ChevronDown size={18} /></button>
        </div>
      </div>
      <div className="card-caption">
        <button className="card-title" onClick={() => onDetails(movie)}>{movie.title}</button>
        <div className="card-meta"><span>{movie.year}</span><span>{movie.genre}</span><span className="score">★ {movie.rating}</span></div>
        <p>{movie.description}</p>
      </div>
    </article>
  );
}

function MovieCarousel({ title, movies, getCardProps, className = "" }) {
  const rowRef = useRef(null);
  if (!movies?.length) return null;
  const scroll = (direction) => rowRef.current?.scrollBy({ left: direction * Math.max(rowRef.current.clientWidth * 0.78, 280), behavior: "smooth" });
  return (
    <section className={`movie-row ${className}`} aria-label={title}>
      <div className="row-heading">
        <h2>{title}</h2>
        <div className="row-controls">
          <button onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`}><ChevronLeft size={20} /></button>
          <button onClick={() => scroll(1)} aria-label={`Scroll ${title} right`}><ChevronRight size={20} /></button>
        </div>
      </div>
      <div className="row-scroller" ref={rowRef} tabIndex={0} aria-label={`${title} titles`}>
        {movies.map((movie) => <MovieCard key={`${title}-${movie.id}`} movie={movie} {...getCardProps(movie)} />)}
      </div>
    </section>
  );
}

function ContinueWatching({ movies, getCardProps }) {
  return <MovieCarousel title="Continue Watching" movies={movies} getCardProps={getCardProps} className="continue-row" />;
}

function MovieDetailsModal({ movie, movies, saved, reaction, onClose, onToggle, onPlay, onReact, onDetails }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const similar = movies.filter((item) => item.id !== movie.id && item.genre === movie.genre).slice(0, 5);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="details-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="modal-close icon-button" onClick={onClose} aria-label="Close details"><X size={22} /></button>
        <div className="details-hero" style={{ "--detail-image": `url("${movie.backdrop}")` }}>
          <div className="details-hero-content">
            <span className="hero-kicker"><span className="kicker-rule" /> {movie.type || "MOVIE"}</span>
            <h2 id="detail-title">{movie.title}</h2>
            <div className="hero-meta"><span className="match-score">{movie.match} match</span><span>{movie.year}</span><span className="rating-chip">★ {movie.rating}</span><span>{movie.runtime}</span></div>
            <div className="detail-actions">
              <button className="button button-light" onClick={() => onPlay(movie)}><Play size={18} fill="currentColor" /> Play</button>
              <button className="button button-circle" onClick={() => onToggle(movie)} aria-label={saved ? "Remove from My List" : "Add to My List"}>{saved ? <Check size={20} /> : <Plus size={20} />}</button>
              <button className={`button button-circle ${reaction === "like" ? "reacted" : ""}`} onClick={() => onReact(movie, "like")} aria-label="Like title" aria-pressed={reaction === "like"}><ThumbsUp size={18} /></button>
              {movie.trailer_url && <a className="button button-glass" href={movie.trailer_url} target="_blank" rel="noreferrer noopener">Watch trailer</a>}
            </div>
            <p className="demo-notice">{movie.video_url ? "Authorized title playback is available." : "No authorized video source is available for this title."}</p>
          </div>
        </div>
        <div className="details-body">
          <div className="details-overview">
              <img className="detail-poster-thumb" src={movie.poster} alt={`${movie.title} poster`} />
              <p className="detail-description">{movie.description}</p>
            <div className="credits">
              <p><span>Cast</span>{movie.cast || "Not provided by the catalog"}</p>
              <p><span>Director</span>{movie.director || "Not provided by the catalog"}</p>
              <p><span>Genres</span>{movie.genre || "Not provided by the catalog"}</p>
              <p><span>Runtime</span>{movie.runtime || "Not provided by the catalog"}</p>
            </div>
          </div>
          {similar.length > 0 && (
            <div className="similar-section">
              <h3>More like this</h3>
              <div className="similar-grid">
                {similar.map((item) => (
                  <button key={item.id} className="similar-card" onClick={() => onDetails(item)}>
                    <img src={item.poster} alt="" loading="lazy" />
                    <span><strong>{item.title}</strong><small>{item.year} · {item.genre}</small></span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DemoPlayer({ movie, progress, onProgress, onClose }) {
  const videoRef = useRef(null);
  const savedTime = useRef(progress?.currentTime || 0);
  const lastSavedAt = useRef(0);

  const restorePlayback = () => {
    if (movie.video_url && videoRef.current && savedTime.current > 0) {
      videoRef.current.currentTime = savedTime.current;
      savedTime.current = 0;
    }
  };
  const saveCurrentProgress = (force = false) => {
    const video = videoRef.current;
    if (!movie.video_url || !video || !Number.isFinite(video.duration) || video.duration === 0) return;
    if (!force && video.currentTime - lastSavedAt.current < 5) return;
    lastSavedAt.current = video.currentTime;
    onProgress(movie, { currentTime: video.currentTime, duration: video.duration, percent: Math.min(100, Math.round((video.currentTime / video.duration) * 100)) });
  };
  return (
    <div className="player-backdrop" role="dialog" aria-modal="true" aria-label={`Demo player for ${movie.title}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="player-window">
        <div className="player-top"><span><b>STREAMFLIX</b> <i>{movie.video_url ? "TITLE PLAYBACK" : "DEMO PLAYER"}</i> · {movie.title}</span><button onClick={onClose} aria-label="Close player"><X size={22} /></button></div>
        {movie.video_url ? (
          <>
            <video ref={videoRef} controls autoPlay playsInline poster={movie.backdrop} onLoadedMetadata={restorePlayback} onTimeUpdate={() => saveCurrentProgress()} onPause={() => saveCurrentProgress(true)}>
              <source src={movie.video_url} />
              Your browser does not support this video.
            </video>
            <div className="player-note">Playback position is saved on this device.</div>
          </>
        ) : (
          <div className="player-unavailable">
            <Clapperboard size={34} />
            <h2>Playback isn’t available yet</h2>
            <p>This catalog title has no authorized video or trailer source configured. StreamFlix won’t substitute unrelated footage.</p>
            <button className="button button-glass" onClick={onClose}>Back to browsing</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="skeleton-content" role="status" aria-label="Loading StreamFlix titles">
      {[1, 2, 3].map((row) => <div className="skeleton-row" key={row}><div className="skeleton-heading" /> <div className="skeleton-posters">{[1, 2, 3, 4, 5].map((item) => <div className="skeleton-poster" key={item} />)}</div></div>)}
      <span className="sr-only">Loading titles…</span>
    </div>
  );
}

function App() {
  const [movies, setMovies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(readPreferences);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState("home");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [genre, setGenre] = useState("All genres");
  const [sort, setSort] = useState("popular");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      try {
        const [movieResponse, profileResponse] = await Promise.all([
          axios.get(`${API}/movies`),
          axios.get(`${API}/profiles`),
        ]);
        if (active) {
          setMovies(movieResponse.data);
          setProfiles(profileResponse.data);
          const savedProfileId = readPreferences().profileId;
          const currentProfile = profileResponse.data.find((item) => item.id === savedProfileId) || profileResponse.data[0] || null;
          setProfile(currentProfile);
        }
      } catch (requestError) {
        if (active) {
          setError("Could not load the catalog or profiles. Check that the StreamFlix API is running and try again.");
          console.error("Failed to load the StreamFlix catalog:", requestError);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCatalog();
    return () => { active = false; };
  }, []);

  const profilePreferences = preferences.profiles?.[profile?.id] || { watchlist: [], progress: {}, reactions: {} };
  const savedIds = profilePreferences.watchlist || [];
  const watchlistMovies = useMemo(() => movies.filter((movie) => savedIds.includes(movie.id)), [movies, savedIds]);
  const genres = useMemo(() => ["All genres", ...new Set(movies.map((movie) => movie.genre).filter(Boolean))], [movies]);
  const filteredMovies = useMemo(() => {
    const term = query.trim().toLowerCase();
    let result = movies.filter((movie) => {
      const searchedFields = [movie.title, movie.genre, movie.description, movie.cast, movie.director].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = !term || searchedFields.includes(term);
      const matchesGenre = genre === "All genres" || movie.genre === genre;
      const matchesList = page !== "list" || savedIds.includes(movie.id);
      const matchesMedia = page !== "tv" || /series|tv/i.test(movie.type || "");
      return matchesQuery && matchesGenre && matchesList && matchesMedia;
    });
    if (sort === "newest") result = [...result].sort((a, b) => b.year - a.year);
    if (sort === "rating") result = [...result].sort((a, b) => b.rating - a.rating);
    if (sort === "popularity") result = [...result].sort((a, b) => b.popularity - a.popularity);
    return result;
  }, [movies, query, genre, page, savedIds, sort]);
  const continueWatching = useMemo(() => movies.filter((movie) => (profilePreferences.progress?.[movie.id]?.percent || 0) > 0 && (profilePreferences.progress?.[movie.id]?.percent || 0) < 95), [movies, profilePreferences.progress]);
  const featured = movies[0];

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const updateProfilePreferences = useCallback((updater) => {
    setPreferences((current) => {
      const existing = current.profiles?.[profile?.id] || { watchlist: [], progress: {}, reactions: {} };
      const next = { ...current, profiles: { ...current.profiles, [profile?.id]: updater(existing) } };
      writePreferences(next);
      return next;
    });
  }, [profile]);

  const toggleWatchlist = useCallback((movie) => {
    if (!profile?.id) return;
    const isSaved = savedIds.includes(movie.id);
    updateProfilePreferences((current) => ({
      ...current,
      watchlist: isSaved ? current.watchlist.filter((id) => id !== movie.id) : [...current.watchlist, movie.id],
    }));
    setNotice(isSaved ? `${movie.title} removed from My List` : `${movie.title} added to My List`);
  }, [profile, savedIds, updateProfilePreferences]);

  const saveProgress = useCallback((movie, progress) => {
    updateProfilePreferences((current) => ({ ...current, progress: { ...current.progress, [movie.id]: progress } }));
  }, [updateProfilePreferences]);

  const setReaction = useCallback((movie, reaction) => {
    updateProfilePreferences((current) => ({
      ...current,
      reactions: { ...current.reactions, [movie.id]: current.reactions[movie.id] === reaction ? "" : reaction },
    }));
  }, [updateProfilePreferences]);

  const selectProfile = (nextProfile) => {
    setProfile(nextProfile);
    const nextPreferences = { ...preferences, profileId: nextProfile.id };
    setPreferences(nextPreferences);
    writePreferences(nextPreferences);
  };

  const createProfile = (nextProfile) => {
    setProfiles((current) => [...current, nextProfile]);
    selectProfile(nextProfile);
  };

  const getCardProps = (movie) => ({
    saved: savedIds.includes(movie.id),
    progress: profilePreferences.progress?.[movie.id],
    reaction: profilePreferences.reactions?.[movie.id],
    onToggle: toggleWatchlist,
    onPlay: setPlaying,
    onDetails: setSelectedMovie,
    onReact: setReaction,
  });

  const openBrowse = () => {
    setPage("browse");
    setQuery("");
    setGenre("All genres");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageTitle = page === "list" ? "My List" : page === "search" ? "Search results" : page === "browse" ? "Browse by genre" : page === "tv" ? "TV Shows" : "Movies";
  const showSearchGrid = page === "search" || page === "list" || page === "browse" || page === "movies" || page === "tv";
  const rows = useMemo(() => {
    if (page !== "home" || query) return [];
    const first = featured ? movies.filter((movie) => movie.id !== featured.id) : movies;
    const rowsList = [
      ["Trending Now", first],
      ["Popular on StreamFlix", movies],
      ["Top Rated", [...movies].sort((a, b) => b.rating - a.rating)],
      ["New Releases", [...movies].sort((a, b) => b.year - a.year)],
      ...genres.slice(1).map((category) => [category, movies.filter((movie) => movie.genre === category)]),
    ];
    if (watchlistMovies.length) rowsList.push(["My List", watchlistMovies]);
    return rowsList;
  }, [page, query, movies, featured, genres, watchlistMovies]);

  return (
    <div className="app-shell" onClick={(event) => {
      if (event.target === event.currentTarget) {
        setMobileOpen(false);
      }
    }}>
      <Navbar page={page} setPage={(nextPage) => { setPage(nextPage); setGenre("All genres"); }} query={query} setQuery={setQuery} profile={profile} profiles={profiles} onProfileChange={selectProfile} onCreateProfile={createProfile} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={17} /></button></div>}
      {!loading && page === "home" && featured && !query && (
        <HeroBanner movie={featured} onPlay={setPlaying} onDetails={setSelectedMovie} saved={savedIds.includes(featured.id)} onToggle={toggleWatchlist} />
      )}
      {loading ? <SkeletonRows /> : (
        <main className={`content-area ${page === "home" && !query ? "home-content" : "browse-content"}`}>
          {page === "home" && !query ? (
            <>
              {continueWatching.length > 0 && <ContinueWatching movies={continueWatching} getCardProps={getCardProps} />}
              {rows.map(([title, rowMovies]) => <MovieCarousel key={title} title={title} movies={rowMovies} getCardProps={getCardProps} />)}
              {!movies.length && <EmptyState title="Your catalog is empty" description="Add titles to the StreamFlix API to start browsing." />}
            </>
          ) : (
            <>
              <div className="browse-heading">
                <div>
                  <span className="eyebrow-muted">{page === "list" ? "YOUR COLLECTION" : "FIND YOUR NEXT FAVORITE"}</span>
                  <h1>{pageTitle}</h1>
                </div>
                <div className="browse-filters">
                  <label className="filter-select"><ListFilter size={16} /><select aria-label="Filter by genre" value={genre} onChange={(event) => setGenre(event.target.value)}><option value="All genres">All genres</option>{genres.slice(1).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  <label className="filter-select"><select aria-label="Sort titles" value={sort} onChange={(event) => setSort(event.target.value)}><option value="popular">Catalog order</option>{movies.some((movie) => Number.isFinite(movie.popularity)) && <option value="popularity">Popularity</option>}<option value="newest">Release year</option><option value="rating">Rating</option></select></label>
                </div>
              </div>
              {page === "browse" && <div className="genre-pills" aria-label="Choose a genre">{genres.map((item) => <button key={item} className={genre === item ? "genre-selected" : ""} onClick={() => setGenre(item)}>{item}</button>)}</div>}
              {filteredMovies.length ? (
                <div className="movie-grid">
                  {filteredMovies.map((movie) => <MovieCard key={movie.id} movie={movie} {...getCardProps(movie)} />)}
                </div>
              ) : (
                <EmptyState
                  title={page === "list" ? "Your list is waiting" : page === "tv" ? "No TV shows in this catalog yet" : query ? "No titles found" : "Nothing to show yet"}
                  description={page === "list" ? "Add a title to My List and it will be saved to this profile on this device." : page === "tv" ? "Your current API catalog contains movies only. TV shows will appear here when the API provides them." : query ? "Try a different title, genre, cast member, or description." : "Try another genre or come back when the catalog has more titles."}
                />
              )}
            </>
          )}
        </main>
      )}
      <footer className="site-footer"><span className="footer-brand">STREAMFLIX</span><span>Made for the next great watch.</span><button onClick={openBrowse}><Compass size={15} /> Explore genres</button></footer>
      {selectedMovie && <MovieDetailsModal movie={selectedMovie} movies={movies} saved={savedIds.includes(selectedMovie.id)} reaction={profilePreferences.reactions?.[selectedMovie.id]} onClose={() => setSelectedMovie(null)} onToggle={toggleWatchlist} onPlay={(movie) => { setSelectedMovie(null); setPlaying(movie); }} onReact={setReaction} onDetails={setSelectedMovie} />}
      {playing && <DemoPlayer movie={playing} progress={profilePreferences.progress?.[playing.id]} onProgress={saveProgress} onClose={() => setPlaying(null)} />}
      {notice && <div className="toast-message" role="status"><Check size={16} />{notice}</div>}
    </div>
  );
}

function EmptyState({ title, description }) {
  return <div className="empty-state"><span className="empty-icon"><Bookmark size={24} /></span><h2>{title}</h2><p>{description}</p></div>;
}

export default App;
