declare module '3d-force-graph' {
  interface NodeObject {
    id?: string | number;
    name?: string;
    val?: number;
    color?: string;
    x?: number;
    y?: number;
    z?: number;
    [key: string]: any;
  }

  interface LinkObject {
    source?: string | number | NodeObject;
    target?: string | number | NodeObject;
    color?: string;
    [key: string]: any;
  }

  interface GraphData {
    nodes: NodeObject[];
    links: LinkObject[];
  }

  export default class ForceGraph3D {
    constructor(element: HTMLElement);
    
    // Core methods
    graphData(data?: GraphData): this | GraphData;
    width(width?: number): this | number;
    height(height?: number): this | number;
    backgroundColor(color?: string): this | string;
    showNavInfo(show?: boolean): this | boolean;
    
    // Node styling
    nodeLabel(accessor?: string | ((node: NodeObject) => string)): this;
    nodeColor(accessor?: string | ((node: NodeObject) => string)): this;
    nodeOpacity(opacity?: number): this | number;
    nodeResolution(resolution?: number): this | number;
    
    // Link styling  
    linkLabel(accessor?: string | ((link: LinkObject) => string)): this;
    linkColor(accessor?: string | ((link: LinkObject) => string)): this;
    linkWidth(accessor?: number | string | ((link: LinkObject) => number)): this;
    linkOpacity(opacity?: number): this | number;
    linkResolution(resolution?: number): this | number;
    
    // Directional features
    linkDirectionalArrowLength(accessor?: number | string | ((link: LinkObject) => number)): this;
    linkDirectionalArrowColor(accessor?: string | ((link: LinkObject) => string)): this;
    linkDirectionalArrowRelPos(position?: number): this | number;
    linkDirectionalParticles(accessor?: number | string | ((link: LinkObject) => number)): this;
    linkDirectionalParticleSpeed(accessor?: number | string | ((link: LinkObject) => number)): this;
    linkDirectionalParticleWidth(accessor?: number | string | ((link: LinkObject) => number)): this;
    linkDirectionalParticleColor(accessor?: string | ((link: LinkObject) => string)): this;
    
    // Force engine
    d3AlphaDecay(decay?: number): this | number;
    d3VelocityDecay(decay?: number): this | number;
    
    // Interaction
    enableNodeDrag(enable?: boolean): this | boolean;
    enableNavigationControls(enable?: boolean): this | boolean;
    onNodeClick(callback?: (node: NodeObject, event: Event) => void): this;
    
    // Camera controls
    cameraPosition(position?: {x?: number, y?: number, z?: number}, lookAt?: {x?: number, y?: number, z?: number}, duration?: number): this;
    zoomToFit(duration?: number, padding?: number): this;
  }
} 