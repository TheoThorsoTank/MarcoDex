export interface BggSearchResult {
  id: number;
  name: string;
  yearPublished?: number;
}

export interface BggGameDetails {
  id: number;
  name: string;
  yearPublished?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  minPlayers?: number;
  maxPlayers?: number;
  playingTime?: number;
  description?: string;
  bggRating?: number;
}
