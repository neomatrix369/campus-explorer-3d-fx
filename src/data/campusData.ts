export type BuildingArchetype =
  | 'gothic-library'
  | 'cantilever-tech'
  | 'geodesic-dome'
  | 'observatory-tower'
  | 'timber-pavilion'
  | 'classical-cloister';

export type FacadeMaterialStyle =
  | 'portland-stone'
  | 'red-brick-terracotta'
  | 'modern-curtain-glass'
  | 'diagrid-stone'
  | 'beehive-red-brick';

export type TerrainPreset =
  | 'river-valley'
  | 'alpine-ridge'
  | 'coastal-bluff'
  | 'canyon-gorge';

export interface FloorZone {
  floorNumber: number;
  name: string;
  noiseDba: number;
  occupiedSeats: number;
  totalSeats: number;
  powerOutletsPct: number;
  ambientType: 'silent-vault' | 'whisper-reading' | 'collaborative-hum' | 'breeze-atrium';
  features: string[];
}

export interface CampusBuilding {
  id: string;
  name: string;
  shortCode: string;
  category: string;
  archetype: BuildingArchetype;
  facadeStyle?: FacadeMaterialStyle;
  position: [number, number, number];
  dimensions: [number, number, number];
  open24Hours: boolean;
  hoursLabel: string;
  accentColor: string;
  description: string;
  audioLandmarkFreq: number;
  floors: FloorZone[];
}

export interface PathwaySegment {
  id: string;
  fromBuildingId: string;
  toBuildingId: string;
  points: [number, number, number][];
  flowIntensity: number;
}

export interface RoadSegment {
  id: string;
  name: string;
  width: number;
  points: [number, number, number][];
  isPedestrianised?: boolean;
}

export interface MapResourceLink {
  label: string;
  url: string;
  mapType: string;
  isDirectPdf?: boolean;
}

export interface CampusProfile {
  id: string;
  name: string;
  shortName: string;
  locationLabel: string;
  terrainPreset: TerrainPreset;
  baseAslMeters: number;
  topographySummary: string;
  architecturalSignature: string;
  waterLevelY: number;
  foliageHue: number;
  mapLinks: MapResourceLink[];
  roads: RoadSegment[];
  buildings: CampusBuilding[];
  pathways: PathwaySegment[];
}

export interface UniversityProfile {
  id: string;
  name: string;
  shortName: string;
  region: string;
  bestMapFormatNote: string;
  campuses: CampusProfile[];
}

export interface BlueprintPreset {
  id: string;
  title: string;
  subtitle: string;
  rawVectorSpec: string;
}

export const INITIAL_CAMPUS_BUILDINGS: CampusBuilding[] = [
  {
    id: 'ucl-wilkins-main-lib',
    name: 'Wilkins Building (Main Library, Portico & Dome)',
    shortCode: 'WIL',
    category: 'Historic Portico & Main Quad',
    archetype: 'classical-cloister',
    facadeStyle: 'portland-stone',
    position: [0, 0, -6],
    dimensions: [18, 15, 14],
    open24Hours: false,
    hoursLabel: '08:00 – 00:00 · Main Quad, Flaxman Gallery & Donaldson Room',
    accentColor: '#60a5fa',
    description:
      'Heart of UCL Bloomsbury on maps.ucl.ac.uk: William Wilkins’ 19th-century Portland stone Portico and central Octagon Dome facing west across the gravelled Main Quad toward the Gower Street gate.',
    audioLandmarkFreq: 261.63,
    floors: [
      {
        floorNumber: 1,
        name: '1F North & South Cloisters & Main Quad Entry',
        noiseDba: 39,
        occupiedSeats: 48,
        totalSeats: 85,
        powerOutletsPct: 80,
        ambientType: 'whisper-reading',
        features: ['Portland Stone Colonnade', 'Main Quad Views', 'Quick Reference'],
      },
      {
        floorNumber: 2,
        name: '2F Donaldson Reading Room & Main Library',
        noiseDba: 27,
        occupiedSeats: 32,
        totalSeats: 96,
        powerOutletsPct: 88,
        ambientType: 'silent-vault',
        features: ['Barrel-Vaulted Ceiling', 'Brass Desk Lamps', 'Strict Silence'],
      },
      {
        floorNumber: 3,
        name: '3F Flaxman Octagon Dome & Law Stacks',
        noiseDba: 29,
        occupiedSeats: 24,
        totalSeats: 78,
        powerOutletsPct: 85,
        ambientType: 'whisper-reading',
        features: ['Rotunda Natural Light', 'Archive Carrels', 'High-Speed Eduroam'],
      },
    ],
  },
  {
    id: 'ucl-student-centre',
    name: 'UCL Student Centre (27–28 Gordon St · 24/7)',
    shortCode: 'USC',
    category: '24/7 Flagship Study Hub',
    archetype: 'cantilever-tech',
    facadeStyle: 'modern-curtain-glass',
    position: [15, 0, -12],
    dimensions: [15, 16, 12],
    open24Hours: true,
    hoursLabel: 'Open 24/7 · 1,000+ Study Spaces (Gordon Street)',
    accentColor: '#38bdf8',
    description:
      'Located at 27–28 Gordon Street immediately east of the Wilkins Building on maps.ucl.ac.uk, offering 1,000 seats across 8 levels of timber, limestone, and glass.',
    audioLandmarkFreq: 220,
    floors: [
      {
        floorNumber: 1,
        name: 'B1 & B2 Deep Quiet Study Vaults',
        noiseDba: 26,
        occupiedSeats: 38,
        totalSeats: 140,
        powerOutletsPct: 100,
        ambientType: 'silent-vault',
        features: ['Acoustic Timber Baffles', 'Individual Task Lighting', 'USB-C 100W Power'],
      },
      {
        floorNumber: 2,
        name: '1F–2F Gordon Street Atrium & Mezzanine',
        noiseDba: 44,
        occupiedSeats: 76,
        totalSeats: 120,
        powerOutletsPct: 92,
        ambientType: 'collaborative-hum',
        features: ['Group Study Booths', '24/7 Cafe Express', 'Print & Loan Lockers'],
      },
      {
        floorNumber: 3,
        name: '3F Silent Research Reading Room',
        noiseDba: 28,
        occupiedSeats: 29,
        totalSeats: 110,
        powerOutletsPct: 98,
        ambientType: 'silent-vault',
        features: ['Zero-Conversation Zone', 'Dual-Monitor Bays', 'Ergonomic Chairs'],
      },
      {
        floorNumber: 4,
        name: '4F Japanese Garden & Gordon Sq Terrace',
        noiseDba: 33,
        occupiedSeats: 34,
        totalSeats: 95,
        powerOutletsPct: 90,
        ambientType: 'breeze-atrium',
        features: ['Skylight Canopy', 'Bloomsbury Roof Views', 'Quiet Loungers'],
      },
    ],
  },
  {
    id: 'ucl-cruciform-hub',
    name: 'Cruciform Building (Gower St West · 24/7 Hub)',
    shortCode: 'CRU',
    category: 'Clinical & Bio Study Hub',
    archetype: 'gothic-library',
    facadeStyle: 'red-brick-terracotta',
    position: [-28, 0, -8],
    dimensions: [15, 15, 13],
    open24Hours: true,
    hoursLabel: 'Open 24/7 · Alfred Waterhouse Red-Brick Landmark',
    accentColor: '#f43f5e',
    description:
      'Standing directly opposite the UCL Main Quad gate on the west side of Gower Street (maps.ucl.ac.uk), housing the subterranean 24/7 Cruciform biomedical study cluster.',
    audioLandmarkFreq: 329.63,
    floors: [
      {
        floorNumber: 1,
        name: 'B1 Cruciform 24/7 Study Cluster',
        noiseDba: 31,
        occupiedSeats: 36,
        totalSeats: 88,
        powerOutletsPct: 98,
        ambientType: 'whisper-reading',
        features: ['Anatomical Model Archive', 'High-Contrast Lighting', 'Clinical Workstations'],
      },
      {
        floorNumber: 2,
        name: '1F Silent Biomedical Reading Suites',
        noiseDba: 26,
        occupiedSeats: 18,
        totalSeats: 68,
        powerOutletsPct: 96,
        ambientType: 'silent-vault',
        features: ['Soundproof Pods', 'Individual Carrels', 'USB-C Fast Charge'],
      },
    ],
  },
  {
    id: 'ucl-science-lib',
    name: 'DMS Watson Science Library (Malet Place · 24/7)',
    shortCode: 'SCI',
    category: 'STEM Research Library',
    archetype: 'gothic-library',
    facadeStyle: 'red-brick-terracotta',
    position: [-4, 0, 12],
    dimensions: [15, 14, 12],
    open24Hours: true,
    hoursLabel: 'Open 24/7 · Malet Place Science & Engineering Spine',
    accentColor: '#34d399',
    description:
      'Anchored on tree-lined Malet Place south of the Main Quad (maps.ucl.ac.uk), featuring 24-hour STEM computer clusters, GIS nodes, and silent upper reading decks.',
    audioLandmarkFreq: 293.66,
    floors: [
      {
        floorNumber: 1,
        name: 'Ground Learning Laboratory & Helpdesk',
        noiseDba: 48,
        occupiedSeats: 64,
        totalSeats: 90,
        powerOutletsPct: 95,
        ambientType: 'collaborative-hum',
        features: ['24/7 Café Pods', 'Laptop Loans', 'Group Touchtables'],
      },
      {
        floorNumber: 2,
        name: '2F–3F Linux & Quantitative Clusters',
        noiseDba: 35,
        occupiedSeats: 41,
        totalSeats: 84,
        powerOutletsPct: 100,
        ambientType: 'whisper-reading',
        features: ['Dual 4K Workstations', 'MATLAB & CAD Nodes', 'Quiet Partition Desks'],
      },
      {
        floorNumber: 3,
        name: '4F Silent STEM Stacks',
        noiseDba: 27,
        occupiedSeats: 19,
        totalSeats: 70,
        powerOutletsPct: 92,
        ambientType: 'silent-vault',
        features: ['Acoustic Carrels', 'Zero-Phone Zone', 'Malet Place Views'],
      },
    ],
  },
  {
    id: 'ucl-bartlett-22gordon',
    name: 'Bartlett School of Architecture (22 Gordon St)',
    shortCode: 'BAR',
    category: 'Design & Spatial Studios',
    archetype: 'timber-pavilion',
    facadeStyle: 'diagrid-stone',
    position: [15, 0, -23],
    dimensions: [14, 15, 11],
    open24Hours: false,
    hoursLabel: '07:30 – 23:00 · Corner of Gordon St & Euston Rd',
    accentColor: '#f59e0b',
    description:
      'Positioned at 22 Gordon Street at the north-east corner of the Bloomsbury campus block on maps.ucl.ac.uk, housing CAD fabrication bays and architectural drafting studios.',
    audioLandmarkFreq: 392.0,
    floors: [
      {
        floorNumber: 1,
        name: '1F Exhibition Atrium & Fabrication Lab',
        noiseDba: 51,
        occupiedSeats: 52,
        totalSeats: 75,
        powerOutletsPct: 95,
        ambientType: 'collaborative-hum',
        features: ['Laser & 3D Print Bays', 'Pin-Up Crit Walls', 'Large-Format Plotters'],
      },
      {
        floorNumber: 2,
        name: '3F Architectural Drafting Studio',
        noiseDba: 36,
        occupiedSeats: 31,
        totalSeats: 66,
        powerOutletsPct: 100,
        ambientType: 'whisper-reading',
        features: ['Wide Drafting Tables', 'Gordon Street View', 'CAD Render Nodes'],
      },
      {
        floorNumber: 3,
        name: '5F Quiet Urbanism Research Loft',
        noiseDba: 28,
        occupiedSeats: 14,
        totalSeats: 52,
        powerOutletsPct: 96,
        ambientType: 'silent-vault',
        features: ['North-Light Skylights', 'Silent Thesis Desks', 'Material Library'],
      },
    ],
  },
  {
    id: 'ucl-roberts-eng',
    name: 'Roberts Engineering Building & Senate House South',
    shortCode: 'ROB',
    category: 'Engineering & South Quad Hub',
    archetype: 'observatory-tower',
    facadeStyle: 'portland-stone',
    position: [-14, 0, 22],
    dimensions: [15, 18, 13],
    open24Hours: true,
    hoursLabel: 'Open 24/7 · Torrington Place & Malet Place Corner',
    accentColor: '#a855f7',
    description:
      'Anchoring the southern entrance at Torrington Place and Malet Place on maps.ucl.ac.uk opposite Waterstones, featuring engineering maker hubs and silent upper research rooms.',
    audioLandmarkFreq: 440.0,
    floors: [
      {
        floorNumber: 1,
        name: '1F Torrington Place Engineering Concourse',
        noiseDba: 42,
        occupiedSeats: 44,
        totalSeats: 80,
        powerOutletsPct: 96,
        ambientType: 'collaborative-hum',
        features: ['Torrington Pedestrian Plaza', 'Maker Benches', 'Café Express'],
      },
      {
        floorNumber: 2,
        name: '4F Quiet Systems Engineering Deck',
        noiseDba: 31,
        occupiedSeats: 26,
        totalSeats: 74,
        powerOutletsPct: 100,
        ambientType: 'whisper-reading',
        features: ['Dual-Monitor CAD Bays', 'Silent Study Pods', 'Eduroam 10GbE'],
      },
      {
        floorNumber: 3,
        name: '8F Bloomsbury Skyline Silent Reading Room',
        noiseDba: 25,
        occupiedSeats: 12,
        totalSeats: 56,
        powerOutletsPct: 96,
        ambientType: 'silent-vault',
        features: ['Senate House & Quad Vista', 'Zero-Distraction Vault', 'Thesis Carrels'],
      },
    ],
  },
];

