import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Theme, Language, ChatMessage, Chat } from '../types';
import { LANGUAGE_OPTIONS } from '../constants';
import { generateChatResponse, generateSpeech } from '../services/geminiService';
import { HomeIcon, SunIcon, MoonIcon, SendIcon, ImageIcon, HistoryIcon, ChevronDownIcon, CheckIcon, DoubleCheckIcon, VerifiedIcon, UserIcon, InfoIcon, MicrophoneIcon, ThumbsUpIcon, ThumbsDownIcon, XIcon, CopyIcon, SpeakerOnIcon, SpeakerOffIcon, StopIcon, SpinnerIcon } from './icons';
import { translations } from '../translations';
import SuggestionRoller from './SuggestionRoller';
import { decode, decodeAudioData } from '../utils/audio';
import TimeDisplay from './TimeDisplay';

// Reference to the SpeechRecognition interface from the Web Speech API.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface ChatScreenProps {
  onNavigateHome: () => void;
  onNavigateHistory: () => void;
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
  language: Language;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  chats: { [id: string]: Chat };
  setChats: React.Dispatch<React.SetStateAction<{ [id: string]: Chat }>>;
  activeChatId: string | null;
  setActiveChatId: React.Dispatch<React.SetStateAction<string | null>>;
  onNewChat: () => void;
  initialPrompt: string | null;
  setInitialPrompt: (prompt: string | null) => void;
}

type AudioPlaybackState = {
    messageId: string | null;
    status: 'idle' | 'loading' | 'playing';
};


const TypingIndicator: React.FC<{ botChar: string }> = ({ botChar }) => {
    return (
        <div className="flex items-end gap-2 animate-slide-in-left-chat">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-red-500 flex items-center justify-center text-white font-bold text-xl select-none flex-shrink-0">
                {botChar}
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-200/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-2xl rounded-bl-none">
                <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full dot-1"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full dot-2"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full dot-3"></div>
                </div>
            </div>
        </div>
    );
}

const TextPart: React.FC<{ text: string }> = ({ text }) => {
    const renderedContent = React.useMemo(() => {
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];
        let currentList: React.ReactNode[] = [];
        let isBlockquote = false;
        let blockquoteContent: string[] = [];

        const flushList = () => {
            if (currentList.length > 0) {
                elements.push(<ul key={`ul-${elements.length}`} className="list-inside my-2 pl-4 space-y-1">{currentList}</ul>);
                currentList = [];
            }
        };

        const flushBlockquote = () => {
            if (blockquoteContent.length > 0) {
                elements.push(
                    <blockquote key={`bq-${elements.length}`} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2 italic text-gray-600 dark:text-gray-400">
                        {blockquoteContent.map((bqLine, bqIndex) => <p key={bqIndex}>{processInline(bqLine, `bq-${bqIndex}`)}</p>)}
                    </blockquote>
                );
                blockquoteContent = [];
            }
        };

        const processInline = (line: string, key: string | number): React.ReactNode[] => {
            const regex = /(\*\*.*?\*\*|`.*?`)/g;
            return line.split(regex).filter(Boolean).map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={`${key}-${index}`}>{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                    return <code key={`${key}-${index}`} className="bg-gray-300/50 dark:bg-gray-600/50 rounded px-1.5 py-0.5 text-sm font-mono">{part.slice(1, -1)}</code>;
                }
                return part;
            });
        };

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('> ')) {
                flushList();
                isBlockquote = true;
                blockquoteContent.push(trimmedLine.substring(2));
            } else if (isBlockquote && !trimmedLine.startsWith('> ')) {
                flushBlockquote();
                isBlockquote = false;
            } else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                flushBlockquote();
                currentList.push(<li key={index}>{processInline(trimmedLine.substring(2), index)}</li>);
            } else {
                flushList();
                flushBlockquote();
                if (trimmedLine.length > 0) {
                    elements.push(<p key={index} className="mb-2 last:mb-0">{processInline(line, index)}</p>);
                }
            }
        });

        flushList();
        flushBlockquote();

        return elements;
    }, [text]);

    return <div className="text-sm md:text-base leading-relaxed break-words max-w-none">{renderedContent}</div>;
};

