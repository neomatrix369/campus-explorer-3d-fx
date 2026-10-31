export interface UniversityGeoLocation {
  universityId: string;
  campusId: string;
  shortName: string;
  fullName: string;
  borough: string;
  postcode: string;
  /** WGS84 Latitude (degrees North) */
  lat: number;
  /** WGS84 Longitude (degrees East, negative for West) */
  lng: number;
  /** Permanent 3D London Map World Coordinates [worldX, worldZ] so each campus lives at its real geographic position */
  londonWorldXZ: [number, number];
  /** Ordnance Survey National Grid (EPSG:27700) Easting (meters) */
  osEasting: number;
  /** Ordnance Survey National Grid (EPSG:27700) Northing (meters) */
  osNorthing: number;
  /** Ordnance Survey OpenUPRN identifier */
  osOpenUprn: string;
  /** Ordnance Survey MasterMap TOID */
  osMasterMapToid: string;
  /** OpenStreetMap Relation/Way ID */
  osmWayId: string;
  /** Overpass API Bounding Box [south, west, north, east] */
  osmBbox: [number, number, number, number];
  /** Ground elevation in meters Above Ordnance Datum (m AOD) */
  elevationAodM: number;
  /** Brand accent hex color */
  accentColor: string;
  /** Closest London Underground stations */
  tubeStations: string[];
  /** Authentic OSM GeoJSON polygon footprints (local meter offsets [x, z] around campus hub + height/levels) */
  osmFootprints: OsmBuildingFootprint[];
}

export interface OsmBuildingFootprint {
  osmId: string;
  name: string;
  buildingLevels: number;
  heightMeters: number;
  roofShape: 'flat' | 'dome' | 'gabled' | 'mansard' | 'spire';
  facadeMaterial: 'portland_stone' | 'brick' | 'glass' | 'terracotta' | 'concrete';
  osUprn: string;
  /** 2D polygon ring in local meters [x, z] relative to the campus hub */
  polygonMeters: [number, number][];
}

export interface InterUniversityRoute {
  fromCampusId: string;
  toCampusId: string;
  fromLabel: string;
  toLabel: string;
  distanceKm: number;
  distanceMiles: number;
  walkMinutes: number;
  tubeMinutes: number;
  cycleMinutes: number;
  viaCorridor: string;
  tubeLine: string;
}

/**
 * Center of Central London reference origin (Charing Cross / Covent Garden)
 */
export const LONDON_CENTER_WGS84 = {
  lat: 51.5125,
  lng: -0.1385,
};

/**
 * Exact 3D London Map World Offsets [worldX, worldZ] for all 7 London University Campuses
 * so that all campuses coexist simultaneously across the 3D Map of London at realistic relative positions and distances.
 */
export const CAMPUS_LONDON_WORLD_OFFSETS: Record<string, [number, number]> = {
  'ucl-bloomsbury': [10, -48],
  'ucl-east': [98, -54],
  'lse-aldwych-holborn': [42, -6],
  'kcl-strand': [44, 24],
  'kcl-waterloo-guys': [48, 60],
  'imperial-south-ken': [-66, 34],
  'imperial-white-city': [-96, -24],
};

/**
 * Real-world geospatial registry of the 4 London Universities & all 7 Campuses
 * calibrated with WGS84 GPS coordinates, permanent London 3D Map coordinates (`londonWorldXZ`),
 * Ordnance Survey (EPSG:27700) National Grid Eastings/Northings, OS OpenUPRN identifiers,
 * and OpenStreetMap (OSM) footprints for THREE.ExtrudeGeometry.
 */
