import {useState} from 'react';
import Login from './Login';
import Lobby from './Lobby';
import Game from './game';
import {getToken } from './api';

function App() {
  const [token, setToken] = useState(getToken());
  const [currentGame, setCurrentGame] = useState(null);

  function handleLogout() {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setToken(null);
    setCurrentGame(null);
  }

  if (!token) {
    return <Login onLogin={setToken} />;
  }
  

  if (currentGame) {
    return (<Game game={currentGame} onBack={() => setCurrentGame(null)}/>);
  }

  return (
    <Lobby onSelectGame={setCurrentGame} onLogout={handleLogout} />
  );
}

export default App;
