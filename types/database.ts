export type Puzzle = {
  id: string;
  title: string | null;
  latitude: number;
  longitude: number;
  chain_id: string | null;
  order_index: number | null;
};

export type PuzzleChain = {
  id: string;
  name: string | null;
};

export type Treasure = {
  id: string;
  latitude: number;
  longitude: number;
  status: string;
  last_found_at: string | null;
};
