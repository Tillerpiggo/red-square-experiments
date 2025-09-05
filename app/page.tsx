'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [opacity, setOpacity] = useState(1);
  const [spacing, setSpacing] = useState(0);
  const [warp, setWarp] = useState(0);
  const [gridSize, setGridSize] = useState(5);
  const [selectedSquares, setSelectedSquares] = useState<Set<number>>(new Set());
  const [isPlaying, setIsPlaying] = useState(true);
  const [beatToggle, setBeatToggle] = useState(false);
  const [currentBeatSquares, setCurrentBeatSquares] = useState<number[]>(Array.from({length: 25}, (_, i) => i));
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect' | null>(null);

  const totalSquares = gridSize * gridSize;

  // Create array of which squares to show this beat
  const getSquaresToRender = (alternate: boolean) => {
    const squares: number[] = [];
    for (let i = 0; i < totalSquares; i++) {
      if (alternate) {
        // On alternate beat, EXCLUDE selected squares
        if (!selectedSquares.has(i)) {
          squares.push(i);
        }
      } else {
        // On main beat, show ALL squares
        squares.push(i);
      }
    }
    return squares;
  };

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Show squares for 200ms
      setBeatToggle(prev => {
        const newToggle = !prev;
        setCurrentBeatSquares(getSquaresToRender(newToggle));
        return newToggle;
      });
      setOpacity(1);
      
      // Then hide for 300ms
      setTimeout(() => setOpacity(0), 200);
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, selectedSquares]);

  const handleSquareInteraction = (index: number, isMouseDown: boolean = false) => {
    if (isMouseDown) {
      // Start dragging
      setIsDragging(true);
      const isSelected = selectedSquares.has(index);
      setDragMode(isSelected ? 'deselect' : 'select');
      
      // Toggle the clicked square
      setSelectedSquares(prev => {
        const newSet = new Set(prev);
        if (isSelected) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
        return newSet;
      });
    } else if (isDragging && dragMode) {
      // Continue dragging
      setSelectedSquares(prev => {
        const newSet = new Set(prev);
        if (dragMode === 'select') {
          newSet.add(index);
        } else {
          newSet.delete(index);
        }
        return newSet;
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  const moveSelectedSquares = (direction: 'up' | 'down' | 'left' | 'right') => {
    setSelectedSquares(prev => {
      const newSet = new Set<number>();
      let canMove = true;

      // Check if movement is valid and calculate new positions
      prev.forEach(index => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        let newRow = row;
        let newCol = col;

        switch (direction) {
          case 'up':
            newRow = row - 1;
            if (newRow < 0) canMove = false;
            break;
          case 'down':
            newRow = row + 1;
            if (newRow >= gridSize) canMove = false;
            break;
          case 'left':
            newCol = col - 1;
            if (newCol < 0) canMove = false;
            break;
          case 'right':
            newCol = col + 1;
            if (newCol >= gridSize) canMove = false;
            break;
        }

        if (canMove) {
          const newIndex = newRow * gridSize + newCol;
          newSet.add(newIndex);
        }
      });

      return canMove ? newSet : prev;
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        moveSelectedSquares('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveSelectedSquares('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveSelectedSquares('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveSelectedSquares('right');
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gridSize, selectedSquares]);

  const getSquareColor = (index: number) => {
    // When paused, show selected squares as gray
    if (!isPlaying && selectedSquares.has(index)) {
      return 'bg-gray-500';
    }
    // During play, all squares are red
    return 'bg-red-500';
  };

  const getSquareTransform = (index: number) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    
    // Create wave-like paper folding effect
    const waveX = Math.sin((col / 4) * Math.PI * 2 + warp * 2);
    const waveY = Math.cos((row / 4) * Math.PI * 2 + warp * 2);
    
    // Subtle rotations that vary across the grid like paper creases
    const centerRow = (gridSize - 1) / 2;
    const centerCol = (gridSize - 1) / 2;
    const rotateX = waveY * warp * 3 + (row - centerRow) * warp * 1.5;
    const rotateY = waveX * warp * 3 + (col - centerCol) * warp * 1.5;
    const rotateZ = (waveX * waveY) * warp * 2;
    
    // Gentle Z-axis displacement for paper-like depth
    const translateZ = (waveX + waveY) * warp * 8;
    
    // Very subtle shadows/opacity changes for warp
    const depthOpacity = warp === 0 ? 1 : Math.max(0.85, 1 - Math.abs(translateZ) * 0.005);
    
    // Calculate final opacity
    let finalOpacity;
    if (!isPlaying) {
      // When paused, all squares are visible
      finalOpacity = depthOpacity;
    } else {
      // During play, check if this square should be rendered this beat
      if (currentBeatSquares.includes(index)) {
        // Square is in render list, use attack envelope
        finalOpacity = opacity * depthOpacity;
      } else {
        // Square not in render list, fully transparent
        finalOpacity = 0;
      }
    }
    
    return {
      transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) translateZ(${translateZ}px)`,
      opacity: finalOpacity,
      transformStyle: 'preserve-3d' as const,
    };
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="flex flex-col items-center gap-8">
        <div 
          className="grid select-none"
          style={{ 
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gap: `${spacing}px`,
            perspective: '800px',
            transformStyle: 'preserve-3d',
          }}
        >
          {Array.from({ length: totalSquares }, (_, i) => (
            <div
              key={i}
              onMouseDown={() => handleSquareInteraction(i, true)}
              onMouseEnter={() => handleSquareInteraction(i, false)}
              className={`w-16 h-16 ${getSquareColor(i)} transition-all duration-300 cursor-pointer hover:brightness-110`}
              style={getSquareTransform(i)}
            ></div>
          ))}
        </div>
        
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          
          <div className="flex items-center gap-4 bg-gray-800 p-4 rounded-lg">
            <label htmlFor="gridSize" className="text-white text-sm">Grid:</label>
            <input
              id="gridSize"
              type="range"
              min="2"
              max="10"
              value={gridSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setGridSize(newSize);
                // Clear selected squares when grid size changes
                setSelectedSquares(new Set());
                setCurrentBeatSquares(Array.from({length: newSize * newSize}, (_, i) => i));
              }}
              className="w-48"
            />
            <span className="text-white text-sm w-12">{gridSize}x{gridSize}</span>
          </div>

          <div className="flex items-center gap-4 bg-gray-800 p-4 rounded-lg">
            <label htmlFor="spacing" className="text-white text-sm">Spacing:</label>
            <input
              id="spacing"
              type="range"
              min="0"
              max="20"
              value={spacing}
              onChange={(e) => setSpacing(Number(e.target.value))}
              className="w-48"
            />
            <span className="text-white text-sm w-12">{spacing}px</span>
          </div>

          <div className="flex items-center gap-4 bg-gray-800 p-4 rounded-lg">
            <label htmlFor="warp" className="text-white text-sm">Warp:</label>
            <input
              id="warp"
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={warp}
              onChange={(e) => setWarp(Number(e.target.value))}
              className="w-48"
            />
            <span className="text-white text-sm w-12">{warp.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
