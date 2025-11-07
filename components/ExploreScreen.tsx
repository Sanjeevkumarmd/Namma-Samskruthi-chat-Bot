import React from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { VISUAL_PROMPTS } from '../constants';
import { ArrowLeftIcon } from './icons';

interface ExploreScreenProps {
  onNavigateBack: () => void;
  onStartChatWithPrompt: (prompt: string) => void;
  language: Language;
}

const ExploreScreen: React.FC<ExploreScreenProps> = ({ onNavigateBack, onStartChatWithPrompt, language }) => {
  const t = translations[language];

  const cardColors = [
    'from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900',
    'from-red-100 to-red-200 dark:from-red-800 dark:to-red-900',
    'from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900',
    'from-green-100 to-green-200 dark:from-green-800 dark:to-green-900',
    'from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900',
    'from-pink-100 to-pink-200 dark:from-pink-800 dark:to-pink-900',
  ];

  return (
    <div className="flex flex-col h-screen text-gray-800 dark:text-gray-200">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shadow-sm bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onNavigateBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">{t.explorePageTitle}</h1>
        </div>
      </header>
      <main className="flex-grow overflow-y-auto custom-scrollbar p-4 bg-black/10 dark:bg-black/20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VISUAL_PROMPTS.map((prompt, index) => {
            const color = cardColors[index % cardColors.length];
            return (
              <div 
                key={index} 
                className={`bg-gradient-to-br ${color} rounded-lg shadow-lg overflow-hidden group transform hover:-translate-y-1 transition-transform duration-300 flex flex-col p-6 h-60 justify-between animate-fade-in-up`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-grow">
                  <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-gray-100">{t[prompt.titleKey]}</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{t[prompt.descriptionKey]}</p>
                </div>
                <button 
                  onClick={() => onStartChatWithPrompt(prompt.prompt)}
                  className="w-full mt-4 px-4 py-2 bg-black/20 dark:bg-white/20 text-white dark:text-gray-100 rounded-lg text-sm font-semibold hover:bg-black/30 dark:hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  {t.chatAboutThis}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default ExploreScreen;