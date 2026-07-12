import React, { useState, useEffect } from 'react';
import { Book, Chapter, ThemeType, FontType, FontSize } from '../types';
import { PRESET_GRADIENTS } from '../data';
import { 
  ArrowLeft, 
  BookOpen, 
  Settings, 
  Sliders, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  Bookmark, 
  BookmarkCheck,
  RotateCcw,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReaderModeProps {
  book: Book;
  onClose: () => void;
  savedChapterId?: string;
  onSaveProgress: (bookId: string, chapterId: string) => void;
}

export const ReaderMode: React.FC<ReaderModeProps> = ({
  book,
  onClose,
  savedChapterId,
  onSaveProgress,
}) => {
  // Sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Active chapter list state (lazy loaded for Firestore collections)
  const [chapters, setChapters] = useState<Chapter[]>(book.chapters || []);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  // Active chapter state
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

  // Preference states
  const [theme, setTheme] = useState<ThemeType>('sepia');
  const [fontFamily, setFontFamily] = useState<FontType>('serif');
  const [fontSize, setFontSize] = useState<FontSize>('lg');

  // Interactive page states
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Fetch chapters if needed
  useEffect(() => {
    if (book.custom && (!book.chapters || book.chapters.length === 0)) {
      setChaptersLoading(true);
      import('../libraryService').then(({ fetchBookChapters }) => {
        fetchBookChapters(book.id)
          .then((chaps) => {
            setChapters(chaps);
            setChaptersLoading(false);
          })
          .catch((err) => {
            console.error("Failed to load chapters:", err);
            setChaptersLoading(false);
          });
      });
    } else {
      setChapters(book.chapters || []);
    }
  }, [book]);

  // Track if we have aligned the initial index with savedChapterId
  const [initialized, setInitialized] = useState(false);

  // Reset initialized state when book changes
  useEffect(() => {
    setInitialized(false);
    setActiveChapterIndex(0);
  }, [book.id]);

  // Setup initial saved chapter if available
  useEffect(() => {
    if (chapters.length > 0 && !initialized) {
      const idx = savedChapterId ? chapters.findIndex(c => c.id === savedChapterId) : -1;
      if (idx !== -1) {
        setActiveChapterIndex(idx);
      } else {
        setActiveChapterIndex(0);
      }
      setInitialized(true);
    } else if (chapters.length === 0 && !chaptersLoading && !initialized) {
      setInitialized(true);
    }
  }, [chapters, chaptersLoading, savedChapterId, initialized]);

  const activeChapter: Chapter | undefined = chapters[activeChapterIndex];

  // Save progress automatically when changing chapters (only after initialization alignment)
  useEffect(() => {
    if (initialized && chapters.length > 0) {
      const activeChap = chapters[activeChapterIndex];
      if (activeChap) {
        onSaveProgress(book.id, activeChap.id);
      }
    }
  }, [initialized, activeChapterIndex, book.id, chapters, onSaveProgress]);

  // Navigate chapters
  const handlePrevChapter = () => {
    if (activeChapterIndex > 0) {
      setActiveChapterIndex(activeChapterIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextChapter = () => {
    if (activeChapterIndex < chapters.length - 1) {
      setActiveChapterIndex(activeChapterIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // CSS mappings for reader theme
  const themeClasses = {
    light: 'bg-[#FAF8F5] text-slate-800 border-slate-200',
    sepia: 'bg-[#FAF2E5] text-amber-950 border-amber-200/50',
    dark: 'bg-[#141416] text-slate-200 border-slate-800',
  };

  const controlBgClasses = {
    light: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200',
    sepia: 'bg-[#F2E6CD] text-amber-900 hover:bg-[#EBDEC3] border-amber-200',
    dark: 'bg-[#1E1E22] text-slate-300 hover:bg-[#25252A] border-[#2E2E33]',
  };

  const textFontClasses = {
    serif: 'font-serif tracking-normal leading-relaxed',
    sans: 'font-sans tracking-wide leading-relaxed',
    mono: 'font-mono tracking-tight text-xs leading-loose',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg md:text-xl',
    xl: 'text-xl md:text-2xl',
    '2xl': 'text-2xl md:text-3xl',
  };

  // Helper to highlight terms or format paragraph blocks
  const renderParagraphs = (text: string) => {
    if (!text) return null;
    
    return text.split('\n\n').map((paragraph, index) => {
      if (!paragraph.trim()) return null;

      // Simple implementation of keyword highlight if search is active
      if (searchText && searchOpen) {
        const parts = paragraph.split(new RegExp(`(${searchText})`, 'gi'));
        return (
          <p key={index} className="mb-6 indent-0 md:indent-8">
            {parts.map((part, i) => 
              part.toLowerCase() === searchText.toLowerCase() ? (
                <mark key={i} className="bg-yellow-200 text-slate-900 rounded-xs px-0.5 font-bold">
                  {part}
                </mark>
              ) : (
                part
              )
            )}
          </p>
        );
      }

      return (
        <p key={index} className="mb-6 indent-0 md:indent-8">
          {paragraph}
        </p>
      );
    });
  };

  // Render cover stats/header if no chapters exists
  const noChapters = chapters.length === 0;

  return (
    <div id="reader-root" className={`fixed inset-0 z-50 flex overflow-hidden transition-colors duration-300 ${themeClasses[theme]}`}>
      
      {/* Dynamic Slide-in Chapters Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            id="reader-sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={`border-r h-full flex flex-col flex-shrink-0 z-30 transition-colors duration-300 relative ${
              theme === 'dark' ? 'bg-[#19191B] border-slate-800' : theme === 'sepia' ? 'bg-[#EDE4D3] border-amber-900/10' : 'bg-slate-50 border-slate-200'
            }`}
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b flex items-center justify-between border-current/10">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-700" />
                <span className="font-serif font-bold text-sm tracking-wide uppercase line-clamp-1">Inhalt</span>
              </div>
              <button 
                id="close-sidebar-btn"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 opacity-70 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metadata */}
            <div className="p-4 border-b border-current/10 bg-black/5">
              <p className="font-serif font-bold text-base line-clamp-1">{book.title}</p>
              <p className="text-xs opacity-75 mt-0.5">von {book.author}</p>
              <div className="mt-3 w-full bg-slate-300/30 rounded-full h-1 h-[3px]">
                <div 
                  className="bg-amber-600 h-1 h-[3px] rounded-full transition-all duration-300"
                  style={{ width: `${(chapters.length > 0 ? ((activeChapterIndex + 1) / chapters.length) * 100 : 0)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] opacity-60 mt-2 font-mono">
                <span>{chapters.length > 0 ? `${activeChapterIndex + 1} / ${chapters.length} Kapitel` : '0 Kapitel'}</span>
                <span>{chapters.length > 0 ? `${Math.round(((activeChapterIndex + 1) / chapters.length) * 100)}% gelesen` : '0%'}</span>
              </div>
            </div>

            {/* Chapter List */}
            <div className="flex-grow overflow-y-auto p-2 space-y-1.5 no-scrollbar">
              {chaptersLoading ? (
                <div className="p-8 text-center text-xs opacity-60 flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-amber-600 border-t-transparent animate-spin"/>
                  Kapitel laden...
                </div>
              ) : book.parts && book.parts.length > 0 ? (
                <div className="space-y-4 font-sans">
                  {/* Standalone Chapters first */}
                  {chapters.some((c) => !c.partId) && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest px-2 mb-1">Einzelne Kapitel</p>
                      {chapters.map((chapter, idx) => {
                        if (chapter.partId) return null;
                        return (
                          <button
                            id={`chapter-link-${chapter.id}`}
                            key={chapter.id}
                            onClick={() => {
                              setActiveChapterIndex(idx);
                              if (window.innerWidth < 768) setSidebarOpen(false); // Auto-close on mobile
                            }}
                            className={`w-full text-left p-2.5 rounded-lg transition-all text-sm flex items-start gap-2.5 cursor-pointer ${
                              activeChapterIndex === idx 
                                ? theme === 'dark' ? 'bg-[#2E2E33] font-semibold text-white' : theme === 'sepia' ? 'bg-[#DDD3BE] font-semibold text-amber-950' : 'bg-slate-200/80 font-semibold'
                                : 'hover:bg-black/5 opacity-80'
                            }`}
                          >
                            <span className="font-mono text-xs opacity-50 mt-0.5">{String(idx + 1).padStart(2, '0')}.</span>
                            <span className="line-clamp-2 leading-snug">{chapter.title || `Kapitel ${idx + 1}`}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Grouped by Parts/Teile */}
                  {book.parts.map((part) => {
                    const partChapters = chapters.map((c, i) => ({ chapter: c, originalIndex: i }))
                      .filter(item => item.chapter.partId === part.id);

                    if (partChapters.length === 0) return null;

                    return (
                      <div key={part.id} className="space-y-1">
                        <div className="px-2 py-1 bg-black/5 rounded-md flex items-center gap-1.5 select-none">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-850 dark:text-amber-450 leading-none">
                            📁 {part.title}
                          </span>
                        </div>
                        <div className="space-y-1 pl-1 border-l border-current/10 ml-2">
                          {partChapters.map(({ chapter, originalIndex }) => (
                            <button
                              id={`chapter-link-${chapter.id}`}
                              key={chapter.id}
                              onClick={() => {
                                setActiveChapterIndex(originalIndex);
                                if (window.innerWidth < 768) setSidebarOpen(false); // Auto-close on mobile
                              }}
                              className={`w-full text-left p-2 rounded-lg transition-all text-sm flex items-start gap-2.5 cursor-pointer ${
                                activeChapterIndex === originalIndex 
                                  ? theme === 'dark' ? 'bg-[#2E2E33] font-semibold text-white' : theme === 'sepia' ? 'bg-[#DDD3BE] font-semibold text-amber-950' : 'bg-slate-200/80 font-semibold'
                                  : 'hover:bg-black/5 opacity-80'
                              }`}
                            >
                              <span className="font-mono text-xs opacity-50 mt-0.5">{String(originalIndex + 1).padStart(2, '0')}.</span>
                              <span className="line-clamp-2 leading-snug">{chapter.title || `Kapitel ${originalIndex + 1}`}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Flat Chapter list (no parts predefined) */
                chapters.map((chapter, idx) => (
                  <button
                    id={`chapter-link-${chapter.id}`}
                    key={chapter.id}
                    onClick={() => {
                      setActiveChapterIndex(idx);
                      if (window.innerWidth < 768) setSidebarOpen(false); // Auto-close on mobile
                    }}
                    className={`w-full text-left p-2.5 rounded-lg transition-all text-sm flex items-start gap-2.5 cursor-pointer ${
                      activeChapterIndex === idx 
                        ? theme === 'dark' ? 'bg-[#2E2E33] font-semibold text-white' : theme === 'sepia' ? 'bg-[#DDD3BE] font-semibold text-amber-950' : 'bg-slate-200/80 font-semibold'
                        : 'hover:bg-black/5 opacity-80'
                    }`}
                  >
                    <span className="font-mono text-xs opacity-50 mt-0.5">{String(idx + 1).padStart(2, '0')}.</span>
                    <span className="line-clamp-2 leading-snug">{chapter.title || `Kapitel ${idx + 1}`}</span>
                  </button>
                ))
              )}

              {noChapters && (
                <div className="p-6 text-center opacity-50 text-xs font-serif">
                  Keine Kapitel vorhanden.
                </div>
              )}
            </div>

            {/* Close / Return Button inside sidebar */}
            <div className="p-4 border-t border-current/10">
              <button
                id="reader-back-library-btn"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-black/5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Zurück zur Bibliothek
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Reader Stage */}
      <div className="flex-grow flex flex-col h-full overflow-hidden relative">
        
        {/* Navigation Toolbar */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-current/10">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                id="open-sidebar-btn"
                onClick={() => setSidebarOpen(true)}
                className={`p-2 rounded-lg ${controlBgClasses[theme]}`}
                title="Menü öffnen"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            
            <span className="font-serif font-bold text-sm md:text-base tracking-tight line-clamp-1 max-w-[200px] md:max-w-[400px]">
              {book.title}
            </span>
          </div>

          {/* Quick Reader Controls */}
          <div className="flex items-center gap-2">
            
            {/* Search toggler */}
            <div className="relative">
              <button
                id="toggle-search-btn"
                onClick={() => setSearchOpen(!searchOpen)}
                className={`p-2 rounded-lg ${controlBgClasses[theme]} ${searchOpen ? 'ring-2 ring-amber-500' : ''}`}
                title="Im Buch suchen"
              >
                <Search className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {searchOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={`absolute right-0 top-11 p-2 rounded-xl border shadow-xl w-64 flex gap-1 z-40 ${
                      theme === 'dark' ? 'bg-[#19191B] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <input 
                      type="text"
                      id="reader-search-input"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Suchbegriff eingeben..."
                      className="flex-grow text-xs p-1.5 focus:outline-none rounded bg-slate-500/10 text-inherit"
                      autoFocus
                    />
                    {searchText && (
                      <button 
                        onClick={() => setSearchText('')}
                        className="p-1 px-2 text-xs bg-slate-500/20 rounded hover:bg-slate-500/30"
                      >
                        X
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bookmark button */}
            <button
              id="bookmark-page-btn"
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`p-2 rounded-lg transition-colors ${controlBgClasses[theme]}`}
              title={isBookmarked ? "Lesezeichen entfernen" : "Lesezeichen hinzufügen"}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-emerald-500 fill-emerald-500" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>

            {/* Settings Toggler */}
            <button
              id="reader-settings-btn"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${controlBgClasses[theme]}`}
              title="Schrifteinstellungen"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Return Direct */}
            <button
              id="header-back-library-btn"
              onClick={onClose}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold ${controlBgClasses[theme]} flex items-center gap-1`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Schließen</span>
            </button>
          </div>
        </header>

        {/* Floating Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              id="reader-settings-panel"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`absolute top-16 right-4 p-5 rounded-2xl border shadow-2xl w-80 z-40 transition-colors duration-300 ${
                theme === 'dark' ? 'bg-[#1E1E22] border-slate-800' : theme === 'sepia' ? 'bg-[#EDE4D3] border-amber-900/10' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-current/10">
                <span className="font-serif font-bold text-sm tracking-wide">Lese-Einstellungen</span>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-black/5 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Theme selectors */}
              <div className="space-y-4 text-xs font-medium">
                <div>
                  <label className="opacity-75 block mb-1.5">Design-Modus</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      id="theme-light-btn"
                      onClick={() => setTheme('light')}
                      className={`py-2 px-1 rounded-lg border text-center font-medium ${
                        theme === 'light' ? 'border-indigo-600 ring-1 ring-indigo-600 bg-white font-semibold' : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      Klassisch
                    </button>
                    <button
                      id="theme-sepia-btn"
                      onClick={() => setTheme('sepia')}
                      className={`py-2 px-1 rounded-lg border text-center font-medium ${
                        theme === 'sepia' ? 'border-amber-700 ring-1 ring-amber-700 bg-[#FAF2E5] text-amber-950 font-semibold' : 'border-slate-300 bg-[#FAF2E5] text-amber-900'
                      }`}
                    >
                      Sepia
                    </button>
                    <button
                      id="theme-dark-btn"
                      onClick={() => setTheme('dark')}
                      className={`py-2 px-1 rounded-lg border text-center font-medium ${
                        theme === 'dark' ? 'border-slate-400 ring-1 ring-slate-400 bg-slate-900 text-white font-semibold' : 'border-slate-300 bg-[#141416] text-slate-300'
                      }`}
                    >
                      Nacht
                    </button>
                  </div>
                </div>

                {/* Font Choice */}
                <div>
                  <label className="opacity-75 block mb-1.5">Schriftart</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      id="font-serif-btn"
                      onClick={() => setFontFamily('serif')}
                      className={`py-2 rounded-lg border ${
                        fontFamily === 'serif' ? 'border-indigo-600 bg-black/5 font-semibold font-serif' : 'border-slate-300 font-serif'
                      }`}
                    >
                      Serif
                    </button>
                    <button
                      id="font-sans-btn"
                      onClick={() => setFontFamily('sans')}
                      className={`py-2 rounded-lg border ${
                        fontFamily === 'sans' ? 'border-indigo-600 bg-black/5 font-semibold font-sans' : 'border-slate-300 font-sans'
                      }`}
                    >
                      Sans
                    </button>
                    <button
                      id="font-mono-btn"
                      onClick={() => setFontFamily('mono')}
                      className={`py-2 rounded-lg border ${
                        fontFamily === 'mono' ? 'border-indigo-600 bg-black/5 font-semibold font-mono' : 'border-slate-300 font-mono'
                      }`}
                    >
                      Mono
                    </button>
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="opacity-75">Schriftgröße</label>
                    <span className="font-mono opacity-80 uppercase">{fontSize}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(['sm', 'base', 'lg', 'xl', '2xl'] as FontSize[]).map((sz) => (
                      <button
                        id={`fontsize-${sz}-btn`}
                        key={sz}
                        onClick={() => setFontSize(sz)}
                        className={`py-1.5 rounded-md border text-center text-xs uppercase ${
                          fontSize === sz ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : 'border-slate-300 hover:bg-black/5'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area / Standard Reader canvas */}
        <div className="flex-grow overflow-y-auto px-4 py-8 md:py-12 md:px-12 lg:px-24 focus:outline-none">
          
          <div className="max-w-2xl mx-auto flex flex-col min-h-full justify-between">
            
            {!noChapters && activeChapter ? (
              <motion.article
                id={`reader-article-${activeChapter.id}`}
                key={activeChapter.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className={`${textFontClasses[fontFamily]} ${textSizeClasses[fontSize]} mb-8`}
              >
                {/* Lesezeichen Badge */}
                {isBookmarked && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 font-serif font-semibold italic mb-4">
                    <BookmarkCheck className="w-3.5 h-3.5" /> Setzt Lesezeichen auf dieser Seite
                  </div>
                )}
                
                {/* Chapter Title */}
                <h2 className="font-serif text-2xl md:text-3.5xl font-bold mb-8 md:mb-10 text-center tracking-tight leading-tight uppercase border-b-2 border-current/10 pb-4">
                  {activeChapter.title}
                </h2>

                {/* Chapter Content paragraphs */}
                <div className="prose prose-slate max-w-none text-justify">
                  {renderParagraphs(activeChapter.content)}
                </div>
              </motion.article>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                <div className="w-24 h-36 bg-slate-300/30 rounded border border-current/15 mb-6 flex items-center justify-center font-mono text-3xl opacity-50 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/10" />
                  📖
                </div>
                <h3 className="font-serif text-xl font-bold mb-2">Dieses Buch hat keine Kapitel</h3>
                <p className="text-sm opacity-70 max-w-sm mb-6">
                  Erstelle oder bearbeite Kapitel über den "Bearbeiten"-Button im Bibliothekskatalog, um Text einzufügen.
                </p>
              </div>
            )}

            {/* Book End / Footer navigation */}
            {!noChapters && (
              <div className="pt-6 border-t border-current/10 mt-auto flex items-center justify-between gap-4 py-6 font-medium">
                <button
                  id="reader-prev-chapter-btn"
                  onClick={handlePrevChapter}
                  disabled={activeChapterIndex === 0}
                  className={`flex items-center gap-1 py-2 px-3.5 rounded-lg border text-xs transition-opacity ${
                    activeChapterIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voriges Kapitel
                </button>

                <div className="text-xs opacity-60 text-center text-slate-500 font-mono">
                  Kapitel {activeChapterIndex + 1} von {chapters.length}
                </div>

                <button
                  id="reader-next-chapter-btn"
                  onClick={handleNextChapter}
                  disabled={activeChapterIndex === chapters.length - 1}
                  className={`flex items-center gap-1 py-2 px-3.5 rounded-lg border text-xs transition-opacity ${
                    activeChapterIndex === chapters.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5'
                  }`}
                >
                  Nächstes Kapitel
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
