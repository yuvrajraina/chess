import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

function getErrorMessage(error, fallback) {
  const data = error.response?.data;
  return data?.error || data?.detail || data?.non_field_errors?.[0] || fallback;
}

function formatStatus(status) {
  return status.replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function Lobby({ onSelectGame, onLogout }) {
  const [games, setGames] = useState([]);
  const [joinGameId, setJoinGameId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const activeGames = useMemo(
    () => games.filter((game) => game.status !== "finished").length,
    [games]
  );

  async function loadGames() {
    setError("");
    const response = await api.get("/games/");
    setGames(response.data);
  }

  useEffect(() => {
    setLoading(true);
    loadGames()
      .catch((e) => {
        setError(getErrorMessage(e, "Failed to load games."));
      })
      .finally(() => setLoading(false));
  }, []);

  async function createSingleplayer() {
    setError("");
    setBusyAction("single");
    try {
      const response = await api.post("/games/singleplayer/");
      onSelectGame(response.data);
    } catch (e) {
      setError(getErrorMessage(e, "Failed to create singleplayer game."));
    } finally {
      setBusyAction("");
    }
  }

  async function createMultiplayer() {
    setError("");
    setBusyAction("multi");
    try {
      const response = await api.post("/games/multiplayer/");
      onSelectGame(response.data);
    } catch (e) {
      setError(getErrorMessage(e, "Failed to create multiplayer game."));
    } finally {
      setBusyAction("");
    }
  }

  async function joinMultiplayer() {
    setError("");
    const id = joinGameId.trim();
    if (!id) {
      setError("Enter a game ID to join.");
      return;
    }

    setBusyAction("join");
    try {
      const response = await api.post(`/games/${id}/join/`);
      onSelectGame(response.data);
    } catch (e) {
      setError(getErrorMessage(e, "Failed to join game."));
    } finally {
      setBusyAction("");
    }
  }

  async function copyGameId(event, id) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(""), 1600);
    } catch {
      setError("Could not copy game ID.");
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Chess Arena</p>
          <h1>Choose your board</h1>
        </div>

        <div className="header-actions">
          <div className="stat-pill">
            <span>{activeGames}</span>
            active
          </div>
          <button className="button ghost" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="lobby-grid">
        <button
          className="action-tile solo"
          onClick={createSingleplayer}
          disabled={busyAction !== ""}
        >
          <span className="tile-kicker">Play now</span>
          <strong>{busyAction === "single" ? "Creating..." : "Solo game"}</strong>
          <span>Face a quick-moving bot and sharpen your openings.</span>
        </button>

        <button
          className="action-tile versus"
          onClick={createMultiplayer}
          disabled={busyAction !== ""}
        >
          <span className="tile-kicker">Host</span>
          <strong>{busyAction === "multi" ? "Creating..." : "Multiplayer"}</strong>
          <span>Create a room and share the game ID.</span>
        </button>

        <div className="join-panel">
          <div>
            <p className="eyebrow">Join match</p>
            <h2>Enter a game ID</h2>
          </div>
          <div className="join-row">
            <input
              placeholder="Paste game UUID"
              value={joinGameId}
              onChange={(e) => setJoinGameId(e.target.value)}
            />
            <button
              className="button primary"
              onClick={joinMultiplayer}
              disabled={busyAction !== ""}
            >
              {busyAction === "join" ? "Joining..." : "Join"}
            </button>
          </div>
        </div>
      </section>

      {error && <p className="notice error">{error}</p>}

      <section className="history-panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">Recent boards</p>
            <h2>My games</h2>
          </div>
          <button
            className="button subtle"
            onClick={() =>
              loadGames().catch((e) =>
                setError(getErrorMessage(e, "Failed to load games."))
              )
            }
          >
            Refresh
          </button>
        </div>

        {loading && <div className="empty-state">Loading boards...</div>}

        {!loading && games.length === 0 && (
          <div className="empty-state">No games yet. Start with a solo board.</div>
        )}

        <div className="game-list">
          {games.map((game) => (
            <div
              key={game.id}
              className="game-row"
              role="button"
              tabIndex={0}
              onClick={() => onSelectGame(game)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSelectGame(game);
                }
              }}
              title={game.id}
            >
              <span className={`status-dot ${game.status}`} />
              <span>
                <strong>
                  {game.mode === "single" ? "Solo board" : "Multiplayer board"}
                </strong>
                <small>
                  {game.white_name} vs {game.black_name || (game.mode === "single" ? "Bot" : "Open seat")}
                </small>
              </span>
              <span className="game-meta">
                <em>{formatStatus(game.status)}</em>
                <small>{formatDate(game.created_at)}</small>
              </span>
              <button
                type="button"
                className="copy-chip"
                onClick={(event) => copyGameId(event, game.id)}
              >
                {copiedId === game.id ? "Copied" : "Copy ID"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Lobby;