export const CAMPUS_PATHWAYS: PathwaySegment[] = [
  {
    id: 'ucl-path-main-quad',
    fromBuildingId: 'ucl-cruciform-hub',
    toBuildingId: 'ucl-wilkins-main-lib',
    points: [
      [-28, 0, -8],
      [-18, 0, -7],
      [0, 0, -6],
    ],
    flowIntensity: 0.95,
  },
  {
    id: 'ucl-path-gordon',
    fromBuildingId: 'ucl-wilkins-main-lib',
    toBuildingId: 'ucl-student-centre',
    points: [
      [0, 0, -6],
      [8, 0, -9],
      [15, 0, -12],
    ],
    flowIntensity: 0.95,
  },
  {
    id: 'ucl-path-bartlett',
    fromBuildingId: 'ucl-student-centre',
    toBuildingId: 'ucl-bartlett-22gordon',
    points: [
      [15, 0, -12],
      [15, 0, -18],
      [15, 0, -23],
    ],
    flowIntensity: 0.85,
  },
  {
    id: 'ucl-path-malet-place',
    fromBuildingId: 'ucl-wilkins-main-lib',
    toBuildingId: 'ucl-science-lib',
    points: [
      [0, 0, -6],
      [-2, 0, 3],
      [-4, 0, 12],
    ],
    flowIntensity: 0.9,
  },
  {
    id: 'ucl-path-torrington',
    fromBuildingId: 'ucl-science-lib',
    toBuildingId: 'ucl-roberts-eng',
    points: [
      [-4, 0, 12],
      [-9, 0, 17],
      [-14, 0, 22],
    ],
    flowIntensity: 0.85,
  },
  {
    id: 'ucl-path-east-link',
    fromBuildingId: 'ucl-student-centre',
    toBuildingId: 'ucl-science-lib',
    points: [
      [15, 0, -12],
      [6, 0, 0],
      [-4, 0, 12],
    ],
    flowIntensity: 0.8,
  },
];

