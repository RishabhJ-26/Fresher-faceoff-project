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
  const lastMouseEventRef = useRef<MouseEvent | null>(null);
  const [lastPosition, setLastPosition] = useState<{ x: number, y: number } | null>(null);


  useEffect(() => {
    const animateOutline = () => {
      let targetX: number | null = null;
      let targetY: number | null = null;

      if (lastMouseEventRef.current) {
        targetX = lastMouseEventRef.current.clientX;
        targetY = lastMouseEventRef.current.clientY;
      } else if (lastPosition) { // Fallback to state if ref is null
        targetX = lastPosition.x;
        targetY = lastPosition.y;
      }

      if (targetX !== null && targetY !== null && cursorOutlineRef.current) {
        const currentX = parseFloat(cursorOutlineRef.current.style.getPropertyValue('--x') || targetX.toString());
        const currentY = parseFloat(cursorOutlineRef.current.style.getPropertyValue('--y') || targetY.toString());
        
        const lerpFactor = 0.35; 
        const newX = currentX + (targetX - currentX) * lerpFactor;
        const newY = currentY + (targetY - currentY) * lerpFactor;

        cursorOutlineRef.current.style.setProperty('--x', newX.toString());
        cursorOutlineRef.current.style.setProperty('--y', newY.toString());
        cursorOutlineRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
      }
      requestRef.current = requestAnimationFrame(animateOutline);
    };
    
    requestRef.current = requestAnimationFrame(animateOutline);

    const onMouseMove = (event: MouseEvent) => {
      setIsVisible(true); 
      lastMouseEventRef.current = event; 
      const { clientX, clientY } = event;
      setLastPosition({ x: clientX, y: clientY });


      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
      }
      
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
      if (!document.fullscreenElement) {
        setIsVisible(false);
      }
    };
    
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsVisible(true); // Always ensure cursor is 'visible' logically

      // If entering or already in fullscreen, and we have a last known position, apply it
      if (isCurrentlyFullscreen && lastPosition) {
        if (cursorDotRef.current) {
          cursorDotRef.current.style.transform = `translate3d(${lastPosition.x}px, ${lastPosition.y}px, 0)`;
        }
        if (cursorOutlineRef.current) {
          cursorOutlineRef.current.style.setProperty('--x', lastPosition.x.toString());
          cursorOutlineRef.current.style.setProperty('--y', lastPosition.y.toString());
          cursorOutlineRef.current.style.transform = `translate3d(${lastPosition.x}px, ${lastPosition.y}px, 0)`;
        }
      } else if (!isCurrentlyFullscreen && lastPosition) {
        // When exiting fullscreen, ensure position is updated if mouse hasn't moved
         if (cursorDotRef.current) {
          cursorDotRef.current.style.transform = `translate3d(${lastPosition.x}px, ${lastPosition.y}px, 0)`;
        }
         if (cursorOutlineRef.current) {
          cursorOutlineRef.current.style.setProperty('--x', lastPosition.x.toString());
          cursorOutlineRef.current.style.setProperty('--y', lastPosition.y.toString());
          // Let animation catch up
        }
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseenter', onMouseEnterDocument);
    document.addEventListener('mouseleave', onMouseLeaveDocument);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Initial position update if lastPosition is already known (e.g. from SSR or previous state)
    if (isVisible && lastPosition) {
        if (cursorDotRef.current) {
            cursorDotRef.current.style.transform = `translate3d(${lastPosition.x}px, ${lastPosition.y}px, 0)`;
        }
        if (cursorOutlineRef.current) {
            cursorOutlineRef.current.style.setProperty('--x', lastPosition.x.toString());
            cursorOutlineRef.current.style.setProperty('--y', lastPosition.y.toString());
            cursorOutlineRef.current.style.transform = `translate3d(${lastPosition.x}px, ${lastPosition.y}px, 0)`;
        }
    }


    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseenter', onMouseEnterDocument);
      document.removeEventListener('mouseleave', onMouseLeaveDocument);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isVisible, lastPosition]); // Add isVisible and lastPosition to deps for re-running effect if they change from outside

  return (
    <>
      <div
        ref={cursorOutlineRef}
        className={cn(
          'fixed top-0 left-0 rounded-full pointer-events-none z-[9999]', 
          'w-8 h-8 border-2',
          isHoveringInteractive ? 'scale-150 border-accent/80 opacity-80' : 'scale-100 border-primary/60 opacity-60',
          isVisible ? 'opacity-60' : 'opacity-0 scale-0', 
          'transition-transform duration-75 ease-out' 
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
          'transition-all duration-100 ease-out' 
        )}
        style={{ transform: 'translate3d(-100%, -100%, 0) scale(1)' }} 
      />
    </>
  );
};

export default CustomCursor;