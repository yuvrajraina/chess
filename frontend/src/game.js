import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import ChessBoard from "./ChessBoard";
import { WS_BASE_URL, getCurrentUserId, getToken } from "./api";

function formatStatus(status) {
  return status.replaceAll("_", " ");
}

function getTurnFromFen(fen) {
  try {
    return new Chess(fen).turn();
  } catch {
    return "w";
  }
}

function Game({ game, onBack }) {
  const [gameState, setGameState] = useState(game);
  const [error, setError] = useState("");
  const [connectionState, setConnectionState] = useState("connecting");
  const socketRef = useRef(null);
  const currentUserId = getCurrentUserId();

  const turnColor = useMemo(() => getTurnFromFen(gameState.fen), [gameState.fen]);
  const playerSide = useMemo(() => {
    const whiteId = gameState.white_id ? Number(gameState.white_id) : null;
    const blackId = gameState.black_id ? Number(gameState.black_id) : null;

    if (whiteId === currentUserId) return "white";
    if (blackId === currentUserId) return "black";
    return "spectator";
  }, [currentUserId, gameState.black_id, gameState.white_id]);

  const isYourTurn =
    gameState.status === "in_progress" &&
    ((turnColor === "w" && playerSide === "white") ||
      (turnColor === "b" && playerSide === "black"));

  const movableColor = isYourTurn ? turnColor : null;
  const lastMove = gameState.moves?.[gameState.moves.length - 1]?.move || "";
  const opponentName =
    playerSide === "white"
      ? gameState.black_name || (gameState.mode === "single" ? "Bot" : "Open seat")
      : gameState.white_name;

  useEffect(() => {
    const token = getToken();

    const socket = new WebSocket(
      `${WS_BASE_URL}/game/${game.id}/?token=${encodeURIComponent(token)}`
    );

    socketRef.current = socket;
    setConnectionState("connecting");

    socket.onopen = () => {
      setConnectionState("connected");
      setError("");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        setError(data.error);
      }

      if (data.type === "game_state") {
        setGameState(data.game);
        setError("");
      }
    };

    socket.onerror = () => {
      setConnectionState("disconnected");
      setError("Connection error. Refresh the page and try again.");
    };

    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
        setConnectionState("disconnected");
      }
    };

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [game.id]);

  function sendMove(move) {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError("Game connection is not ready yet.");
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        action: "move",
        move,
      })
    );
  }

  async function copyGameId() {
    try {
      await navigator.clipboard.writeText(gameState.id);
    } catch {
      setError("Could not copy game ID.");
    }
  }

  return (
    <main className="game-page">
      <header className="game-topbar">
        <button className="button ghost" onClick={onBack}>
          Back to lobby
        </button>

        <div className="match-title">
          <p className="eyebrow">{gameState.mode === "single" ? "Solo board" : "Multiplayer board"}</p>
          <h1>{gameState.white_name} vs {gameState.black_name || (gameState.mode === "single" ? "Bot" : "Open seat")}</h1>
        </div>

        <div className={`connection-pill ${connectionState}`}>
          {connectionState}
        </div>
      </header>

      <section className="game-layout">
        <div className="board-zone">
          <div className="player-strip top">
            <span>{playerSide === "black" ? "You" : opponentName}</span>
            <strong>{playerSide === "black" ? gameState.black_name : opponentName}</strong>
          </div>

          <div className="board-frame">
            <ChessBoard
              fen={gameState.fen}
              onMove={sendMove}
              movableColor={movableColor}
              orientation={playerSide === "black" ? "black" : "white"}
              lastMove={lastMove}
            />
          </div>

          <div className="player-strip bottom">
            <span>{playerSide === "white" ? "You" : "Opponent"}</span>
            <strong>{playerSide === "white" ? gameState.white_name : gameState.black_name}</strong>
          </div>
        </div>

        <aside className="side-panel">
          <div className="turn-card">
            <p className="eyebrow">Current turn</p>
            <h2>{gameState.status === "finished" ? "Game over" : turnColor === "w" ? "White to move" : "Black to move"}</h2>
            <p className={isYourTurn ? "turn-ready" : "muted"}>
              {gameState.status === "waiting"
                ? "Waiting for opponent."
                : gameState.status === "finished"
                  ? `Result: ${gameState.result || "Draw"}`
                  : isYourTurn
                    ? "Your move."
                    : playerSide === "spectator"
                      ? "Connected as spectator."
                    : "Opponent is thinking."}
            </p>
          </div>

          <div className="info-grid">
            <div>
              <span>Status</span>
              <strong>{formatStatus(gameState.status)}</strong>
            </div>
            <div>
              <span>Your side</span>
              <strong>{playerSide}</strong>
            </div>
            <div>
              <span>Moves</span>
              <strong>{gameState.moves?.length || 0}</strong>
            </div>
            <div>
              <span>Mode</span>
              <strong>{gameState.mode}</strong>
            </div>
          </div>

          <div className="game-id-box">
            <span>Game ID</span>
            <code>{gameState.id}</code>
            <button className="button subtle" onClick={copyGameId}>
              Copy ID
            </button>
          </div>

          {error && <p className="notice error">{error}</p>}

          <div className="moves-panel">
            <div className="section-title compact">
              <div>
                <p className="eyebrow">Notation</p>
                <h2>Moves</h2>
              </div>
            </div>

            <div className="moves">
              {gameState.moves?.length ? (
                gameState.moves.map((move, index) => (
                  <div className="move-row" key={move.id}>
                    <span>{index + 1}</span>
                    <strong>{move.move}</strong>
                    <em>{move.player_name}</em>
                  </div>
                ))
              ) : (
                <p className="empty-state small">No moves yet.</p>
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default Game;
