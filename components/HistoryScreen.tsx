import React from 'react';
import { Chat, Language } from '../types';
import { translations } from '../translations';
import { PlusIcon, MessageIcon, TrashIcon, ArrowLeftIcon, FlashcardIcon } from './icons';

interface HistoryScreenProps {
  onNavigateBack: () => void;
  onNavigateToExplore: () => void;
  chats: { [id: string]: Chat };
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  language: Language;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onNavigateBack,
  onNavigateToExplore,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  language
}) => {
  const t = translations[language];

  // Fix: Explicitly cast `Object.values(chats)` to `Chat[]` to ensure correct type inference for sorting and subsequent operations.
  const sortedChats = (Object.values(chats) as Chat[]).sort((a, b) => b.timestamp - a.timestamp);

  const groupChatsByDate = (chatList: typeof sortedChats) => {
    const groups: { [key: string]: typeof sortedChats } = {
      [t.today as string]: [],
      [t.yesterday as string]: [],
      [t.previous7Days as string]: [],
      [t.older as string]: [],
    };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const sevenDaysAgo = today - 7 * 86400000;

    chatList.forEach(chat => {
      if (chat.timestamp >= today) {
        groups[t.today as string].push(chat);
      } else if (chat.timestamp >= yesterday) {
        groups[t.yesterday as string].push(chat);
      } else if (chat.timestamp >= sevenDaysAgo) {
        groups[t.older as string].push(chat);
      } else {
        groups[t.older as string].push(chat);
      }
    });

    return groups;
  };

  const groupedChats = groupChatsByDate(sortedChats);

  return (
    <div className="flex flex-col h-screen text-gray-800 dark:text-gray-200">
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shadow-sm bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <button onClick={onNavigateBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold">{t.historyPageTitle}</h1>
            </div>
            <div className="flex items-center gap-2">
                 <button onClick={onNavigateToExplore} className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    <FlashcardIcon className="w-5 h-5" />
                    {t.explorePageButton}
                </button>
                <button onClick={onNewChat} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                    <PlusIcon className="w-5 h-5" />
                    {t.newChat}
                </button>
            </div>
        </header>

        <main className="flex-grow overflow-y-auto custom-scrollbar p-2 bg-black/10 dark:bg-black/20">
            {sortedChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                    <MessageIcon className="w-16 h-16 mb-4" />
                    <h2 className="text-xl font-semibold">No Chat History</h2>
                    <p className="max-w-xs mt-2">Your conversations will appear here. Start a new chat to begin!</p>
                </div>
            ) : (
                <div className="space-y-4">
                {Object.entries(groupedChats).map(([groupName, groupChats]) => (
                    groupChats.length > 0 && (
                    <div key={groupName}>
                        <h3 className="text-xs font-bold uppercase text-gray-400 px-2 my-2">{groupName}</h3>
                        <div className="space-y-1">
                        {groupChats.map(chat => {
                            const lastMessage = chat.messages[chat.messages.length - 1];
                            let lastMessageText = '...';
                            if (lastMessage) {
                                const textPart = lastMessage.parts.find(p => p.text)?.text || (lastMessage.parts.length > 0 ? 'Image' : '...');
                                lastMessageText = lastMessage.role === 'user' ? `You: ${textPart}` : textPart;
                            }
                           return (
                            <button
                                key={chat.id}
                                onClick={() => onSelectChat(chat.id)}
                                className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg group transition-colors ${
                                    chat.id === activeChatId
                                    ? 'bg-gray-200/80 dark:bg-gray-700/80 backdrop-blur-sm'
                                    : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                                }`}
                                >
                                <div className="flex items-center gap-3 truncate">
                                    <MessageIcon className="w-5 h-5 flex-shrink-0 text-gray-500" />
                                    <div className="flex flex-col truncate items-start">
                                        <span className="truncate text-sm font-medium">{chat.title}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full">{lastMessageText}</span>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteChat(chat.id);
                                    }}
                                    className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                                    aria-label={`Delete chat: ${chat.title}`}
                                    >
                                    <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </button>
                           )}
                        )}
                        </div>
                    </div>
                    )
                ))}
                </div>
            )}
        </main>
    </div>
  );
};

export default HistoryScreen;