import { useState, useEffect } from 'react';

/**
 * A custom hook for creating a typewriter effect.
 * @param text The full text to be typed out.
 * @param speed The typing speed in milliseconds per character.
 * @param onComplete An optional callback function to run when typing is finished.
 * @returns The currently typed out string.
 */
export const useTypewriter = (text: string, speed: number = 5, onComplete?: () => void) => {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    // Don't type out empty strings
    if (!text) {
        setDisplayText('');
        return;
    }

    setDisplayText(''); // Start fresh
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(typingInterval);
        onComplete?.();
      }
    }, speed);

    // Cleanup interval on component unmount or when text/speed changes
    return () => {
      clearInterval(typingInterval);
    };
  }, [text, speed, onComplete]);

  return displayText;
};
