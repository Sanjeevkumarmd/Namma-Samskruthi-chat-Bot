import React from 'react';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { Language } from '../types';

interface DateDisplayProps {
    language: Language;
}

const DateDisplay: React.FC<DateDisplayProps> = ({ language }) => {
    const now = useCurrentTime();
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const dateString = now.toLocaleDateString(language, options);

    return (
        <div className="text-xs font-semibold text-white/90 drop-shadow-md hidden md:block">
            {dateString}
        </div>
    );
};

export default DateDisplay;