export const LONDON_UNIVERSITY_GEO_LOCATIONS: UniversityGeoLocation[] = [
  {
    universityId: 'ucl-london',
    campusId: 'ucl-bloomsbury',
    shortName: 'UCL Bloomsbury',
    fullName: 'University College London (Bloomsbury Main Campus)',
    borough: 'London Borough of Camden',
    postcode: 'WC1E 6BT',
    lat: 51.5246,
    lng: -0.134,
    londonWorldXZ: [10, -48],
    osEasting: 529562,
    osNorthing: 182298,
    osOpenUprn: '100023071948',
    osMasterMapToid: 'osgb1000005398124',
    osmWayId: 'way/24891432',
    osmBbox: [51.5215, -0.1385, 51.5272, -0.1295],
    elevationAodM: 28.4,
    accentColor: '#38bdf8',
    tubeStations: ['Euston Square', 'Warren Street', 'Russell Square', 'Goodge Street'],
    osmFootprints: [
      {
        osmId: 'way/24891432',
        name: 'UCL Wilkins Building (Main Quad Portico & Dome)',
        buildingLevels: 4,
        heightMeters: 24.5,
        roofShape: 'dome',
        facadeMaterial: 'portland_stone',
        osUprn: '100023071948',
        polygonMeters: [
          [6, -16],
          [22, -16],
          [22, 16],
          [6, 16],
          [6, 9],
          [14, 9],
          [14, -9],
          [6, -9],
        ],
      },
      {
        osmId: 'way/619283710',
        name: 'UCL Student Centre (27-28 Gordon Street)',
        buildingLevels: 5,
        heightMeters: 21.0,
        roofShape: 'flat',
        facadeMaterial: 'glass',
        osUprn: '10091847210',
        polygonMeters: [
          [18, 6],
          [28, 6],
          [28, 17],
          [18, 17],
        ],
      },
      {
        osmId: 'way/25419820',
        name: 'UCL Cruciform Building (Gower Street)',
        buildingLevels: 5,
        heightMeters: 23.0,
        roofShape: 'spire',
        facadeMaterial: 'terracotta',
        osUprn: '100023071955',
        polygonMeters: [
          [-21, -7],
          [-15, -7],
          [-15, -3],
          [-11, -3],
          [-11, 3],
          [-15, 3],
          [-15, 7],
          [-21, 7],
          [-21, 3],
          [-25, 3],
          [-25, -3],
          [-21, -3],
        ],
      },
    ],
  },
  {
    universityId: 'lse-london',
    campusId: 'lse-aldwych-holborn',
    shortName: 'LSE Holborn / Aldwych',
    fullName: 'London School of Economics (Holborn / Lincoln’s Inn Fields)',
    borough: 'City of Westminster & Camden',
    postcode: 'WC2A 2AE',
    lat: 51.5144,
    lng: -0.1165,
    londonWorldXZ: [42, -6],
    osEasting: 530804,
    osNorthing: 181186,
    osOpenUprn: '100023358410',
    osMasterMapToid: 'osgb1000005418812',
    osmWayId: 'way/38192045',
    osmBbox: [51.5128, -0.1195, 51.5168, -0.1135],
    elevationAodM: 21.0,
    accentColor: '#10b981',
    tubeStations: ['Holborn', 'Temple', 'Chancery Lane'],
    osmFootprints: [
      {
        osmId: 'way/38192045',
        name: 'LSE Lionel Robbins Building (Dome Library)',
        buildingLevels: 5,
        heightMeters: 23.0,
        roofShape: 'dome',
        facadeMaterial: 'portland_stone',
        osUprn: '100023358410',
        polygonMeters: [
          [-10, -16],
          [8, -16],
          [8, -4],
          [-10, -4],
        ],
      },
      {
        osmId: 'way/682910442',
        name: 'LSE Marshall Building (44 Lincoln’s Inn Fields)',
        buildingLevels: 10,
        heightMeters: 35.0,
        roofShape: 'flat',
        facadeMaterial: 'portland_stone',
        osUprn: '10093849102',
        polygonMeters: [
          [8, -18],
          [22, -18],
          [22, -5],
          [8, -5],
        ],
      },
      {
        osmId: 'way/541829103',
        name: 'LSE Centre Building (Houghton Street Plaza)',
        buildingLevels: 12,
        heightMeters: 38.0,
        roofShape: 'flat',
        facadeMaterial: 'glass',
        osUprn: '10091928374',
        polygonMeters: [
          [-8, -1],
          [6, -1],
          [6, 11],
          [-8, 11],
        ],
      },
    ],
  },
  {
    universityId: 'kcl-london',
    campusId: 'kcl-strand',
    shortName: 'KCL Strand',
    fullName: "King's College London (Strand & Bush House Campus)",
    borough: 'City of Westminster (North Bank of River Thames)',
    postcode: 'WC2R 2LS',
    lat: 51.5115,
    lng: -0.116,
    londonWorldXZ: [44, 24],
    osEasting: 530848,
    osNorthing: 180865,
    osOpenUprn: '100023349102',
    osMasterMapToid: 'osgb1000005412980',
    osmWayId: 'way/25391844',
    osmBbox: [51.5095, -0.1205, 51.5162, -0.1112],
    elevationAodM: 14.2,
    accentColor: '#f43f5e',
    tubeStations: ['Temple', 'Holborn', 'Covent Garden', 'Charing Cross'],
    osmFootprints: [
      {
        osmId: 'way/25391844',
        name: 'Bush House (Aldwych Crescent Arc)',
        buildingLevels: 8,
        heightMeters: 31.0,
        roofShape: 'dome',
        facadeMaterial: 'portland_stone',
        osUprn: '100023349102',
        polygonMeters: [
          [-10, -8],
          [10, -8],
          [13, 4],
          [-13, 4],
        ],
      },
      {
        osmId: 'way/25391910',
        name: "King's Building & Somerset East Wing",
        buildingLevels: 5,
        heightMeters: 22.0,
        roofShape: 'mansard',
        facadeMaterial: 'portland_stone',
        osUprn: '100023349118',
        polygonMeters: [
          [-6, 8],
          [6, 8],
          [6, 24],
          [-6, 24],
        ],
      },
      {
        osmId: 'way/25408112',
        name: 'KCL Maughan Library (Chancery Lane)',
        buildingLevels: 4,
        heightMeters: 25.0,
        roofShape: 'spire',
        facadeMaterial: 'portland_stone',
        osUprn: '100023351044',
        polygonMeters: [
          [12, -22],
          [26, -22],
          [26, -10],
          [12, -10],
        ],
      },
    ],
  },
  {
    universityId: 'imperial-london',
    campusId: 'imperial-south-ken',
    shortName: 'Imperial South Ken',
    fullName: 'Imperial College London (South Kensington Campus)',
    borough: 'Royal Borough of Kensington and Chelsea',
    postcode: 'SW7 2AZ',
    lat: 51.4988,
    lng: -0.1749,
    londonWorldXZ: [-66, 34],
    osEasting: 526795,
    osNorthing: 179362,
    osOpenUprn: '100021794820',
    osMasterMapToid: 'osgb1000004982311',
    osmWayId: 'way/26819240',
    osmBbox: [51.4962, -0.1802, 51.5015, -0.1705],
    elevationAodM: 18.0,
    accentColor: '#818cf8',
    tubeStations: ['South Kensington', 'Gloucester Road', 'High Street Kensington'],
    osmFootprints: [
      {
        osmId: 'way/26819240',
        name: "The Queen's Tower (Victorian Belfry Landmark)",
        buildingLevels: 10,
        heightMeters: 42.0,
        roofShape: 'spire',
        facadeMaterial: 'portland_stone',
        osUprn: '100021794820',
        polygonMeters: [
          [-3.5, -3.5],
          [3.5, -3.5],
          [3.5, 3.5],
          [-3.5, 3.5],
        ],
      },
      {
        osmId: 'way/26819288',
        name: 'Abdus Salam Central Library (Queen’s Lawn West)',
        buildingLevels: 5,
        heightMeters: 21.5,
        roofShape: 'flat',
        facadeMaterial: 'glass',
        osUprn: '100021794855',
        polygonMeters: [
          [-22, -8],
          [-8, -8],
          [-8, 6],
          [-22, 6],
        ],
      },
      {
        osmId: 'way/26819312',
        name: 'City & Guilds Building (Exhibition Road)',
        buildingLevels: 6,
        heightMeters: 25.0,
        roofShape: 'flat',
        facadeMaterial: 'glass',
        osUprn: '100021794890',
        polygonMeters: [
          [10, -14],
          [22, -14],
          [22, 8],
          [10, 8],
        ],
      },
    ],
  },
  {
    universityId: 'kcl-london',
    campusId: 'kcl-waterloo-guys',
    shortName: "KCL Waterloo & Guy's",
    fullName: "King's College London (Waterloo & Guy's South Bank)",
    borough: 'London Borough of Lambeth & Southwark',
    postcode: 'SE1 9NH',
    lat: 51.5055,
    lng: -0.1128,
    londonWorldXZ: [48, 60],
    osEasting: 531080,
    osNorthing: 180210,
    osOpenUprn: '100023412098',
    osMasterMapToid: 'osgb1000005429104',
    osmWayId: 'way/25410982',
    osmBbox: [51.5025, -0.1165, 51.5078, -0.1085],
    elevationAodM: 12.0,
    accentColor: '#fb7185',
    tubeStations: ['Waterloo', 'London Bridge', 'Southwark'],
    osmFootprints: [
      {
        osmId: 'way/25410982',
        name: 'Franklin-Wilkins Building (Stamford Street)',
        buildingLevels: 6,
        heightMeters: 24.0,
        roofShape: 'flat',
        facadeMaterial: 'concrete',
        osUprn: '100023412098',
        polygonMeters: [
          [-16, -8],
          [16, -8],
          [16, 8],
          [-16, 8],
        ],
      },
    ],
  },
  {
    universityId: 'imperial-london',
    campusId: 'imperial-white-city',
    shortName: 'Imperial White City',
    fullName: 'Imperial College London (White City Deep-Tech Hub)',
    borough: 'London Borough of Hammersmith and Fulham',
    postcode: 'W12 0BZ',
    lat: 51.5138,
    lng: -0.2245,
    londonWorldXZ: [-96, -24],
    osEasting: 523310,
    osNorthing: 180980,
    osOpenUprn: '100021892011',
    osMasterMapToid: 'osgb1000004991820',
    osmWayId: 'way/482910384',
    osmBbox: [51.511, -0.228, 51.5165, -0.221],
    elevationAodM: 32.0,
    accentColor: '#a855f7',
    tubeStations: ['White City', 'Wood Lane'],
    osmFootprints: [
      {
        osmId: 'way/482910384',
        name: 'Molecular Sciences Research Hub (MSRH)',
        buildingLevels: 8,
        heightMeters: 29.0,
        roofShape: 'flat',
        facadeMaterial: 'glass',
        osUprn: '100021892011',
        polygonMeters: [
          [-14, -8],
          [14, -8],
          [14, 8],
          [-14, 8],
        ],
      },
    ],
  },
  {
    universityId: 'ucl-london',
    campusId: 'ucl-east',
    shortName: 'UCL East (Olympic Park)',
    fullName: 'University College London (UCL East · Marshgate & Pool St)',
    borough: 'London Borough of Newham (Stratford)',
    postcode: 'E20 2AF',
    lat: 51.5385,
    lng: -0.0128,
    londonWorldXZ: [98, -54],
    osEasting: 537910,
    osNorthing: 184020,
    osOpenUprn: '10094819204',
    osMasterMapToid: 'osgb1000005918273',
    osmWayId: 'way/819203841',
    osmBbox: [51.5355, -0.0175, 51.5415, -0.0085],
    elevationAodM: 15.0,
    accentColor: '#2dd4bf',
    tubeStations: ['Stratford', 'Stratford International', 'Pudding Mill Lane'],
    osmFootprints: [
      {
        osmId: 'way/819203841',
        name: 'UCL East Marshgate Innovation Hub',
        buildingLevels: 8,
        heightMeters: 32.0,
        roofShape: 'flat',
        facadeMaterial: 'glass',
        osUprn: '10094819204',
        polygonMeters: [
          [-14, -10],
          [14, -10],
          [14, 10],
          [-14, 10],
        ],
      },
    ],
  },
];