const Message: React.FC<{ 
    message: ChatMessage;
    botChar: string;
    onFeedback: (id: string, feedback: 'positive' | 'negative') => void;
    onCopy: (text: string) => void;
    onReadAloud: (messageId: string, text: string) => void;
    audioPlaybackState: AudioPlaybackState;
}> = ({ message, botChar, onFeedback, onCopy, onReadAloud, audioPlaybackState }) => {
    const isModel = message.role === 'model';
    const isUser = message.role === 'user';
    const textToCopy = message.parts.filter(p => p.text).map(p => p.text).join('\n\n');
    const [popAnimation, setPopAnimation] = useState<'positive' | 'negative' | null>(null);

    const handleFeedbackClick = (feedback: 'positive' | 'negative') => {
        onFeedback(message.id, feedback);
        setPopAnimation(feedback);
        setTimeout(() => setPopAnimation(null), 300);
    }
    
    const animationClass = isModel ? 'animate-slide-in-left-chat' : 'animate-slide-in-right-chat';
    
    const ReadAloudButton: React.FC = () => {
        const isThisMessageActive = audioPlaybackState.messageId === message.id;
        const status = isThisMessageActive ? audioPlaybackState.status : 'idle';

        let icon;
        let label = "Read aloud";
        switch (status) {
            case 'loading':
                icon = <SpinnerIcon className="w-4 h-4 animate-spin" />;
                label = "Loading audio...";
                break;
            case 'playing':
                icon = <StopIcon className="w-4 h-4" />;
                label = "Stop reading";
                break;
            default:
                icon = <SpeakerOnIcon className="w-4 h-4" />;
                break;
        }

        return (
            <button 
                onClick={() => onReadAloud(message.id, textToCopy)}
                disabled={!textToCopy || (status === 'loading')}
                className="p-1.5 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                aria-label={label}
            >
                {icon}
            </button>
        );
    };

    return (
        <div className={`flex flex-col ${isModel ? 'items-start' : 'items-end'} mb-4 ${animationClass}`}>
             <div className={`flex items-end gap-2 max-w-sm md:max-w-xl lg:max-w-3xl w-full ${isModel ? 'justify-start' : 'justify-end'}`}>
                {isModel && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-red-500 flex items-center justify-center text-white font-bold text-xl select-none flex-shrink-0">
                        {botChar}
                    </div>
                )}
                <div className={`px-4 py-3 rounded-2xl shadow-md ${isModel ? 'bg-gray-200/95 dark:bg-gray-700/95 backdrop-blur-sm rounded-bl-none' : 'bg-blue-600 text-white rounded-br-none'} overflow-hidden`}>
                    {message.parts.map((part, index) => {
                        if (part.text) {
                            return <TextPart 
                                        key={index} 
                                        text={part.text}
                                   />;
                        }
                        if (part.inlineData) {
                            return <img key={index} src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} alt="user upload" className="rounded-lg mt-2 max-w-full h-auto"/>
                        }
                        return null;
                    })}
                    <div className="flex items-center justify-end text-xs mt-1 opacity-70 animate-fade-in-subtle">
                        <span className="mr-1">{new Date(message.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                        {isUser && message.status === 'sent' && <CheckIcon className="w-4 h-4" />}
                        {isUser && message.status === 'seen' && <DoubleCheckIcon className="w-4 h-4" />}
                    </div>
                </div>
                 {isUser && (
                    <div className="w-10 h-10 rounded-full bg-gray-300/80 dark:bg-gray-600/80 backdrop-blur-sm flex items-center justify-center text-gray-800 dark:text-gray-200 select-none flex-shrink-0 p-1.5">
                        <UserIcon className="w-full h-full" />
                    </div>
                )}
             </div>
             {isModel && (
                <div className="flex gap-2 ml-12 mt-2">
                    <ReadAloudButton />
                    <button 
                        onClick={() => onCopy(textToCopy)}
                        disabled={!textToCopy}
                        className="p-1.5 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                        aria-label="Copy message"
                    >
                        <CopyIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => handleFeedbackClick('positive')} 
                        disabled={!!message.feedback}
                        className={`p-1.5 rounded-full transition-colors ${message.feedback === 'positive' ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300' : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 disabled:opacity-50'} ${popAnimation === 'positive' ? 'animate-icon-pop' : ''}`}
                        aria-label="Good response"
                    >
                        <ThumbsUpIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => handleFeedbackClick('negative')} 
                        disabled={!!message.feedback}
                        className={`p-1.5 rounded-full transition-colors ${message.feedback === 'negative' ? 'bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300' : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 disabled:opacity-50'} ${popAnimation === 'negative' ? 'animate-icon-pop' : ''}`}
                        aria-label="Bad response"
                    >
                        <ThumbsDownIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

const ChatScreen: React.FC<ChatScreenProps> = ({ onNavigateHome, onNavigateHistory, theme, setTheme, language, setLanguage, chats, setChats, activeChatId, setActiveChatId, onNewChat, initialPrompt, setInitialPrompt }) => {
  const [userInput, setUserInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [toastText, setToastText] = useState('');
  const [soundIconPop, setSoundIconPop] = useState(false);
  const [audioPlaybackState, setAudioPlaybackState] = useState<AudioPlaybackState>({ messageId: null, status: 'idle' });

  
  const t = translations[language];
  const botChar = t.botIconChar as string;
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [suggestionsSource, setSuggestionsSource] = useState<'default' | 'model'>('default');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userInputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  useEffect(() => {
    if ((!activeChatId || !chats[activeChatId]) && Object.keys(chats).length === 0) {
      onNewChat();
    } else if (!activeChatId && Object.keys(chats).length > 0) {
      setActiveChatId(Object.keys(chats).sort((a,b) => chats[b].timestamp - chats[a].timestamp)[0]);
    }
  }, [activeChatId, chats, onNewChat, setActiveChatId]);
  
  const messages = chats[activeChatId || '']?.messages || [];

  const setMessages = useCallback((update: (prevMessages: ChatMessage[]) => ChatMessage[]) => {
    if (!activeChatId) return;
    const chatId = activeChatId;
    setChats(prevChats => {
      const currentMessages = prevChats[chatId]?.messages || [];
      const newMessages = update(currentMessages);
      
      const shouldUpdateTitle = newMessages.length === 2 && newMessages[1].role === 'user' && (prevChats[chatId]?.title === (t.newChat as string));

      return {
        ...prevChats,
        [chatId]: {
          ...prevChats[chatId],
          messages: newMessages,
          title: shouldUpdateTitle
            ? newMessages[1].parts.find(p => p.text)?.text?.substring(0, 30) || t.newChat as string
            : prevChats[chatId]?.title || t.newChat as string,
          timestamp: Date.now(),
        }
      };
    });
  }, [activeChatId, setChats, t.newChat]);

  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom(messages.length < 3 ? 'auto' : 'smooth');
  }, [messages, scrollToBottom]);
  
  useEffect(() => {
    if (suggestionsSource === 'default' || messages.length <= 1) {
      setSuggestedPrompts(t.suggestedPrompts as string[]);
      if (messages.length <= 1) {
          setSuggestionsSource('default');
      }
    }
  }, [language, messages.length, t.suggestedPrompts, suggestionsSource]);


  useEffect(() => {
    if (toastText) {
      const timer = setTimeout(() => setToastText(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastText]);
  
  useEffect(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;
    recognition.onresult = (event: any) => setUserInput(p => p ? `${p} ${event.results[0][0].transcript}` : event.results[0][0].transcript);
    recognition.onerror = (event: any) => { console.error("Speech error:", event.error); setIsRecording(false); };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
  }, [language]);

  const getAudioContext = useCallback(async (): Promise<AudioContext | null> => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      } catch (e) {
        console.error("Failed to create AudioContext:", e);
        return null;
      }
    }
    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (e) {
        console.error("Failed to resume AudioContext:", e);
        return null;
      }
    }
    return audioContextRef.current;
  }, []);

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.onended = null;
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current = null;
    }
    setAudioPlaybackState({ messageId: null, status: 'idle' });
  }, []);

  const playNotificationSound = useCallback(async () => {
    if (!isTtsEnabled) return;
    const audioContext = await getAudioContext();
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5 pitch
    
    oscillator.start(audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.15);
    oscillator.stop(audioContext.currentTime + 0.15);
  }, [isTtsEnabled, getAudioContext]);

  const handleReadAloud = useCallback(async (messageId: string, text: string) => {
    if (audioPlaybackState.status === 'playing' && audioPlaybackState.messageId === messageId) {
        stopCurrentAudio();
        return;
    }

    stopCurrentAudio();
    setAudioPlaybackState({ messageId, status: 'loading' });

    const cleanText = text.replace(/\*\*|`|#+/g, '');
    const base64Audio = await generateSpeech(cleanText);
    
    if (!base64Audio) {
        console.error("Failed to generate speech for read-aloud.");
        setToastText(t.audioGenerationError as string);
        setAudioPlaybackState({ messageId: null, status: 'idle' });
        return;
    }
    
    try {
        const audioContext = await getAudioContext();
        if (!audioContext) {
            setToastText(t.audioPlaybackError as string);
            setAudioPlaybackState({ messageId: null, status: 'idle' });
            return;
        }

        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        source.onended = () => {
            if (currentAudioSourceRef.current === source) {
                currentAudioSourceRef.current = null;
                setAudioPlaybackState({ messageId: null, status: 'idle' });
            }
        };
        
        source.start();
        currentAudioSourceRef.current = source;
        setAudioPlaybackState({ messageId, status: 'playing' });
    } catch (e) {
        console.error("Error playing generated speech:", e);
        setToastText(t.audioPlaybackError as string);
        setAudioPlaybackState({ messageId: null, status: 'idle' });
    }
  }, [stopCurrentAudio, audioPlaybackState.status, audioPlaybackState.messageId, getAudioContext, t, setToastText]);

  const handleRemoveImage = useCallback(() => {
    setImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSendMessage = useCallback(async (prompt?: string) => {
    const messageToSend = prompt || userInput;
    if (!messageToSend.trim() && !imageFile) return;
    if (!activeChatId) return;

    stopCurrentAudio();
    const currentImageFile = imageFile;
    const currentImagePreviewUrl = imagePreviewUrl;

    setUserInput('');
    handleRemoveImage();
    
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      parts: [],
      timestamp: Date.now(),
      status: 'sent',
    };
    
    if (messageToSend.trim()) {
        userMessage.parts.push({ text: messageToSend.trim() });
    }
    if (currentImageFile && currentImagePreviewUrl) {
        const base64Data = currentImagePreviewUrl.split(',')[1];
        userMessage.parts.push({ inlineData: { mimeType: currentImageFile.type, data: base64Data }});
    }

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setSuggestedPrompts([]);
    
    const history = [...(chats[activeChatId!]?.messages || []), userMessage];
    const { response, suggestions: newSuggestions, summary } = await generateChatResponse(history, messageToSend, currentImageFile, language);

    let botResponseText = response;
    if (summary) {
        botResponseText += `\n\n**📝 ${t.summaryTitle || 'Summary'}**\n${summary}`;
    }

    const botMessage: ChatMessage = {
        id: `${Date.now()}-model`,
        role: 'model',
        parts: [{ text: botResponseText }],
        timestamp: Date.now(),
    };

    setIsLoading(false);
    setMessages(prev => {
        const updated = prev.map(msg => msg.id === userMessage.id ? { ...msg, status: 'seen' as const } : msg);
        return [...updated, botMessage];
    });
    
    playNotificationSound();

    const modelGeneratedSuggestions = newSuggestions?.length > 0;
    setSuggestedPrompts(modelGeneratedSuggestions ? newSuggestions : (t.suggestedPrompts as string[]));
    setSuggestionsSource(modelGeneratedSuggestions ? 'model' : 'default');

    if (isTtsEnabled) {
      const cleanText = botResponseText.replace(/\*\*|`|#+/g, '');
      await handleReadAloud(botMessage.id, cleanText);
    }

  }, [userInput, imageFile, imagePreviewUrl, activeChatId, chats, language, handleRemoveImage, setMessages, t.suggestedPrompts, t.summaryTitle, playNotificationSound, stopCurrentAudio, isTtsEnabled, handleReadAloud]);
  
  useEffect(() => {
    if (initialPrompt && messages.length === 1 && !isLoading) {
        handleSendMessage(initialPrompt);
        setInitialPrompt(null);
    }
  }, [initialPrompt, messages.length, isLoading, handleSendMessage, setInitialPrompt]);

  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, feedback } : msg));
    setToastText(t.feedbackThanks as string);
  };

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy).then(() => setToastText(t.copiedSuccess as string));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
        setToastText('Please select a valid image file.');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    if (isRecording) recognitionRef.current.stop();
    else { recognitionRef.current.start(); setIsRecording(true); }
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setIsLangDropdownOpen(false);
    setSuggestionsSource('default'); // Reset to default suggestions on language change

    const newTranslations = translations[lang];
    const langName = LANGUAGE_OPTIONS[lang];
    const messageText = newTranslations[`languageChangedTo${langName}`] as string;

    if (messageText && activeChatId) {
        const systemMessage: ChatMessage = {
            id: `${Date.now()}-system`,
            role: 'system',
            parts: [{ text: messageText }],
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, systemMessage]);
    }
  }
  
  const handleTtsToggle = () => {
    const newTtsState = !isTtsEnabled;
    setIsTtsEnabled(newTtsState);
    setToastText(newTtsState ? t.soundOn as string : t.soundOff as string);
    setSoundIconPop(true);
    setTimeout(() => setSoundIconPop(false), 300);
    if (!newTtsState) {
        stopCurrentAudio();
    }
  };
  
  const handleStop = () => {
    setIsLoading(false);
    stopCurrentAudio();
  };

  const isSendButtonEnabled = !isLoading && (!!userInput.trim() || !!imageFile);

  let lastDisplayedDate: string | null = null;
  const formatDateForSeparator = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toDateString();
  };

  const getRelativeDateLabel = (timestamp: number) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) return t.today as string;
    if (messageDate.toDateString() === yesterday.toDateString()) return t.yesterday as string;

    return messageDate.toLocaleDateString(language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
  };
  
  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopCurrentAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stopCurrentAudio]);

  return (
    <div className={`relative flex flex-col h-screen transition-colors duration-300 overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
      {toastText && (
        <div className="absolute top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-toast-in-out">
            {toastText}
        </div>
      )}

      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onNavigateHome} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-transform duration-300 ease-in-out hover:rotate-[-90deg]" title={t.tooltipHome as string}>
            <HomeIcon className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-red-500 animate-title-background bg-clip-text text-transparent">
                {t.chatTitle}
              </h1>
              <VerifiedIcon className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t.chatSubtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
             <TimeDisplay />
          </div>
          <button 
            onClick={handleTtsToggle} 
            className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${soundIconPop ? 'animate-icon-pop' : ''}`} 
            title={isTtsEnabled ? t.tooltipSoundOn as string : t.tooltipSoundOff as string}
          >
            {isTtsEnabled ? <SpeakerOnIcon className="w-6 h-6" /> : <SpeakerOffIcon className="w-6 h-6" />}
          </button>
          <button onClick={onNavigateHistory} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title={t.tooltipHistory as string}>
            <HistoryIcon className="w-6 h-6" />
          </button>
          <button onClick={() => setTheme(theme === Theme.Light ? Theme.Dark : Theme.Light)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-transform duration-500 ease-in-out hover:rotate-180" title={t.tooltipTheme as string}>
            {theme === Theme.Light ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
          </button>
           <div className="relative">
                <button
                    onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                    className="flex items-center gap-1 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
                    title={t.tooltipLanguage as string}
                >
                    <span className='font-semibold text-sm'>{language.split('-')[0].toUpperCase()}</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isLangDropdownOpen && (
                    <div
                        onMouseLeave={() => setIsLangDropdownOpen(false)}
                        className="absolute right-0 mt-2 w-36 bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md rounded-md shadow-lg py-1 z-30"
                    >
                        {Object.entries(LANGUAGE_OPTIONS).map(([code, name]) => (
                            <a
                                href="#"
                                key={code}
                                onClick={(e) => { e.preventDefault(); handleLanguageChange(code as Language); }}
                                className="block px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                            >
                                {name}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </header>

      <div className="relative flex-1 flex flex-col overflow-hidden">
        <main ref={chatContainerRef} className="relative flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
                {messages.map((msg) => {
                    const currentDateStr = formatDateForSeparator(msg.timestamp);
                    let dateSeparator: React.ReactNode = null;
                    if (currentDateStr !== lastDisplayedDate) {
                        dateSeparator = (
                            <div key={`date-${msg.id}`} className="text-center my-4 animate-fade-in">
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200/80 dark:bg-gray-700/80 backdrop-blur-sm px-3 py-1 rounded-full">
                                    {getRelativeDateLabel(msg.timestamp)}
                                </span>
                            </div>
                        );
                        lastDisplayedDate = currentDateStr;
                    }

                    if (msg.role === 'system') {
                        return (
                            <React.Fragment key={msg.id}>
                                {dateSeparator}
                                <div className="text-center my-4 animate-fade-in">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200/80 dark:bg-gray-700/80 backdrop-blur-sm px-3 py-1 rounded-full">
                                        {msg.parts[0]?.text}
                                    </span>
                                </div>
                            </React.Fragment>
                        );
                    }
                    
                    return (
                        <React.Fragment key={msg.id}>
                            {dateSeparator}
                            <Message 
                              message={msg} 
                              botChar={botChar} 
                              onFeedback={handleFeedback} 
                              onCopy={handleCopy} 
                              onReadAloud={handleReadAloud} 
                              audioPlaybackState={audioPlaybackState}
                            />
                        </React.Fragment>
                    );
                })}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                      <TypingIndicator botChar={botChar}/>
                  </div>
                )}
                <div ref={chatEndRef} />
            </div>
        </main>
      </div>

      <footer className="p-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky bottom-0">
        <div className="max-w-4xl mx-auto">
          {imagePreviewUrl && (
            <div className="relative w-20 h-20 mb-2 rounded-lg shadow-md p-1 bg-gray-200/80 dark:bg-gray-700/80">
              <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover rounded" />
              <button onClick={handleRemoveImage} className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg" aria-label="Remove image">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 p-1.5 bg-transparent border border-gray-300/40 dark:border-gray-600/40 rounded-full backdrop-blur-sm transition-colors focus-within:border-blue-500">
            <div className="flex items-center pl-1">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-colors flex-shrink-0" title={t.tooltipUpload as string}>
                  <ImageIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
              {SpeechRecognition && (
                <button onClick={handleMicClick} className={`p-2 rounded-full hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-colors flex-shrink-0 ${isRecording ? 'animate-pulse-red' : ''}`} title={isRecording ? t.tooltipMicStop as string : t.tooltipMicStart as string}>
                    <MicrophoneIcon className={`w-6 h-6 ${isRecording ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`} />
                </button>
              )}
            </div>
            <div className="relative flex-1 self-center">
                <textarea
                  ref={userInputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.currentTarget.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                  placeholder=""
                  className="w-full bg-transparent focus:outline-none resize-none text-base px-2 pt-2 pb-2 dark:text-gray-200 text-gray-800"
                  rows={1}
                />
                {!userInput.trim() && (
                    <div
                        className="absolute inset-0 flex items-center text-gray-400 dark:text-gray-500 pointer-events-none overflow-hidden"
                    >
                        <span className="animate-slide-fade-in-out-right whitespace-nowrap">{t.askAnythingPlaceholder}</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1.5 self-center">
              {!isLoading && suggestedPrompts.length > 0 && (
                <SuggestionRoller 
                    suggestions={suggestedPrompts} 
                    onSuggestionClick={handleSendMessage}
                    language={language}
                />
              )}
              <button
                  onClick={isLoading ? handleStop : () => handleSendMessage()}
                  disabled={!isSendButtonEnabled && !isLoading}
                  className={`w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-110 transition-all duration-300 ease-in-out flex-shrink-0 ${isSendButtonEnabled ? 'animate-button-pop-in' : ''}`}
                  title={isLoading ? 'Stop' : t.tooltipSend as string}
              >
                  {isLoading ? <StopIcon className="w-6 h-6"/> : <SendIcon className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChatScreen;