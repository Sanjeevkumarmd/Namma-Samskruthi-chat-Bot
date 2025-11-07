import React, { useState, useEffect } from 'react';

interface SuggestionRollerProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  language: string;
}

const SuggestionRoller: React.FC<SuggestionRollerProps> = ({ suggestions, onSuggestionClick, language }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSuggestion, setCurrentSuggestion] = useState(suggestions[0] || '');
  const [animationClass, setAnimationClass] = useState('animate-suggestion-roll-in');

  useEffect(() => {
    if (suggestions.length === 0) {
      setCurrentSuggestion('');
      return;
    };

    const interval = setInterval(() => {
      setAnimationClass('animate-suggestion-roll-out');

      setTimeout(() => {
        const nextIndex = (currentIndex + 1) % suggestions.length;
        setCurrentIndex(nextIndex);
        setCurrentSuggestion(suggestions[nextIndex]);
        setAnimationClass('animate-suggestion-roll-in');
      }, 500); // This should match animation duration
    }, 4000); // Time suggestion is visible

    return () => clearInterval(interval);
  }, [suggestions, currentIndex]);
  
  useEffect(() => {
      setCurrentIndex(0);
      setCurrentSuggestion(suggestions[0] || '');
      setAnimationClass('animate-suggestion-roll-in');
  }, [suggestions]);

  if (suggestions.length === 0) return null;

  return (
    <div 
        className="h-9 flex items-center justify-center overflow-hidden cursor-pointer" 
        onClick={() => onSuggestionClick(currentSuggestion)}
        title={currentSuggestion}
    >
        <span
            key={currentIndex}
            className={`px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap ${animationClass}`}
        >
            {currentSuggestion}
        </span>
    </div>
  );
};

export default SuggestionRoller;
