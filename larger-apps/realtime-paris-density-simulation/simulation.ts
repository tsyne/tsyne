// Portions copyright Yvann Barbot and portions copyright Paul Hammant 2025
// Real-time Paris density simulation engine

import * as h3 from 'h3-js';

export interface Hotspot {
  name: string;
  lat: number;
  lng: number;
  basePop: number;
  radius: number;
  type: string;
}

export interface DensityPoint {
  x: number;
  y: number;
  lat: number;
  lng: number;
  density: number;
}

export interface TimeOfWeek {
  hour: number;
  day: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
}

// 60+ major Paris hotspots with their characteristics
export const HOTSPOTS: Hotspot[] = [
  // Tourist attractions
  { name: 'Eiffel Tower', lat: 48.8584, lng: 2.2945, basePop: 90, radius: 0.8, type: 'tourist' },
  { name: 'Louvre Museum', lat: 48.8606, lng: 2.3352, basePop: 85, radius: 0.7, type: 'tourist' },
  { name: 'Notre-Dame', lat: 48.8530, lng: 2.3499, basePop: 80, radius: 0.6, type: 'tourist' },
  { name: 'Arc de Triomphe', lat: 48.8738, lng: 2.2950, basePop: 75, radius: 0.7, type: 'tourist' },
  { name: 'Sacré-Cœur', lat: 48.8867, lng: 2.3431, basePop: 70, radius: 0.6, type: 'tourist' },
  { name: 'Champs-Élysées', lat: 48.8698, lng: 2.3072, basePop: 85, radius: 1.0, type: 'shopping' },
  { name: 'Versailles', lat: 48.8047, lng: 2.1200, basePop: 60, radius: 1.2, type: 'tourist' },

  // Shopping districts
  { name: 'Marais District', lat: 48.8612, lng: 2.3650, basePop: 70, radius: 0.8, type: 'shopping' },
  { name: 'Pigalle', lat: 48.8828, lng: 2.3338, basePop: 60, radius: 0.6, type: 'shopping' },
  { name: 'Galeries Lafayette', lat: 48.8731, lng: 2.3315, basePop: 75, radius: 0.5, type: 'shopping' },

  // Business districts
  { name: 'La Défense', lat: 48.8954, lng: 2.2377, basePop: 85, radius: 1.5, type: 'business' },
  { name: 'Montparnasse', lat: 48.8420, lng: 2.3289, basePop: 65, radius: 0.7, type: 'business' },
  { name: 'Opéra District', lat: 48.8723, lng: 2.3317, basePop: 70, radius: 0.6, type: 'business' },

  // Transport hubs
  { name: 'Gare du Nord', lat: 48.8809, lng: 2.3553, basePop: 80, radius: 0.8, type: 'transport' },
  { name: 'Gare de l\'Est', lat: 48.8761, lng: 2.3618, basePop: 70, radius: 0.7, type: 'transport' },
  { name: 'Gare Montparnasse', lat: 48.8403, lng: 2.3244, basePop: 75, radius: 0.7, type: 'transport' },
  { name: 'Gare Saint-Lazare', lat: 48.8757, lng: 2.3271, basePop: 70, radius: 0.6, type: 'transport' },
  { name: 'Gare d\'Austerlitz', lat: 48.8417, lng: 2.3640, basePop: 65, radius: 0.7, type: 'transport' },
  { name: 'Gare de Lyon', lat: 48.8451, lng: 2.3738, basePop: 75, radius: 0.7, type: 'transport' },

  // Nightlife
  { name: 'Moulin Rouge', lat: 48.8844, lng: 2.3296, basePop: 55, radius: 0.5, type: 'nightlife' },
  { name: 'Quartier Latin', lat: 48.8490, lng: 2.3467, basePop: 60, radius: 0.8, type: 'nightlife' },

  // Parks
  { name: 'Bois de Boulogne', lat: 48.8640, lng: 2.2528, basePop: 40, radius: 1.5, type: 'park' },
  { name: 'Parc de la Villette', lat: 48.8940, lng: 2.3869, basePop: 35, radius: 1.0, type: 'park' },
  { name: 'Luxembourg Gardens', lat: 48.8462, lng: 2.3368, basePop: 50, radius: 0.7, type: 'park' },
  { name: 'Tuileries Garden', lat: 48.8638, lng: 2.3273, basePop: 45, radius: 0.7, type: 'park' },

  // Residential areas
  { name: 'Belleville', lat: 48.8720, lng: 2.3988, basePop: 35, radius: 0.9, type: 'residential' },
  { name: 'Montmartre', lat: 48.8867, lng: 2.3431, basePop: 40, radius: 0.9, type: 'residential' },
  { name: 'Marais Residential', lat: 48.8564, lng: 2.3650, basePop: 30, radius: 0.8, type: 'residential' },

  // Additional hotspots for coverage
  { name: 'Samaritaine', lat: 48.8611, lng: 2.3382, basePop: 65, radius: 0.5, type: 'shopping' },
  { name: 'Forum des Halles', lat: 48.8619, lng: 2.3451, basePop: 60, radius: 0.6, type: 'shopping' },
  { name: 'BHV Marais', lat: 48.8601, lng: 2.3618, basePop: 55, radius: 0.5, type: 'shopping' },
  { name: 'Boulogne-Billancourt', lat: 48.8348, lng: 2.2389, basePop: 25, radius: 0.7, type: 'residential' },
  { name: 'Neuilly-sur-Seine', lat: 48.8821, lng: 2.2641, basePop: 30, radius: 0.8, type: 'residential' },
  { name: 'Bois de Vincennes', lat: 48.8268, lng: 2.4369, basePop: 35, radius: 1.2, type: 'park' },
  { name: 'Île de la Cité', lat: 48.8530, lng: 2.3484, basePop: 45, radius: 0.5, type: 'tourist' },
  { name: 'Île Saint-Louis', lat: 48.8518, lng: 2.3553, basePop: 35, radius: 0.4, type: 'residential' },

  // Tourist landmarks (from OG)
  { name: 'Musée d\'Orsay', lat: 48.8600, lng: 2.3266, basePop: 75, radius: 0.5, type: 'tourist' },
  { name: 'Centre Pompidou', lat: 48.8606, lng: 2.3522, basePop: 70, radius: 0.5, type: 'tourist' },
  { name: 'Trocadéro', lat: 48.8616, lng: 2.2875, basePop: 80, radius: 0.7, type: 'tourist' },
  { name: 'Invalides', lat: 48.8550, lng: 2.3125, basePop: 65, radius: 0.6, type: 'tourist' },

  // Shopping (from OG)
  { name: 'Printemps', lat: 48.8745, lng: 2.3285, basePop: 82, radius: 0.5, type: 'shopping' },
  { name: 'Saint-Germain', lat: 48.8539, lng: 2.3338, basePop: 72, radius: 0.8, type: 'shopping' },
  { name: 'Rue de Rivoli', lat: 48.8590, lng: 2.3420, basePop: 70, radius: 1.0, type: 'shopping' },
  { name: 'Boulevard Haussmann', lat: 48.8750, lng: 2.3300, basePop: 75, radius: 0.9, type: 'shopping' },

  // Business (from OG)
  { name: 'Bourse', lat: 48.8690, lng: 2.3410, basePop: 70, radius: 0.5, type: 'business' },

  // Transport hubs (from OG)
  { name: 'Châtelet', lat: 48.8584, lng: 2.3474, basePop: 90, radius: 0.9, type: 'transport' },
  { name: 'République', lat: 48.8675, lng: 2.3640, basePop: 75, radius: 0.6, type: 'transport' },
  { name: 'Nation', lat: 48.8485, lng: 2.3958, basePop: 70, radius: 0.5, type: 'transport' },
  { name: 'Bastille', lat: 48.8533, lng: 2.3692, basePop: 78, radius: 0.6, type: 'transport' },

  // Nightlife (from OG)
  { name: 'Oberkampf', lat: 48.8656, lng: 2.3778, basePop: 68, radius: 0.6, type: 'nightlife' },
  { name: 'Canal Saint-Martin', lat: 48.8710, lng: 2.3650, basePop: 65, radius: 0.7, type: 'nightlife' },
  { name: 'Grands Boulevards', lat: 48.8710, lng: 2.3420, basePop: 72, radius: 0.7, type: 'nightlife' },

  // Parks (from OG)
  { name: 'Champ de Mars', lat: 48.8556, lng: 2.2986, basePop: 70, radius: 1.0, type: 'park' },
  { name: 'Parc Monceau', lat: 48.8794, lng: 2.3089, basePop: 45, radius: 0.5, type: 'park' },
  { name: 'Buttes-Chaumont', lat: 48.8811, lng: 2.3828, basePop: 40, radius: 0.9, type: 'park' },
  { name: 'Père Lachaise', lat: 48.8614, lng: 2.3933, basePop: 35, radius: 0.9, type: 'park' },

  // Education / cultural (from OG)
  { name: 'Sorbonne', lat: 48.8489, lng: 2.3443, basePop: 65, radius: 0.5, type: 'education' },
  { name: 'Odéon', lat: 48.8515, lng: 2.3388, basePop: 62, radius: 0.5, type: 'education' },

  // Residential (from OG)
  { name: 'Ménilmontant', lat: 48.8660, lng: 2.3900, basePop: 45, radius: 0.6, type: 'residential' },
  { name: 'Batignolles', lat: 48.8867, lng: 2.3172, basePop: 42, radius: 0.7, type: 'residential' },
  { name: 'Alésia', lat: 48.8280, lng: 2.3270, basePop: 45, radius: 0.6, type: 'residential' },
  { name: 'Convention', lat: 48.8375, lng: 2.2968, basePop: 40, radius: 0.6, type: 'residential' },
  { name: 'Denfert-Rochereau', lat: 48.8337, lng: 2.3326, basePop: 48, radius: 0.5, type: 'residential' },
  { name: 'Place d\'Italie', lat: 48.8311, lng: 2.3558, basePop: 55, radius: 0.7, type: 'residential' },
  { name: 'Bercy', lat: 48.8396, lng: 2.3825, basePop: 52, radius: 0.8, type: 'residential' },
];

