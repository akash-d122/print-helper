import React, { createContext, useContext, useRef } from 'react';

const CanvasRefContext = createContext(null);

export function CanvasRefProvider({ children }) {
  const canvasRef = useRef(null);
  return (
    <CanvasRefContext.Provider value={canvasRef}>
      {children}
    </CanvasRefContext.Provider>
  );
}

export function useCanvasRef() {
  return useContext(CanvasRefContext);
} 