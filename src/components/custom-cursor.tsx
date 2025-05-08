
'use client';

import type { FC } from 'react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const CustomCursor: FC = () => {
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorOutlineRef = useRef<HTMLDivElement>(null);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const lastMouseEventRef = useRef<MouseEvent | null>(null);


  useEffect(() => {
    const animateOutline = () => {
      if (lastMouseEventRef.current && cursorOutlineRef.current) {
        const { clientX, clientY } = lastMouseEventRef.current;
        
        const currentX = parseFloat(cursorOutlineRef.current.style.getPropertyValue('--x') || clientX.toString());
        const currentY = parseFloat(cursorOutlineRef.current.style.getPropertyValue('--y') || clientY.toString());
        
        // Adjusted lerp factor for a slightly faster/smoother follow
        const lerpFactor = 0.35; 
        const newX = currentX + (clientX - currentX) * lerpFactor;
        const newY = currentY + (clientY - currentY) * lerpFactor;

        cursorOutlineRef.current.style.setProperty('--x', newX.toString());
        cursorOutlineRef.current.style.setProperty('--y', newY.toString());
        cursorOutlineRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
      }
      requestRef.current = requestAnimationFrame(animateOutline);
    };
    
    requestRef.current = requestAnimationFrame(animateOutline);

    const onMouseMove = (event: MouseEvent) => {
      setIsVisible(true); // Always ensure visibility on mouse move
      lastMouseEventRef.current = event; // Store the latest event for the animation loop

      const { clientX, clientY } = event;

      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
      }
      
      // Initialize outline position if not set
      if (cursorOutlineRef.current && !cursorOutlineRef.current.style.getPropertyValue('--x')) {
        cursorOutlineRef.current.style.setProperty('--x', clientX.toString());
        cursorOutlineRef.current.style.setProperty('--y', clientY.toString());
      }

      const target = event.target as HTMLElement;
      if (target.closest('button, a, [role="button"], input, textarea, select, [data-interactive="true"]')) {
        setIsHoveringInteractive(true);
      } else {
        setIsHoveringInteractive(false);
      }
    };

    const onMouseEnterDocument = () => {
      setIsVisible(true);
    };

    const onMouseLeaveDocument = () => {
      if (!document.fullscreenElement) { // Only hide if not in fullscreen
        setIsVisible(false);
      }
    };
    
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setIsVisible(true); // Ensure cursor is visible when entering fullscreen
      } else {
        // Check if mouse is outside viewport when exiting fullscreen
        // This part is tricky as mouse position isn't tracked if outside
        // For simplicity, we rely on subsequent mousemove/mouseenter to show it
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseenter', onMouseEnterDocument);
    document.addEventListener('mouseleave', onMouseLeaveDocument);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseenter', onMouseEnterDocument);
      document.removeEventListener('mouseleave', onMouseLeaveDocument);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <>
      <div
        ref={cursorOutlineRef}
        className={cn(
          'fixed top-0 left-0 rounded-full pointer-events-none z-[9999]', // Removed transition-all duration-75 for direct control via rAF
          'w-8 h-8 border-2',
          isHoveringInteractive ? 'scale-150 border-accent/80 opacity-80' : 'scale-100 border-primary/60 opacity-60',
          isVisible ? 'opacity-60' : 'opacity-0 scale-0',
          'transition-transform duration-75 ease-out' // Keep transform transition for scale/opacity changes
        )}
        style={{ transform: 'translate3d(-100%, -100%, 0) scale(1)' }} 
      />
      <div
        ref={cursorDotRef}
        className={cn(
          'fixed top-0 left-0 rounded-full pointer-events-none z-[9999]',
          'w-2 h-2', 
          isHoveringInteractive ? 'bg-accent scale-150' : 'bg-primary scale-100',
          isVisible ? 'opacity-100' : 'opacity-0 scale-0',
          'transition-all duration-100 ease-out' // Keep transition for bg/scale changes
        )}
        style={{ transform: 'translate3d(-100%, -100%, 0) scale(1)' }} 
      />
    </>
  );
};

export default CustomCursor;
