export type Phase = 'LOBBY' | 'ORDERING' | 'REVEAL';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  number: number | null;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  phase: Phase;
  currentOrder: string[];
  finalOrder: string[] | null;
  // server may send extra fields; that's fine
}

export type You = Player;