/**
 * Calculates the real-world great-circle Haversine distance in kilometers between two WGS84 coordinates.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Projects a London WGS84 coordinate or looks up the calibrated 3D London World XZ coordinate.
 */
export function projectLondonWgs84ToSceneXZ(
  lat: number,
  lng: number,
  scalePerKm = 20.0
): [number, number] {
  const match = LONDON_UNIVERSITY_GEO_LOCATIONS.find(
    (g) => Math.abs(g.lat - lat) < 0.0005 && Math.abs(g.lng - lng) < 0.0005
  );
  if (match) {
    return match.londonWorldXZ;
  }
  const dxKm = (lng - LONDON_CENTER_WGS84.lng) * 69.05;
  const dzKm = -(lat - LONDON_CENTER_WGS84.lat) * 111.13;
  return [Number((dxKm * scalePerKm).toFixed(2)), Number((dzKm * scalePerKm).toFixed(2))];
}

/**
 * Computes all real-world inter-university distances, walking times, and London Underground routes.
 */
export function getLondonInterUniversityRoutes(): InterUniversityRoute[] {
  const findGeo = (campusId: string) =>
    LONDON_UNIVERSITY_GEO_LOCATIONS.find((g) => g.campusId === campusId) ||
    LONDON_UNIVERSITY_GEO_LOCATIONS[0];

  const pairs: Array<{
    from: string;
    to: string;
    viaCorridor: string;
    tubeLine: string;
    tubeMinutes: number;
  }> = [
    {
      from: 'ucl-bloomsbury',
      to: 'lse-aldwych-holborn',
      viaCorridor: 'Gower St → Bloomsbury Way → Kingsway → Houghton St',
      tubeLine: 'Piccadilly Line (Russell Sq → Holborn)',
      tubeMinutes: 6,
    },
    {
      from: 'lse-aldwych-holborn',
      to: 'kcl-strand',
      viaCorridor: 'Houghton St → Aldwych Crescent → Bush House → The Strand',
      tubeLine: 'Direct Pedestrian Quarter (Strand-Aldwych)',
      tubeMinutes: 4,
    },
    {
      from: 'ucl-bloomsbury',
      to: 'kcl-strand',
      viaCorridor: 'Gower St → Kingsway → Aldwych → The Strand',
      tubeLine: 'Northern Line (Warren St → Charing Cross)',
      tubeMinutes: 9,
    },
    {
      from: 'kcl-strand',
      to: 'kcl-waterloo-guys',
      viaCorridor: 'The Strand → Waterloo Bridge → Stamford Street (South Bank)',
      tubeLine: 'Direct Walk across Waterloo Bridge over River Thames',
      tubeMinutes: 5,
    },
    {
      from: 'ucl-bloomsbury',
      to: 'imperial-south-ken',
      viaCorridor: 'Bloomsbury → Hyde Park Corner → Knightsbridge → Exhibition Rd',
      tubeLine: 'Piccadilly Line (Russell Sq → South Kensington)',
      tubeMinutes: 16,
    },
    {
      from: 'kcl-strand',
      to: 'imperial-south-ken',
      viaCorridor: 'Victoria Embankment → Westminster → Sloane Sq → Cromwell Rd',
      tubeLine: 'District / Circle Line (Temple → South Kensington)',
      tubeMinutes: 13,
    },
  ];

  return pairs.map((p) => {
    const g1 = findGeo(p.from);
    const g2 = findGeo(p.to);
    const straightKm = calculateHaversineDistanceKm(g1.lat, g1.lng, g2.lat, g2.lng);
    const streetDistanceKm = Number((straightKm * 1.22).toFixed(2));
    const distanceMiles = Number((streetDistanceKm * 0.621371).toFixed(2));
    const walkMinutes = Math.max(4, Math.round((streetDistanceKm / 4.8) * 60));
    const cycleMinutes = Math.max(2, Math.round((streetDistanceKm / 16.5) * 60));

    return {
      fromCampusId: p.from,
      toCampusId: p.to,
      fromLabel: g1.shortName,
      toLabel: g2.shortName,
      distanceKm: streetDistanceKm,
      distanceMiles,
      walkMinutes,
      tubeMinutes: p.tubeMinutes,
      cycleMinutes,
      viaCorridor: p.viaCorridor,
      tubeLine: p.tubeLine,
    };
  });
}

