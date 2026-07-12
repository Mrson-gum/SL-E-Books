import { useState, useEffect, useCallback, useRef } from 'react';
import { Book, Chapter, UserProfile, Message, Follow, BookLike, BookRead } from './types';
import { GENRES } from './data';
import { BookCard } from './components/BookCard';
import { ReaderMode } from './components/ReaderMode';
import { BookEditor } from './components/BookEditor';
import { ProfileDashboard, AVATAR_PRESETS } from './components/ProfileDashboard';
import { 
  BookOpen, 
  Plus, 
  Search, 
  BookMarked,
  Tags,
  Library,
  Feather,
  Sparkles,
  RefreshCw,
  LogOut,
  User as UserIcon,
  Loader2,
  Heart,
  Mail,
  ThumbsUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Firebase imports
import { auth, signInWithPopup, signOut, googleProvider } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  subscribeToBooks, 
  saveBookToFirestore, 
  deleteBookFromFirestore, 
  saveUserProgress, 
  subscribeToProgress,
  subscribeToLikes,
  toggleLikeBook,
  subscribeToProfiles,
  saveProfile,
  subscribeToFollows,
  toggleFollow,
  subscribeToReceivedMessages,
  subscribeToSentMessages,
  sendMessage,
  markMessageAsRead,
  deleteMessage,
  subscribeToReads,
  recordBookRead
} from './libraryService';

