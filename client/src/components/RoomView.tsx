import React, { useMemo } from 'react';
import type { Room, You } from '../types';
import { OrderingBoard } from './OrderingBoard';

interface RoomViewProps {
  room: Room;
  you: You;
  socket: any;
}

export const RoomView: React.FC<RoomViewProps> = ({ room, you, socket }) => {
  const isHost = you.isHost;

  const handleStart = () => {
    socket?.emit('START_GAME', { code: room.code });
  };

  const handleReveal = () => {
    socket?.emit('REVEAL_NUMBERS', { code: room.code });
  };

  const handlePlayAgain = () => {
    socket?.emit('PLAY_AGAIN', { code: room.code });
  };

  const handleOrderChange = (orderedIds: string[]) => {
    socket?.emit('UPDATE_ORDER', {
      code: room.code,
      orderedPlayerIds: orderedIds,
    });
  };

  const canDrag = room.phase === 'ORDERING';

  const resultsText = useMemo(() => {
    if (room.phase !== 'REVEAL') return null;
    if (!room.finalOrder) return null;

    const playersById = new Map(room.players.map((p) => [p.id, p]));
    const finalNumbers = room.finalOrder
      .map((id) => playersById.get(id))
      .filter((p): p is typeof room.players[number] => !!p)
      .map((p) => p.number ?? 0);

    const isNonDecreasing = finalNumbers.every(
      (n, i, arr) => i === 0 || n >= arr[i - 1]
    );

    const sortedByNumber = [...room.players].sort((a, b) => {
      const na = a.number ?? 0;
      const nb = b.number ?? 0;
      return na - nb;
    });
    const correctOrderIds = sortedByNumber.map((p) => p.id);

    const exactlyCorrect =
      JSON.stringify(correctOrderIds) === JSON.stringify(room.finalOrder);

    if (exactlyCorrect) {
      return 'Perfect! You nailed the exact order.';
    }
    if (isNonDecreasing) {
      return 'Close! Your order was increasing, but not perfectly sorted.';
    }
    return 'Incorrect order — some higher numbers were placed before lower ones.';
  }, [room]);

  return (
    <>
      <header className="app-header">
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Room</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{room.code}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Phase</div>
          <div style={{ fontSize: 14 }}>{room.phase}</div>
        </div>
      </header>

      <main className="app-main">
        <section style={{ position: 'absolute', top: 8, left: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Players</div>
          <div style={{ fontSize: 12 }}>
            {room.players.map((p) => (
              <span key={p.id} style={{ marginRight: 8 }}>
                {p.name}
                {p.isHost && ' ⭐'}
                {!p.connected && ' (dc)'}
              </span>
            ))}
          </div>
        </section>

        <OrderingBoard
          room={room}
          you={you}
          onOrderChange={handleOrderChange}
          canDrag={canDrag}
        />
      </main>

      <footer className="app-footer">
        {room.phase === 'LOBBY' && (
          <>
            {isHost ? (
              <button onClick={handleStart}>Start Game</button>
            ) : (
              <span>Waiting for host to start…</span>
            )}
          </>
        )}

        {room.phase === 'ORDERING' && (
          <>
            {isHost ? (
              <button onClick={handleReveal}>Reveal</button>
            ) : (
              <span>Host will reveal when ready…</span>
            )}
          </>
        )}

        {room.phase === 'REVEAL' && (
          <>
            <div style={{ flex: 1 }}>
              {resultsText && (
                <div className="results-line">{resultsText}</div>
              )}
            </div>
            {isHost && <button onClick={handlePlayAgain}>Play again</button>}
          </>
        )}
      </footer>
    </>
  );
};
