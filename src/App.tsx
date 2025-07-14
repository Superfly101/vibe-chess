import React, { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

interface CapturedPiece {
  type: string;
  color: 'w' | 'b';
}

interface GameStatus {
  inCheck: boolean;
  inCheckmate: boolean;
  inDraw: boolean;
  inStalemate: boolean;
  inThreefoldRepetition: boolean;
  inInsufficientMaterial: boolean;
}

const ChessGame: React.FC = () => {
  // Use ref to persist game state across renders
  const gameRef = useRef(new Chess());
  const game = gameRef.current;
  
  // Track position to trigger re-renders
  const [gamePosition, setGamePosition] = useState(game.fen());
  const [capturedPieces, setCapturedPieces] = useState<{
    white: CapturedPiece[];
    black: CapturedPiece[];
  }>({
    white: [],
    black: []
  });
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    inCheck: false,
    inCheckmate: false,
    inDraw: false,
    inStalemate: false,
    inThreefoldRepetition: false,
    inInsufficientMaterial: false
  });
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [moveFrom, setMoveFrom] = useState<string>('');
  const [rightClickedSquares, setRightClickedSquares] = useState<{[key: string]: any}>({});
  const [optionSquares, setOptionSquares] = useState<{[key: string]: any}>({});

  const pieceUnicodeMap: {[key: string]: string} = {
    'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
    'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
  };

  const updateGameStatus = useCallback((gameInstance: Chess) => {
    setGameStatus({
      inCheck: gameInstance.inCheck(),
      inCheckmate: gameInstance.isCheckmate(),
      inDraw: gameInstance.isDraw(),
      inStalemate: gameInstance.isStalemate(),
      inThreefoldRepetition: gameInstance.isThreefoldRepetition(),
      inInsufficientMaterial: gameInstance.isInsufficientMaterial()
    });
  }, []);

  const updateCapturedPieces = useCallback((gameInstance: Chess) => {
    const history = gameInstance.history({ verbose: true });
    const captured = { white: [] as CapturedPiece[], black: [] as CapturedPiece[] };
    
    history.forEach((move: any) => {
      if (move.captured) {
        const capturedPiece: CapturedPiece = {
          type: move.captured,
          color: move.color === 'w' ? 'b' : 'w'
        };
        
        if (capturedPiece.color === 'w') {
          captured.white.push(capturedPiece);
        } else {
          captured.black.push(capturedPiece);
        }
      }
    });
    
    setCapturedPieces(captured);
  }, []);

  const updateGameState = useCallback(() => {
    setGamePosition(game.fen());
    setMoveHistory(game.history());
    updateCapturedPieces(game);
    updateGameStatus(game);
  }, [game, updateCapturedPieces, updateGameStatus]);

  const getMoveOptions = useCallback((square: string) => {
    const moves = game.moves({
      square: square as any,
      verbose: true,
    });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    moves.forEach((move: any) => {
      newSquares[move.to] = {
        background:
          game.get(move.to as any) && game.get(move.to as any)?.color !== game.get(square as any)?.color
            ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    });
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)',
    };
    setOptionSquares(newSquares);
    return true;
  }, [game]);

  const makeAMove = useCallback((move: any) => {
    try {
      const result = game.move(move);
      
      if (result) {
        updateGameState();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }, [game, updateGameState]);

  const onSquareClick = useCallback((args: any) => {
    const { square, piece } = args;
    setRightClickedSquares({});

    // If no piece is selected, try to select the clicked square
    if (!moveFrom && piece) {
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }

    // If the same square is clicked again, deselect
    if (moveFrom === square) {
      setMoveFrom('');
      setOptionSquares({});
      return;
    }

    // Check if it's a valid move
    const moves = game.moves({
      square: moveFrom as any,
      verbose: true,
    });
    const foundMove = moves.find((m: any) => m.from === moveFrom && m.to === square);

    if (!foundMove) {
      // Check if clicked on new piece
      const hasMoveOptions = getMoveOptions(square);
      setMoveFrom(hasMoveOptions ? square : '');
      return;
    }

    // Make the move
    const moveData = {
      from: moveFrom,
      to: square,
      promotion: 'q',
    };

    if (makeAMove(moveData)) {
      setMoveFrom('');
      setOptionSquares({});
    } else {
      const hasMoveOptions = getMoveOptions(square);
      setMoveFrom(hasMoveOptions ? square : '');
    }
  }, [moveFrom, getMoveOptions, makeAMove, game]);

  const onPieceDrop = useCallback((args: any) => {
    const { sourceSquare, targetSquare } = args;
    
    if (!targetSquare) {
      return false;
    }

    const moveData = {
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    };

    const moveResult = makeAMove(moveData);
    if (!moveResult) return false;

    setMoveFrom('');
    setOptionSquares({});
    return true;
  }, [makeAMove]);

  const onSquareRightClick = useCallback((args: any) => {
    const { square } = args;
    const colour = 'rgba(0, 0, 255, 0.4)';
    setRightClickedSquares({
      ...rightClickedSquares,
      [square]:
        rightClickedSquares[square] &&
        rightClickedSquares[square].backgroundColor === colour
          ? undefined
          : { backgroundColor: colour },
    });
  }, [rightClickedSquares]);

  const resetGame = useCallback(() => {
    game.reset();
    setCapturedPieces({ white: [], black: [] });
    setMoveHistory([]);
    setSelectedSquare(null);
    setMoveFrom('');
    setRightClickedSquares({});
    setOptionSquares({});
    updateGameState();
  }, [game, updateGameState]);

  const renderCapturedPieces = (pieces: CapturedPiece[], color: 'white' | 'black') => {
    if (pieces.length === 0) return <div className="text-gray-400 text-sm">No captures</div>;
    
    return (
      <div className="flex flex-wrap gap-1">
        {pieces.map((piece, index) => (
          <span key={index} className="text-2xl">
            {pieceUnicodeMap[`${piece.color}${piece.type.toUpperCase()}`]}
          </span>
        ))}
      </div>
    );
  };

  const getStatusMessage = () => {
    if (gameStatus.inCheckmate) {
      return `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`;
    }
    if (gameStatus.inDraw) {
      if (gameStatus.inStalemate) return 'Draw by stalemate!';
      if (gameStatus.inThreefoldRepetition) return 'Draw by threefold repetition!';
      if (gameStatus.inInsufficientMaterial) return 'Draw by insufficient material!';
      return 'Draw!';
    }
    if (gameStatus.inCheck) {
      return `${game.turn() === 'w' ? 'White' : 'Black'} is in check!`;
    }
    return `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
  };

  const customSquareStyles = {
    ...optionSquares,
    ...rightClickedSquares,
  };

  const chessboardOptions = {
    position: gamePosition,
    onPieceDrop,
    onSquareClick,
    onSquareRightClick,
    squareStyles: customSquareStyles,
    arePiecesDraggable: true,
    boardOrientation: 'white' as const,
    animationDuration: 200,
    boardWidth: typeof window !== 'undefined' ? Math.min(window.innerWidth - 100, 500) : 500,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">Chess Game</h1>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 inline-block">
            <p className="text-white text-lg font-semibold">{getStatusMessage()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Captured Pieces - Black */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3 text-center">Black Captures</h3>
            <div className="min-h-[60px] flex items-center justify-center">
              {renderCapturedPieces(capturedPieces.black, 'black')}
            </div>
          </div>

          {/* Chess Board */}
          <div className="flex justify-center">
            <div className="w-full max-w-[500px] bg-white/5 backdrop-blur-sm rounded-lg p-4">
              <Chessboard options={chessboardOptions} />
            </div>
          </div>

          {/* Captured Pieces - White */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3 text-center">White Captures</h3>
            <div className="min-h-[60px] flex items-center justify-center">
              {renderCapturedPieces(capturedPieces.white, 'white')}
            </div>
          </div>
        </div>

        {/* Game Controls */}
        <div className="mt-6 text-center">
          <button
            onClick={resetGame}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 mr-4"
          >
            New Game
          </button>
        </div>

        {/* Move History */}
        {moveHistory.length > 0 && (
          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3">Move History</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-32 overflow-y-auto">
              {moveHistory.map((move, index) => (
                <div
                  key={index}
                  className="bg-white/10 rounded px-2 py-1 text-white text-sm text-center"
                >
                  <span className="text-gray-400">{Math.floor(index / 2) + 1}.</span>
                  {index % 2 === 0 ? ' ' : '.. '}
                  {move}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3">How to Play</h3>
          <div className="text-gray-300 text-sm space-y-2">
            <p><strong>Desktop:</strong> Click to select a piece, then click the destination square. You can also drag and drop pieces.</p>
            <p><strong>Mobile:</strong> Tap to select a piece, then tap the destination square. Touch and drag also works.</p>
            <p><strong>Highlights:</strong> Yellow highlights show selected pieces, circles show possible moves.</p>
            <p><strong>Right-click (or long press on mobile):</strong> Mark squares with blue highlights for analysis.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessGame;