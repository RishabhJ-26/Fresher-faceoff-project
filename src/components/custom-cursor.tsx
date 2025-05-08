
'use client';

import type { FC } from 'react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const CustomCursor: FC = () => {
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorOutlineRef = useRef<HTMLDivElement>(null);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // Start hidden
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  // Debounce mouse move for outline for smoother follow
  const animateOutline = (event: MouseEvent, currentTime: number) => {
    if (previousTimeRef.current !== undefined) {
      const { clientX, clientY } = event;
      if (cursorOutlineRef.current) {
        // Apply a slight delay factor to the outline movement
        const x = parseFloat(cursorOutlineRef.current.style.getPropertyValue('--x') || clientX.toString());
        const y = parseFloat(cursorOutlineRef.current.style.getPropertyValue('--y') || clientY.toString());
        
        const newX = x + (clientX - x) * 0.2; // Adjust 0.2 for more/less lag
        const newY = y + (clientY - y) * 0.2;

        cursorOutlineRef.current.style.setProperty('--x', newX.toString());
        cursorOutlineRef.current.style.setProperty('--y', newY.toString());
        cursorOutlineRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
      }
    }
    previousTimeRef.current = currentTime;
    requestRef.current = requestAnimationFrame((time) => animateOutline(event, time));
  };


  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!isVisible) setIsVisible(true); // Show cursor on first move

      const { clientX, clientY } = event;

      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
      }
      
      // Initial position for outline if not set
      if (cursorOutlineRef.current && !cursorOutlineRef.current.style.getPropertyValue('--x')) {
        cursorOutlineRef.current.style.setProperty('--x', clientX.toString());
        cursorOutlineRef.current.style.setProperty('--y', clientY.toString());
      }


      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      // Pass the event to keep track of the latest mouse position for the animation loop
      const eventCopy = new MouseEvent(event.type, event) as MouseEvent & { clientX: number, clientY: number};
      requestRef.current = requestAnimationFrame((time) => animateOutline(eventCopy, time));
      

      const target = event.target as HTMLElement;
      if (target.closest('button, a, [role="button"], input, textarea, select, [data-interactive="true"]')) {
        setIsHoveringInteractive(true);
      } else {
        setIsHoveringInteractive(false);
      }
    };

    const onMouseEnter = () => {
      setIsVisible(true);
    };
    const onMouseLeave = () => {
      setIsVisible(false);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseenter', onMouseEnter);
    document.addEventListener('mouseleave', onMouseLeave);


    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseenter', onMouseEnter);
      document.removeEventListener('mouseleave', onMouseLeave);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isVisible]);

  return (
    <>
      {/* Cursor Outline */}
      <div
        ref={cursorOutlineRef}
        className={cn(
          'fixed top-0 left-0 rounded-full pointer-events-none z-[9999] transition-all duration-75 ease-out',
          'w-8 h-8 border-2',
          isHoveringInteractive ? 'scale-150 border-accent/80 opacity-80' : 'scale-100 border-primary/60 opacity-60',
          isVisible ? 'opacity-60' : 'opacity-0 scale-0' // Control visibility
        )}
        style={{ transform: 'translate3d(-100%, -100%, 0)' }} // Initial off-screen and small
      />
      {/* Cursor Dot */}
      <div
        ref={cursorDotRef}
        className={cn(
          'fixed top-0 left-0 rounded-full pointer-events-none z-[9999] transition-all duration-100 ease-out',
          'w-2 h-2', 
          isHoveringInteractive ? 'bg-accent scale-150' : 'bg-primary scale-100',
          isVisible ? 'opacity-100' : 'opacity-0 scale-0' // Control visibility
        )}
        style={{ transform: 'translate3d(-100%, -100%, 0)' }} // Initial off-screen and small
      />
    </>
  );
};

export default CustomCursor;