// Time multipliers by hotspot type and hour of day
const TIME_MULTIPLIERS: Record<string, number[]> = {
  tourist: [
    0.2, 0.1, 0.1, 0.1, 0.2, 0.3, 0.5, 0.7, 0.85, 0.95, 1.0, 1.0,
    0.95, 0.9, 0.95, 1.0, 1.0, 0.95, 0.85, 0.7, 0.5, 0.3, 0.2, 0.1
  ],
  shopping: [
    0.1, 0.05, 0.05, 0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 0.95, 1.0, 1.0,
    0.95, 0.8, 0.9, 0.95, 1.0, 1.0, 0.9, 0.7, 0.4, 0.2, 0.1, 0.05
  ],
  business: [
    0.1, 0.1, 0.1, 0.1, 0.2, 0.4, 0.6, 0.9, 1.0, 1.0, 1.0, 1.0,
    0.95, 0.9, 0.85, 0.8, 0.75, 0.6, 0.3, 0.1, 0.05, 0.05, 0.05, 0.1
  ],
  transport: [
    0.3, 0.2, 0.2, 0.2, 0.4, 0.8, 1.0, 1.0, 0.9, 0.7, 0.5, 0.6,
    0.7, 0.6, 0.7, 0.9, 1.0, 0.95, 0.8, 0.6, 0.4, 0.3, 0.2, 0.2
  ],
  nightlife: [
    0.1, 0.05, 0.05, 0.1, 0.2, 0.3, 0.2, 0.1, 0.05, 0.05, 0.1, 0.2,
    0.3, 0.2, 0.1, 0.05, 0.1, 0.3, 0.6, 0.9, 1.0, 1.0, 0.8, 0.4
  ],
  park: [
    0.1, 0.05, 0.05, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8,
    0.75, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05, 0.05, 0.05, 0.1, 0.1
  ],
  education: [
    0.05, 0.02, 0.02, 0.02, 0.02, 0.05, 0.15, 0.4, 0.8, 1.0, 0.95, 0.85,
    0.7, 0.75, 0.9, 0.95, 0.85, 0.7, 0.45, 0.25, 0.15, 0.1, 0.08, 0.05
  ],
  residential: [
    0.3, 0.2, 0.1, 0.05, 0.1, 0.3, 0.5, 0.6, 0.4, 0.2, 0.1, 0.1,
    0.1, 0.1, 0.1, 0.2, 0.3, 0.5, 0.7, 0.8, 0.8, 0.6, 0.5, 0.4
  ]
};

