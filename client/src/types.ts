export type Phase = 'LOBBY' | 'ORDERING' | 'REVEAL';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  number: number | null;
  color: string;
  icon: string;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  phase: Phase;
  currentOrder: string[];
  finalOrder: string[] | null;
}

export type You = Player;
