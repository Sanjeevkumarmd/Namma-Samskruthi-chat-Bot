import React, { useState, useEffect, useCallback } from 'react';
import { Screen, Theme, Language, Chat, ChatMessage } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import ChatScreen from './components/ChatScreen';
import HistoryScreen from './components/HistoryScreen';
import ExploreScreen from './components/ExploreScreen';
import { useLocalStorage } from './hooks/useLocalStorage';
import { translations } from './translations';
import { HERITAGE_IMAGES } from './constants';


const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(Theme.Light);
  const [language, setLanguage] = useState<Language>(Language.KN);

  const [screen, setScreen] = useState<Screen>(Screen.Welcome);
  const [displayScreen, setDisplayScreen] = useState<Screen>(Screen.Welcome);
  const [animationClass, setAnimationClass] = useState('animate-fade-in-screen');

  const [chats, setChats] = useLocalStorage<{ [id: string]: Chat }>('karnataka-ai-chats', {});
  const [activeChatId, setActiveChatId] = useLocalStorage<string | null>('karnataka-ai-active-chat', null);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);

  const t = translations[language];

  useEffect(() => {
    const bgInterval = setInterval(() => {
        setCurrentBgIndex(prev => (prev + 1) % HERITAGE_IMAGES.length);
    }, 7000);
    return () => clearInterval(bgInterval);
  }, []);

  useEffect(() => {
    if (theme === Theme.Dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.lang = language;
  }, [theme, language]);
  
  useEffect(() => {
    if (screen !== displayScreen) {
      setAnimationClass('animate-fade-out-screen');
    }
  }, [screen, displayScreen]);

  const handleAnimationEnd = () => {
    if (animationClass === 'animate-fade-out-screen') {
      setDisplayScreen(screen);
      setAnimationClass('animate-fade-in-screen');
    }
  };

  const navigateTo = useCallback((newScreen: Screen) => {
    if (newScreen !== screen) {
        setScreen(newScreen);
    }
  }, [screen]);

  const handleNewChat = useCallback(() => {
    const newChatId = `chat_${Date.now()}`;
    const tInitial = translations[language]; 
    const initialMessage: ChatMessage = {
      id: `${Date.now()}-model-initial`,
      role: 'model',
      parts: [{ text: tInitial.initialGreeting as string }],
      timestamp: Date.now(),
    };

    const newChat: Chat = {
      id: newChatId,
      title: tInitial.newChat as string,
      timestamp: Date.now(),
      messages: [initialMessage],
    };
    setChats(prev => ({
      ...prev,
      [newChatId]: newChat,
    }));
    setActiveChatId(newChatId);
    navigateTo(Screen.Chat);
  }, [setChats, setActiveChatId, navigateTo, language]);

  const handleStartChatWithPrompt = useCallback((prompt: string) => {
    setInitialPrompt(prompt);
    handleNewChat();
  }, [handleNewChat]);

  const handleDeleteChat = useCallback((id: string) => {
    const remainingChats = { ...chats };
    delete remainingChats[id];
    setChats(remainingChats);

    if (activeChatId === id) {
        const remainingChatList = Object.values(remainingChats).sort((a,b) => b.timestamp - a.timestamp);
        if (remainingChatList.length > 0) {
            setActiveChatId(remainingChatList[0].id);
        } else {
            handleNewChat();
        }
    }
  }, [chats, setChats, activeChatId, setActiveChatId, handleNewChat]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
    navigateTo(Screen.Chat);
  }, [setActiveChatId, navigateTo]);
  
  const renderScreen = () => {
    switch(displayScreen) {
        case Screen.Welcome:
            return <WelcomeScreen 
                      onNavigate={handleNewChat}
                      language={language}
                      setLanguage={setLanguage}
                      theme={theme}
                      setTheme={setTheme}
                   />;
        case Screen.Chat:
            return <ChatScreen 
                      onNavigateHome={() => navigateTo(Screen.Welcome)}
                      onNavigateHistory={() => navigateTo(Screen.History)}
                      theme={theme}
                      setTheme={setTheme}
                      language={language}
                      setLanguage={setLanguage}
                      chats={chats}
                      setChats={setChats}
                      activeChatId={activeChatId}
                      setActiveChatId={setActiveChatId}
                      onNewChat={handleNewChat}
                      initialPrompt={initialPrompt}
                      setInitialPrompt={setInitialPrompt}
                    />;
        case Screen.History:
            return <HistoryScreen
                      onNavigateBack={() => navigateTo(Screen.Chat)}
                      onNavigateToExplore={() => navigateTo(Screen.Explore)}
                      language={language}
                      chats={chats}
                      activeChatId={activeChatId}
                      onSelectChat={handleSelectChat}
                      onNewChat={handleNewChat}
                      onDeleteChat={handleDeleteChat}
                   />;
        case Screen.Explore:
            return <ExploreScreen
                      onNavigateBack={() => navigateTo(Screen.History)}
                      language={language}
                      onStartChatWithPrompt={handleStartChatWithPrompt}
                    />;
        default:
            return null;
    }
  }
  
  const overlayClass = displayScreen === Screen.Welcome
    ? "bg-black/50"
    : "bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm";

  return (
    <div className="text-gray-800 dark:text-gray-200 min-h-screen font-sans">
      {HERITAGE_IMAGES.map((src, index) => (
        <div
          key={src}
          className="fixed inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 -z-20"
          style={{
            backgroundImage: `url(${src})`,
            opacity: index === currentBgIndex ? 1 : 0,
          }}
        />
      ))}
      <div className={`fixed inset-0 ${overlayClass} -z-10`} />

      <div onAnimationEnd={handleAnimationEnd} className={animationClass}>
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;