// Day-of-week multipliers for each hotspot type
const DAY_MULTIPLIERS: Record<string, number[]> = {
  tourist: [0.8, 0.7, 0.6, 0.6, 0.65, 0.9, 1.0],     // Busier on weekends
  shopping: [0.6, 0.6, 0.65, 0.7, 0.8, 1.0, 1.0],    // Peak on weekends
  business: [1.0, 1.0, 1.0, 1.0, 0.8, 0.3, 0.2],     // Weekday peak
  transport: [0.8, 1.0, 1.0, 1.0, 1.0, 0.9, 0.7],    // Consistent with peaks
  nightlife: [0.5, 0.5, 0.6, 0.6, 0.7, 1.0, 1.0],    // Weekend surge
  park: [0.7, 0.6, 0.6, 0.6, 0.7, 1.0, 1.0],         // Busier on weekends
  education: [0.1, 1.0, 1.0, 1.0, 1.0, 0.9, 0.15],    // Weekday only
  residential: [0.8, 0.8, 0.8, 0.8, 0.8, 1.0, 1.0]   // Weekend increase
};

export function getTimeMultiplier(type: string, hour: number): number {
  const multipliers = TIME_MULTIPLIERS[type] || TIME_MULTIPLIERS.residential;
  return multipliers[hour % 24];
}

