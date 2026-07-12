import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy,
  writeBatch,
  where,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Book, Chapter, UserProfile, Message, Follow, BookLike, BookRead } from './types';

// Realtime books catalog subscription
export function subscribeToBooks(onSuccess: (books: Book[]) => void, onError: (err: any) => void) {
  const booksCol = collection(db, 'books');
  // Sort custom creations by createdAt descending so new ones show first
  const q = query(booksCol, orderBy('createdAt', 'desc'));

  return onSnapshot(q, async (snapshot) => {
    const booksList: Book[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      booksList.push({
        id: docSnap.id,
        title: data.title || '',
        author: data.author || '',
        description: data.description || '',
        genre: data.genre || 'Klassiker',
        coverType: data.coverType || 'gradient',
        coverUrl: data.coverUrl || '',
        coverGradientIndex: typeof data.coverGradientIndex === 'number' ? data.coverGradientIndex : 0,
        createdAt: data.createdAt || new Date().toISOString(),
        custom: data.custom ?? true,
        ownerId: data.ownerId || '',
        ownerEmail: data.ownerEmail || '',
        parts: data.parts || [],
        chapters: [] // We lazy load chapters inside reader and editor modes
      });
    });
    // Cache books in localStorage in case of quota exhaustion
    try {
      localStorage.setItem('ebook_platform_books_cache', JSON.stringify(booksList));
    } catch (cacheErr) {}
    onSuccess(booksList);
  }, (error) => {
    const errMsg = error.message || String(error);
    if (errMsg.toLowerCase().includes('resource-exhausted') || errMsg.toLowerCase().includes('quota')) {
      console.warn('Firestore read quota exceeded! Loading books from local cache instead.');
      try {
        const cached = localStorage.getItem('ebook_platform_books_cache');
        if (cached) {
          onSuccess(JSON.parse(cached));
          return;
        }
      } catch (cacheErr) {}
      onSuccess([]);
      return;
    }
    handleFirestoreError(error, OperationType.LIST, 'books');
    onError(error);
  });
}

