import React from 'react';
import { parsePlate, isValidRussianPlate } from '../../utils/plateFormatter';

interface Props {
  plate: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const RussianPlateBadge: React.FC<Props> = ({ plate, className = '', size = 'md' }) => {
  const parsed = parsePlate(plate);
  const isValid = isValidRussianPlate(plate);

  const sizeClasses = {
    sm: 'text-[11px] h-6 px-1.5 gap-1',
    md: 'text-xs sm:text-sm h-8 px-2.5 gap-1.5',
    lg: 'text-base sm:text-lg h-10 px-3.5 gap-2',
  }[size];

  if (!isValid || !parsed) {
    return (
      <span className={`inline-flex items-center font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-white/20 text-amber-300 ${className}`}>
        {plate || 'БЕЗ НОМЕРА'}
      </span>
    );
  }

  // match: letter, 3 digits, 2 letters, region
  const match = plate.match(/^([АВЕКМНОРСТУХ])(\d{3})([АВЕКМНОРСТУХ]{2})(\d{2,3})$/);
  if (!match) return null;

  const letter1 = match[1];
  const digits = match[2];
  const letters2 = match[3];
  const region = match[4];

  return (
    <div
      className={`inline-flex items-center bg-[#fdfdfd] text-[#111318] border-[1.5px] border-[#1a1e24] rounded-md font-mono font-black tracking-wider shadow-sm select-none ${sizeClasses} ${className}`}
      title={`Госномер РФ: ${plate}`}
    >
      {/* Main plate segment: 1 letter + 3 numbers + 2 letters */}
      <div className="flex items-center tracking-normal font-black font-sans">
        <span className="text-[1.05em] uppercase font-bold">{letter1}</span>
        <span className="text-[1.15em] mx-0.5 tracking-tight font-extrabold">{digits}</span>
        <span className="text-[1.05em] uppercase font-bold">{letters2}</span>
      </div>

      {/* Region segment divider */}
      <div className="w-[1.5px] h-full bg-[#1a1e24]/80 mx-0.5" />

      {/* Region code & RUS with mini flag */}
      <div className="flex flex-col items-center justify-center leading-none pl-0.5">
        <span className="text-[0.9em] font-extrabold font-mono">{region}</span>
        <div className="flex items-center gap-0.5 text-[8px] font-sans font-bold text-[#111318] -mt-0.5">
          <span>RUS</span>
          <span className="inline-block w-2.5 h-1.5 border border-black/20 rounded-[1px] overflow-hidden bg-gradient-to-b from-white via-blue-600 to-red-600" />
        </div>
      </div>
    </div>
  );
};
