export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  color: string;
  alpha: number;
}

export class CosmosSimulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrameId: number = 0;
  private isSparked: boolean = false;
  private width: number = 0;
  private height: number = 0;

  // Physics Constants
  private readonly GRAVITY_CONSTANT = 0.05;
  private readonly FRICTION = 0.98;
  private readonly MAX_SPEED = 5;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error("Could not get 2D context");
    this.ctx = context;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  public spark(x: number, y: number) {
    if (this.isSparked) return; // Only one Big Bang allowed
    this.isSparked = true;
    
    // Aesthetic: Electric blues, neon greens, amber, and pure white
    const colors = ['#00f0ff', '#00ff9d', '#ffb700', '#ffffff'];
    
    // Generate 800 particles for a massive initial explosion
    for (let i = 0; i < 800; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Varying speeds for depth
      const speed = Math.random() * 20 + 2; 
      const radius = Math.random() * 2 + 0.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: radius,
        mass: radius * 2, // Mass is proportional to size
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1
      });
    }
  }

  public reset() {
    this.particles = [];
    this.isSparked = false;
    // Clear the canvas immediately to pure black
    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  public start() {
    const loop = () => {
      this.update();
      this.draw();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  public stop() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', () => this.resize());
  }

  private update() {
    if (!this.isSparked) return;
    
    // O(N^2) Gravity Calculation
    // For 800 particles, this is 640,000 checks per frame. Modern JS engines can handle this,
    // but we will optimize with a spatial grid in the future if we add more entities.
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        
        // Prevent division by zero and extreme forces when particles are too close
        if (distSq < 100) continue; 
        
        const dist = Math.sqrt(distSq);
        
        // F = G * (m1 * m2) / r^2
        const force = (this.GRAVITY_CONSTANT * p1.mass * p2.mass) / distSq;
        
        const ax = (force * dx) / dist;
        const ay = (force * dy) / dist;
        
        // Apply acceleration based on mass (F = ma -> a = F/m)
        p1.vx += ax / p1.mass;
        p1.vy += ay / p1.mass;
        
        p2.vx -= ax / p2.mass;
        p2.vy -= ay / p2.mass;
      }
    }

    for (const p of this.particles) {
      // Apply velocity limits to prevent particles from shooting off to infinity
      const speedSq = p.vx * p.vx + p.vy * p.vy;
      if (speedSq > this.MAX_SPEED * this.MAX_SPEED) {
        const speed = Math.sqrt(speedSq);
        p.vx = (p.vx / speed) * this.MAX_SPEED;
        p.vy = (p.vy / speed) * this.MAX_SPEED;
      }

      p.x += p.vx;
      p.y += p.vy;
      
      // Cosmic friction - particles slow down over time, allowing gravity to take over
      p.vx *= this.FRICTION;
      p.vy *= this.FRICTION;
      
      // Screen wrapping (a closed universe)
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;
    }
  }

  private draw() {
    // Fill with deep black, but use low opacity (0.2) to create motion blur/trails
    this.ctx.fillStyle = 'rgba(5, 5, 5, 0.2)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (!this.isSparked) return;

    // Add neon glow effect
    this.ctx.globalCompositeOperation = 'lighter';
    
    for (const p of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();
    }
    
    // Reset composite operation for the next frame's background fill
    this.ctx.globalCompositeOperation = 'source-over';
  }
}
