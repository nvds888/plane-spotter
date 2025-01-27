export type Flight = {
    hex: string;
    flight: string;
    type: string;
    alt: number;
    speed: number;
    operator: string;
    lat: number;
    lon: number;
  };
  
  export type Spot = {
    _id: string;
    userId: string;
    lat: number;
    lon: number;
    timestamp: string;
    flight?: Flight;
    guessedType?: string;
    guessedAltitudeRange?: string;
    isTypeCorrect?: boolean;
    isAltitudeCorrect?: boolean;
    bonusXP?: number;
  };