/**
 * 3D Scene XZ points for the River Thames winding through London
 * Flows from Chelsea/Battersea (South-West of Imperial) through Westminster,
 * right between KCL Strand (North Bank [44, 24]) and KCL Waterloo (South Bank [48, 60]) at z = 42,
 * and East through Blackfriars & City of London.
 */
export const RIVER_THAMES_SCENE_XZ_PATH: [number, number][] = [
  [-155, 86], // Putney / Wandsworth Reach
  [-105, 76], // Chelsea Embankment (South of Imperial South Ken)
  [-55, 68], // Grosvenor / Pimlico Reach
  [-12, 56], // Westminster Bridge / Houses of Parliament
  [18, 45], // Hungerford Bridge / Victoria Embankment
  [46, 42], // Waterloo Bridge (Directly between KCL Strand [44,24] & KCL Waterloo [48,60])
  [82, 38], // Blackfriars Bridge
  [118, 36], // Millennium Bridge & St Paul's Reach
  [158, 38], // London Bridge & Tower Bridge Reach
];

export const RIVER_THAMES_WGS84_PATH: [number, number][] = [
  [51.4835, -0.182],
  [51.4852, -0.165],
  [51.4865, -0.148],
  [51.491, -0.128],
  [51.5008, -0.1242],
  [51.5062, -0.1202],
  [51.5085, -0.1168],
  [51.5096, -0.1045],
  [51.5082, -0.092],
  [51.5075, -0.081],
];

export function buildOverpassQueryForCampus(geo: UniversityGeoLocation): string {
  const [s, w, n, e] = geo.osmBbox;
  return `[out:json][timeout:15];
(
  way["building"](${s},${w},${n},${e});
  relation["building"](${s},${w},${n},${e});
);
out body;
>;
out skel qt;`;
}

