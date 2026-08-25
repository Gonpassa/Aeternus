import * as React from 'react';

export interface Ripple {
  key: number;
  x: number;
  y: number;
}

export function useRipple<T extends HTMLElement>(onClick?: (event: React.MouseEvent<T>) => void) {
  const [ripple, setRipple] = React.useState<Ripple | null>(null);

  const handleClick = (event: React.MouseEvent<T>) => {
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