export const UNIVERSITIES: UniversityProfile[] = [
  {
    id: 'ucl-london',
    name: 'University College London (UCL)',
    shortName: 'UCL',
    region: 'Bloomsbury (maps.ucl.ac.uk) & Queen Elizabeth Olympic Park',
    bestMapFormatNote:
      'Live Interactive Map (maps.ucl.ac.uk) & Vector PDF floor layouts (3.5m/floor)',
    campuses: [
      {
        id: 'ucl-bloomsbury',
        name: 'Bloomsbury Campus (maps.ucl.ac.uk Main Site)',
        shortName: 'Bloomsbury Main',
        locationLabel: 'Gower St, Gordon St, Malet Place & Torrington Pl, London WC1E',
        terrainPreset: 'river-valley',
        baseAslMeters: 28,
        topographySummary:
          'Authentic maps.ucl.ac.uk street grid: Gower Street (West), Gordon Street & Gordon Square (East), Euston Rd (North), Torrington Place (South), and Malet Place spine.',
        architecturalSignature:
          'Wilkins Portico & Main Quad facing Gower Street, Waterhouse red-brick Cruciform across Gower St, and 24/7 Student Centre on Gordon Street.',
        waterLevelY: -0.75,
        foliageHue: 0.33,
        mapLinks: [
          {
            label: 'Official UCL Interactive Map (maps.ucl.ac.uk)',
            url: 'https://maps.ucl.ac.uk/',
            mapType: 'Official Interactive Map',
          },
          {
            label: 'UCL Maps & Vector Downloads Portal',
            url: 'https://maps.ucl.ac.uk/downloads/',
            mapType: 'Official PDF Portal',
          },
          {
            label: 'UCL Virtual Campus Panorama Map (Mapme)',
            url: 'https://mapme.com/interactive-map-example/ucl-virtual-campus-map-student-navigation-services/',
            mapType: '360° Visual Reference',
          },
        ],
        roads: [
          {
            id: 'gower-st',
            name: 'Gower Street (West Boundary · Main Gate & Cruciform)',
            width: 6.2,
            points: [
              [-19, 0, -95],
              [-19, 0, 0],
              [-19, 0, 95],
            ],
          },
          {
            id: 'gordon-st',
            name: 'Gordon Street & Gordon Square (East Boundary)',
            width: 5.6,
            points: [
              [24, 0, -95],
              [24, 0, 0],
              [24, 0, 95],
            ],
          },
          {
            id: 'malet-place',
            name: 'Malet Place (Internal STEM Pedestrian Spine)',
            width: 4.4,
            isPedestrianised: true,
            points: [
              [-4, 0, 2],
              [-4, 0, 28],
            ],
          },
          {
            id: 'torrington-pl',
            name: 'Torrington Place (Pedestrianised South Avenue)',
            width: 5.2,
            isPedestrianised: true,
            points: [
              [-95, 0, 28],
              [0, 0, 28],
              [95, 0, 28],
            ],
          },
          {
            id: 'euston-rd',
            name: 'Euston Road / Gower Place (North Boundary)',
            width: 6.4,
            points: [
              [-95, 0, -30],
              [0, 0, -30],
              [95, 0, -30],
            ],
          },
        ],
        buildings: INITIAL_CAMPUS_BUILDINGS,
        pathways: CAMPUS_PATHWAYS,
      },
      {
        id: 'ucl-east',
        name: 'UCL East (Queen Elizabeth Olympic Park)',
        shortName: 'UCL East',
        locationLabel: 'Waterworks River & Pool Street, Stratford, London E20',
        terrainPreset: 'canyon-gorge',
        baseAslMeters: 14,
        topographySummary:
          'River Lea & Waterworks River canal basin flanked by sculpted Olympic Park wetlands and bridges.',
        architecturalSignature:
          'Monumental fluid-concrete and bronze-finned Marshgate cube overlooking riverside boardwalks.',
        waterLevelY: -0.15,
        foliageHue: 0.35,
        mapLinks: [
          {
            label: 'UCL Maps & Downloads Portal',
            url: 'https://maps.ucl.ac.uk/downloads/',
            mapType: 'Olympic Park Zoning',
          },
        ],
        roads: [
          {
            id: 'pool-st',
            name: 'Pool Street & Montfichet Road',
            width: 5.5,
            points: [
              [-90, 0, -25],
              [0, 0, -25],
              [90, 0, -25],
            ],
          },
          {
            id: 'loop-rd',
            name: 'Olympic Park Loop Road',
            width: 5.5,
            points: [
              [-28, 0, -90],
              [-28, 0, 0],
              [-28, 0, 90],
            ],
          },
          {
            id: 'waterworks-promenade',
            name: 'Waterworks River Promenade',
            width: 4.5,
            isPedestrianised: true,
            points: [
              [-90, 0, 22],
              [0, 0, 22],
              [90, 0, 22],
            ],
          },
        ],
        buildings: [
          {
            id: 'ucl-marshgate',
            name: 'Marshgate Innovation Building (24/7)',
            shortCode: 'MGT',
            category: 'Interdisciplinary Research Hub',
            archetype: 'cantilever-tech',
            facadeStyle: 'diagrid-stone',
            position: [-14, 0, -10],
            dimensions: [17, 19, 13],
            open24Hours: true,
            hoursLabel: 'Open 24/7 · 8-Story Canal-Side Atrium',
            accentColor: '#38bdf8',
            description:
              'Monumental eight-story architectural cube overlooking the Waterworks River in Queen Elizabeth Olympic Park with open fabrication floors and sky reading decks.',
            audioLandmarkFreq: 246.94,
            floors: [
              {
                floorNumber: 1,
                name: '1F Public Fluid Atrium & Refectory',
                noiseDba: 47,
                occupiedSeats: 68,
                totalSeats: 110,
                powerOutletsPct: 94,
                ambientType: 'collaborative-hum',
                features: ['River Lea Terrace', 'Open Exhibition Floor', 'Express Café'],
              },
              {
                floorNumber: 2,
                name: '4F Robotics & Design-Make Studio',
                noiseDba: 36,
                occupiedSeats: 34,
                totalSeats: 85,
                powerOutletsPct: 100,
                ambientType: 'whisper-reading',
                features: ['Cleanroom Prototyping', 'Dual-Monitor Desks', 'Acoustic Pods'],
              },
              {
                floorNumber: 3,
                name: '7F Marshgate Silent Sky Library',
                noiseDba: 26,
                occupiedSeats: 19,
                totalSeats: 90,
                powerOutletsPct: 98,
                ambientType: 'silent-vault',
                features: ['Olympic Park Panorama', 'Zero-Noise Study Bays', '100W USB-C'],
              },
            ],
          },
          {
            id: 'ucl-pool-street',
            name: 'One Pool Street (Future Living Hub)',
            shortCode: 'OPS',
            category: 'Ecology & Urbanism Hub',
            archetype: 'timber-pavilion',
            facadeStyle: 'modern-curtain-glass',
            position: [16, 0, 8],
            dimensions: [15, 16, 12],
            open24Hours: true,
            hoursLabel: 'Open 24/7 · Waterfront Study Podium',
            accentColor: '#10b981',
            description:
              'Riverfront academic podium integrating robotics, urban ecology labs, and a 24-hour student learning commons.',
            audioLandmarkFreq: 293.66,
            floors: [
              {
                floorNumber: 1,
                name: '1F Waterfront Learning Commons',
                noiseDba: 38,
                occupiedSeats: 42,
                totalSeats: 80,
                powerOutletsPct: 95,
                ambientType: 'whisper-reading',
                features: ['Canal Boardwalk Access', 'Collaborative Booths', 'AV Screens'],
              },
              {
                floorNumber: 2,
                name: '3F Silent Ecology & Cinema Archive',
                noiseDba: 27,
                occupiedSeats: 16,
                totalSeats: 68,
                powerOutletsPct: 96,
                ambientType: 'silent-vault',
                features: ['Sound-Insulated Carrels', 'Wetland Park Views', 'Task Lamps'],
              },
            ],
          },
          {
            id: 'ucl-aquatics-vista',
            name: 'Parklands Ecological Observatory',
            shortCode: 'PEO',
            category: 'Sensor & Climate Dome',
            archetype: 'geodesic-dome',
            facadeStyle: 'modern-curtain-glass',
            position: [6, 0, -16],
            dimensions: [13, 12, 13],
            open24Hours: false,
            hoursLabel: '07:00 – 23:00 · Living Lab Pavilion',
            accentColor: '#34d399',
            description:
              'Biophilic glass-and-timber pavilion nestled in the Queen Elizabeth Olympic Park river meadows for quiet reading and urban biodiversity telemetry.',
            audioLandmarkFreq: 329.63,
            floors: [
              {
                floorNumber: 1,
                name: '1F Riparian Meadow Reading Lounge',
                noiseDba: 29,
                occupiedSeats: 18,
                totalSeats: 56,
                powerOutletsPct: 90,
                ambientType: 'breeze-atrium',
                features: ['Botanical Air Filtration', 'Acoustic Timber Ribs', 'Daylight Loungers'],
              },
            ],
          },
        ],
        pathways: [
          {
            id: 'ucle-p1',
            fromBuildingId: 'ucl-marshgate',
            toBuildingId: 'ucl-pool-street',
            points: [
              [-14, 0, -10],
              [0, 0, -1],
              [16, 0, 8],
            ],
            flowIntensity: 0.9,
          },
          {
            id: 'ucle-p2',
            fromBuildingId: 'ucl-marshgate',
            toBuildingId: 'ucl-aquatics-vista',
            points: [
              [-14, 0, -10],
              [-4, 0, -13],
              [6, 0, -16],
            ],
            flowIntensity: 0.8,
          },
          {
            id: 'ucle-p3',
            fromBuildingId: 'ucl-aquatics-vista',
            toBuildingId: 'ucl-pool-street',
            points: [
              [6, 0, -16],
              [11, 0, -4],
              [16, 0, 8],
            ],
            flowIntensity: 0.75,
          },
        ],
      },
    ],
  },
  {
    id: 'kcl-london',
    name: 'King’s College London (KCL)',
    shortName: 'King’s (KCL)',
    region: 'Strand Riverfront, Waterloo & London Bridge',
    bestMapFormatNote:
      'Segmented 2D architectural zoning PDFs with KCL building codes (KBG, STR, BH, MAU)',
    campuses: [
      {
        id: 'kcl-strand',
        name: 'Strand Campus (Central / Riverfront)',
        shortName: 'Strand Riverfront',
        locationLabel: 'The Strand, Aldwych & Victoria Embankment, London WC2R',
        terrainPreset: 'coastal-bluff',
        baseAslMeters: 18,
        topographySummary:
          'Pedestrianised Strand-Aldwych limestone terrace stepping down to Victoria Embankment and the River Thames.',
        architecturalSignature:
          'Gothic Revival Maughan Library, classical Somerset House / King’s Building river facade, and monumental Portland stone Bush House.',
        waterLevelY: -0.2,
        foliageHue: 0.33,
        mapLinks: [
          {
            label: 'KCL Strand Campus Map (Direct PDF)',
            url: 'https://www.kcl.ac.uk/assets/pdf24/strand-campus-map-2025.pdf',
            mapType: 'Direct PDF Download',
            isDirectPdf: true,
          },
          {
            label: 'Alamy KCL Strand Architecture Photos',
            url: 'https://www.alamy.com/stock-photo/kings-college-london-strand.html',
            mapType: 'Elevation Photo Reference',
          },
        ],
        roads: [
          {
            id: 'strand-aldwych',
            name: 'The Strand & Pedestrianised Aldwych Plaza',
            width: 6.0,
            isPedestrianised: true,
            points: [
              [-95, 0, -5],
              [0, 0, -5],
              [95, 0, -5],
            ],
          },
          {
            id: 'victoria-embankment',
            name: 'Victoria Embankment (A3211 Thames Boulevard)',
            width: 6.2,
            points: [
              [-95, 0, 12],
              [0, 0, 12],
              [95, 0, 12],
            ],
          },
          {
            id: 'chancery-lane',
            name: 'Chancery Lane / Surrey Street',
            width: 5.0,
            points: [
              [-28, 0, -95],
              [-28, 0, 12],
            ],
          },
          {
            id: 'kingsway-approach',
            name: 'Kingsway Boulevard',
            width: 5.8,
            points: [
              [28, 0, -95],
              [28, 0, 12],
            ],
          },
        ],
        buildings: [
          {
            id: 'kcl-maughan-lib',
            name: 'The Maughan Library (24/7 Flagship)',
            shortCode: 'MAU',
            category: 'Neo-Gothic Research Library',
            archetype: 'gothic-library',
            facadeStyle: 'red-brick-terracotta',
            position: [-16, 0, -16],
            dimensions: [17, 16, 14],
            open24Hours: true,
            hoursLabel: 'Open 24/7 · Historic Dodecagonal Round Reading Room',
            accentColor: '#ef4444',
            description:
              '19th-century Gothic Revival masterpiece designed by Sir James Pennethorne on Chancery Lane, home to the iconic Dodecagonal Round Reading Room and whisper-quiet vaults.',
            audioLandmarkFreq: 220.0,
            floors: [
              {
                floorNumber: 1,
                name: '1F Pennethorne Gallery & Legal Stacks',
                noiseDba: 36,
                occupiedSeats: 48,
                totalSeats: 95,
                powerOutletsPct: 88,
                ambientType: 'whisper-reading',
                features: ['Vaulted Stone Bays', 'Self-Issue Kiosks', '24/7 Security'],
              },
              {
                floorNumber: 2,
                name: '2F Dodecagonal Round Reading Room',
                noiseDba: 25,
                occupiedSeats: 34,
                totalSeats: 110,
                powerOutletsPct: 94,
                ambientType: 'silent-vault',
                features: ['Cast-Iron Rotunda Dome', 'Individual Reading Desks', 'Strict Silence'],
              },
              {
                floorNumber: 3,
                name: '3F Rolls Chapel Silent Sanctuary',
                noiseDba: 24,
                occupiedSeats: 18,
                totalSeats: 72,
                powerOutletsPct: 90,
                ambientType: 'silent-vault',
                features: ['Stained Glass Light', 'Medieval Mosaic Floor', 'Thesis Carrels'],
              },
            ],
          },
          {
            id: 'kcl-kings-bldg',
            name: 'King’s Building & Somerset House East Wing',
            shortCode: 'KBG',
            category: 'Historic Thames-Side Quad',
            archetype: 'classical-cloister',
            facadeStyle: 'portland-stone',
            position: [-2, 0, 3],
            dimensions: [18, 14, 12],
            open24Hours: false,
            hoursLabel: '07:30 – 23:00 · River Thames Embankment Terrace',
            accentColor: '#38bdf8',
            description:
              'Grade I listed classical Portland stone edifice designed by Sir Robert Smirke extending from the Strand to the River Thames embankment terrace.',
            audioLandmarkFreq: 261.63,
            floors: [
              {
                floorNumber: 1,
                name: 'Ground Riverfront Arcade & Great Hall',
                noiseDba: 44,
                occupiedSeats: 56,
                totalSeats: 90,
                powerOutletsPct: 85,
                ambientType: 'collaborative-hum',
                features: ['Thames Embankment Terrace', 'Study Tables', 'Café Access'],
              },
              {
                floorNumber: 2,
                name: '2F–3F Classical Reading Galleries',
                noiseDba: 31,
                occupiedSeats: 28,
                totalSeats: 80,
                powerOutletsPct: 90,
                ambientType: 'whisper-reading',
                features: ['River Thames Views', 'Quiet Study Alcoves', 'Eduroam Wi-Fi'],
              },
            ],
          },
          {
            id: 'kcl-bush-house',
            name: 'Bush House (Strand-Aldwych Quarter)',
            shortCode: 'BH',
            category: 'Global Affairs & Tech Hub',
            archetype: 'cantilever-tech',
            facadeStyle: 'portland-stone',
            position: [15, 0, -15],
            dimensions: [18, 16, 13],
            open24Hours: true,
            hoursLabel: 'Open 24/7 · Former BBC World Service HQ',
            accentColor: '#f59e0b',
            description:
              'Monumental Portland stone and glass complex on the pedestrianised Strand-Aldwych crescent offering 24/7 student lounges and rooftop terraces.',
            audioLandmarkFreq: 311.13,
            floors: [
              {
                floorNumber: 1,
                name: '1F Arcade & Student Union Hub',
                noiseDba: 49,
                occupiedSeats: 72,
                totalSeats: 105,
                powerOutletsPct: 95,
                ambientType: 'collaborative-hum',
                features: ['Arcade Coffee Bar', 'Group Pods', 'Presentation Screens'],
              },
              {
                floorNumber: 2,
                name: '5F Silent Social Science Commons',
                noiseDba: 29,
                occupiedSeats: 31,
                totalSeats: 88,
                powerOutletsPct: 98,
                ambientType: 'silent-vault',
                features: ['Bloomberg Terminals', 'Acoustic Booths', 'USB-C Desks'],
              },
              {
                floorNumber: 3,
                name: '8F Bush House Rooftop Study Pavilion',
                noiseDba: 32,
                occupiedSeats: 24,
                totalSeats: 70,
                powerOutletsPct: 92,
                ambientType: 'breeze-atrium',
                features: ['Panoramic Thames Vista', 'Glass Terrace', 'Quiet Study Tables'],
              },
            ],
          },
          {
            id: 'kcl-strand-bldg',
            name: 'Strand Building (Physics & Engineering)',
            shortCode: 'STR',
            category: 'STEM & Informatics Tower',
            archetype: 'observatory-tower',
            facadeStyle: 'modern-curtain-glass',
            position: [17, 0, 3],
            dimensions: [14, 17, 12],
            open24Hours: true,
            hoursLabel: 'Open 24/7 · Rooftop Telescope & STEM Decks',
            accentColor: '#60a5fa',
            description:
              'Multi-story STEM research building overlooking St Mary le Strand and Temple Station with 24-hour physics and computer science study decks.',
            audioLandmarkFreq: 349.23,
            floors: [
              {
                floorNumber: 1,
                name: '3F Informatics & Robotics Commons',
                noiseDba: 37,
                occupiedSeats: 38,
                totalSeats: 76,
                powerOutletsPct: 100,
                ambientType: 'whisper-reading',
                features: ['Dual-Monitor Linux Stations', 'Whiteboard Walls', 'High-Speed Fiber'],
              },
              {
                floorNumber: 2,
                name: '7F Silent Theoretical Physics Loft',
                noiseDba: 26,
                occupiedSeats: 16,
                totalSeats: 60,
                powerOutletsPct: 96,
                ambientType: 'silent-vault',
                features: ['Zero-Noise Sanctuary', 'Thames Bend View', 'Individual Carrels'],
              },
            ],
          },
        ],
        pathways: [
          {
            id: 'kcl-s-1',
            fromBuildingId: 'kcl-maughan-lib',
            toBuildingId: 'kcl-bush-house',
            points: [
              [-16, 0, -16],
              [0, 0, -15],
              [15, 0, -15],
            ],
            flowIntensity: 0.9,
          },
          {
            id: 'kcl-s-2',
            fromBuildingId: 'kcl-bush-house',
            toBuildingId: 'kcl-kings-bldg',
            points: [
              [15, 0, -15],
              [6, 0, -5],
              [-2, 0, 3],
            ],
            flowIntensity: 0.95,
          },
          {
            id: 'kcl-s-3',
            fromBuildingId: 'kcl-kings-bldg',
            toBuildingId: 'kcl-strand-bldg',
            points: [
              [-2, 0, 3],
              [8, 0, 3],
              [17, 0, 3],
            ],
            flowIntensity: 0.85,
          },
          {
            id: 'kcl-s-4',
            fromBuildingId: 'kcl-maughan-lib',
            toBuildingId: 'kcl-kings-bldg',
            points: [
              [-16, 0, -16],
              [-9, 0, -6],
              [-2, 0, 3],
            ],
            flowIntensity: 0.8,
          },
        ],
      },
      {
        id: 'kcl-waterloo-guys',
        name: 'Waterloo & Guy’s Campus (South Bank Corridor)',
        shortName: 'Waterloo & Guy’s',
        locationLabel: 'Stamford St (Waterloo SE1) & Great Maze Pond (London Bridge SE1)',
        terrainPreset: 'river-valley',
        baseAslMeters: 12,
        topographySummary:
          'South Bank Thames alluvial terrace connecting Waterloo Bridge reach to London Bridge historic colonnades.',
        architecturalSignature:
          'Expansive Stamford Street bioscience block (FWB) paired with Guy’s historic hospital colonnades and 34-story tower.',
        waterLevelY: -0.65,
        foliageHue: 0.35,
        mapLinks: [
          {
            label: 'KCL Waterloo Detail Map (Direct PDF)',
            url: 'https://www.kcl.ac.uk/assets/pdf24/waterloo-detail-map.pdf',
            mapType: 'Direct PDF Download',
            isDirectPdf: true,
          },
          {
            label: 'KCL Campus Locations & Visitor Portal',
            url: 'https://www.kcl.ac.uk/visit',
            mapType: 'Spatial Visitor Portal',
          },
        ],
        roads: [
          {
            id: 'stamford-st',
            name: 'Stamford Street (A3200)',
            width: 5.8,
            points: [
              [-95, 0, -22],
              [0, 0, -22],
              [95, 0, -22],
            ],
          },
          {
            id: 'waterloo-rd',
            name: 'Waterloo Road / Great Maze Pond',
            width: 5.8,
            points: [
              [-28, 0, -95],
              [-28, 0, 95],
            ],
          },
        ],
        buildings: [
          {
            id: 'kcl-fwb-lib',
            name: 'Franklin-Wilkins Building & Library (24/7)',
            shortCode: 'FWB',
            category: 'Health & Life Sciences Library',
            archetype: 'cantilever-tech',
            facadeStyle: 'portland-stone',
            position: [-14, 0, -10],
            dimensions: [18, 15, 13],
            open24Hours: true,
            hoursLabel: 'Open 24/7 · Waterloo Stamford Street Hub',
            accentColor: '#38bdf8',
            description:
              'Expansive Stamford Street academic block housing one of London’s largest 24/7 health, bioscience, and quiet study libraries.',
            audioLandmarkFreq: 246.94,
            floors: [
              {
                floorNumber: 1,
                name: '1F Waterloo Collaborative Commons',
                noiseDba: 43,
                occupiedSeats: 58,
                totalSeats: 100,
                powerOutletsPct: 94,
                ambientType: 'collaborative-hum',
                features: ['Group Study Pods', 'Laptop Loans', '24/7 Security'],
              },
              {
                floorNumber: 2,
                name: '3F Silent Bioscience Reading Floor',
                noiseDba: 27,
                occupiedSeats: 29,
                totalSeats: 95,
                powerOutletsPct: 98,
                ambientType: 'silent-vault',
                features: ['Acoustic Divider Desks', 'Dual Monitors', 'Strict Silence'],
              },
            ],
          },
          {
            id: 'kcl-nhh-lib',
            name: 'New Hunt’s House Library (Guy’s 24/7)',
            shortCode: 'NHH',
            category: 'Medical & Dental Library',
            archetype: 'gothic-library',
            facadeStyle: 'modern-curtain-glass',
            position: [15, 0, -8],
            dimensions: [16, 14, 12],
            open24Hours: true,
            hoursLabel: 'Open 24/7 · Guy’s Campus Medical Sanctuary',
            accentColor: '#10b981',
            description:
              'Dedicated medical and dental research library at Guy’s Campus adjacent to London Bridge with 24-hour silent clinical revision suites.',
            audioLandmarkFreq: 293.66,
            floors: [
              {
                floorNumber: 1,
                name: '1F Clinical Revision & Anatomy Suite',
                noiseDba: 34,
                occupiedSeats: 41,
                totalSeats: 84,
                powerOutletsPct: 96,
                ambientType: 'whisper-reading',
                features: ['3D Medical Workstations', 'Group Rooms', 'High-Speed Power'],
              },
              {
                floorNumber: 2,
                name: '2F Silent Medical Sanctuary',
                noiseDba: 25,
                occupiedSeats: 22,
                totalSeats: 78,
                powerOutletsPct: 100,
                ambientType: 'silent-vault',
                features: ['Individual Study Carrels', 'Garden Courtyard View', 'Zero Noise'],
              },
            ],
          },
          {
            id: 'kcl-guys-tower',
            name: 'Guy’s Tower & Hodgkin Building',
            shortCode: 'GWT',
            category: 'Vertical Biomedical Tower',
            archetype: 'observatory-tower',
            facadeStyle: 'diagrid-stone',
            position: [4, 0, 16],
            dimensions: [14, 21, 14],
            open24Hours: false,
            hoursLabel: '07:00 – 23:00 · 34-Story Biomedical Landmark',
            accentColor: '#a855f7',
            description:
              'Iconic tall brutalist-modern biomedical tower beside London Bridge with high-altitude seminar and silent research floors.',
            audioLandmarkFreq: 392.0,
            floors: [
              {
                floorNumber: 1,
                name: '2F Hodgkin Historic Museum & Study Hall',
                noiseDba: 31,
                occupiedSeats: 28,
                totalSeats: 70,
                powerOutletsPct: 88,
                ambientType: 'whisper-reading',
                features: ['Historic Gordon Museum', 'Reading Tables', 'Quiet Alcoves'],
              },
              {
                floorNumber: 2,
                name: '18F Sky Clinical Research Deck',
                noiseDba: 24,
                occupiedSeats: 14,
                totalSeats: 56,
                powerOutletsPct: 96,
                ambientType: 'silent-vault',
                features: ['Thames & City Skyline View', 'Silent Research Bays', 'USB-C 100W'],
              },
            ],
          },
        ],
        pathways: [
          {
            id: 'kcl-wg-1',
            fromBuildingId: 'kcl-fwb-lib',
            toBuildingId: 'kcl-nhh-lib',
            points: [
              [-14, 0, -10],
              [0, 0, -9],
              [15, 0, -8],
            ],
            flowIntensity: 0.85,
          },
          {
            id: 'kcl-wg-2',
            fromBuildingId: 'kcl-nhh-lib',
            toBuildingId: 'kcl-guys-tower',
            points: [
              [15, 0, -8],
              [9, 0, 4],
              [4, 0, 16],
            ],
            flowIntensity: 0.8,
          },
          {
            id: 'kcl-wg-3',
            fromBuildingId: 'kcl-fwb-lib',
            toBuildingId: 'kcl-guys-tower',
            points: [
              [-14, 0, -10],
              [-5, 0, 3],
              [4, 0, 16],
            ],
            flowIntensity: 0.75,
          },
        ],
      },
    ],
  },
  {
    id: 'imperial-london',
    name: 'Imperial College London',
    shortName: 'Imperial',
    region: 'South Kensington (Exhibition Road) & White City',
    bestMapFormatNote:
      'Geometric block-grid layouts & open-day blueprints ideal for 3D box extrusions',
    campuses: [
      {
        id: 'imperial-south-ken',
        name: 'South Kensington Campus (Unified Quad Layout)',
        shortName: 'South Kensington',
        locationLabel: 'Exhibition Road & Queen’s Lawn, London SW7 2AZ',
        terrainPreset: 'river-valley',
        baseAslMeters: 24,
        topographySummary:
          'Unified Albertopolis museum-and-science quad centered on Queen’s Lawn, framed by Exhibition Road and Queen’s Gate.',
        architecturalSignature:
          'Towering Victorian brick-and-stone Queen’s Tower surrounded by functional research blocks and modern glass facades.',
        waterLevelY: -0.75,
        foliageHue: 0.35,
        mapLinks: [
          {
            label: 'Imperial South Kensington Map (Direct PDF)',
            url: 'https://www.imperial.ac.uk/media/imperial-college/visit/public/SouthKensingtonCampus.pdf',
            mapType: 'Direct PDF Download',
            isDirectPdf: true,
          },
          {
            label: 'Alamy Imperial South Kensington Photos',
            url: 'https://www.alamy.com/stock-photo/imperial-college-london-south-kensington-campus.html',
            mapType: 'Elevation Photo Archive',
          },
        ],
        roads: [
          {
            id: 'exhibition-rd',
            name: 'Exhibition Road (Cultural & Museum Boulevard)',
            width: 6.4,
            isPedestrianised: true,
            points: [
              [30, 0, -95],
              [30, 0, 0],
              [30, 0, 95],
            ],
          },
          {
            id: 'queens-gate',
            name: 'Queen’s Gate Boulevard',
            width: 5.8,
            points: [
              [-30, 0, -95],
              [-30, 0, 0],
              [-30, 0, 95],
            ],
          },
          {
            id: 'imperial-college-rd',
            name: 'Imperial College Road',
            width: 5.2,
            points: [
              [-95, 0, 26],
              [0, 0, 26],
              [95, 0, 26],
            ],
          },
          {
            id: 'prince-consort-rd',
            name: 'Prince Consort Road',
            width: 5.4,
            points: [
              [-95, 0, -25],
              [0, 0, -25],
              [95, 0, -25],
            ],
          },
        ],
        buildings: [
          {
            id: 'imp-abdus-salam-lib',
            name: 'Abdus Salam Central Library (24/7)',
            shortCode: 'ASL',
            category: 'Flagship 24/7 STEM Library',
            archetype: 'cantilever-tech',
            facadeStyle: 'portland-stone',
            position: [-14, 0, -10],
            dimensions: [17, 15, 14],
            open24Hours: true,
            hoursLabel: 'Open 24/7 · Five-Level Queen’s Lawn Sanctuary',
            accentColor: '#38bdf8',
            description:
              'Imperial’s five-story central library overlooking Queen’s Lawn, offering silent upper reading levels, group tech booths, and 24-hour study access.',
            audioLandmarkFreq: 220.0,
            floors: [
              {
                floorNumber: 1,
                name: '1F Library Café & Group Study Lounge',
                noiseDba: 46,
                occupiedSeats: 78,
                totalSeats: 115,
                powerOutletsPct: 95,
                ambientType: 'collaborative-hum',
                features: ['Interactive Touchscreens', '24/7 Vending', 'Laptop Lockers'],
              },
              {
                floorNumber: 2,
                name: '3F Quiet STEM Study Deck',
                noiseDba: 32,
                occupiedSeats: 44,
                totalSeats: 110,
                powerOutletsPct: 98,
                ambientType: 'whisper-reading',
                features: ['Queen’s Lawn Views', 'Dual-Monitor Bays', 'USB-C Power'],
              },
              {
                floorNumber: 3,
                name: '5F Silent Research Sanctuary',
                noiseDba: 25,
                occupiedSeats: 26,
                totalSeats: 105,
                powerOutletsPct: 100,
                ambientType: 'silent-vault',
                features: ['Zero-Conversation Rule', 'Acoustic Carrels', 'Task Lighting'],
              },
            ],
          },
          {
            id: 'imp-queens-tower',
            name: 'The Queen’s Tower & Sherfield Concourse',
            shortCode: 'QTW',
            category: 'Victorian Landmark Tower',
            archetype: 'observatory-tower',
            facadeStyle: 'red-brick-terracotta',
            position: [0, 0, -4],
            dimensions: [10, 24, 10],
            open24Hours: false,
            hoursLabel: '08:00 – 22:00 · 87m Victorian Imperial Institute Tower',
            accentColor: '#f59e0b',
            description:
              'Iconic 287-foot Victorian red-brick and Portland stone tower crowned with a copper dome standing at the heart of Queen’s Lawn.',
            audioLandmarkFreq: 293.66,
            floors: [
              {
                floorNumber: 1,
                name: '1F Sherfield Quiet Reading Concourse',
                noiseDba: 37,
                occupiedSeats: 39,
                totalSeats: 75,
                powerOutletsPct: 90,
                ambientType: 'whisper-reading',
                features: ['Queen’s Lawn Terrace', 'Study Benches', 'High-Speed Wi-Fi'],
              },
              {
                floorNumber: 2,
                name: 'Belfry & Horizon Telemetry Gallery',
                noiseDba: 26,
                occupiedSeats: 12,
                totalSeats: 42,
                powerOutletsPct: 88,
                ambientType: 'silent-vault',
                features: ['Kensington Skyline Vista', 'Heritage Archive', 'Silent Alcoves'],
              },
            ],
          },
          {
            id: 'imp-huxley-computing',
            name: 'Huxley Building (Computing & Maths 24/7)',
            shortCode: 'HUX',
            category: 'Computing & AI Labs',
            archetype: 'cantilever-tech',
            facadeStyle: 'diagrid-stone',
            position: [-16, 0, 13],
            dimensions: [16, 15, 12],
            open24Hours: true,
            hoursLabel: 'Open 24/7 · Department of Computing GPU Clusters',
            accentColor: '#10b981',
            description:
              'Home to Imperial’s Department of Computing and Mathematics on Queen’s Gate, featuring 24/7 Linux GPU labs and quiet theorem lounges.',
            audioLandmarkFreq: 329.63,
            floors: [
              {
                floorNumber: 1,
                name: '2F 24/7 Department of Computing Labs',
                noiseDba: 38,
                occupiedSeats: 52,
                totalSeats: 96,
                powerOutletsPct: 100,
                ambientType: 'whisper-reading',
                features: ['RTX Workstation Nodes', 'Mechanical Keyboards', 'Dual 4K Displays'],
              },
              {
                floorNumber: 2,
                name: '5F Pure Mathematics Silent Library',
                noiseDba: 26,
                occupiedSeats: 18,
                totalSeats: 64,
                powerOutletsPct: 95,
                ambientType: 'silent-vault',
                features: ['Chalkboard Alcoves', 'Silent Proof Desks', 'Queen’s Gate View'],
              },
            ],
          },
          {
            id: 'imp-city-guilds',
            name: 'City & Guilds Building & Business School',
            shortCode: 'CAG',
            category: 'Engineering & Glass Atrium',
            archetype: 'classical-cloister',
            facadeStyle: 'modern-curtain-glass',
            position: [17, 0, 8],
            dimensions: [17, 15, 13],
            open24Hours: true,
            hoursLabel: 'Open 24/7 · Exhibition Road Glass & Engineering Wing',
            accentColor: '#60a5fa',
            description:
              'Flagship engineering and modern glass complex along Exhibition Road housing wind-tunnel telemetry, CAD design studios, and 24-hour study suites.',
            audioLandmarkFreq: 392.0,
            floors: [
              {
                floorNumber: 1,
                name: '1F Exhibition Road Glass Atrium',
                noiseDba: 44,
                occupiedSeats: 54,
                totalSeats: 92,
                powerOutletsPct: 96,
                ambientType: 'collaborative-hum',
                features: ['CAD Design Clusters', 'Flight Sim Telemetry', 'Group Tables'],
              },
              {
                floorNumber: 2,
                name: '4F Silent Aeronautics Reading Deck',
                noiseDba: 27,
                occupiedSeats: 21,
                totalSeats: 74,
                powerOutletsPct: 98,
                ambientType: 'silent-vault',
                features: ['Soundproof Study Bays', '100W Laptop Docks', 'Museum Quarter View'],
              },
            ],
          },
        ],
        pathways: [
          {
            id: 'imp-sk-1',
            fromBuildingId: 'imp-abdus-salam-lib',
            toBuildingId: 'imp-queens-tower',
            points: [
              [-14, 0, -10],
              [-7, 0, -7],
              [0, 0, -4],
            ],
            flowIntensity: 0.95,
          },
          {
            id: 'imp-sk-2',
            fromBuildingId: 'imp-queens-tower',
            toBuildingId: 'imp-city-guilds',
            points: [
              [0, 0, -4],
              [9, 0, 2],
              [17, 0, 8],
            ],
            flowIntensity: 0.85,
          },
          {
            id: 'imp-sk-3',
            fromBuildingId: 'imp-abdus-salam-lib',
            toBuildingId: 'imp-huxley-computing',
            points: [
              [-14, 0, -10],
              [-15, 0, 2],
              [-16, 0, 13],
            ],
            flowIntensity: 0.85,
          },
          {
            id: 'imp-sk-4',
            fromBuildingId: 'imp-huxley-computing',
            toBuildingId: 'imp-city-guilds',
            points: [
              [-16, 0, 13],
              [0, 0, 11],
              [17, 0, 8],
            ],
            flowIntensity: 0.8,
          },
        ],
      },
      {
        id: 'imperial-white-city',
        name: 'White City Campus (Modern Deep-Tech Hub)',
        shortName: 'White City Tech',
        locationLabel: 'Wood Lane, White City, London W12 0BZ',
        terrainPreset: 'alpine-ridge',
        baseAslMeters: 32,
        topographySummary:
          'Modern West London innovation plateau with landscaped podium gardens and sculpted acoustic earth berms.',
        architecturalSignature:
          'Sleek anodized-aluminum and glass translational research towers (MSRH & Sir Michael Uren Hub).',
        waterLevelY: -0.6,
        foliageHue: 0.36,
        mapLinks: [
          {
            label: 'Imperial White City Map (Direct PDF)',
            url: 'https://www.imperial.ac.uk/media/imperial-college/visit/public/WhiteCityCampus.pdf',
            mapType: 'Direct PDF Download',
            isDirectPdf: true,
          },
        ],
        roads: [
          {
            id: 'wood-lane',
            name: 'Wood Lane (A219)',
            width: 5.8,
            points: [
              [-28, 0, -90],
              [-28, 0, 90],
            ],
          },
          {
            id: 'westway-ave',
            name: 'White City Innovation Boulevard',
            width: 5.5,
            points: [
              [-90, 0, 22],
              [90, 0, 22],
            ],
          },
        ],
        buildings: [
          {
            id: 'imp-msrh',
            name: 'Molecular Sciences Research Hub (MSRH)',
            shortCode: 'MSR',
            category: 'Chemical & Quantum Research',
            archetype: 'cantilever-tech',
            facadeStyle: 'modern-curtain-glass',
            position: [-12, 0, -12],
            dimensions: [17, 16, 13],
            open24Hours: true,
            hoursLabel: 'Open 24/7 · £170m Molecular & Quantum Hub',
            accentColor: '#38bdf8',
            description:
              'State-of-the-art molecular sciences headquarters with ultra-low-vibration laboratories and 24-hour computational study decks.',
            audioLandmarkFreq: 246.94,
            floors: [
              {
                floorNumber: 1,
                name: '1F Molecular Atrium & Ideas Café',
                noiseDba: 42,
                occupiedSeats: 48,
                totalSeats: 90,
                powerOutletsPct: 98,
                ambientType: 'collaborative-hum',
                features: ['Glass Lab Vistas', 'Collaborative Pods', '24/7 Coffee'],
              },
              {
                floorNumber: 2,
                name: '5F Silent Computational Chemistry Deck',
                noiseDba: 25,
                occupiedSeats: 19,
                totalSeats: 76,
                powerOutletsPct: 100,
                ambientType: 'silent-vault',
                features: ['Vibration-Isolated Floor', 'Dual 4K Monitors', 'Zero Noise'],
              },
            ],
          },
          {
            id: 'imp-uren-hub',
            name: 'Sir Michael Uren Hub (Biomedical Engineering)',
            shortCode: 'URH',
            category: 'MedTech & Bioengineering Tower',
            archetype: 'observatory-tower',
            facadeStyle: 'modern-curtain-glass',
            position: [14, 0, -6],
            dimensions: [15, 19, 13],
            open24Hours: true,
            hoursLabel: 'Open 24/7 · 13-Story MedTech Innovation Tower',
            accentColor: '#34d399',
            description:
              'Thirteen-story translational med-tech tower bringing engineers and clinicians together with sky-high silent reading terraces.',
            audioLandmarkFreq: 311.13,
            floors: [
              {
                floorNumber: 1,
                name: '3F Bioengineering Design Commons',
                noiseDba: 35,
                occupiedSeats: 32,
                totalSeats: 78,
                powerOutletsPct: 96,
                ambientType: 'whisper-reading',
                features: ['Medical Imaging Nodes', 'Quiet Booths', 'High-Speed Fiber'],
              },
              {
                floorNumber: 2,
                name: '11F White City Panorama Silent Loft',
                noiseDba: 24,
                occupiedSeats: 14,
                totalSeats: 62,
                powerOutletsPct: 100,
                ambientType: 'silent-vault',
                features: ['West London Skyline Vista', 'Silent Carrels', '100W USB-C'],
              },
            ],
          },
        ],
        pathways: [
          {
            id: 'imp-wc-1',
            fromBuildingId: 'imp-msrh',
            toBuildingId: 'imp-uren-hub',
            points: [
              [-12, 0, -12],
              [1, 0, -9],
              [14, 0, -6],
            ],
            flowIntensity: 0.85,
          },
        ],
      },
    ],
  },
  {
    id: 'lse-london',
    name: 'London School of Economics (LSE)',
    shortName: 'LSE',
    region: 'Aldwych, Holborn & Lincoln’s Inn Fields',
    bestMapFormatNote:
      'Isometric building guides & compact urban tower codes (SAW, MAR, CBG, OLD, LRB)',
    campuses: [
      {
        id: 'lse-aldwych-holborn',
        name: 'Aldwych / Holborn Compact Urban Campus',
        shortName: 'Aldwych / Holborn',
        locationLabel: 'Houghton St, Portugal St & Lincoln’s Inn Fields, London WC2A',
        terrainPreset: 'river-valley',
        baseAslMeters: 22,
        topographySummary:
          'Tightly packed pedestrianised legal-district alleyways (Houghton St, Portugal St) opening onto Lincoln’s Inn Fields parkland.',
        architecturalSignature:
          'Edwardian red-brick Old Building (OLD), beehive brick Saw Swee Hock (SAW), and diagrid concrete-and-glass Marshall Building (MAR).',
        waterLevelY: -0.75,
        foliageHue: 0.34,
        mapLinks: [
          {
            label: 'LSE Official Campus Map (Direct PDF)',
            url: 'https://www.lse.ac.uk/lse-information/assets/documents/21-0099-Campus-Map-update-241121-V6.pdf',
            mapType: 'Direct PDF Download',
            isDirectPdf: true,
          },
          {
            label: 'Alamy LSE Old Building & Street Archive',
            url: 'https://www.alamy.com/stock-photo/lse-old-building.html',
            mapType: 'Street-Level Photo Archive',
          },
        ],
        roads: [
          {
            id: 'kingsway-lse',
            name: 'Kingsway Boulevard (A4200)',
            width: 6.2,
            points: [
              [-30, 0, -95],
              [-30, 0, 95],
            ],
          },
          {
            id: 'houghton-st',
            name: 'Houghton Street & Clare Market (Pedestrianised)',
            width: 4.4,
            isPedestrianised: true,
            points: [
              [-8, 0, -35],
              [-8, 0, 35],
            ],
          },
          {
            id: 'portugal-st',
            name: 'Portugal Street (Pedestrianised Academic Lane)',
            width: 4.5,
            isPedestrianised: true,
            points: [
              [-30, 0, -22],
              [35, 0, -22],
            ],
          },
          {
            id: 'lincolns-inn-perimeter',
            name: 'Lincoln’s Inn Fields South Perimeter',
            width: 5.2,
            points: [
              [28, 0, -95],
              [28, 0, 95],
            ],
          },
        ],
        buildings: [
          {
            id: 'lse-lrb-library',
            name: 'Lionel Robbins Building — LSE Library (24/7)',
            shortCode: 'LRB',
            category: 'Social Science Research Library',
            archetype: 'geodesic-dome',
            facadeStyle: 'portland-stone',
            position: [-3, 0, -14],
            dimensions: [17, 16, 15],
            open24Hours: true,
            hoursLabel: 'Open 24/7 · Iconic Foster + Partners Helical Ramp',
            accentColor: '#ef4444',
            description:
              'The British Library of Political and Economic Science (BLPES) on Portugal Street, centered around a sunlit glass dome and white helical ramp with 2,000+ study seats.',
            audioLandmarkFreq: 220.0,
            floors: [
              {
                floorNumber: 1,
                name: 'LG & 1F Helical Atrium & Group Zones',
                noiseDba: 43,
                occupiedSeats: 84,
                totalSeats: 130,
                powerOutletsPct: 96,
                ambientType: 'collaborative-hum',
                features: ['Foster Helical Ramp', '24/7 Security Entry', 'Group Study Rooms'],
              },
              {
                floorNumber: 2,
                name: '2F–3F Whisper Social Science Galleries',
                noiseDba: 31,
                occupiedSeats: 56,
                totalSeats: 120,
                powerOutletsPct: 98,
                ambientType: 'whisper-reading',
                features: ['Dual-Monitor PCs', 'Individual Desks', 'Fast USB-C Power'],
              },
              {
                floorNumber: 3,
                name: '4F Dome Silent Research Sanctuary',
                noiseDba: 25,
                occupiedSeats: 32,
                totalSeats: 110,
                powerOutletsPct: 100,
                ambientType: 'silent-vault',
                features: ['Skylight Rotunda', 'Zero-Noise Carrels', 'Postgraduate Vault'],
              },
            ],
          },
          {
            id: 'lse-cbg-centre',
            name: 'Centre Building (CBG)',
            shortCode: 'CBG',
            category: 'BREEAM Outstanding Vertical Hub',
            archetype: 'cantilever-tech',
            facadeStyle: 'modern-curtain-glass',
            position: [-15, 0, 4],
            dimensions: [16, 17, 13],
            open24Hours: false,
            hoursLabel: '07:00 – 23:00 · LSE Square & 13-Story Study Stair',
            accentColor: '#38bdf8',
            description:
              'Rogers Stirk Harbour + Partners 13-story steel-and-glass flagship overlooking LSE Square, featuring terraced student study stairs and panoramic rooftop study decks.',
            audioLandmarkFreq: 261.63,
            floors: [
              {
                floorNumber: 1,
                name: '1F–2F The Commons & Collaboration Stair',
                noiseDba: 45,
                occupiedSeats: 62,
                totalSeats: 95,
                powerOutletsPct: 95,
                ambientType: 'collaborative-hum',
                features: ['LSE Square Views', 'Timber Bleacher Desks', 'Group Screens'],
              },
              {
                floorNumber: 2,
                name: '6F Quiet Quantitative & Econ Commons',
                noiseDba: 30,
                occupiedSeats: 28,
                totalSeats: 78,
                powerOutletsPct: 100,
                ambientType: 'whisper-reading',
                features: ['Acoustic Study Booths', 'Dual Monitors', 'Balcony Access'],
              },
              {
                floorNumber: 3,
                name: '12F CBG Sky Terrace Reading Room',
                noiseDba: 26,
                occupiedSeats: 18,
                totalSeats: 64,
                powerOutletsPct: 98,
                ambientType: 'silent-vault',
                features: ['Westminster & City Skyline', 'Silent Study Desks', 'Roof Garden'],
              },
            ],
          },
          {
            id: 'lse-mar-marshall',
            name: 'The Marshall Building (MAR)',
            shortCode: 'MAR',
            category: 'Diagrid Concrete & Glass Megastructure',
            archetype: 'timber-pavilion',
            facadeStyle: 'diagrid-stone',
            position: [16, 0, -4],
            dimensions: [17, 17, 14],
            open24Hours: false,
            hoursLabel: '07:30 – 23:00 · 44 Lincoln’s Inn Fields (Grafton Architects)',
            accentColor: '#f59e0b',
            description:
              'Sculptural tree-branch concrete-and-stone landmark by Grafton Architects facing Lincoln’s Inn Fields, with rotated upper floors and tranquil parkland study halls.',
            audioLandmarkFreq: 311.13,
            floors: [
              {
                floorNumber: 1,
                name: '1F Great Vaulted Tree-Column Concourse',
                noiseDba: 42,
                occupiedSeats: 54,
                totalSeats: 90,
                powerOutletsPct: 94,
                ambientType: 'breeze-atrium',
                features: ['Sculpted Tree Columns', 'Lincoln’s Inn Fields View', 'Café Terrace'],
              },
              {
                floorNumber: 2,
                name: '4F–5F Finance & Accounting Silent Decks',
                noiseDba: 27,
                occupiedSeats: 24,
                totalSeats: 82,
                powerOutletsPct: 100,
                ambientType: 'silent-vault',
                features: ['Parkland Canopy Vistas', 'Silent Study Carrels', 'Garden Terrace'],
              },
            ],
          },
          {
            id: 'lse-saw-student',
            name: 'Saw Swee Hock Student Centre (SAW)',
            shortCode: 'SAW',
            category: 'Porous Beehive Red-Brick Tower',
            archetype: 'gothic-library',
            facadeStyle: 'beehive-red-brick',
            position: [-18, 0, -14],
            dimensions: [13, 15, 11],
            open24Hours: false,
            hoursLabel: '08:00 – 23:00 · O’Donnell + Tuomey RIBA Award Landmark',
            accentColor: '#f43f5e',
            description:
              'Faceted beehive-like openwork red-brick tower on Sheffield Street housing quiet contemplation suites, media studios, and sunlit upper study lounges.',
            audioLandmarkFreq: 349.23,
            floors: [
              {
                floorNumber: 1,
                name: '2F Student Media & Collaborative Lounge',
                noiseDba: 46,
                occupiedSeats: 38,
                totalSeats: 64,
                powerOutletsPct: 92,
                ambientType: 'collaborative-hum',
                features: ['Dappled Brick Daylight', 'Booth Seating', 'Coffee Hub'],
              },
              {
                floorNumber: 2,
                name: '6F Faith & Silent Contemplation Loft',
                noiseDba: 24,
                occupiedSeats: 11,
                totalSeats: 46,
                powerOutletsPct: 90,
                ambientType: 'silent-vault',
                features: ['Acoustic Timber Sanctuary', 'Roof Terrace', 'Zero Noise'],
              },
            ],
          },
          {
            id: 'lse-old-bldg',
            name: 'Old Building (OLD — Edwardian Houghton St)',
            shortCode: 'OLD',
            category: 'Edwardian Red-Brick Anchor',
            archetype: 'classical-cloister',
            facadeStyle: 'red-brick-terracotta',
            position: [0, 0, 15],
            dimensions: [16, 14, 12],
            open24Hours: false,
            hoursLabel: '08:00 – 22:30 · Historic Houghton Street Core',
            accentColor: '#a855f7',
            description:
              'LSE’s traditional Edwardian red-brick anchor on Houghton Street featuring the Shaw Library (6th floor) with leather armchairs and rooftop terrace views.',
            audioLandmarkFreq: 392.0,
            floors: [
              {
                floorNumber: 1,
                name: '4F Houghton Street Quiet Study Rooms',
                noiseDba: 33,
                occupiedSeats: 31,
                totalSeats: 70,
                powerOutletsPct: 88,
                ambientType: 'whisper-reading',
                features: ['Quiet Reading Tables', 'Eduroam Fiber', 'Power Strips'],
              },
              {
                floorNumber: 2,
                name: '6F The Shaw Library & Founders’ Room',
                noiseDba: 28,
                occupiedSeats: 19,
                totalSeats: 62,
                powerOutletsPct: 85,
                ambientType: 'silent-vault',
                features: ['Historic Club Armchairs', 'Roof Terrace Access', 'Tranquil Sanctuary'],
              },
            ],
          },
        ],
        pathways: [
          {
            id: 'lse-p1',
            fromBuildingId: 'lse-lrb-library',
            toBuildingId: 'lse-cbg-centre',
            points: [
              [-3, 0, -14],
              [-9, 0, -5],
              [-15, 0, 4],
            ],
            flowIntensity: 0.95,
          },
          {
            id: 'lse-p2',
            fromBuildingId: 'lse-lrb-library',
            toBuildingId: 'lse-mar-marshall',
            points: [
              [-3, 0, -14],
              [6, 0, -9],
              [16, 0, -4],
            ],
            flowIntensity: 0.9,
          },
          {
            id: 'lse-p3',
            fromBuildingId: 'lse-cbg-centre',
            toBuildingId: 'lse-old-bldg',
            points: [
              [-15, 0, 4],
              [-7, 0, 10],
              [0, 0, 15],
            ],
            flowIntensity: 0.85,
          },
          {
            id: 'lse-p4',
            fromBuildingId: 'lse-saw-student',
            toBuildingId: 'lse-lrb-library',
            points: [
              [-18, 0, -14],
              [-11, 0, -14],
              [-3, 0, -14],
            ],
            flowIntensity: 0.85,
          },
          {
            id: 'lse-p5',
            fromBuildingId: 'lse-old-bldg',
            toBuildingId: 'lse-mar-marshall',
            points: [
              [0, 0, 15],
              [8, 0, 6],
              [16, 0, -4],
            ],
            flowIntensity: 0.8,
          },
        ],
      },
    ],
  },
];

