import AsyncStorage from '@react-native-async-storage/async-storage';
import { createConversationStorage } from './conversationStorage';

const conversations = createConversationStorage(AsyncStorage);
export const readChatHistory = conversations.read;
export const writeChatHistory = conversations.write;
export const clearChatHistory = conversations.clear;
export const clearConversationData = conversations.clearAll;
