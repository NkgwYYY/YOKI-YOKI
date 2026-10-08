import type { LightEnergyState } from './lightEnergy';
import type { PowerPlantState } from './powerPlant';
import type { FeedState } from '../contexts/AppContext';

export type GardenBalances = { energy: LightEnergyState; plant: PowerPlantState; feed: FeedState };
/** Uses the existing 1:1 exchange rate; fractional energy and historical fields survive. */
export function claimGardenReward(state: GardenBalances, pointsPerEnergy: number) {
  const converted = Math.floor(state.energy.storedEnergy);
  const received = converted * pointsPerEnergy + state.plant.ecoPoints;
  if (received <= 0) return { state, result: { received: 0 } };
  return { state: {
    energy: { ...state.energy, storedEnergy: state.energy.storedEnergy - converted },
    plant: { ...state.plant, ecoPoints: 0, totalSold: state.plant.totalSold + converted,
      sellCount: state.plant.sellCount + (converted > 0 ? 1 : 0) },
    feed: { ...state.feed, points: state.feed.points + received },
  }, result: { received } };
}