// Position every campus in UNIVERSITIES at its permanent, realistic geographic location on the 3D Map of London
const LONDON_CAMPUS_WORLD_OFFSETS: Record<string, [number, number]> = {
  'ucl-bloomsbury': [10, -48],
  'ucl-east': [98, -54],
  'lse-aldwych-holborn': [42, -6],
  'kcl-strand': [44, 24],
  'kcl-waterloo-guys': [48, 60],
  'imperial-south-ken': [-66, 34],
  'imperial-white-city': [-96, -24],
};

for (const uni of UNIVERSITIES) {
  for (const camp of uni.campuses) {
    const offset = LONDON_CAMPUS_WORLD_OFFSETS[camp.id];
    if (!offset) continue;
    const [ox, oz] = offset;
    const spreadScale = 0.56;
    const roadScale = 0.25;

    camp.buildings = camp.buildings.map((b) => ({
      ...b,
      position: [
        Number((b.position[0] * spreadScale + ox).toFixed(2)),
        b.position[1],
        Number((b.position[2] * spreadScale + oz).toFixed(2)),
      ],
      dimensions: [
        Number((b.dimensions[0] * 0.72).toFixed(2)),
        b.dimensions[1],
        Number((b.dimensions[2] * 0.72).toFixed(2)),
      ],
    }));

    camp.roads = camp.roads.map((r) => ({
      ...r,
      width: Number((r.width * 0.78).toFixed(2)),
      points: r.points.map((pt) => [
        Number((pt[0] * roadScale + ox).toFixed(2)),
        pt[1],
        Number((pt[2] * roadScale + oz).toFixed(2)),
      ]),
    }));

    camp.pathways = camp.pathways.map((p) => ({
      ...p,
      points: p.points.map((pt) => [
        Number((pt[0] * spreadScale + ox).toFixed(2)),
        pt[1],
        Number((pt[2] * spreadScale + oz).toFixed(2)),
      ]),
    }));
  }
}