export default function App() {
  // Authentication states
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Books collections split (dynamic from Firestore, classic static presets)
  const [firestoreBooks, setFirestoreBooks] = useState<Book[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Selection states
  const [selectedBookToRead, setSelectedBookToRead] = useState<Book | null>(null);
  const [selectedBookToEdit, setSelectedBookToEdit] = useState<Book | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Filters
  const [selectedGenre, setSelectedGenre] = useState('Alle');
  const [searchQuery, setSearchQuery] = useState('');

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Reader progress keeper (bookId -> chapterId)
  const [readingProgress, setReadingProgress] = useState<Record<string, string>>({});

  // Profiles, Follows, Likes and Mailbox states
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [bookLikes, setBookLikes] = useState<BookLike[]>([]);
  const [bookReads, setBookReads] = useState<BookRead[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [activeProfileUserId, setActiveProfileUserId] = useState<string | null>(null);

  const currentUserProfile = user ? profiles.find((p) => p.userId === user.uid) : null;

  // Keep progressRef current to optimize handleSaveProgress comparisons safely across callback renders
  const progressRef = useRef(readingProgress);
  useEffect(() => {
    progressRef.current = readingProgress;
  }, [readingProgress]);

  // Auth observer
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Sync real-time profiles
  useEffect(() => {
    const unsub = subscribeToProfiles((pList) => {
      setProfiles(pList);
    });
    return () => unsub();
  }, []);

  // Sync real-time follows
  useEffect(() => {
    const unsub = subscribeToFollows((fList) => {
      setFollows(fList);
    });
    return () => unsub();
  }, []);

  // Sync real-time likes
  useEffect(() => {
    const unsub = subscribeToLikes((lList) => {
      setBookLikes(lList);
    });
    return () => unsub();
  }, []);

  // Sync real-time unique book reads
  useEffect(() => {
    const unsub = subscribeToReads((rList) => {
      setBookReads(rList);
    });
    return () => unsub();
  }, []);

  // Sync real-time messages & Auto profile generation
  useEffect(() => {
    if (!user) {
      setReceivedMessages([]);
      setSentMessages([]);
      return;
    }

    const hasProfile = profiles.some(p => p.userId === user.uid);
    if (!hasProfile && profiles.length > 0) {
      const emailPrefixName = user.displayName || user.email?.split('@')[0] || 'Unbenannter Autor';
      saveProfile({
        userId: user.uid,
        displayName: emailPrefixName,
        bio: 'Willkommen in meinem literarischen Salon! Ich lese und verfasse leidenschaftlich gerne Werke.',
        avatarIndex: 1,
        followersCount: 0,
        followingCount: 0,
        createdAt: new Date().toISOString()
      }).catch(err => console.error('Auto profile initial registration failed', err));
    }

    const unsubRec = subscribeToReceivedMessages(user.uid, (mList) => {
      setReceivedMessages(mList);
    });
    const unsubSent = subscribeToSentMessages(user.uid, (mList) => {
      setSentMessages(mList);
    });

    return () => {
      unsubRec();
      unsubSent();
    };
  }, [user, profiles.length]);

  // Load favorites locally on start
  useEffect(() => {
    const cachedFavorites = localStorage.getItem('ebook_platform_favorites');
    if (cachedFavorites) {
      try {
        setFavorites(JSON.parse(cachedFavorites));
      } catch (e) {
        console.error("Failed to load offline favorites", e);
      }
    }
  }, []);

  const handleToggleFavorite = (bookId: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId];
      localStorage.setItem('ebook_platform_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const handleToggleLike = async (bookId: string) => {
    if (!user) {
      alert("Bitte melde dich an, um dieses E-Book mit einem 'Gefällt mir' zu versehen!");
      return;
    }
    const isCurrentlyLiked = bookLikes.some((like) => like.userId === user.uid && like.bookId === bookId);
    try {
      await toggleLikeBook(user.uid, bookId, isCurrentlyLiked);
    } catch (err) {
      console.error("Failed to toggle book like status:", err);
    }
  };

  // Real-time catalog observer
  useEffect(() => {
    const unsubscribeBooks = subscribeToBooks(
      (books) => {
        setFirestoreBooks(books);
        setDbLoading(false);
      },
      (err) => {
        console.error("Failed to fetch real-time books", err);
        setDbLoading(false);
      }
    );
    return () => unsubscribeBooks();
  }, []);

  // Sync progress based on auth profile
  useEffect(() => {
    if (user) {
      const unsubscribeProgress = subscribeToProgress(user.uid, (progressMap) => {
        setReadingProgress(progressMap);
      });
      return () => unsubscribeProgress();
    } else {
      // Load standard guest progress locally
      const cachedProgress = localStorage.getItem('ebook_platform_progress');
      if (cachedProgress) {
        try {
          setReadingProgress(JSON.parse(cachedProgress));
        } catch (e) {
          console.error("Failed to load offline progress", e);
        }
      }
    }
  }, [user]);

  // Only display user made/uploaded books from Firestore, removing local presets
  const books = firestoreBooks;

  // Google authentication actions
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setReadingProgress({}); // Clear current instance progress
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Cloud & local CRUD actions
  const handleAddNewBook = async (newBook: Book, chapters: Chapter[]) => {
    if (!user) {
      alert("Bitte melde dich an, um Bücher hochzuladen!");
      return;
    }
    try {
      await saveBookToFirestore(newBook, chapters, user.uid, user.email || '');
      setIsCreating(false);
    } catch (err: any) {
      if (err?.message === 'QUOTA_EXCEEDED') {
        alert("Firestore-Schreibquote überschritten! Das Buch wurde sicher lokal in deinem Browser gespeichert. Andere Leser können es im Moment vielleicht nicht sehen, aber du kannst es uneingeschränkt lesen.");
        setFirestoreBooks((prev) => [newBook, ...prev]);
        setIsCreating(false);
      } else {
        console.error("Add failed:", err);
        alert("Konnte das Buch nicht hochladen. Bitte prüfe deine Autorisierung.");
      }
    }
  };

  const handleUpdateBook = async (updatedBook: Book, chapters: Chapter[]) => {
    if (!user) return;
    try {
      await saveBookToFirestore(updatedBook, chapters, user.uid, user.email || '');
      setSelectedBookToEdit(null);
      
      // Update reader mode focus instantly
      if (selectedBookToRead && selectedBookToRead.id === updatedBook.id) {
        setSelectedBookToRead(updatedBook);
      }
    } catch (err: any) {
      if (err?.message === 'QUOTA_EXCEEDED') {
        alert("Firestore-Updatequote überschritten! Deine Änderungen wurden sicher lokal in deinem Browser gesichert.");
        setFirestoreBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));
        setSelectedBookToEdit(null);
        
        if (selectedBookToRead && selectedBookToRead.id === updatedBook.id) {
          setSelectedBookToRead(updatedBook);
        }
      } else {
        console.error("Update failed:", err);
        alert("Buch-Update fehlgeschlagen.");
      }
    }
  };

  const handleDeleteBook = async (id: string) => {
    const confirmed = window.confirm('Möchtest du dieses Salon-Buch wirklich für alle Leser endgültig löschen?');
    if (confirmed) {
      try {
        await deleteBookFromFirestore(id);
        
        // Clean up locally represented state trace
        const progressCopy = { ...readingProgress };
        delete progressCopy[id];
        setReadingProgress(progressCopy);
        if (!user) {
          localStorage.setItem('ebook_platform_progress', JSON.stringify(progressCopy));
        }
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Löschen fehlgeschlagen.");
      }
    }
  };

  // Progress update handler from reading component
  const handleSaveProgress = useCallback(async (bookId: string, chapterId: string) => {
    // Read current state from the ref safely to avoid stale closure references
    if (progressRef.current[bookId] === chapterId) {
      return;
    }
    
    setReadingProgress((prev) => {
      const updated = {
        ...prev,
        [bookId]: chapterId,
      };
      
      if (!user) {
        localStorage.setItem('ebook_platform_progress', JSON.stringify(updated));
      }
      
      return updated;
    });

    if (user) {
      try {
        await saveUserProgress(user.uid, bookId, chapterId);
      } catch (err) {
        console.error("Could not sync progression marker to Firestore", err);
      }
    }
  }, [user]);

  // Reset local guest triggers
  const handleResetDefaults = () => {
    const confirmed = window.confirm('Möchtest du deinen Lesungsverlauf zurücksetzen?');
    if (confirmed) {
      setReadingProgress({});
      localStorage.removeItem('ebook_platform_progress');
    }
  };

  // Compute filtered books list
  const filteredBooks = books.filter((book) => {
    const matchesGenre = selectedGenre === 'Alle' || book.genre.toLowerCase() === selectedGenre.toLowerCase();
    const matchesFavorite = !showOnlyFavorites || favorites.includes(book.id);
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      book.title.toLowerCase().includes(query) || 
      book.author.toLowerCase().includes(query) ||
      (book.description && book.description.toLowerCase().includes(query));
    return matchesGenre && matchesFavorite && matchesSearch;
  });

  // Calculate dynamic stats
  const totalBooks = books.length;
  const customBooksCount = books.filter(b => b.custom).length;
  const startedBooksCount = Object.keys(readingProgress).length;

  return (
    <div id="library-root" className="min-h-screen bg-[#FDFBF7] text-slate-900 pb-16 selection:bg-amber-100 selection:text-amber-900 antialiased font-sans">
      
      {/* Editorial Decorative Header Banner */}
      <header className="border-b border-amber-900/5 bg-[#FCF8F0] relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 opacity-5 bg-radial from-amber-700 to-transparent pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            {/* Title / Brand */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-850">
                <Library className="w-5 h-5 text-amber-800" />
                <span className="font-mono text-xs uppercase tracking-widest font-bold">Freie Digitale Bibliothek</span>
              </div>
              <h1 className="text-3xl md:text-4.5xl font-serif font-black tracking-tight text-slate-900 leading-none">
                SL E-books
              </h1>
            </div>

            {/* Quick CTAs and Auth Profile */}
            <div className="flex flex-wrap items-center gap-4">
              {authLoading ? (
                <div className="flex items-center gap-2 py-2 px-3 border border-slate-200 rounded-xl bg-white/50">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <span className="text-xs text-slate-400 font-mono">Nutzer...</span>
                </div>
              ) : user ? (
                <div className="flex items-center gap-3 py-1.5 pl-2 pr-3 border border-slate-200 rounded-xl bg-white shadow-xs">
                  <button
                    type="button"
                    id="open-my-profile-btn"
                    onClick={() => setActiveProfileUserId(user.uid)}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-all text-left focus:outline-none bg-transparent"
                    title="Mein Profil & Postfach öffnen"
                  >
                    {currentUserProfile?.avatarUrl ? (
                      <img 
                        src={currentUserProfile.avatarUrl} 
                        alt={currentUserProfile.displayName || 'Profil'} 
                        className="w-7 h-7 rounded-lg border border-slate-100 object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : currentUserProfile?.avatarIndex !== undefined && AVATAR_PRESETS[currentUserProfile.avatarIndex] ? (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm border bg-slate-50 border-slate-150 select-none">
                        {AVATAR_PRESETS[currentUserProfile.avatarIndex].emoji}
                      </div>
                    ) : user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName || 'Profil'} 
                        className="w-7 h-7 rounded-lg border border-slate-100" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                        {user.email?.[0].toUpperCase()}
                      </div>
                    )}
                    <div className="hidden sm:block">
                      <p className="text-[10px] text-slate-405 font-bold uppercase leading-none">Salon Autor</p>
                      <p className="text-xs font-bold text-slate-700 hover:text-indigo-650 transition-colors line-clamp-1 leading-normal">
                        {currentUserProfile?.displayName || user.displayName || user.email?.split('@')[0]}
                      </p>
                    </div>
                  </button>

                  {/* Header mini Mailbox indicator badge */}
                  <button
                    type="button"
                    id="header-mailbox-btn"
                    onClick={() => setActiveProfileUserId(user.uid)}
                    className="p-1.5 hover:bg-slate-55 hover:text-indigo-600 rounded-lg text-slate-450 transition-colors cursor-pointer relative focus:outline-none"
                    title={`${receivedMessages.filter(m => !m.isRead).length} ungelesene Briefe im Postfach`}
                  >
                    <Mail className="w-4 h-4" />
                    {receivedMessages.filter(m => !m.isRead).length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                      </span>
                    )}
                  </button>

                  <div className="w-[1px] h-4 bg-slate-200" />

                  <button
                    id="auth-logout-btn"
                    onClick={handleLogout}
                    className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition-colors cursor-pointer"
                    title="Abmelden"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  id="auth-login-btn"
                  onClick={handleLogin}
                  className="py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                >
                  <UserIcon className="w-3.5 h-3.5 text-amber-800" />
                  Anmelden mit Google
                </button>
              )}

              {user ? (
                <button
                  id="create-book-btn"
                  onClick={() => setIsCreating(true)}
                  className="py-2.5 px-5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Buch verfassen
                </button>
              ) : (
                <button
                  id="create-book-btn-disabled"
                  onClick={handleLogin}
                  className="py-2.5 px-5 bg-slate-200 text-slate-500 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer opacity-75 hover:bg-slate-300 transition-all"
                  title="Bitte melde dich an, um ein E-Book freizuschalten"
                >
                  <Plus className="w-4 h-4" />
                  Buch hochladen
                </button>
              )}
            </div>
          </div>

          {/* Library statistic chips */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 md:mt-12 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="p-2 border-r border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Gesamtkatalog</span>
                <span className="text-sm font-bold text-slate-800 font-serif">{totalBooks} Bücher</span>
              </div>
            </div>

            <div className="p-2 md:border-r border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-700">
                <Feather className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Eigene Uploads</span>
                <span className="text-sm font-bold text-slate-800 font-serif">{customBooksCount} verfasst</span>
              </div>
            </div>

            <div className="p-2 border-r border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                <BookMarked className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">In Lesung</span>
                <span className="text-sm font-bold text-slate-800 font-serif">{startedBooksCount} angefangen</span>
              </div>
            </div>

            <div className="p-2 flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg text-yellow-700">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Literaturgüte</span>
                <span className="text-sm font-bold text-slate-800 font-serif">Klassik-Standard</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main library body content */}
      <main className="max-w-6xl mx-auto px-4 mt-8 md:mt-12 space-y-6">
        
        {/* Controls Layout: Filter and Search */}
        <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Genre scrolling list */}
          <div className="flex items-center gap-3 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
            <Tags className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1 hidden sm:inline" />
            <div className="flex gap-1 items-center">
              {GENRES.map((g) => (
                <button
                  id={`genre-filter-${g}`}
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    selectedGenre === g
                      ? 'bg-slate-900 text-white font-bold shadow-xs'
                      : 'hover:bg-slate-200/60 text-slate-600'
                  }`}
                >
                  {g}
                </button>
              ))}

              {/* Favorites Toggle Button inside the flow list */}
              <div className="w-[1px] h-5 bg-slate-200 mx-1.5 hidden sm:block" />
              <button
                id="toggle-only-favorites-btn"
                type="button"
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 border border-slate-200 ${
                  showOnlyFavorites
                    ? 'bg-red-500 hover:bg-red-650 border-red-500 text-white shadow-xs'
                    : 'bg-white hover:bg-red-50 text-slate-600 hover:text-red-500'
                }`}
                title="Lieblingsbücher filtern"
              >
                <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-current text-white' : 'text-red-500'}`} />
                <span>Favoriten {favorites.length > 0 ? `(${favorites.length})` : ''}</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72 flex-shrink-0">
            <input
              type="text"
              id="library-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Titel, Autor, Beschreibung..."
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-700 bg-white"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 py-0.5 px-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-950 text-[10px] font-bold"
                title="Suche leeren"
              >
                X
              </button>
            )}
          </div>
        </div>

        {/* Books Grid */}
        <AnimatePresence mode="popLayout">
          {filteredBooks.length > 0 ? (
            <motion.div 
              id="books-grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              layout
            >
              {filteredBooks.map((book) => {
                const ownerProfile = profiles.find((p) => p.userId === book.ownerId);
                return (
                  <BookCard
                    key={book.id}
                    book={book}
                    currentUserId={user?.uid}
                    onRead={(b) => {
                      setSelectedBookToRead(b);
                      if (user) {
                        recordBookRead(user.uid, b.id);
                      }
                    }}
                    onEdit={(b) => setSelectedBookToEdit(b)}
                    onDelete={handleDeleteBook}
                    isFavorite={favorites.includes(book.id)}
                    onToggleFavorite={handleToggleFavorite}
                    isLiked={user ? bookLikes.some((like) => like.userId === user.uid && like.bookId === book.id) : false}
                    likesCount={bookLikes.filter((like) => like.bookId === book.id).length}
                    onToggleLike={handleToggleLike}
                    onViewProfile={(profileId) => setActiveProfileUserId(profileId)}
                    ownerDisplayName={ownerProfile?.displayName}
                    readsCount={bookReads.filter((read) => read.bookId === book.id).length}
                  />
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              id="empty-library-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center p-12 md:p-20 border border-slate-200/50 rounded-2xl bg-white"
            >
              <div className="w-16 h-16 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold text-slate-800">Keine E-Books gefunden</h3>
              <p className="text-sm text-slate-400 max-w-sm mt-1 mb-6">
                Leider entsprechen keine geladenen Bücher deiner Suche oder der gewählten Sparte. Erschaffe selbst eins!
              </p>
              
              <div className="flex gap-2">
                {selectedGenre !== 'Alle' || searchQuery ? (
                  <button
                    onClick={() => {
                      setSelectedGenre('Alle');
                      setSearchQuery('');
                    }}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Filter zurücksetzen
                  </button>
                ) : null}
                <button
                  onClick={() => setIsCreating(true)}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Echtes Buch schreiben
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Reader Overlay View */}
      <AnimatePresence>
        {selectedBookToRead && (
          <ReaderMode
            book={selectedBookToRead}
            onClose={() => setSelectedBookToRead(null)}
            savedChapterId={readingProgress[selectedBookToRead.id]}
            onSaveProgress={handleSaveProgress}
          />
        )}
      </AnimatePresence>

      {/* Book Form (Create / Edit) Modal */}
      <AnimatePresence>
        {(isCreating || selectedBookToEdit) && (
          <BookEditor
            book={selectedBookToEdit}
            onSave={(editedBook, chaps) => {
              if (selectedBookToEdit) {
                handleUpdateBook(editedBook, chaps);
              } else {
                handleAddNewBook(editedBook, chaps);
              }
            }}
            onCancel={() => {
              setIsCreating(false);
              setSelectedBookToEdit(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Profile & Mailbox Dashboard Modal Overlay */}
      <AnimatePresence>
        {activeProfileUserId && (
          <ProfileDashboard
            currentUserId={user?.uid || ''}
            currentUserEmail={user?.email || ''}
            currentUserName={user?.displayName || user?.email?.split('@')[0] || 'Unbenannter Autor'}
            targetUserId={activeProfileUserId}
            profiles={profiles}
            follows={follows}
            receivedMessages={receivedMessages}
            sentMessages={sentMessages}
            booksCount={books.filter(b => b.ownerId === activeProfileUserId).length}
            onClose={() => setActiveProfileUserId(null)}
            onSaveProfile={saveProfile}
            onToggleFollow={toggleFollow}
            onSendMessage={sendMessage}
            onMarkMessageRead={markMessageAsRead}
            onDeleteMessage={deleteMessage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
