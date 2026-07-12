import React, { useState, useEffect } from 'react';
import { Book, Chapter, Part } from '../types';
import { GENRES, PRESET_GRADIENTS } from '../data';
import { Plus, Trash2, X, Layout, FileText, Check, AlertCircle, Loader2, FolderPlus, Folder, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchBookChapters } from '../libraryService';

interface BookEditorProps {
  book?: Book | null; // If null/undefined, we are creating a new book
  onSave: (book: Book, chapters: Chapter[]) => void;
  onCancel: () => void;
}

export const BookEditor: React.FC<BookEditorProps> = ({
  book,
  onSave,
  onCancel,
}) => {
  const isEditing = !!book;

  // Book metadata states
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('Klassiker');
  const [description, setDescription] = useState('');
  const [coverType, setCoverType] = useState<'gradient' | 'image'>('gradient');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverGradientIndex, setCoverGradientIndex] = useState(0);

  // Chapters management
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(null);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  // Parts management
  const [parts, setParts] = useState<Part[]>([]);
  const [newPartTitle, setNewPartTitle] = useState('');

  // Validation feedback
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize on load/edit change
  useEffect(() => {
    if (book) {
      setTitle(book.title);
      setAuthor(book.author);
      setGenre(book.genre);
      setDescription(book.description);
      setCoverType(book.coverType);
      setCoverUrl(book.coverUrl || '');
      setCoverGradientIndex(book.coverGradientIndex);
      setParts(book.parts || []);
      
      if (book.custom && (!book.chapters || book.chapters.length === 0)) {
        setChaptersLoading(true);
        fetchBookChapters(book.id)
          .then((chaps) => {
            setChapters(chaps);
            if (chaps.length > 0) {
              setActiveChapterIndex(0);
            } else {
              setActiveChapterIndex(null);
            }
            setChaptersLoading(false);
          })
          .catch((err) => {
            console.error("Error loading chapters in editor:", err);
            setChaptersLoading(false);
            setChapters([]);
            setActiveChapterIndex(null);
          });
      } else {
        setChapters([...book.chapters]);
        if (book.chapters.length > 0) {
          setActiveChapterIndex(0);
        } else {
          setActiveChapterIndex(null);
        }
      }
    } else {
      // Set defaults for a brand new book
      setTitle('');
      setAuthor('');
      setGenre('Klassiker');
      setDescription('');
      setCoverType('gradient');
      setCoverUrl('');
      setCoverGradientIndex(0);
      setParts([]);
      // Give a default first chapter
      setChapters([
        {
          id: `chapter-${Date.now()}-1`,
          title: 'Kapitel I: Die Einleitung',
          content: 'Schreibe hier dein erstes Kapitel...',
        }
      ]);
      setActiveChapterIndex(0);
    }
  }, [book]);

  // Handle saving the full book
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMsg('Bitte gib einen Buchtitel an.');
      return;
    }
    if (!author.trim()) {
      setErrorMsg('Bitte gib einen Autor an.');
      return;
    }

    const compiledBook: Book = {
      id: book?.id || `book-${Date.now()}`,
      title: title.trim(),
      author: author.trim(),
      genre,
      description: description.trim(),
      coverType,
      coverUrl: coverType === 'image' ? coverUrl.trim() : undefined,
      coverGradientIndex,
      chapters: [], // We submit chapters separately in callback
      createdAt: book?.createdAt || new Date().toISOString(),
      custom: true,
      parts,
    };

    onSave(compiledBook, chapters);
  };

  // Parts administration handlers
  const handleAddPart = () => {
    if (!newPartTitle.trim()) return;
    const newPart: Part = {
      id: `part-${Date.now()}`,
      title: newPartTitle.trim(),
    };
    setParts((prev) => [...prev, newPart]);
    setNewPartTitle('');
  };

  const handleDeletePart = (partIdToRemove: string) => {
    const confirmed = window.confirm('Möchtest du diesen Buch-Teil wirklich löschen? Zugeordnete Kapitel werden nicht gelöscht, sondern zu eigenständigen Kapiteln herabgestuft.');
    if (confirmed) {
      setParts((prev) => prev.filter((p) => p.id !== partIdToRemove));
      setChapters((prev) =>
        prev.map((c) => (c.partId === partIdToRemove ? { ...c, partId: undefined } : c))
      );
    }
  };

  // Chapter editing operations
  const handleAddChapter = () => {
    const nextNum = chapters.length + 1;
    const newChapter: Chapter = {
      id: `chapter-${Date.now()}-${nextNum}`,
      title: `Kapitel ${nextNum}: Neuer Titel`,
      content: 'Schreibe hier den Inhalt deines neuen Kapitels...',
    };
    const updated = [...chapters, newChapter];
    setChapters(updated);
    setActiveChapterIndex(updated.length - 1);
  };

  const handleDeleteChapter = (idxToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = chapters.filter((_, idx) => idx !== idxToDelete);
    setChapters(updated);

    if (activeChapterIndex === idxToDelete) {
      if (updated.length > 0) {
        setActiveChapterIndex(Math.max(0, idxToDelete - 1));
      } else {
        setActiveChapterIndex(null);
      }
    } else if (activeChapterIndex !== null && activeChapterIndex > idxToDelete) {
      setActiveChapterIndex(activeChapterIndex - 1);
    }
  };

  const handleActiveChapterTitleChange = (val: string) => {
    if (activeChapterIndex === null) return;
    const updated = [...chapters];
    updated[activeChapterIndex] = {
      ...updated[activeChapterIndex],
      title: val,
    };
    setChapters(updated);
  };

  const handleActiveChapterContentChange = (val: string) => {
    if (activeChapterIndex === null) return;
    const updated = [...chapters];
    updated[activeChapterIndex] = {
      ...updated[activeChapterIndex],
      content: val,
    };
    setChapters(updated);
  };

  const handleMoveChapter = (idx: number, direction: 'left' | 'right' | 'up' | 'down', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if ((direction === 'left' || direction === 'up') && idx > 0) {
      const updated = [...chapters];
      const temp = updated[idx];
      updated[idx] = updated[idx - 1];
      updated[idx - 1] = temp;
      setChapters(updated);
      setActiveChapterIndex(idx - 1);
    } else if ((direction === 'right' || direction === 'down') && idx < chapters.length - 1) {
      const updated = [...chapters];
      const temp = updated[idx];
      updated[idx] = updated[idx + 1];
      updated[idx + 1] = temp;
      setChapters(updated);
      setActiveChapterIndex(idx + 1);
    }
  };

  const selectedGradient = PRESET_GRADIENTS[coverGradientIndex] || PRESET_GRADIENTS[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 md:p-6">
      <motion.div
        id="book-editor-modal"
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100"
      >
        
        {/* Editor Header */}
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-serif font-bold text-slate-900">
              {isEditing ? `"${title}" bearbeiten` : 'Neues Buch hochladen / verfassen'}
            </h2>
          </div>
          <button
            id="editor-close-btn"
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-950 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-grow flex flex-col md:flex-row overflow-hidden">
          
          {/* Column 1: Book Info & Metadata */}
          <div className="w-full md:w-[320px] p-5 overflow-y-auto border-r border-slate-100/80 space-y-4 flex-shrink-0 bg-slate-50/45">
            
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 font-medium border border-red-100">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Title input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Buchtitel *</label>
                <input
                  type="text"
                  id="editor-title-input"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="z.B. Moby Dick"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                />
              </div>

              {/* Author input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Autor / Schriftsteller *</label>
                <input
                  type="text"
                  id="editor-author-input"
                  value={author}
                  onChange={(e) => {
                    setAuthor(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="z.B. Herman Melville"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              {/* Genre Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Genre / Kategorie</label>
                <select
                  id="editor-genre-select"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  {GENRES.map((g) => (
                    g !== 'Alle' && <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Cover-Type Switch */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Cover-Art</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCoverType('gradient')}
                    className={`py-2 px-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      coverType === 'gradient'
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Farbverlauf
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverType('image')}
                    className={`py-2 px-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      coverType === 'image'
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Bild-URL
                  </button>
                </div>
              </div>
            </div>

            {/* Cover specific customizers */}
            <div className="p-3.5 bg-slate-100/50 rounded-2xl border border-slate-200/60">
              {coverType === 'gradient' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Elegantes Cover-Design</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRESET_GRADIENTS.map((g, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCoverGradientIndex(idx)}
                        className={`h-9 rounded-lg border-2 relative overflow-hidden flex items-center justify-center transition-all ${
                          coverGradientIndex === idx ? 'border-indigo-600 scale-102 shadow-xs' : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundImage: g.bg }}
                        title={g.name}
                      >
                        {coverGradientIndex === idx && (
                          <Check className="w-4 h-4 text-white bg-black/30 rounded-full p-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Bild-URL (Unsplash, Picsum)</label>
                  <input
                    type="url"
                    id="editor-image-url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
              )}

              {/* Live Preview section */}
              <div className="mt-3.5 pt-3.5 border-t border-slate-200 flex items-center gap-3">
                <div className="w-14 h-20 rounded shadow-md overflow-hidden relative border border-slate-200 flex-shrink-0 flex flex-col justify-between">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/20 z-20 backdrop-blur-[0.5px]" />
                  {coverType === 'gradient' ? (
                    <div 
                      className="w-full h-full p-1 flex flex-col justify-between text-center relative select-none"
                      style={{ backgroundImage: selectedGradient.bg }}
                    >
                      <span className={`text-[5px] uppercase tracking-wide opacity-80 font-mono ${selectedGradient.text}`}>{genre.substring(0, 8)}</span>
                      <span className={`text-[6px] font-bold leading-tight font-serif drop-shadow-xs line-clamp-3 my-auto leading-none ${selectedGradient.accent || 'text-white'}`}>
                        {title || 'Titel'}
                      </span>
                      <span className={`text-[5px] truncate ${selectedGradient.text}`}>{author || 'Autor'}</span>
                    </div>
                  ) : (
                    <img 
                      src={coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=200'} 
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-slate-700">Live-Vorschau</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                    So wird die Buch-Tasche in der Bibliothek aussehen.
                  </p>
                </div>
              </div>
            </div>

            {/* Description Area */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Abschnitts-Beschreibung / Klappentext</label>
              <textarea
                id="editor-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Schreibe eine Inhaltsangabe..."
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white resize-none"
              />
            </div>

            {/* Manage Parts (Teile verwalten) */}
            <div className="p-3 bg-slate-100/50 rounded-2xl border border-slate-200/60 space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-slate-500" />
                Buch-Abschnitte ({parts.length})
              </label>
              
              <div className="flex gap-1.5">
                <input
                  type="text"
                  id="new-part-title-input"
                  value={newPartTitle}
                  onChange={(e) => setNewPartTitle(e.target.value)}
                  placeholder="z.B. Teil I"
                  className="flex-grow px-2.5 py-1 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPart();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddPart}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Neu
                </button>
              </div>

              {parts.length > 0 ? (
                <div className="max-h-24 overflow-y-auto space-y-1 pr-0.5">
                  {parts.map((part) => (
                    <div key={part.id} className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200 shadow-3xs">
                      <span className="text-[11px] text-slate-700 font-medium flex items-center gap-1 truncate">
                        <Folder className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                        {part.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeletePart(part.id)}
                        className="p-0.5 hover:bg-red-50 text-slate-400 hover:text-red-650 rounded transition-all cursor-pointer"
                        title="Teil entfernen"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">Noch keine Abschnitte erstellt.</p>
              )}
            </div>
          </div>

          {/* Column 2: Chapters Outline List (Immer sichtbar!) */}
          <div className="w-full md:w-[260px] p-4 overflow-y-auto border-r border-slate-100/80 flex flex-col bg-slate-50/15 flex-shrink-0">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-650" />
                Kapitel ({chapters.length})
              </label>
              <button
                type="button"
                id="add-chapter-btn"
                onClick={handleAddChapter}
                className="px-2 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                Neu
              </button>
            </div>

            <div className="flex-grow flex flex-col min-h-0 space-y-2">
              {chaptersLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-3 font-semibold justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  Wird geladen...
                </div>
              ) : chapters.length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic text-xs border border-dashed border-slate-200 rounded-xl bg-white/50">
                  Noch keine Kapitel.
                </div>
              ) : (
                <div className="space-y-2 select-none overflow-y-auto max-h-[60vh] pr-1">
                  {chapters.map((chapter, idx) => {
                    const chapterPart = parts.find((p) => p.id === chapter.partId);
                    const isActive = activeChapterIndex === idx;
                    return (
                      <div
                        key={chapter.id || idx}
                        onClick={() => setActiveChapterIndex(idx)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 shadow-3xs relative ${
                          isActive
                            ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-indigo-500/10'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-700'
                        }`}
                      >
                        {/* Title Row */}
                        <div className="flex items-start justify-between gap-1.5 min-w-0">
                          <span className={`text-[10px] font-bold font-mono tracking-tight shrink-0 px-1 py-0.5 rounded ${
                            isActive ? 'bg-indigo-800 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-semibold truncate flex-1 leading-normal">
                            {chapter.title || 'Unbenannt'}
                          </span>
                        </div>

                        {/* Part Badge */}
                        {chapterPart && (
                          <div className={`text-[8.5px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 max-w-full truncate ${
                            isActive ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500'
                          }`}>
                            📁 {chapterPart.title}
                          </div>
                        )}

                        {/* Order Controls & Delete Button inside the directory item */}
                        <div 
                          className="flex items-center justify-between border-t border-dashed pt-1.5 mt-0.5"
                          style={{ borderColor: isActive ? 'rgba(255,255,255,0.15)' : '#f1f5f9' }}
                        >
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={(e) => handleMoveChapter(idx, 'up', e)}
                              className={`p-0.5 rounded transition-colors disabled:opacity-20 disabled:cursor-not-allowed ${
                                isActive ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                              }`}
                              title="Nach oben verschieben"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === chapters.length - 1}
                              onClick={(e) => handleMoveChapter(idx, 'down', e)}
                              className={`p-0.5 rounded transition-colors disabled:opacity-20 disabled:cursor-not-allowed ${
                                isActive ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                              }`}
                              title="Nach unten verschieben"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteChapter(idx, e)}
                            className={`p-0.5 rounded transition-colors ${
                              isActive ? 'hover:bg-red-500/20 text-red-300' : 'hover:bg-red-50 text-slate-400 hover:text-red-650'
                            }`}
                            title="Kapitel löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Active Chapter Content Editor */}
          <div className="w-full md:flex-1 p-5 overflow-y-auto flex flex-col bg-white min-w-0">
            {activeChapterIndex !== null && chapters[activeChapterIndex] ? (
              <div className="flex-grow flex flex-col gap-4 min-h-0 font-sans">
                {/* Active Chapter Details Header */}
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-650" />
                    Kapitel bearbeiten: <span className="text-indigo-650">{chapters[activeChapterIndex].title || 'Unbenannt'}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Kapiteltitel</label>
                    <input
                      type="text"
                      id={`active-chapter-title-${activeChapterIndex}`}
                      value={chapters[activeChapterIndex].title}
                      onChange={(e) => handleActiveChapterTitleChange(e.target.value)}
                      placeholder="z.B. Kapitel I: Der Aufbruch"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Gehört zu Buch-Teil (Sektion)</label>
                    <select
                      id={`active-chapter-part-${activeChapterIndex}`}
                      value={chapters[activeChapterIndex].partId || ''}
                      onChange={(e) => {
                        const updated = [...chapters];
                        updated[activeChapterIndex] = {
                          ...updated[activeChapterIndex],
                          partId: e.target.value || undefined,
                        };
                        setChapters(updated);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-700 cursor-pointer"
                    >
                      <option value="">-- Eigenständiges Kapitel (kein Teil) --</option>
                      {parts.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col flex-1 min-h-0">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Inhalt des Kapitels</label>
                  <textarea
                    id={`active-chapter-content-${activeChapterIndex}`}
                    value={chapters[activeChapterIndex].content}
                    onChange={(e) => handleActiveChapterContentChange(e.target.value)}
                    placeholder="Verfasse den Fließtext für dieses Kapitel. Absätze trennst du am besten mit zwei Zeilenumbrüchen."
                    className="w-full flex-grow min-h-[300px] md:min-h-[380px] p-3 border border-slate-200 rounded-xl text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none overflow-y-auto bg-white"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 my-auto">
                <AlertCircle className="w-10 h-10 text-slate-300 mb-2 animate-pulse" />
                <h3 className="text-sm font-semibold text-slate-700">Kein Kapitel ausgewählt</h3>
                <p className="text-xs text-slate-400 font-serif max-w-xs mt-1 leading-relaxed">
                  Wähle in der mittleren Spalte ein Kapitel aus oder erstelle ein neues, um mit dem Schreiben zu beginnen.
                </p>
              </div>
            )}
          </div>
        </form>

        {/* Footer actions */}
        <footer className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button
            type="button"
            id="editor-btn-cancel"
            onClick={onCancel}
            className="px-4 py-2 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            type="button"
            id="editor-btn-save"
            onClick={handleSubmit}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Buch speichern
          </button>
        </footer>
      </motion.div>
    </div>
  );
};
