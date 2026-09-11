import { useState, type MouseEvent } from 'react';

export interface Ripple {
  key: number;
  x: number;
  y: number;
}

export function useRipple<T extends HTMLElement>(onClick?: (event: MouseEvent<T>) => void) {
  const [ripple, setRipple] = useState<Ripple | null>(null);

  const handleClick = (event: MouseEvent<T>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setRipple({
      key: Date.now(),
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    onClick?.(event);
  };

  const clearRipple = () => setRipple(null);

  return { ripple, handleClick, clearRipple };
}
