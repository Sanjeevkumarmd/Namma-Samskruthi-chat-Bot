import React, { useState, useEffect, useRef } from 'react';
import { HERITAGE_IMAGES, LANGUAGE_OPTIONS } from '../constants';
import { ChevronDownIcon, SunIcon, MoonIcon } from './icons';
import { Language, Theme } from '../types';
import { translations } from '../translations';
import TimeDisplay from './TimeDisplay';
import DateDisplay from './DateDisplay';
import { useUserLocation } from '../hooks/useUserLocation';


interface LanguageSelectorProps {
    language: Language;
    setLanguage: (lang: Language) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ language, setLanguage }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 p-2 rounded-full hover:bg-white/20 transition-all duration-300"
            >
                <span className='font-semibold'>{language.split('-')[0].toUpperCase()}</span>
                <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div
                    onMouseLeave={() => setIsOpen(false)}
                    className="absolute right-0 mt-2 w-36 bg-white/10 dark:bg-black/20 border border-white/20 backdrop-blur-md rounded-md shadow-lg py-1 z-30"
                >
                    {Object.entries(LANGUAGE_OPTIONS).map(([code, name]) => (
                        <a
                            href="#"
                            key={code}
                            onClick={(e) => {
                                e.preventDefault();
                                setLanguage(code as Language);
                                setIsOpen(false);
                            }}
                            className="block px-4 py-2 text-sm text-white hover:bg-white/20 dark:hover:bg-black/40"
                        >
                            {name}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

const LocationDisplay: React.FC = () => {
    const { location, error, loading } = useUserLocation();

    if (loading) {
        return <div className="text-xs font-semibold text-white/90 drop-shadow-md animate-pulse">Locating...</div>;
    }

    if (error) {
        console.warn("Could not get user location:", error);
        return null;
    }

    if (location) {
        return <div className="text-xs font-semibold text-white/90 drop-shadow-md">{location.city}, {location.country}</div>;
    }

    return null;
};


interface WelcomeScreenProps {
  onNavigate: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigate, language, setLanguage, theme, setTheme }) => {
  const t = translations[language];
  const botChar = t.botIconChar as string;
  const botRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const botElement = botRef.current;
    const mainElement = mainRef.current;
    if (!botElement || !mainElement) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { left, top, width, height } = mainElement.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      
      const rotateY = (deltaX / (width / 2)) * 12; // Max 12 deg
      const rotateX = -(deltaY / (height / 2)) * 12; // Max 12 deg

      requestAnimationFrame(() => {
        botElement.style.setProperty('--rotateX', `${rotateX}deg`);
        botElement.style.setProperty('--rotateY', `${rotateY}deg`);
      });
    };

    const handleMouseLeave = () => {
      requestAnimationFrame(() => {
        botElement.style.setProperty('--rotateX', '0deg');
        botElement.style.setProperty('--rotateY', '0deg');
      });
    };

    mainElement.addEventListener('mousemove', handleMouseMove);
    mainElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      mainElement.removeEventListener('mousemove', handleMouseMove);
      mainElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center text-white p-8">
      <header className="absolute top-4 right-4 flex items-center gap-4 z-20">
            <div className='flex flex-col items-end'>
                <TimeDisplay />
                <DateDisplay language={language} />
                <LocationDisplay />
            </div>
            <button
                onClick={() => setTheme(theme === Theme.Light ? Theme.Dark : Theme.Light)}
                className="p-2 rounded-full hover:bg-white/20 transition-transform duration-500 ease-in-out hover:rotate-180"
                aria-label="Toggle theme"
            >
                {theme === Theme.Light 
                    ? <MoonIcon className="w-6 h-6 text-white" /> 
                    : <SunIcon className="w-6 h-6 text-white" />}
            </button>
            
            <LanguageSelector language={language} setLanguage={setLanguage} />
      </header>

      <main ref={mainRef} className="relative z-10 flex flex-col items-center justify-center text-center h-full w-full">
        <div className="flex-grow flex flex-col items-center justify-center">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-8 animate-flag-wave">
                {t.welcomeTitle}
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mb-12 drop-shadow-md animate-subtitle">
                {t.welcomeSubtitle}
            </p>

            <button 
                ref={botRef}
                onClick={onNavigate} 
                className="relative w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center text-white font-bold text-6xl md:text-7xl select-none flex-shrink-0 bot-3d-interactive drop-shadow-lg"
                aria-label="Start Chat"
            >
              {botChar}
            </button>
        </div>
      </main>
      
      <footer className="absolute bottom-4 left-8 text-left z-10">
         <p className="text-lg max-w-md drop-shadow-md animate-description">
            {t.welcomeDescription}
         </p>
      </footer>
    </div>
  );
};

export default WelcomeScreen;