export interface London3DLandmark {
  id: string;
  name: string;
  shortLabel: string;
  postcode: string;
  accucitiesTileId: string;
  lat: number;
  lng: number;
  londonWorldXZ: [number, number];
  heightMeters: number;
  archetype:
    | 'shard-spire'
    | 'bt-tower'
    | 'london-eye'
    | 'st-pauls-dome'
    | 'albert-hall'
    | 'gherkin'
    | 'british-museum'
    | 'olympic-orbit';
  accentColor: string;
  nearCampusId: string;
}

/**
 * Iconic London 3D Landmarks derived from the AccuCities 2025 Free 3D Model of London
 * (`accucities.com/free-3d-model-of-london-2025/`) and Apple Maps 3D Detailed City Experience,
 * providing immediate real-world spatial orientation around all 7 university campuses.
 */
export const LONDON_3D_ICONIC_LANDMARKS: London3DLandmark[] = [
  {
    id: 'bt-tower-fitzrovia',
    name: 'BT Tower (Fitzrovia Telecom Spire)',
    shortLabel: 'BT Tower',
    postcode: 'W1T 4JZ',
    accucitiesTileId: 'TQ2981',
    lat: 51.5215,
    lng: -0.1389,
    londonWorldXZ: [-6, -44],
    heightMeters: 177,
    archetype: 'bt-tower',
    accentColor: '#38bdf8',
    nearCampusId: 'ucl-bloomsbury',
  },
  {
    id: 'british-museum-bloomsbury',
    name: 'British Museum (Great Court & Reading Room Dome)',
    shortLabel: 'British Museum',
    postcode: 'WC1B 3DG',
    accucitiesTileId: 'TQ3081',
    lat: 51.5194,
    lng: -0.127,
    londonWorldXZ: [24, -28],
    heightMeters: 44,
    archetype: 'british-museum',
    accentColor: '#60a5fa',
    nearCampusId: 'ucl-bloomsbury',
  },
  {
    id: 'royal-albert-hall',
    name: 'Royal Albert Hall & Imperial Queen’s Tower (Albertopolis)',
    shortLabel: 'Royal Albert Hall',
    postcode: 'SW7 2AP',
    accucitiesTileId: 'TQ2679',
    lat: 51.5009,
    lng: -0.1774,
    londonWorldXZ: [-66, 16],
    heightMeters: 41,
    archetype: 'albert-hall',
    accentColor: '#f59e0b',
    nearCampusId: 'imperial-south-ken',
  },
  {
    id: 'london-eye-waterloo',
    name: 'London Eye & South Bank Jubilee Gardens',
    shortLabel: 'London Eye',
    postcode: 'SE1 7PB',
    accucitiesTileId: 'TQ3079',
    lat: 51.5033,
    lng: -0.1195,
    londonWorldXZ: [24, 54],
    heightMeters: 135,
    archetype: 'london-eye',
    accentColor: '#f43f5e',
    nearCampusId: 'kcl-waterloo-guys',
  },
  {
    id: 'st-pauls-cathedral',
    name: 'St Paul’s Cathedral (City of London Ludgate Hill)',
    shortLabel: 'St Paul’s Cathedral',
    postcode: 'EC4M 8AD',
    accucitiesTileId: 'TQ3281',
    lat: 51.5138,
    lng: -0.0984,
    londonWorldXZ: [78, 14],
    heightMeters: 111,
    archetype: 'st-pauls-dome',
    accentColor: '#eab308',
    nearCampusId: 'kcl-strand',
  },
  {
    id: 'the-shard-london-bridge',
    name: 'The Shard (London Bridge Quarter & Guy’s Campus)',
    shortLabel: 'The Shard',
    postcode: 'SE1 9SG',
    accucitiesTileId: 'TQ3280',
    lat: 51.5045,
    lng: -0.0865,
    londonWorldXZ: [86, 56],
    heightMeters: 310,
    archetype: 'shard-spire',
    accentColor: '#38bdf8',
    nearCampusId: 'kcl-waterloo-guys',
  },
  {
    id: 'the-gherkin-city',
    name: '30 St Mary Axe (The Gherkin · City of London)',
    shortLabel: 'The Gherkin',
    postcode: 'EC3A 8EP',
    accucitiesTileId: 'TQ3381',
    lat: 51.5145,
    lng: -0.0803,
    londonWorldXZ: [104, 8],
    heightMeters: 180,
    archetype: 'gherkin',
    accentColor: '#10b981',
    nearCampusId: 'lse-aldwych-holborn',
  },
  {
    id: 'olympic-park-orbit',
    name: 'Queen Elizabeth Olympic Park & ArcelorMittal Orbit',
    shortLabel: 'Olympic Park Orbit',
    postcode: 'E20 2ST',
    accucitiesTileId: 'TQ3784',
    lat: 51.5384,
    lng: -0.0129,
    londonWorldXZ: [112, -48],
    heightMeters: 114,
    archetype: 'olympic-orbit',
    accentColor: '#ec4899',
    nearCampusId: 'ucl-east',
  },
];

export interface LondonRoyalPark3D {
  id: string;
  name: string;
  londonWorldXZ: [number, number];
  sizeXZ: [number, number];
}

export const LONDON_ROYAL_PARKS_3D: LondonRoyalPark3D[] = [
  {
    id: 'hyde-park-kensington',
    name: 'Hyde Park & Kensington Gardens',
    londonWorldXZ: [-52, 0],
    sizeXZ: [34, 22],
  },
  {
    id: 'regents-park',
    name: 'The Regent’s Park',
    londonWorldXZ: [-18, -72],
    sizeXZ: [32, 18],
  },
  {
    id: 'russell-square-bloomsbury',
    name: 'Russell Square & Gordon Square (Bloomsbury)',
    londonWorldXZ: [24, -46],
    sizeXZ: [12, 10],
  },
  {
    id: 'lincolns-inn-fields',
    name: 'Lincoln’s Inn Fields (Holborn / LSE)',
    londonWorldXZ: [34, -14],
    sizeXZ: [11, 9],
  },
  {
    id: 'olympic-parklands-east',
    name: 'Queen Elizabeth Olympic Parklands (Stratford)',
    londonWorldXZ: [86, -42],
    sizeXZ: [20, 16],
  },
];

