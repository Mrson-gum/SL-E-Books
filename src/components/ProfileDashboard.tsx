import React, { useState, useEffect } from 'react';
import { UserProfile, Message, Follow } from '../types';
import { 
  X, 
  User as UserIcon, 
  Mail, 
  Send, 
  UserPlus, 
  UserMinus, 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  Trash2, 
  Check, 
  Clock,
  ArrowRight,
  Inbox,
  PenTool
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Lovely visual preset avatars representing literary genres/personas
export const AVATAR_PRESETS = [
  { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Natur & Essay', emoji: '🌱' },
  { bg: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Bibliophil & Klassik', emoji: '📜' },
  { bg: 'bg-slate-900 text-slate-100 border-slate-700', label: 'Krimi & Noir', emoji: '🕵️' },
  { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Lyrik & Romantik', emoji: '🌹' },
  { bg: 'bg-sky-55 text-sky-800 border-sky-200', label: 'Abenteuer & Reise', emoji: '⛵' },
  { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Phantastik & Drama', emoji: '🎭' },
];

interface ProfileDashboardProps {
  currentUserId: string;
  currentUserEmail: string;
  currentUserName: string;
  targetUserId: string; // The profile to view/edit (can be current user or another author)
  profiles: UserProfile[];
  follows: Follow[];
  receivedMessages: Message[];
  sentMessages: Message[];
  booksCount: number; // number of books written by this targetUserId
  onClose: () => void;
  onSaveProfile: (profile: UserProfile) => Promise<void>;
  onToggleFollow: (followerId: string, followedId: string, isFollowing: boolean) => Promise<void>;
  onSendMessage: (senderId: string, senderEmail: string, senderName: string, receiverId: string, receiverName: string, title: string, content: string) => Promise<void>;
  onMarkMessageRead: (msgId: string) => Promise<void>;
  onDeleteMessage: (msgId: string) => Promise<void>;
}

export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({
  currentUserId,
  currentUserEmail,
  currentUserName,
  targetUserId,
  profiles,
  follows,
  receivedMessages,
  sentMessages,
  booksCount,
  onClose,
  onSaveProfile,
  onToggleFollow,
  onSendMessage,
  onMarkMessageRead,
  onDeleteMessage,
}) => {
  const isOwnProfile = currentUserId === targetUserId;

  // Find or instantiate target user profile
  const existingProfile = profiles.find(p => p.userId === targetUserId);
  const targetProfileName = existingProfile?.displayName || (isOwnProfile ? currentUserName : 'Literarischer Salon Gast');

  // Input fields for editing own profile
  const [displayName, setDisplayName] = useState(targetProfileName);
  const [bio, setBio] = useState(existingProfile?.bio || '');
  const [avatarIndex, setAvatarIndex] = useState(existingProfile?.avatarIndex ?? 1);
  const [avatarUrl, setAvatarUrl] = useState(existingProfile?.avatarUrl || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Sync real-time updates when profile changes
  useEffect(() => {
    if (existingProfile) {
      setDisplayName(existingProfile.displayName || '');
      setBio(existingProfile.bio || '');
      setAvatarIndex(existingProfile.avatarIndex ?? 1);
      setAvatarUrl(existingProfile.avatarUrl || '');
    }
  }, [existingProfile]);

  // Mailbox tabs: 'received' | 'sent' | 'compose'
  const [mailboxTab, setMailboxTab] = useState<'received' | 'sent'>('received');
  // Message composing state
  const [composeTitle, setComposeTitle] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  // Active message details modal state
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

  // Dynamic Follow count calculations
  const followers = follows.filter(f => f.followedId === targetUserId);
  const following = follows.filter(f => f.followerId === targetUserId);
  const isFollowing = follows.some(f => f.followerId === currentUserId && f.followedId === targetUserId);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await onSaveProfile({
        userId: currentUserId,
        displayName: displayName.trim() || currentUserName,
        bio: bio.trim(),
        avatarIndex,
        avatarUrl: avatarUrl.trim() || undefined,
        followersCount: existingProfile?.followersCount || 0,
        followingCount: existingProfile?.followingCount || 0,
        createdAt: existingProfile?.createdAt || new Date().toISOString()
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUserId) {
      alert("Bitte melde dich an, um Autoren zu folgen!");
      return;
    }
    await onToggleFollow(currentUserId, targetUserId, isFollowing);
  };

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      alert("Bitte melde dich an, um Briefe zu senden!");
      return;
    }
    if (!composeTitle.trim() || !composeContent.trim()) return;
    setSendLoading(true);
    try {
      await onSendMessage(
        currentUserId,
        currentUserEmail,
        currentUserName,
        targetUserId,
        targetProfileName,
        composeTitle.trim(),
        composeContent.trim()
      );
      setComposeTitle('');
      setComposeContent('');
      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
        setComposeOpen(false);
      }, 2500);
    } catch (err) {
      console.error('Failed to send mail', err);
    } finally {
      setSendLoading(false);
    }
  };

  // Quick reply setup
  const [replyTitle, setReplyTitle] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);

  const handleSendReply = async (originalMsg: Message) => {
    if (!replyContent.trim()) return;
    setSendLoading(true);
    try {
      await onSendMessage(
        currentUserId,
        currentUserEmail,
        currentUserName,
        originalMsg.senderId,
        originalMsg.senderName,
        replyTitle || `Aw: ${originalMsg.title}`,
        replyContent.trim()
      );
      setReplyContent('');
      setReplyOpen(false);
      setExpandedMessageId(null);
      alert('Nachricht erfolgreich gesendet!');
    } catch (e) {
      console.error(e);
    } finally {
      setSendLoading(false);
    }
  };

  const currentAvatar = AVATAR_PRESETS[existingProfile?.avatarIndex ?? avatarIndex] || AVATAR_PRESETS[1];

  return (
    <div id="profile-dashboard-backdrop" className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div
        id="profile-dashboard-modal"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#FCFBF8] border border-slate-200 rounded-3xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col font-sans"
      >
        
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-amber-800" />
            <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-slate-400">
              {isOwnProfile ? 'Mein Autorenprofil & Mailbox' : 'Autoren-Auskunft'}
            </span>
          </div>
          <button 
            id="close-profile-btn" 
            onClick={onClose}
            className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg hover:text-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            Schließen
          </button>
        </div>

        {/* Modal content body splitting profile status & actions */}
        <div className="flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-0">
          
          {/* LEFT SPLIT (8 COLUMNS): Profile details and content */}
          <div className="md:col-span-7 p-6 border-r border-slate-100 overflow-y-auto space-y-6">
            
            {/* Header / Avatar info row */}
            <div className="flex items-start gap-4">
              {existingProfile?.avatarUrl ? (
                <img 
                  src={existingProfile.avatarUrl} 
                  alt={targetProfileName} 
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0 animate-fade-in" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // fall back gracefully
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border ${currentAvatar.bg} shadow-xs shrink-0 select-none`}>
                  {currentAvatar.emoji}
                </div>
              )}
              <div className="space-y-1 py-1 flex-grow">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-serif font-black text-slate-900 leading-none">
                    {targetProfileName}
                  </h2>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                    {isOwnProfile ? 'Ich' : 'Autor'}
                  </span>
                </div>
                <p className="text-[10px] font-mono font-medium text-slate-400">
                  Rolle: {AVATAR_PRESETS[existingProfile?.avatarIndex ?? avatarIndex]?.label || 'Salon-Mitglied'}
                </p>

                {/* Follower Stats row */}
                <div className="flex gap-4 pt-1.5 text-xs text-slate-500">
                  <span className="font-serif">
                    <strong className="text-slate-800 font-sans font-bold">{followers.length}</strong> Follower
                  </span>
                  <span className="font-serif">
                    <strong className="text-slate-800 font-sans font-bold">{following.length}</strong> Folgt
                  </span>
                  <span className="font-serif">
                    <strong className="text-slate-800 font-sans font-bold">{booksCount}</strong> Bücher
                  </span>
                </div>
              </div>
            </div>

            {/* Editing / Bio card */}
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2">Profil bearbeiten</p>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Anzeigename</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg bg-slate-50"
                    placeholder="Name eingeben"
                    maxLength={100}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kurzbiographie (Über mich)</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full text-xs font-normal p-2.5 border border-slate-200 rounded-lg bg-slate-50 resize-none"
                    placeholder="Erzähle den Salon-Lesern etwas über dich und deine literarische Leidenschaft..."
                    maxLength={1000}
                  />
                </div>
                <div className="p-3 bg-indigo-50/40 border border-indigo-150/60 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Eigenes Profilbild (Web-URL)</label>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="text-[9px] bg-red-55 text-red-650 px-2 py-0.5 rounded border border-red-250 font-bold hover:bg-red-100 cursor-pointer"
                      >
                        Bild-Link entfernen
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full text-xs font-semibold p-2 border border-indigo-100 rounded-lg bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-455"
                    placeholder="Einen Link eintragen (z.B. https://images.unsplash.com/photo-...)"
                    maxLength={2000}
                  />
                  
                  <div>
                    <p className="text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1">Oder ein wunderschönes Portrait auswählen:</p>
                    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                      {[
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
                      ].map((pUrl, pIdx) => (
                        <button
                          type="button"
                          key={pIdx}
                          onClick={() => setAvatarUrl(pUrl)}
                          className={`relative w-8 h-8 rounded-lg overflow-hidden border-2 cursor-pointer shrink-0 transition-all ${
                            avatarUrl === pUrl ? 'border-indigo-600 scale-105 shadow-md' : 'border-slate-200 hover:scale-105'
                          }`}
                        >
                          <img src={pUrl} alt="Preset Portrait" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {avatarUrl && (
                    <div className="flex items-center gap-2 p-1.5 bg-white border border-indigo-100 rounded-lg">
                      <img 
                        src={avatarUrl} 
                        alt="Profilbild Vorschau" 
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold text-emerald-700 leading-tight">Vorschau Aktiv</p>
                        <p className="text-[8px] text-slate-400 font-mono truncate">{avatarUrl}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Literarisches Genre wählen (Avatar)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVATAR_PRESETS.map((avatar, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setAvatarIndex(idx)}
                        className={`p-2 rounded-xl text-left border flex items-center gap-2 transition-all cursor-pointer ${
                          avatarIndex === idx 
                            ? `${avatar.bg} border-indigo-500 ring-1 ring-indigo-500 scale-[1.02]`
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="text-xl select-none">{avatar.emoji}</span>
                        <div>
                          <p className="text-[10px] font-bold leading-tight">{avatar.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    {saveLoading ? 'Speichert...' : 'Speichern'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-100/50 rounded-2xl border border-slate-200/50 space-y-2">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Biographie</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-serif whitespace-pre-wrap">
                    {existingProfile?.bio || 'Dieser Autor hat noch keine Biographie verfasst. Ein geheimnisvoller Geist im Salon...'}
                  </p>
                </div>

                {isOwnProfile ? (
                  <button
                    id="edit-bio-btn"
                    onClick={() => setIsEditing(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 hover:shadow-xs transition-colors cursor-pointer"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    Profil und Biographie anpassen
                  </button>
                ) : (
                  <div className="flex gap-2.5">
                    {/* Follow button */}
                    <button
                      id={`follow-author-btn-${targetUserId}`}
                      onClick={handleFollowToggle}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border ${
                        isFollowing
                          ? 'bg-red-50 text-red-650 border-red-200 hover:bg-red-100'
                          : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-md'
                      }`}
                    >
                      {isFollowing ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                      <span>{isFollowing ? 'Entfolgen' : 'Autor folgen'}</span>
                    </button>

                    {/* Open Message Dialog */}
                    <button
                      id="toggle-compose-mail-btn"
                      onClick={() => setComposeOpen(!composeOpen)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{composeOpen ? 'Schließen' : 'Brief senden'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Compose mail wrapper */}
            <AnimatePresence>
              {composeOpen && !isOwnProfile && (
                <motion.form
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleSendMail}
                  className="p-4 bg-amber-50/50 border border-amber-200/65 rounded-2xl space-y-3 shadow-xs"
                >
                  <div className="flex items-center gap-1.5 text-amber-800">
                    <PenTool className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Nachricht verfassen</span>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Betreff (z.B. Feedback zu deinem Roman)"
                      value={composeTitle}
                      onChange={(e) => setComposeTitle(e.target.value)}
                      className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg bg-white"
                      maxLength={200}
                      required
                    />
                  </div>
                  <div>
                    <textarea
                      placeholder="Schreibe deinen Brief für den Salon-Briefkasten dieses Autors..."
                      value={composeContent}
                      onChange={(e) => setComposeContent(e.target.value)}
                      rows={4}
                      className="w-full text-xs font-normal p-2.5 border border-slate-200 rounded-lg bg-white resize-none"
                      maxLength={5000}
                      required
                    />
                  </div>
                  
                  {sendSuccess && (
                    <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold text-center">
                      ✓ Dein Brief wurde erfolgreich in das Postfach geworfen!
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setComposeOpen(false)}
                      className="px-3 py-1.5 text-xs text-slate-500 font-semibold cursor-pointer"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={sendLoading}
                      className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3 h-3" />
                      <span>{sendLoading ? 'Wirft ein...' : 'Einwerfen'}</span>
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

          </div>

          {/* RIGHT SPLIT (5 COLUMNS): Mailbox for your profile / User Interactions info */}
          <div className="md:col-span-5 p-6 bg-slate-50/60 overflow-y-auto flex flex-col space-y-4">
            {isOwnProfile ? (
              <div className="flex-grow flex flex-col min-h-0 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-250 pb-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Inbox className="w-4 h-4 text-slate-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Mein Postfach</h3>
                  </div>
                  {/* Mailbox Navigation tab toggle */}
                  <div className="flex gap-1 bg-slate-200/70 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setMailboxTab('received')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        mailboxTab === 'received' 
                          ? 'bg-white text-slate-800 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Posteingang ({receivedMessages.filter(m => !m.isRead).length} neu)
                    </button>
                    <button
                      onClick={() => setMailboxTab('sent')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        mailboxTab === 'sent' 
                          ? 'bg-white text-slate-800 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Gesendet
                    </button>
                  </div>
                </div>

                {/* Messages Listing block */}
                <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                  <AnimatePresence mode="popLayout">
                    {mailboxTab === 'received' ? (
                      receivedMessages.length > 0 ? (
                        receivedMessages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            id={`msg-${msg.id}`}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            onClick={() => {
                              setExpandedMessageId(msg.id);
                              if (!msg.isRead) onMarkMessageRead(msg.id);
                            }}
                            className={`p-3 border rounded-xl cursor-pointer text-left transition-all ${
                              msg.isRead 
                                ? 'bg-white border-slate-100 opacity-90 hover:border-slate-200' 
                                : 'bg-indigo-50/50 border-indigo-200 hover:bg-indigo-50 hover:shadow-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-slate-500 truncate">
                                Von: {msg.senderName}
                              </span>
                              {!msg.isRead && (
                                <span className="bg-indigo-600 text-white text-[8px] font-bold px-1.5 py-0.25 rounded-full uppercase tracking-wider">
                                  NEU
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">
                              {msg.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(msg.createdAt).toLocaleDateString('de-DE')}
                            </p>
                          </motion.div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-100">
                          <Inbox className="w-8 h-8 mx-auto opacity-30" />
                          <p className="text-xs font-serif italic">Dein Posteingang ist leer</p>
                        </div>
                      )
                    ) : (
                      sentMessages.length > 0 ? (
                        sentMessages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            id={`sent-msg-${msg.id}`}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            onClick={() => {
                              setExpandedMessageId(msg.id);
                            }}
                            className="p-3 border border-slate-200 bg-white rounded-xl hover:border-slate-300 transition-all cursor-pointer text-left"
                          >
                            <span className="text-[10px] font-bold text-slate-500">
                              An: {msg.receiverName}
                            </span>
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">
                              {msg.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(msg.createdAt).toLocaleDateString('de-DE')}
                            </p>
                          </motion.div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-100">
                          <Send className="w-8 h-8 mx-auto opacity-30" />
                          <p className="text-xs font-serif italic">Noch keine Briefe verschickt</p>
                        </div>
                      )
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col justify-center text-center p-4 bg-amber-50/20 border border-amber-100 rounded-2xl space-y-3">
                <PenTool className="w-8 h-8 mx-auto text-amber-800/60" />
                <h4 className="font-serif font-bold text-slate-800 text-sm">Salon-Briefkasten</h4>
                <p className="text-xs text-slate-450 leading-relaxed max-w-xs mx-auto">
                  Du kannst diesem Autor direkt einen privaten Brief hinterlassen. Lob, literarisches Feedback oder Ideen sind im Salon immer gern gesehen!
                </p>
                {!composeOpen && (
                  <button 
                    onClick={() => setComposeOpen(true)}
                    className="py-1.5 px-4 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl cursor-pointer self-center"
                  >
                    Brief verfassen
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </motion.div>

      {/* Expanded Message View Drawer Overlay */}
      <AnimatePresence>
        {expandedMessageId && (
          <div id="msg-detail-backdrop" className="fixed inset-0 bg-slate-950/25 backdrop-blur-xs z-55 flex items-center justify-center p-4">
            {(() => {
              const allM = [...receivedMessages, ...sentMessages];
              const activeMsg = allM.find(m => m.id === expandedMessageId);
              if (!activeMsg) return null;

              const isReceived = activeMsg.receiverId === currentUserId;

              return (
                <motion.div
                  id="expanded-message-card"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-[#FCFBF8] border border-slate-300 rounded-2xl shadow-lg w-full max-w-lg p-5 space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest leading-none">
                        {isReceived ? 'Aus Posteingang' : 'Gesendeter Brief'}
                      </span>
                      <p className="text-xs text-slate-700 leading-normal">
                        <strong>{isReceived ? 'Von:' : 'An:'}</strong> {isReceived ? activeMsg.senderName : activeMsg.receiverName} ({isReceived ? activeMsg.senderEmail.split('@')[0] : 'Uploader'})
                      </p>
                    </div>
                    <button
                      id="close-msg-detail-btn"
                      onClick={() => {
                        setExpandedMessageId(null);
                        setReplyOpen(false);
                      }}
                      className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg hover:text-slate-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      X
                    </button>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    <h3 className="font-sans font-black text-slate-850 text-sm leading-tight border-b border-slate-100 pb-1.5">
                      {activeMsg.title}
                    </h3>
                    <p className="text-xs text-slate-650 leading-relaxed font-serif whitespace-pre-wrap py-2">
                      {activeMsg.content}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Erstellt am {new Date(activeMsg.createdAt).toLocaleString('de-DE')}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (window.confirm('Brief unwiderruflich aus deinem Postfach löschen?')) {
                            await onDeleteMessage(activeMsg.id);
                            setExpandedMessageId(null);
                          }
                        }}
                        className="py-1 px-2.5 hover:bg-red-50 text-red-500 rounded-md transition-colors font-bold cursor-pointer flex items-center gap-1"
                        title="Nachricht löschen"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Löschen</span>
                      </button>

                      {isReceived && !replyOpen && (
                        <button
                          onClick={() => {
                            setReplyTitle(`Aw: ${activeMsg.title}`);
                            setReplyOpen(true);
                          }}
                          className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold cursor-pointer"
                        >
                          Antworten
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Reply Form nested */}
                  <AnimatePresence>
                    {replyOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-200 pt-3 space-y-2 text-left"
                      >
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Antwort formulieren</label>
                        <textarea
                          placeholder="Antwort verfassen..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          rows={3}
                          className="w-full text-xs font-normal p-2.5 border border-slate-200 rounded-lg bg-white resize-none"
                          required
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setReplyOpen(false)}
                            className="px-2.5 py-1 text-xs text-slate-500 font-semibold cursor-pointer"
                          >
                            Abbrechen
                          </button>
                          <button
                            onClick={() => handleSendReply(activeMsg)}
                            disabled={sendLoading}
                            className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-md cursor-pointer"
                          >
                            {sendLoading ? 'Repliziert...' : 'Antwort senden'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