export function getDayMultiplier(type: string, day: number): number {
  const multipliers = DAY_MULTIPLIERS[type] || DAY_MULTIPLIERS.residential;
  return multipliers[day % 7];
}

function smoothstep(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

// Gaussian falloff function
function gaussianFalloff(distance: number, sigma: number): number {
  if (distance > sigma * 4) return 0; // Cutoff for efficiency
  return Math.exp(-(distance * distance) / (2 * sigma * sigma));
}

// Calculate distance between two lat/lng points (approximate in km)
function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

// Seed-based random generator for consistent animation
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Paris bounding box
const PARIS_BOUNDS = {
  minLat: 48.815,
  maxLat: 48.905,
  minLng: 2.22,
  maxLng: 2.47
};

export function generateDensityGrid(
  time: TimeOfWeek,
  resolution: number = 0.01  // ~1 km resolution in lat/lng
): DensityPoint[] {
  const points: DensityPoint[] = [];
  const h3Resolution = 9; // H3 hexagon resolution

  // Generate grid points across Paris
  for (let lat = PARIS_BOUNDS.minLat; lat <= PARIS_BOUNDS.maxLat; lat += resolution) {
    for (let lng = PARIS_BOUNDS.minLng; lng <= PARIS_BOUNDS.maxLng; lng += resolution) {
      let density = 5; // Base density

      // Accumulate influence from all hotspots
      for (const hotspot of HOTSPOTS) {
        const dist = distance(lat, lng, hotspot.lat, hotspot.lng);
        const sigma = hotspot.radius;
        const influence = gaussianFalloff(dist, sigma);

        // Apply temporal modifiers
        const timeMultiplier = getTimeMultiplier(hotspot.type, time.hour);
        const dayMultiplier = getDayMultiplier(hotspot.type, time.day);
        const seededNoise = seededRandom(hotspot.lat * 1000 + hotspot.lng * 1000 + time.hour);

        density += hotspot.basePop * influence * timeMultiplier * dayMultiplier * (0.8 + seededNoise * 0.2);
      }

      // Only include points with meaningful density
      if (density > 3) {
        points.push({
          x: (lng - PARIS_BOUNDS.minLng) / (PARIS_BOUNDS.maxLng - PARIS_BOUNDS.minLng),
          y: (lat - PARIS_BOUNDS.minLat) / (PARIS_BOUNDS.maxLat - PARIS_BOUNDS.minLat),
          lat,
          lng,
          density: Math.min(100, density)
        });
      }
    }
  }

  return points;
}

// Linear interpolation between two hours
export function interpolateDensityGrids(
  grid1: DensityPoint[],
  grid2: DensityPoint[],
  t: number // 0 to 1
): DensityPoint[] {
  const progress = smoothstep(t);
  const result: DensityPoint[] = [];

  // Assume grids have same structure
  for (let i = 0; i < grid1.length; i++) {
    const p1 = grid1[i];
    const p2 = grid2[i] || p1;

    result.push({
      ...p1,
      density: p1.density * (1 - progress) + p2.density * progress
    });
  }

  return result;
}
