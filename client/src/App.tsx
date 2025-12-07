// client/src/App.tsx
import React, { useState } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import { RoomView } from './components/RoomView';
import { RotateMessage } from './components/RotateMessage';

const App: React.FC = () => {
  const { socket, room, you } = useGameSocket();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const canCreateOrJoin = !!socket;

  const handleCreate = () => {
    if (!socket) return;
    socket.emit('CREATE_ROOM', { name: name || 'Host' });
  };

  const handleJoin = () => {
    if (!socket) return;
    if (!joinCode.trim()) {
      alert('Enter a room code');
      return;
    }
    socket.emit('JOIN_ROOM', {
      code: joinCode.toUpperCase(),
      name: name || 'Player',
    });
  };

  if (room && you && socket) {
    return (
      <div className="app">
        <RotateMessage />
        <RoomView room={room} you={you} socket={socket} />
      </div>
    );
  }

  return (
    <div className="app">
      <RotateMessage />
      <div className="landing">
        <div className="landing-title">Ito Online</div>

        <div className="landing-card">
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>
            Your name
          </div>
          <input
            placeholder="e.g. Rohan"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="landing-card">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Create room</div>
          <button onClick={handleCreate} disabled={!canCreateOrJoin}>
            Create new room
          </button>
        </div>

        <div className="landing-card">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Join room</div>
          <div className="landing-row">
            <input
              placeholder="Room code (e.g. ABCD)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button onClick={handleJoin} disabled={!canCreateOrJoin}>
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