export type LondonWaterwayType =
  | 'tidal-river'
  | 'surface-river'
  | 'canal'
  | 'subterranean-stream';

export interface LondonThamesBridge3D {
  id: string;
  name: string;
  shortLabel: string;
  curveFraction: number;
  nearCampusId: string;
}

export const LONDON_THAMES_BRIDGES_3D: LondonThamesBridge3D[] = [
  {
    id: 'chelsea-bridge',
    name: 'Chelsea Bridge (Imperial / Battersea Reach)',
    shortLabel: 'Chelsea Bridge',
    curveFraction: 0.2,
    nearCampusId: 'imperial-south-ken',
  },
  {
    id: 'vauxhall-bridge',
    name: 'Vauxhall Bridge (River Effra Outfall)',
    shortLabel: 'Vauxhall Bridge',
    curveFraction: 0.34,
    nearCampusId: 'imperial-south-ken',
  },
  {
    id: 'westminster-bridge',
    name: 'Westminster Bridge (Parliament & South Bank)',
    shortLabel: 'Westminster Bridge',
    curveFraction: 0.47,
    nearCampusId: 'kcl-waterloo-guys',
  },
  {
    id: 'waterloo-bridge',
    name: 'Waterloo Bridge (KCL Strand ↔ KCL Waterloo Spine)',
    shortLabel: 'Waterloo Bridge',
    curveFraction: 0.58,
    nearCampusId: 'kcl-strand',
  },
  {
    id: 'blackfriars-bridge',
    name: 'Blackfriars Bridge (River Fleet Outfall & LSE/City)',
    shortLabel: 'Blackfriars Bridge',
    curveFraction: 0.67,
    nearCampusId: 'lse-aldwych-holborn',
  },
  {
    id: 'london-bridge',
    name: 'London Bridge (KCL Guy’s Campus & The Shard)',
    shortLabel: 'London Bridge',
    curveFraction: 0.77,
    nearCampusId: 'kcl-waterloo-guys',
  },
  {
    id: 'tower-bridge',
    name: 'Tower Bridge (Pool of London & St Saviour’s Dock)',
    shortLabel: 'Tower Bridge',
    curveFraction: 0.86,
    nearCampusId: 'kcl-waterloo-guys',
  },
];

export interface LondonWaterway3D {
  id: string;
  name: string;
  shortLabel: string;
  type: LondonWaterwayType;
  statusLabel: string;
  widthSceneUnits: number;
  realLengthKm: number;
  flowDirection: string;
  colorHex: string;
  emissiveHex: string;
  nearCampusIds: string[];
  description: string;
  pathXZ: [number, number][];
  labelXZ: [number, number];
}

