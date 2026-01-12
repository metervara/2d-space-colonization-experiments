export interface Vec2Like {
  x: number;
  y: number;
}

export class Vec2 implements Vec2Like {
  x: number;
  y: number;
  
  constructor(x?: number, y?: number);
  add(v: Vec2Like, returnNew?: boolean): Vec2;
  subtract(v: Vec2Like, returnNew?: boolean): Vec2;
  multiply(v: number | Vec2Like, returnNew?: boolean): Vec2;
  divide(v: number | Vec2Like, returnNew?: boolean): Vec2;
  length(): number;
  normalize(returnNew?: boolean): Vec2;
  distance(v: Vec2Like): number;
  clone(): Vec2;
}

export interface ColorsConfig {
  BackgroundColor: string;
  AttractorColor: string;
  BranchColor: string;
  TipColor: string;
  InfluenceLinesColor: string;
  AttractionZoneColor: string;
  KillZoneColor: string;
  BoundsFillColor: string;
  BoundsBorderColor: string;
  ObstacleFillColor: string;
  [key: string]: string;
}

export interface Settings {
  VenationType: 'Open' | 'Closed';
  SegmentLength: number;
  AttractionDistance: number;
  KillDistance: number;
  IsPaused: boolean;
  EnableCanalization: boolean;
  EnableOpacityBlending: boolean;
  ShowAttractors: boolean;
  ShowNodes: boolean;
  ShowTips: boolean;
  ShowAttractionZones: boolean;
  ShowKillZones: boolean;
  ShowInfluenceLines: boolean;
  ShowBounds: boolean;
  ShowObstacles: boolean;
  RenderMode: 'Lines' | 'Dots';
  Colors: ColorsConfig;
  BranchThickness: number;
  TipThickness: number;
  BoundsBorderThickness: number;
  [key: string]: unknown;
}

export class Node {
  constructor(
    parent: Node | null,
    position: Vec2Like,
    isTip: boolean,
    ctx: CanvasRenderingContext2D,
    settings?: Partial<Settings>,
    color?: string
  );
  parent: Node | null;
  position: Vec2Like;
  isTip: boolean;
  thickness: number;
  influencedBy: number[];
  ctx: CanvasRenderingContext2D;
  settings: Settings;
  color: string | undefined;
  draw(): void;
  getNextNode(averageAttractorDirection: Vec2Like): Node;
}

export class Attractor {
  constructor(position: Vec2Like, ctx: CanvasRenderingContext2D, settings?: Partial<Settings>);
  position: Vec2Like;
  influencingNodes: Node[];
  fresh: boolean;
  reached?: boolean;
  ctx: CanvasRenderingContext2D;
  settings: Settings;
  draw(): void;
}

export class Path {
  constructor(
    polygon: number[][],
    type: 'Bounds' | 'Obstacle',
    ctx: CanvasRenderingContext2D,
    settings?: Partial<Settings>
  );
  polygon: number[][];
  transformedPolygon: number[][];
  type: string;
  ctx: CanvasRenderingContext2D;
  settings: Settings;
  origin: { x: number; y: number };
  scale: number;
  width: number;
  height: number;
  isCentered: boolean;
  
  contains(x: number, y: number): boolean;
  moveBy(x: number, y: number): void;
  moveTo(x: number, y: number): void;
  setScale(factor: number): void;
  getTotalLength(): number;
  calculateDimensions(): void;
  createTransformedPolygon(): void;
  draw(): void;
}

export class Network {
  constructor(ctx: CanvasRenderingContext2D, settings?: Partial<Settings>);
  attractors: Attractor[];
  nodes: Node[];
  bounds: Path[];
  obstacles: Path[];
  ctx: CanvasRenderingContext2D;
  settings: Settings;
  
  update(): void;
  draw(): void;
  addNode(node: Node): void;
  reset(): void;
  toggleNodes(): void;
  toggleTips(): void;
  toggleAttractors(): void;
  toggleAttractionZones(): void;
  toggleKillZones(): void;
  toggleInfluenceLines(): void;
  toggleBounds(): void;
  toggleObstacles(): void;
  toggleCanalization(): void;
  toggleOpacityBlending(): void;
  togglePause(): void;
}

export class SVGLoader {
  static load(svgString: string): number[][][];
}

export const Defaults: Settings;

export namespace AttractorPatterns {
  function getRandomAttractors(
    numAttractors: number,
    ctx: CanvasRenderingContext2D,
    bounds?: Path[],
    obstacles?: Path[]
  ): Attractor[];
  
  function getGridOfAttractors(
    numRows: number,
    numColumns: number,
    ctx: CanvasRenderingContext2D,
    jitterRange?: number,
    bounds?: Path[],
    obstacles?: Path[]
  ): Attractor[];
  
  function getPhyllotaxisAttractors(ctx: CanvasRenderingContext2D): Attractor[];
  function getWaveOfAttractors(ctx: CanvasRenderingContext2D): Attractor[];
  function applyNoise(attractors: Attractor[]): Attractor[];
}

export namespace Utilities {
  function random(min?: number, max?: number): number;
  function map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
  function getCircleOfPoints(cx: number, cy: number, radius: number, resolution: number): number[][];
  function exportSVG(network: Network): void;
}

export namespace ColorPresets {
  const Light: ColorsConfig;
  const Dark: ColorsConfig;
  const Realistic: ColorsConfig;
  const Custom: ColorsConfig;
}

export function setupKeyListeners(network: Network): void;
