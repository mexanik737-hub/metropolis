/**
 * METROPOLIS Firestore Database Service
 * Облачное хранилище игрового состояния и истории диалогов ИИ в Google Cloud Firestore
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  getDocFromServer,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { GameState } from '../types/game';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use custom database ID if provisioned, else default
export const db = getFirestore(
  app,
  (firebaseConfig as any).firestoreDatabaseId || '(default)'
);

// Validate initial Firestore connection as required by security guidelines
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.message && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice:', error.message);
    }
  }
}
testFirestoreConnection();

export interface ChatMessageDoc {
  id?: string;
  userId: string;
  role: 'user' | 'model';
  content: string;
  agentRole: 'consultant' | 'strategist' | 'guide';
  modelUsed: string;
  timestamp: number;
}

/**
 * Сохранение состояния игры в Firestore
 */
export async function saveGameStateToFirestore(uid: string, state: GameState): Promise<boolean> {
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(
      userDocRef,
      {
        uid,
        username: state.username,
        gameState: state,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Error saving gameState to Firestore:', err);
    return false;
  }
}

/**
 * Загрузка сохраненного состояния игры из Firestore
 */
export async function loadGameStateFromFirestore(uid: string): Promise<GameState | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.gameState) {
        return data.gameState as GameState;
      }
    }
    return null;
  } catch (err) {
    console.error('Error loading gameState from Firestore:', err);
    return null;
  }
}

/**
 * Сохранение сообщения чата с Gemini в Firestore
 */
export async function saveChatMessageToFirestore(
  uid: string,
  message: Omit<ChatMessageDoc, 'id'>
): Promise<string | null> {
  try {
    const colRef = collection(db, 'users', uid, 'chat_messages');
    const docRef = await addDoc(colRef, {
      ...message,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (err) {
    console.error('Error saving chat message to Firestore:', err);
    return null;
  }
}

/**
 * Загрузка истории сообщений из Firestore
 */
export async function loadChatMessagesFromFirestore(uid: string): Promise<ChatMessageDoc[]> {
  try {
    const colRef = collection(db, 'users', uid, 'chat_messages');
    const q = query(colRef, orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);
    const messages: ChatMessageDoc[] = [];
    snap.forEach((d) => {
      const data = d.data();
      messages.push({
        id: d.id,
        userId: data.userId || uid,
        role: data.role,
        content: data.content,
        agentRole: data.agentRole || 'consultant',
        modelUsed: data.modelUsed || 'gemini-3.8-flash',
        timestamp: data.timestamp || Date.now(),
      });
    });
    return messages;
  } catch (err) {
    console.error('Error loading chat messages from Firestore:', err);
    return [];
  }
}

/**
 * Очистка истории сообщений
 */
export async function clearChatHistoryInFirestore(uid: string): Promise<boolean> {
  try {
    const colRef = collection(db, 'users', uid, 'chat_messages');
    const snap = await getDocs(colRef);
    const deletions = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletions);
    return true;
  } catch (err) {
    console.error('Error clearing chat history in Firestore:', err);
    return false;
  }
}