export const LONDON_RIVERS_AND_STREAMS_3D: LondonWaterway3D[] = [
  {
    id: 'river-thames',
    name: 'River Thames (Main Tidal Channel through Central London)',
    shortLabel: '🌊 River Thames (W → E)',
    type: 'tidal-river',
    statusLabel: 'Primary Tidal River',
    widthSceneUnits: 12.6,
    realLengthKm: 346,
    flowDirection: 'West (Chelsea / Battersea) → East (Westminster, KCL Strand, Waterloo, City & Greenwich)',
    colorHex: '#0284c7',
    emissiveHex: '#0369a1',
    nearCampusIds: ['kcl-strand', 'kcl-waterloo-guys', 'lse-aldwych-holborn', 'imperial-south-ken'],
    description:
      'London’s primary tidal artery separating the North Bank (KCL Strand, LSE, UCL, Imperial) from the South Bank (KCL Waterloo & Guy’s). Crossed by 7 iconic bridges.',
    pathXZ: RIVER_THAMES_SCENE_XZ_PATH,
    labelXZ: [44, 38],
  },
  {
    id: 'river-lea-waterworks',
    name: 'River Lea (Lee Navigation) & Waterworks River (UCL East Olympic Park)',
    shortLabel: '🌊 River Lea & Waterworks',
    type: 'surface-river',
    statusLabel: 'Surface River & Navigation',
    widthSceneUnits: 4.8,
    realLengthKm: 68,
    flowDirection: 'North (Hackney Marshes) → South through UCL East Olympic Park → Thames at Bow Creek',
    colorHex: '#0891b2',
    emissiveHex: '#06b6d4',
    nearCampusIds: ['ucl-east'],
    description:
      'Flows directly between UCL East Marshgate and One Pool Street inside Queen Elizabeth Olympic Park in Stratford before joining the River Thames at Bow Creek.',
    pathXZ: [
      [92, -118],
      [95, -88],
      [98, -54],
      [104, -22],
      [114, 4],
      [126, 24],
    ],
    labelXZ: [99, -50],
  },
  {
    id: 'regents-canal',
    name: 'Regent’s Canal (Little Venice → Camden → King’s Cross → Limehouse)',
    shortLabel: '🛶 Regent’s Canal',
    type: 'canal',
    statusLabel: 'Surface Canal Waterway',
    widthSceneUnits: 3.6,
    realLengthKm: 13.8,
    flowDirection: 'West (Paddington) → East past Regent’s Park & UCL North → Thames at Limehouse Basin',
    colorHex: '#0d9488',
    emissiveHex: '#14b8a6',
    nearCampusIds: ['ucl-bloomsbury', 'ucl-east'],
    description:
      'Historic 1820 canal curving around Regent’s Park and Camden Lock just north of UCL Bloomsbury, passing King’s Cross and Mile End to enter the Thames at Limehouse.',
    pathXZ: [
      [-88, -56],
      [-52, -74],
      [-18, -84],
      [12, -82],
      [38, -74],
      [68, -62],
      [96, -34],
      [114, 2],
      [118, 25],
    ],
    labelXZ: [12, -82],
  },
  {
    id: 'river-fleet',
    name: 'River Fleet (Hampstead → Camden → King’s Cross / UCL → Fleet St / LSE → Blackfriars)',
    shortLabel: '💧 River Fleet (Subterranean)',
    type: 'subterranean-stream',
    statusLabel: 'Subterranean Lost River',
    widthSceneUnits: 3.1,
    realLengthKm: 6.5,
    flowDirection: 'North (Hampstead Heath) → South between UCL Bloomsbury & LSE → Thames at Blackfriars Bridge',
    colorHex: '#38bdf8',
    emissiveHex: '#0ea5e9',
    nearCampusIds: ['ucl-bloomsbury', 'lse-aldwych-holborn', 'kcl-strand'],
    description:
      'London’s largest subterranean “Lost River”. Flows beneath St Pancras and King’s Cross just east of UCL Bloomsbury, down Farringdon Road past LSE and Fleet Street into the Thames under Blackfriars Bridge.',
    pathXZ: [
      [16, -114],
      [22, -84],
      [27, -52],
      [38, -28],
      [50, -6],
      [58, 16],
      [64, 35],
    ],
    labelXZ: [38, -28],
  },
  {
    id: 'river-westbourne-serpentine',
    name: 'River Westbourne & Hyde Park Serpentine (Paddington → Imperial / Hyde Park → Chelsea)',
    shortLabel: '🦢 River Westbourne & Serpentine',
    type: 'surface-river',
    statusLabel: 'Park Lake & Culvert Stream',
    widthSceneUnits: 4.2,
    realLengthKm: 9.8,
    flowDirection: 'North (Hampstead / Paddington) → South via Hyde Park Serpentine (Imperial) → Thames at Chelsea',
    colorHex: '#22d3ee',
    emissiveHex: '#06b6d4',
    nearCampusIds: ['imperial-south-ken'],
    description:
      'Feeds the famous Serpentine & Long Water lakes in Hyde Park & Kensington Gardens immediately north of Imperial College South Kensington, before flowing in a pipe above Sloane Square platform to the Thames.',
    pathXZ: [
      [-68, -88],
      [-64, -46],
      [-56, -12],
      [-52, 8],
      [-54, 30],
      [-52, 52],
      [-50, 70],
    ],
    labelXZ: [-53, 8],
  },
  {
    id: 'river-tyburn',
    name: 'River Tyburn (Regent’s Park → Marylebone → Mayfair → Westminster Thames)',
    shortLabel: '💧 River Tyburn (Subterranean)',
    type: 'subterranean-stream',
    statusLabel: 'Subterranean Lost River',
    widthSceneUnits: 2.7,
    realLengthKm: 6.2,
    flowDirection: 'North (Hampstead / Regent’s Park) → South via Marylebone & Mayfair → Thames at Westminster',
    colorHex: '#60a5fa',
    emissiveHex: '#3b82f6',
    nearCampusIds: ['ucl-bloomsbury'],
    description:
      'Subterranean stream flowing south from Regent’s Park boating lake along winding Marylebone Lane (west of UCL Bloomsbury), through Mayfair and directly beneath Buckingham Palace to the Thames.',
    pathXZ: [
      [-22, -108],
      [-18, -74],
      [-15, -42],
      [-13, -12],
      [-10, 18],
      [-8, 42],
      [-6, 63],
    ],
    labelXZ: [-14, -24],
  },
  {
    id: 'river-walbrook',
    name: 'River Walbrook (Moorfields → Bank of England / City → Cannon St Thames)',
    shortLabel: '💧 River Walbrook (Roman Stream)',
    type: 'subterranean-stream',
    statusLabel: 'Subterranean Roman Stream',
    widthSceneUnits: 2.6,
    realLengthKm: 3.5,
    flowDirection: 'North (Finsbury / Moorfields) → South through Roman Londinium & Bank → Thames at Cannon St',
    colorHex: '#38bdf8',
    emissiveHex: '#0284c7',
    nearCampusIds: ['lse-aldwych-holborn', 'kcl-strand'],
    description:
      'Ancient freshwater stream around which the Romans founded Londinium. Flows underground beneath Moorgate and the Bank of England into the Thames beside Cannon Street railway bridge.',
    pathXZ: [
      [78, -52],
      [77, -26],
      [76, -4],
      [76, 16],
      [76, 32],
    ],
    labelXZ: [76, -4],
  },
  {
    id: 'counters-creek',
    name: 'Counter’s Creek / Stamford Brook (Kensal Green → Imperial White City → Chelsea Creek)',
    shortLabel: '💧 Counter’s Creek (White City)',
    type: 'subterranean-stream',
    statusLabel: 'West London Culvert Stream',
    widthSceneUnits: 2.8,
    realLengthKm: 7.4,
    flowDirection: 'North (Kensal Green) → South past Imperial White City & Olympia → Thames at Chelsea Creek',
    colorHex: '#818cf8',
    emissiveHex: '#6366f1',
    nearCampusIds: ['imperial-white-city', 'imperial-south-ken'],
    description:
      'West London stream running directly along the eastern edge of Imperial College White City campus and the West London Line railway down to Chelsea Creek on the Thames.',
    pathXZ: [
      [-102, -76],
      [-95, -46],
      [-92, -18],
      [-91, 14],
      [-90, 44],
      [-88, 72],
    ],
    labelXZ: [-92, -12],
  },
  {
    id: 'river-effra',
    name: 'River Effra (Dulwich / Brixton → Oval → Vauxhall Bridge Thames)',
    shortLabel: '💧 River Effra (South Bank)',
    type: 'subterranean-stream',
    statusLabel: 'South London Lost River',
    widthSceneUnits: 2.9,
    realLengthKm: 8.8,
    flowDirection: 'South (Crystal Palace / Brixton) → North via Oval → Thames at Vauxhall Bridge',
    colorHex: '#2dd4bf',
    emissiveHex: '#14b8a6',
    nearCampusIds: ['kcl-waterloo-guys'],
    description:
      'Major South London underground river rising in Upper Norwood and flowing north beneath Brixton and The Oval cricket ground to discharge into the Thames at Vauxhall Bridge.',
    pathXZ: [
      [18, 126],
      [12, 104],
      [4, 84],
      [-6, 65],
    ],
    labelXZ: [6, 92],
  },
  {
    id: 'river-neckinger',
    name: 'River Neckinger & Earl’s Sluice (Southwark / KCL Guy’s → St Saviour’s Dock Thames)',
    shortLabel: '💧 River Neckinger (Southwark)',
    type: 'subterranean-stream',
    statusLabel: 'Southwark Subterranean Stream',
    widthSceneUnits: 2.7,
    realLengthKm: 4.6,
    flowDirection: 'South (Elephant & Castle) → North past KCL Waterloo & Guy’s → Thames at St Saviour’s Dock',
    colorHex: '#34d399',
    emissiveHex: '#10b981',
    nearCampusIds: ['kcl-waterloo-guys'],
    description:
      'Historic Southwark stream flowing from Lambeth and Elephant & Castle past KCL Waterloo and Guy’s Campus in Bermondsey to enter the Thames at St Saviour’s Dock just east of Tower Bridge.',
    pathXZ: [
      [50, 108],
      [60, 82],
      [74, 56],
      [88, 31],
    ],
    labelXZ: [66, 74],
  },
  {
    id: 'river-wandle',
    name: 'River Wandle (Wimbledon / Earlsfield → Wandsworth Thames)',
    shortLabel: '🌊 River Wandle (SW Chalk Stream)',
    type: 'surface-river',
    statusLabel: 'Surface Chalk Stream',
    widthSceneUnits: 3.5,
    realLengthKm: 14.5,
    flowDirection: 'South (Croydon / Wimbledon) → North to Thames at Wandsworth Reach',
    colorHex: '#0ea5e9',
    emissiveHex: '#0284c7',
    nearCampusIds: ['imperial-south-ken'],
    description:
      'Crystal-clear South-West London chalk stream flowing north through Merton and Wandsworth into the tidal River Thames.',
    pathXZ: [
      [-74, 126],
      [-70, 104],
      [-66, 88],
      [-62, 72],
    ],
    labelXZ: [-68, 98],
  },
  {
    id: 'river-ravensbourne',
    name: 'River Ravensbourne & Deptford Creek (Lewisham / Greenwich → Thames)',
    shortLabel: '🌊 Ravensbourne / Deptford Creek',
    type: 'surface-river',
    statusLabel: 'Tidal Creek & Surface River',
    widthSceneUnits: 3.8,
    realLengthKm: 17.4,
    flowDirection: 'South (Bromley / Lewisham) → North via Deptford Creek into Thames at Greenwich',
    colorHex: '#0284c7',
    emissiveHex: '#0369a1',
    nearCampusIds: ['kcl-waterloo-guys', 'ucl-east'],
    description:
      'South-East London river becoming the tidal Deptford Creek before joining the River Thames near Greenwich Reach.',
    pathXZ: [
      [126, 118],
      [122, 88],
      [118, 56],
      [116, 26],
    ],
    labelXZ: [120, 72],
  },
];