// Fetch all chapters of a specific custom book from subcollection
export async function fetchBookChapters(bookId: string): Promise<Chapter[]> {
  const chaptersPath = `books/${bookId}/chapters`;
  try {
    const chaptersCol = collection(db, chaptersPath);
    const q = query(chaptersCol, orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const chapters: Chapter[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      chapters.push({
        id: docSnap.id,
        title: data.title || '',
        content: data.content || '',
        partId: data.partId || undefined,
      });
    });

    try {
      localStorage.setItem(`ebook_platform_chapters_cache_${bookId}`, JSON.stringify(chapters));
    } catch (cacheErr) {}

    return chapters;
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (errMsg.toLowerCase().includes('resource-exhausted') || errMsg.toLowerCase().includes('quota')) {
      console.warn(`Firestore quota exceeded while fetching chapters for book ${bookId}! Loading from local cache instead.`);
      try {
        const cached = localStorage.getItem(`ebook_platform_chapters_cache_${bookId}`);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (cacheErr) {}
    }
    return handleFirestoreError(error, OperationType.GET, chaptersPath);
  }
}

// Create or update a full book document along with its chapters
export async function saveBookToFirestore(
  book: Book, 
  chapters: Chapter[], 
  userId: string, 
  userEmail: string
): Promise<void> {
  const bookPath = `books/${book.id}`;
  try {
    // A. Detect if we have a completely brand-new book, or newly added chapters BEFORE saving
    const bookRef = doc(db, 'books', book.id);
    let isNewBook = false;
    const newChapterTitles: string[] = [];

    try {
      const existingBookSnap = await getDoc(bookRef);
      if (!existingBookSnap.exists()) {
        isNewBook = true;
      } else {
        // Book existed, let's fetch its existing chapters to compare
        const existingChapters = await fetchBookChapters(book.id);
        const existingChapterIds = new Set(existingChapters.map((c) => c.id));
        
        // Find if any incoming chapters are new
        chapters.forEach((chap) => {
          if (chap.id && !existingChapterIds.has(chap.id)) {
            newChapterTitles.push(chap.title || 'Ungesetztes Kapitel');
          }
        });
      }
    } catch (detectErr) {
      console.warn("Could not check existing book state for notifications:", detectErr);
    }

    // 1. Write core Book metadata
    const bookData = {
      title: book.title,
      author: book.author,
      genre: book.genre,
      description: book.description || '',
      coverType: book.coverType,
      coverGradientIndex: book.coverGradientIndex ?? 0,
      createdAt: book.createdAt || new Date().toISOString(),
      custom: true,
      ownerId: userId,
      ownerEmail: userEmail,
      parts: book.parts || [],
    } as any;
    
    if (book.coverUrl) {
      bookData.coverUrl = book.coverUrl;
    }

    await setDoc(doc(db, 'books', book.id), bookData);

    // 2. Clear old chapters and write new chapters inside subcollection
    const chaptersPath = `books/${book.id}/chapters`;
    const chaptersCol = collection(db, chaptersPath);
    const existingSnap = await getDocs(chaptersCol);
    
    // Using batch for atomic chapter state
    const batch = writeBatch(db);
    
    // Mark old chapters for deletion to overwrite cleanly
    existingSnap.forEach((oldDoc) => {
      batch.delete(doc(db, chaptersPath, oldDoc.id));
    });
    
    // Write out each new or reconstructed chapter
    chapters.forEach((chap, idx) => {
      const chapRef = doc(db, chaptersPath, chap.id || `chapter-${idx}`);
      batch.set(chapRef, {
        title: chap.title,
        content: chap.content,
        order: idx,
        partId: chap.partId || '',
      });
    });

    await batch.commit();

    // B. If it's a new book or contains new chapters, notify all followers in their mailbox
    if (isNewBook || newChapterTitles.length > 0) {
      try {
        const followsCol = collection(db, 'follows');
        const q = query(followsCol, where('followedId', '==', userId));
        const followsSnap = await getDocs(q);

        const followerIds: string[] = [];
        followsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.followerId) {
            followerIds.push(data.followerId);
          }
        });

        if (followerIds.length > 0) {
          const authorName = book.author || userEmail.split('@')[0];

          for (const followerId of followerIds) {
            let followerName = 'Bücherfreund';
            try {
              const profileSnap = await getDoc(doc(db, 'profiles', followerId));
              if (profileSnap.exists()) {
                const profileData = profileSnap.data();
                if (profileData && profileData.displayName) {
                  followerName = profileData.displayName;
                }
              }
            } catch (pErr) {
              // Ignore failure, proceed with fallback
            }

            if (isNewBook) {
              const msgTitle = `📖 Neues Buch von ${authorName}: "${book.title}"`;
              const msgContent = `Hallo ${followerName},\n\nsensationelle Neuigkeiten im literarischen Salon! Der Autor **${authorName}**, dem du folgst, hat ein brandneues Buch veröffentlicht:\n\n📖 **${book.title}**\nGenre: *${book.genre}*\n\nBeschreibung:\n"${book.description || 'Keine Beschreibung vorhanden.'}"\n\nSchau gleich im Salon vorbei, entdecke das neue Buch und hinterlasse ein 'Gefällt mir'!\n\nMit literarischen Grüßen,\nDein Literarischer Salon`;
              
              await sendMessage(
                userId,
                userEmail,
                authorName,
                followerId,
                followerName,
                msgTitle,
                msgContent
              );
            } else if (newChapterTitles.length > 0) {
              for (const chapTitle of newChapterTitles) {
                const msgTitle = `📝 Neues Kapitel in "${book.title}": "${chapTitle}"`;
                const msgContent = `Hallo ${followerName},\n\nes gibt neuen Lesestoff im literarischen Salon! Der Autor **${authorName}**, dem du folgst, hat ein neues Kapitel in seinem Werk **${book.title}** hinzugefügt:\n\n📝 **${chapTitle}**\n\nÖffne das E-Book jetzt im Reader-Modus, um weiterzulesen!\n\nMit literarischen Grüßen,\nDein Literarischer Salon`;
                
                await sendMessage(
                  userId,
                  userEmail,
                  authorName,
                  followerId,
                  followerName,
                  msgTitle,
                  msgContent
                );
              }
            }
          }
        }
      } catch (notifErr) {
        console.warn("Failed to dispatch mailbox notifications to followers:", notifErr);
      }
    }
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (errMsg.toLowerCase().includes('resource-exhausted') || errMsg.toLowerCase().includes('quota')) {
      console.warn('Firestore write quota exceeded! Saving book and chapters locally.');
      // 1. Save chapters to cache
      try {
        localStorage.setItem(`ebook_platform_chapters_cache_${book.id}`, JSON.stringify(chapters));
      } catch (e) {}
      
      // 2. Add/update book in cached list
      try {
        const cachedBooksRaw = localStorage.getItem('ebook_platform_books_cache');
        const list: Book[] = cachedBooksRaw ? JSON.parse(cachedBooksRaw) : [];
        const index = list.findIndex((b: Book) => b.id === book.id);
        const savedBook: Book = {
          ...book,
          ownerId: userId,
          ownerEmail: userEmail,
        };
        if (index !== -1) {
          list[index] = savedBook;
        } else {
          list.unshift(savedBook);
        }
        localStorage.setItem('ebook_platform_books_cache', JSON.stringify(list));
      } catch (e) {}
      
      throw new Error('QUOTA_EXCEEDED');
    }
    handleFirestoreError(error, OperationType.WRITE, bookPath);
    throw error;
  }
}

