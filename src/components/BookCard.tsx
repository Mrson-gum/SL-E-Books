import React from 'react';
import { Book } from '../types';
import { PRESET_GRADIENTS } from '../data';
import { BookOpen, Edit, Trash2, Heart, ThumbsUp } from 'lucide-react';
import { motion } from 'motion/react';

interface BookCardProps {
  book: Book;
  currentUserId?: string | null;
  onRead: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  isLiked?: boolean;
  likesCount?: number;
  onToggleLike?: (id: string) => void;
  onViewProfile?: (userId: string) => void;
  ownerDisplayName?: string;
  readsCount?: number;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  currentUserId,
  onRead,
  onEdit,
  onDelete,
  isFavorite,
  onToggleFavorite,
  isLiked = false,
  likesCount = 0,
  onToggleLike,
  onViewProfile,
  ownerDisplayName,
  readsCount = 0,
}) => {
  const isGradient = book.coverType === 'gradient';
  const gradient = PRESET_GRADIENTS[book.coverGradientIndex] || PRESET_GRADIENTS[0];
  
  // Can only modify if user owns the book, or if it is a legacy unsaved local-only book
  const canModify = !book.custom || (book.ownerId === 'system') || (currentUserId && book.ownerId === currentUserId);

  return (
    <motion.div
      id={`book-card-${book.id}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md overflow-hidden flex flex-col h-[420px] group transition-all"
    >
      {/* Dynamic Book Cover Frame */}
      <div className="relative h-56 w-full overflow-hidden bg-slate-50 flex items-center justify-center p-4 border-b border-slate-50 animate-fade-in">
        
        {/* Favorite Button Overlay on Cover */}
        <button
          id={`btn-favorite-${book.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(book.id);
          }}
          className={`absolute top-3 left-3 z-10 p-2 rounded-full backdrop-blur-md shadow-xs border border-white/20 transition-all cursor-pointer ${
            isFavorite 
              ? 'bg-red-500/90 text-white hover:bg-red-600 scale-105' 
              : 'bg-white/85 hover:bg-white text-slate-700 hover:text-red-650'
          }`}
          title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
        >
          <Heart className={`w-3.5 h-3.5 transition-transform duration-200 active:scale-130 ${isFavorite ? 'fill-current text-white font-bold' : ''}`} />
        </button>

        {/* Like Button Overlay on Cover */}
        <button
          id={`btn-like-${book.id}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleLike) onToggleLike(book.id);
          }}
          className={`absolute top-14 left-3 z-10 py-1.5 px-2.5 rounded-full backdrop-blur-md shadow-xs border border-white/20 transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-mono font-black ${
            isLiked 
              ? 'bg-blue-500/95 text-white hover:bg-blue-600 scale-105' 
              : 'bg-white/85 hover:bg-white text-slate-700 hover:text-blue-600'
          }`}
          title={isLiked ? "Gefällt mir entfernen" : "Gefällt mir"}
        >
          <ThumbsUp className={`w-3 h-3 transition-transform duration-200 active:scale-130 ${isLiked ? 'fill-current text-white font-bold' : ''}`} />
          <span>{likesCount}</span>
        </button>
        
        {/* Subtle background blur of the cover image for depth */}
        {isGradient ? (
          <div 
            className="absolute inset-0 opacity-10 blur-xl scale-110" 
            style={{ backgroundImage: gradient.bg }}
          />
        ) : (
          <img
            src={book.coverUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-10 blur-xl scale-110"
          />
        )}

        {/* The Actual Book Representation */}
        <div className="relative z-10 w-28 h-40 rounded shadow-lg overflow-hidden flex-shrink-0 transition-transform group-hover:scale-105 duration-300 border border-black/10 flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/20 z-20 backdrop-blur-[0.5px]" title="Book Spine Highlight" />
          
          {isGradient ? (
            <div 
              className="w-full h-full p-2.5 flex flex-col justify-between text-center relative select-none"
              style={{ backgroundImage: gradient.bg }}
            >
              <div className={`text-[9px] uppercase tracking-wider opacity-75 font-mono ${gradient.text}`}>
                {book.genre}
              </div>
              <div className="flex-grow flex items-center justify-center px-1">
                <span className={`text-xs font-serif font-bold leading-tight line-clamp-3 antialiased ${gradient.accent || 'text-white'}`}>
                  {book.title}
                </span>
              </div>
              <div className={`text-[8px] font-medium truncate ${gradient.text}`}>
                {book.author}
              </div>
            </div>
          ) : (
            <img
              src={book.coverUrl}
              alt={book.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to gradient if image fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </div>

        {/* Genre Badge */}
        <span className="absolute top-3 right-3 z-10 px-2 py-0.5 text-[10px] font-semibold bg-slate-900/80 backdrop-blur-xs text-white rounded-full uppercase tracking-wider">
          {book.genre}
        </span>
      </div>

      {/* Book Information */}
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between">
            <h3 className="font-serif text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-amber-700 transition-colors">
              {book.title}
            </h3>
          </div>
          <p className="text-sm text-slate-500 font-medium font-serif italic">von <span className="text-slate-700 font-sans not-italic font-bold">{book.author}</span></p>
          <div className="flex items-center justify-between gap-1.5 mt-1.5">
            {book.custom && (book.ownerEmail || ownerDisplayName) ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onViewProfile && book.ownerId) {
                    onViewProfile(book.ownerId);
                  }
                }}
                className="text-[10px] text-indigo-700 font-semibold bg-indigo-50/70 hover:bg-indigo-150 border border-indigo-100 hover:border-indigo-200 px-2 py-0.5 rounded-md font-sans transition-colors cursor-pointer text-left focus:outline-none truncate max-w-[150px]"
                title={`${ownerDisplayName || book.ownerEmail?.split('@')[0] || 'Autor'}'s Profil anzeigen`}
              >
                Aufgeladen von: {ownerDisplayName || book.ownerEmail?.split('@')[0] || 'Unbekannt'}
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 font-semibold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">Klassiker</span>
            )}

            {/* Unique Reads Counter (Bottom-Right of Info block) */}
            <div 
              className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-semibold font-sans ml-auto shrink-0 select-none cursor-help"
              title={`${readsCount} einzigartige Leser haben dieses Buch geöffnet`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{readsCount} gelesen</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2 h-8 font-normal leading-relaxed">
            {book.description || 'Keine Beschreibung verfügbar.'}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-50 flex items-center gap-2">
          {/* Read button */}
          <button
            id={`btn-read-${book.id}`}
            onClick={() => onRead(book)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Lesen
          </button>

          {/* Edit button */}
          {canModify && (
            <button
              id={`btn-edit-${book.id}`}
              onClick={() => onEdit(book)}
              className="p-2 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              title="Buch bearbeiten"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}

          {/* Delete button */}
          {canModify && (
            <button
              id={`btn-delete-${book.id}`}
              onClick={() => onDelete(book.id)}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-100 cursor-pointer"
              title="Buch löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
