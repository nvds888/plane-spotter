export type Flight = {
  hex: string
  flight: string
  type: string
  alt: number
  speed: number
  operator: string
  lat: number
  lon: number
  departureAirport?: string
  arrivalAirport?: string
  track?: number
  geography?: {
    direction?: number
    altitude?: number
    latitude?: number
    longitude?: number
    gspeed?: number
  }
}

export type Spot = {
  _id: string
  userId: string
  lat: number
  lon: number
  timestamp: string
  flight: Flight
  guessedType?: string
  guessedAirline?: string
  guessedDestination?: string
  isTypeCorrect?: boolean
  isAirlineCorrect?: boolean
  isDestinationCorrect?: boolean
  bonusXP?: number
  baseXP?: number
}

export type GuessResult = {
  spot: Spot
  isTypeCorrect: boolean
  isAirlineCorrect: boolean
  isDestinationCorrect: boolean
  xpEarned: number
}
  
  