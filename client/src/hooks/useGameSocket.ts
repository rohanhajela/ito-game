import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Room, You } from '../types';

interface GameState {
  room: Room | null;
  you: You | null;
}

export function useGameSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<GameState>({ room: null, you: null });

  const errorShown = useRef(false);

  useEffect(() => {
    const url = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const s = io(url);

    setSocket(s);

    s.on('ROOM_STATE', ({ room, you }) => {
      setState({ room, you });
    });

    s.on('ERROR', (err: { message: string }) => {
      console.error('Server error:', err);
      if (!errorShown.current) {
        alert(err.message);
        errorShown.current = true;
      }
    });

    return () => {
      s.disconnect();
    };
  }, []);

  return {
    socket,
    room: state.room,
    you: state.you,
  };
}
