
import React from 'react';
import { useCurrentTime } from '../hooks/useCurrentTime';

const Digit: React.FC<{ char: string }> = ({ char }) => {
  // If character is not a number (e.g., ':'), display it statically.
  if (isNaN(parseInt(char))) {
    // We give it a fixed width to align with numbers and center it.
    // The parent's `items-center` will handle vertical alignment.
    return <span className="w-[0.6em] text-center">{char}</span>;
  }

  const num = parseInt(char, 10);
  // Calculate the vertical offset to show the correct digit.
  // Each digit is 1em high, we have 10 digits (0-9).
  // `yOffset` will be -0% for 0, -10% for 1, ..., -90% for 9.
  const yOffset = -num * 10;

  return (
    // Container with fixed height and overflow hidden to create the "slot" effect.
    <div className="h-[1em] w-[0.6em] overflow-hidden">
      <div
        // The inner div contains all digits and moves vertically.
        // A smoother 'ease-in-out' transition is used for the rolling effect.
        className="transition-transform duration-500 ease-in-out"
        style={{ transform: `translateY(${yOffset}%)` }}
      >
        {/* Render all digits from 0 to 9 stacked vertically. */}
        {[...Array(10).keys()].map(i => (
          <div key={i} className="h-[1em] flex items-center justify-center">
            {i}
          </div>
        ))}
      </div>
    </div>
  );
};

const TimeDisplay: React.FC = () => {
    const time = useCurrentTime();

    let hours = time.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    // Format time into a string for easy mapping.
    const timeString = [
        String(hours).padStart(2, '0'),
        ':',
        String(time.getMinutes()).padStart(2, '0'),
        ':',
        String(time.getSeconds()).padStart(2, '0')
    ].join('');

    return (
        // Use 'items-center' for better vertical alignment of all parts of the clock.
        <div className="flex items-center font-mono text-lg md:text-xl font-bold tracking-wider text-white drop-shadow-lg">
        {timeString.split('').map((char, index) => (
            // Use a stable key (index) for each digit position to enable CSS transitions.
            <Digit key={index} char={char} />
        ))}
        <span className="ml-2 text-base md:text-lg font-semibold">{ampm}</span>
        </div>
    );
};

export default TimeDisplay;