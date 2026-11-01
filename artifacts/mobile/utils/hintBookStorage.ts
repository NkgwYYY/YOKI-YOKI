import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHintBook } from './hintBook';

const notebook = createHintBook(AsyncStorage);
export const readSavedHints = notebook.read;
export const saveHint = notebook.save;
export const removeSavedHint = notebook.remove;
export const clearHintBook = notebook.clear;