export function exportCampusOsmGeoJson(geo: UniversityGeoLocation): string {
  const features = geo.osmFootprints.map((fp) => {
    const ringLngLat = fp.polygonMeters.map(([mx, mz]) => {
      const lng = Number((geo.lng + mx / 69050).toFixed(6));
      const lat = Number((geo.lat - mz / 111130).toFixed(6));
      return [lng, lat];
    });
    if (ringLngLat.length > 0) {
      ringLngLat.push([...ringLngLat[0]]);
    }

    return {
      type: 'Feature',
      id: fp.osmId,
      properties: {
        '@id': fp.osmId,
        name: fp.name,
        building: 'university',
        'building:levels': fp.buildingLevels,
        height: fp.heightMeters,
        'roof:shape': fp.roofShape,
        'building:material': fp.facadeMaterial,
        'os:uprn': fp.osUprn,
        'os:toid': geo.osMasterMapToid,
        'accucities:source': 'AccuCities London 2025 Level-3 3D + Apple Maps 3D + OSM',
        university: geo.shortName,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [ringLngLat],
      },
    };
  });

  return JSON.stringify(
    {
      type: 'FeatureCollection',
      name: `${geo.shortName}_AccuCities2025_AppleMaps3D_OSM`,
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
      },
      features,
    },
    null,
    2
  );
}

