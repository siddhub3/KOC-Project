'use client';
import { Chessboard } from 'react-chessboard';
import { useState } from 'react';

export function ChessBoardLive({
  fen,
  orientation = 'white',
  onMove,
  disabled,
  lastMove,
}: {
  fen: string;
  orientation?: 'white' | 'black';
  onMove?: (from: string, to: string) => void;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
}) {
  const [moveFrom, setMoveFrom] = useState<string | null>(null);

  const handleSquareClick = ({ square }: { square: string }) => {
    if (disabled) return;
    if (!moveFrom) {
      setMoveFrom(square);
    } else {
      if (moveFrom !== square) onMove?.(moveFrom, square);
      setMoveFrom(null);
    }
  };

  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }) => {
    if (disabled || !targetSquare) return false;
    onMove?.(sourceSquare, targetSquare);
    return true;
  };

  const squareStyles: Record<string, React.CSSProperties> = lastMove
    ? {
        [lastMove.from]: { background: 'rgba(255, 220, 0, 0.4)' },
        [lastMove.to]: { background: 'rgba(255, 220, 0, 0.6)' },
      }
    : {};

  return (
    <div className="w-full max-w-[560px] aspect-square">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: !disabled,
          onPieceDrop: handlePieceDrop,
          onSquareClick: handleSquareClick,
          boardStyle: { borderRadius: '4px' },
          darkSquareStyle: { backgroundColor: '#769656' },
          lightSquareStyle: { backgroundColor: '#eeeed2' },
          darkSquareNotationStyle: { color: '#edf1dd', fontWeight: 700 },
          lightSquareNotationStyle: { color: '#769656', fontWeight: 700 },
          squareStyles,
        }}
      />
    </div>
  );
}