export const BLUEPRINT_PRESETS: BlueprintPreset[] = [
  {
    id: 'ucl-kathleen-lonsdale',
    title: 'UCL Bloomsbury · Kathleen Lonsdale Earth Sciences (KLB)',
    subtitle: 'Vector Floor Plan Extrusion · 5 Floors (3.5m/floor = 17.5m) · Gower Place',
    rawVectorSpec: JSON.stringify(
      {
        name: 'Kathleen Lonsdale Building (UCL Earth Sciences)',
        shortCode: 'KLB',
        category: 'Earth & Planetary Lab',
        archetype: 'classical-cloister',
        open24Hours: true,
        accentColor: '#38bdf8',
        footprintMeters: [16, 17.5, 12],
        coordinates: [-2, 6],
        floors: [
          {
            floorNumber: 1,
            name: '1F Rock & Mineralogy Collection Hall',
            noiseDba: 36,
            occupiedSeats: 24,
            totalSeats: 68,
            powerOutletsPct: 95,
          },
          {
            floorNumber: 2,
            name: '3F Geophysical GIS & CAD Cluster',
            noiseDba: 31,
            occupiedSeats: 19,
            totalSeats: 64,
            powerOutletsPct: 100,
          },
          {
            floorNumber: 3,
            name: '5F Silent Planetary Science Reading Loft',
            noiseDba: 25,
            occupiedSeats: 11,
            totalSeats: 56,
            powerOutletsPct: 98,
          },
        ],
      },
      null,
      2
    ),
  },
  {
    id: 'lse-ckk-cheng-kin-ku',
    title: 'LSE Aldwych · Cheng Kin Ku Building (CKK / New Academic)',
    subtitle: 'Isometric Block Extrusion · Lincoln’s Inn Fields · 24/7 Postgrad Vault',
    rawVectorSpec: JSON.stringify(
      {
        name: 'Cheng Kin Ku Building (LSE Lincoln’s Inn Fields)',
        shortCode: 'CKK',
        category: 'Economics & Law Hub',
        archetype: 'cantilever-tech',
        open24Hours: true,
        accentColor: '#10b981',
        footprintMeters: [15, 16, 13],
        coordinates: [14, 14],
        floors: [
          {
            floorNumber: 1,
            name: 'LG Lower Ground Study Commons',
            noiseDba: 39,
            occupiedSeats: 38,
            totalSeats: 85,
            powerOutletsPct: 96,
          },
          {
            floorNumber: 2,
            name: '3F Silent Econometrics Suite',
            noiseDba: 26,
            occupiedSeats: 16,
            totalSeats: 72,
            powerOutletsPct: 100,
          },
          {
            floorNumber: 3,
            name: '7F Lincoln’s Inn Parkland Sky Deck',
            noiseDba: 24,
            occupiedSeats: 12,
            totalSeats: 58,
            powerOutletsPct: 100,
          },
        ],
      },
      null,
      2
    ),
  },
  {
    id: 'imperial-blackett-lab',
    title: 'Imperial South Kensington · Blackett Physics Laboratory (BLK)',
    subtitle: 'Exhibition Road Geometric Block Extrusion · Quantum & Optics Hub',
    rawVectorSpec: JSON.stringify(
      {
        name: 'Blackett Laboratory (Imperial Physics)',
        shortCode: 'BLK',
        category: 'Quantum & Optics Tower',
        archetype: 'observatory-tower',
        open24Hours: true,
        accentColor: '#a855f7',
        footprintMeters: [15, 18, 13],
        coordinates: [14, -14],
        floors: [
          {
            floorNumber: 1,
            name: '2F Physics Undergraduate Study Lounge',
            noiseDba: 38,
            occupiedSeats: 36,
            totalSeats: 78,
            powerOutletsPct: 95,
          },
          {
            floorNumber: 2,
            name: '6F Silent Laser & Theoretical Physics Library',
            noiseDba: 25,
            occupiedSeats: 14,
            totalSeats: 64,
            powerOutletsPct: 100,
          },
        ],
      },
      null,
      2
    ),
  },
];
