import { useMemo, useState } from "react";
import { Chess } from "chess.js";

const pieceIcons = {
  wp: "\u2659",
  wn: "\u2658",
  wb: "\u2657",
  wr: "\u2656",
  wq: "\u2655",
  wk: "\u2654",
  bp: "\u265F",
  bn: "\u265E",
  bb: "\u265D",
  br: "\u265C",
  bq: "\u265B",
  bk: "\u265A",
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

function getSquareName(row, col) {
  return `${files[col]}${8 - row}`;
}

function ChessBoard({ fen, onMove, movableColor, orientation = "white", lastMove }) {
  const [selected, setSelected] = useState(null);
  const chess = useMemo(() => new Chess(fen), [fen]);
  const board = chess.board();

  const rowIndexes = orientation === "black" ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const colIndexes = orientation === "black" ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const legalSquares = useMemo(() => {
    if (!selected) return [];
    return chess.moves({ square: selected, verbose: true }).map((move) => move.to);
  }, [chess, selected]);

  const lastMoveSquares = useMemo(() => {
    if (!lastMove) return [];
    return [lastMove.slice(0, 2), lastMove.slice(2, 4)];
  }, [lastMove]);

  function canSelectPiece(piece) {
    if (!piece) return false;
    if (!movableColor) return false;
    return piece.color === movableColor;
  }

  function handleSquareClick(row, col, piece) {
    const square = getSquareName(row, col);

    if (!selected) {
      if (canSelectPiece(piece)) setSelected(square);
      return;
    }

    if (selected === square) {
      setSelected(null);
      return;
    }

    if (canSelectPiece(piece)) {
      setSelected(square);
      return;
    }

    const legalMove = chess
      .moves({ square: selected, verbose: true })
      .find((move) => move.to === square);

    if (!legalMove) {
      setSelected(null);
      return;
    }

    const promotion = legalMove.flags.includes("p") ? "q" : "";
    onMove(`${selected}${square}${promotion}`);
    setSelected(null);
  }

  return (
    <div className="chess-board" aria-label="Chess board">
      {rowIndexes.map((rowIndex) =>
        colIndexes.map((colIndex) => {
          const piece = board[rowIndex][colIndex];
          const isDark = (rowIndex + colIndex) % 2 === 1;
          const square = getSquareName(rowIndex, colIndex);
          const pieceKey = piece ? `${piece.color}${piece.type}` : null;
          const isLegal = legalSquares.includes(square);
          const isLastMove = lastMoveSquares.includes(square);
          const showFile = rowIndex === rowIndexes[rowIndexes.length - 1];
          const showRank = colIndex === colIndexes[0];

          return (
            <button
              key={square}
              type="button"
              className={`square ${isDark ? "dark" : "light"} ${
                selected === square ? "selected" : ""
              } ${isLegal ? "legal" : ""} ${isLastMove ? "last-move" : ""}`}
              onClick={() => handleSquareClick(rowIndex, colIndex, piece)}
              aria-label={pieceKey ? `${pieceKey} on ${square}` : square}
            >
              {showFile && <span className="coord file-label">{square[0]}</span>}
              {showRank && <span className="coord rank-label">{square[1]}</span>}
              {pieceKey && <span className="piece">{pieceIcons[pieceKey]}</span>}
            </button>
          );
        })
      )}
    </div>
  );
}

export default ChessBoard;