// Cleanly delete custom book and its chapters
export async function deleteBookFromFirestore(bookId: string): Promise<void> {
  const bookPath = `books/${bookId}`;
  try {
    // Collect all sub-chapters to delete in a batch
    const chaptersPath = `books/${bookId}/chapters`;
    const chaptersSnap = await getDocs(collection(db, chaptersPath));
    
    const batch = writeBatch(db);
    chaptersSnap.forEach((chapDoc) => {
      batch.delete(doc(db, chaptersPath, chapDoc.id));
    });
    
    // Add book metadata deletion
    batch.delete(doc(db, 'books', bookId));
    
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, bookPath);
  }
}

// Sync reading progress
export async function saveUserProgress(userId: string, bookId: string, chapterId: string): Promise<void> {
  const progressPath = `users/${userId}/progress/${bookId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'progress', bookId), {
      chapterId,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.toLowerCase().includes('resource-exhausted') || errMsg.toLowerCase().includes('quota')) {
      console.warn('Firestore write quota exceeded! Saving reading progress to localStorage fallback.');
      try {
        const cached = localStorage.getItem('ebook_platform_progress') || '{}';
        const progress = JSON.parse(cached);
        progress[bookId] = chapterId;
        localStorage.setItem('ebook_platform_progress', JSON.stringify(progress));
      } catch (cacheErr) {}
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, progressPath);
  }
}

// Subscribe user progress
export function subscribeToProgress(userId: string, onSuccess: (progress: Record<string, string>) => void) {
  const progressPath = `users/${userId}/progress`;
  const progressCol = collection(db, 'users', userId, 'progress');
  
  return onSnapshot(progressCol, (snapshot) => {
    const progressMap: Record<string, string> = {};
    snapshot.forEach((docSnap) => {
      progressMap[docSnap.id] = docSnap.data().chapterId;
    });
    onSuccess(progressMap);
  }, (error) => {
    const errMsg = error.message || String(error);
    if (errMsg.toLowerCase().includes('resource-exhausted') || errMsg.toLowerCase().includes('quota')) {
      console.warn('Firestore subscription quota exceeded! Loading reading progress from localStorage database fallback.');
      try {
        const cached = localStorage.getItem('ebook_platform_progress');
        if (cached) {
          onSuccess(JSON.parse(cached));
          return;
        }
      } catch (cacheErr) {}
      onSuccess({});
      return;
    }
    handleFirestoreError(error, OperationType.LIST, progressPath);
  });
}

// ==========================================
// LIKE SYSTEM SERVICES
// ==========================================

export function subscribeToLikes(onSuccess: (likes: BookLike[]) => void) {
  return onSnapshot(collection(db, 'likes'), (snapshot) => {
    const likesList: BookLike[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      likesList.push({
        id: docSnap.id,
        userId: data.userId || '',
        bookId: data.bookId || '',
        createdAt: data.createdAt || ''
      });
    });
    onSuccess(likesList);
  }, (error) => {
    if (!error.message.toLowerCase().includes('quota')) {
      handleFirestoreError(error, OperationType.LIST, 'likes');
    }
  });
}

export async function toggleLikeBook(userId: string, bookId: string, isCurrentlyLiked: boolean): Promise<void> {
  const likeId = `${userId}_${bookId}`;
  const likeRef = doc(db, 'likes', likeId);
  try {
    if (isCurrentlyLiked) {
      await deleteDoc(likeRef);
    } else {
      await setDoc(likeRef, {
        id: likeId,
        userId,
        bookId,
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `likes/${likeId}`);
  }
}

// ==========================================
// UNIQUE BOOK READ COUNTER SYSTEM
// ==========================================

export function subscribeToReads(onSuccess: (reads: BookRead[]) => void) {
  return onSnapshot(collection(db, 'reads'), (snapshot) => {
    const list: BookRead[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        userId: data.userId || '',
        bookId: data.bookId || '',
        createdAt: data.createdAt || ''
      });
    });
    onSuccess(list);
  }, (error) => {
    if (!error.message.toLowerCase().includes('quota')) {
      handleFirestoreError(error, OperationType.LIST, 'reads');
    }
  });
}

export async function recordBookRead(userId: string, bookId: string): Promise<void> {
  const readId = `${userId}_${bookId}`;
  const readRef = doc(db, 'reads', readId);
  try {
    await setDoc(readRef, {
      id: readId,
      userId,
      bookId,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn("Could not record book read:", error);
  }
}

// ==========================================
// PROFILE SYSTEM SERVICES
// ==========================================

export function subscribeToProfiles(onSuccess: (profiles: UserProfile[]) => void) {
  return onSnapshot(collection(db, 'profiles'), (snapshot) => {
    const profilesList: UserProfile[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      profilesList.push({
        userId: docSnap.id,
        displayName: data.displayName || 'Unbenannter Autor',
        bio: data.bio || '',
        avatarIndex: typeof data.avatarIndex === 'number' ? data.avatarIndex : 0,
        avatarUrl: data.avatarUrl || '',
        followersCount: data.followersCount || 0,
        followingCount: data.followingCount || 0,
        createdAt: data.createdAt || new Date().toISOString()
      });
    });
    onSuccess(profilesList);
  }, (error) => {
    if (!error.message.toLowerCase().includes('quota')) {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
    }
  });
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const profilePath = `profiles/${profile.userId}`;
  try {
    await setDoc(doc(db, 'profiles', profile.userId), {
      userId: profile.userId,
      displayName: profile.displayName,
      bio: profile.bio || '',
      avatarIndex: profile.avatarIndex ?? 0,
      avatarUrl: profile.avatarUrl || '',
      followersCount: profile.followersCount || 0,
      followingCount: profile.followingCount || 0,
      createdAt: profile.createdAt || new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, profilePath);
  }
}

// ==========================================
// FOLLOW SYSTEM SERVICES
// ==========================================

export function subscribeToFollows(onSuccess: (follows: Follow[]) => void) {
  return onSnapshot(collection(db, 'follows'), (snapshot) => {
    const list: Follow[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        followerId: data.followerId || '',
        followedId: data.followedId || '',
        createdAt: data.createdAt || ''
      });
    });
    onSuccess(list);
  }, (error) => {
    if (!error.message.toLowerCase().includes('quota')) {
      handleFirestoreError(error, OperationType.LIST, 'follows');
    }
  });
}

export async function toggleFollow(followerId: string, followedId: string, isCurrentlyFollowing: boolean): Promise<void> {
  const followId = `${followerId}_${followedId}`;
  const followRef = doc(db, 'follows', followId);
  try {
    if (isCurrentlyFollowing) {
      await deleteDoc(followRef);
    } else {
      await setDoc(followRef, {
        id: followId,
        followerId,
        followedId,
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `follows/${followId}`);
  }
}

// ==========================================
// MAILBOX SYSTEM SERVICES
// ==========================================

export function subscribeToReceivedMessages(userId: string, onSuccess: (messages: Message[]) => void) {
  const msgsCol = collection(db, 'messages');
  const q = query(msgsCol, where('receiverId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const list: Message[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        senderId: data.senderId || '',
        senderEmail: data.senderEmail || '',
        senderName: data.senderName || '',
        receiverId: data.receiverId || '',
        receiverName: data.receiverName || '',
        title: data.title || '',
        content: data.content || '',
        createdAt: data.createdAt || '',
        isRead: data.isRead ?? false
      });
    });
    onSuccess(list);
  }, (error) => {
    if (!error.message.toLowerCase().includes('quota')) {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    }
  });
}

export function subscribeToSentMessages(userId: string, onSuccess: (messages: Message[]) => void) {
  const msgsCol = collection(db, 'messages');
  const q = query(msgsCol, where('senderId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const list: Message[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        senderId: data.senderId || '',
        senderEmail: data.senderEmail || '',
        senderName: data.senderName || '',
        receiverId: data.receiverId || '',
        receiverName: data.receiverName || '',
        title: data.title || '',
        content: data.content || '',
        createdAt: data.createdAt || '',
        isRead: data.isRead ?? false
      });
    });
    onSuccess(list);
  }, (error) => {
    if (!error.message.toLowerCase().includes('quota')) {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    }
  });
}

export async function sendMessage(
  senderId: string, 
  senderEmail: string, 
  senderName: string, 
  receiverId: string, 
  receiverName: string, 
  title: string, 
  content: string
): Promise<void> {
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const messagePath = `messages/${messageId}`;
  try {
    await setDoc(doc(db, 'messages', messageId), {
      id: messageId,
      senderId,
      senderEmail,
      senderName,
      receiverId,
      receiverName,
      title,
      content,
      createdAt: new Date().toISOString(),
      isRead: false
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, messagePath);
  }
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  const messageRef = doc(db, 'messages', messageId);
  try {
    await setDoc(messageRef, { isRead: true }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `messages/${messageId}`);
  }
}

export async function deleteMessage(messageId: string): Promise<void> {
  const messageRef = doc(db, 'messages', messageId);
  try {
    await deleteDoc(messageRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `messages/${messageId}`);
  }
}
