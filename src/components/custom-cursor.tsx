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
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number }>({ x: -100, y: -100 });


  useEffect(() => {
    const animateOutline = () => {
      let targetX = lastPosition.x;
      let targetY = lastPosition.y;

      if (lastMouseEventRef.current) {
        targetX = lastMouseEventRef.current.clientX;
        targetY = lastMouseEventRef.current.clientY;
      }

      if (cursorOutlineRef.current) {
        const currentX = parseFloat(cursorOutlineRef.current.style.getPropertyValue('--x') || targetX.toString());
        const currentY = parseFloat(cursorOutlineRef.current.style.getPropertyValue('--y') || targetY.toString());

        const lerpFactor = 0.25; 
        const newX = currentX + (targetX - currentX) * lerpFactor;
        const newY = currentY + (targetY - currentY) * lerpFactor;

        cursorOutlineRef.current.style.setProperty('--x', newX.toString());
        cursorOutlineRef.current.style.setProperty('--y', newY.toString());
        cursorOutlineRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
      }
      requestRef.current = requestAnimationFrame(animateOutline);
    };

    const onMouseMove = (event: MouseEvent) => {
      if(!isVisible) setIsVisible(true); 
      lastMouseEventRef.current = event;
      const { clientX, clientY } = event;
      setLastPosition({ x: clientX, y: clientY });


      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
      }

      if (cursorOutlineRef.current && !cursorOutlineRef.current.style.getPropertyValue('--x')) {
        cursorOutlineRef.current.style.setProperty('--x', clientX.toString());
        cursorOutlineRef.current.style.setProperty('--y', clientY.toString());
        cursorOutlineRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
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

    const onMouseLeaveDocument = (event: MouseEvent) => {
      if (event.clientY <= 0 || event.clientX <= 0 || (event.clientX >= window.innerWidth || event.clientY >= window.innerHeight)) {
        setIsVisible(false);
      }
    };
    
    const handleFullscreenChange = () => {
      setIsVisible(true); 
      const currentX = lastMouseEventRef.current?.clientX ?? lastPosition.x;
      const currentY = lastMouseEventRef.current?.clientY ?? lastPosition.y;
      
      if (currentX !== -100 || currentY !== -100) { 
          if (cursorDotRef.current) {
              cursorDotRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
          }
          if (cursorOutlineRef.current) {
              cursorOutlineRef.current.style.setProperty('--x', currentX.toString());
              cursorOutlineRef.current.style.setProperty('--y', currentY.toString());
              cursorOutlineRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
          }
      }
    };

    // Set initial position for outline if lastPosition is valid
    if (cursorOutlineRef.current && lastPosition.x !== -100 && lastPosition.y !== -100) {
        if (!cursorOutlineRef.current.style.getPropertyValue('--x')) {
             cursorOutlineRef.current.style.setProperty('--x', lastPosition.x.toString());
             cursorOutlineRef.current.style.setProperty('--y', lastPosition.y.toString());
             cursorOutlineRef.current.style.transform = `translate3d(${lastPosition.x}px, ${lastPosition.y}px, 0)`;
        }
    }

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseenter', onMouseEnterDocument);
    document.addEventListener('mouseleave', onMouseLeaveDocument);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    requestRef.current = requestAnimationFrame(animateOutline);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseenter', onMouseEnterDocument);
      document.removeEventListener('mouseleave', onMouseLeaveDocument);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isVisible, lastPosition.x, lastPosition.y]); // Re-run effect if isVisible or lastPosition changes.
                                                     // lastPosition dependency ensures initial outline position is set if mouse hasn't moved yet.
                                                     // isVisible dependency ensures listeners are correctly managed if visibility logic changes.


  return (
    <>
      <div
        ref={cursorOutlineRef}
        className={cn(
          'fixed top-0 left-0 rounded-full pointer-events-none z-[9999]',
          'w-8 h-8 border-2',
          isHoveringInteractive ? 'scale-150 border-accent/80 opacity-80' : 'scale-100 border-primary/60 opacity-60',
          isVisible ? 'opacity-60' : 'opacity-0 scale-0', 
          'transition-transform duration-75 ease-out',
          isVisible && isHoveringInteractive ? 'opacity-80' : isVisible ? 'opacity-60' : 'opacity-0'
        )}
        style={{
             // transform is handled by animateOutline and initial JS setup
             opacity: isVisible ? (isHoveringInteractive ? 0.8 : 0.6) : 0,
        }}
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
        style={{
            transform: `translate3d(${lastPosition.x}px, ${lastPosition.y}px, 0) scale(${isHoveringInteractive ? 1.5 : 1})`,
            opacity: isVisible ? 1 : 0,
        }}
      />
    </>
  );
};

export default CustomCursor;
