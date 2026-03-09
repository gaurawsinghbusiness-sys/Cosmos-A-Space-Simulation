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

export interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  color: string;
  heatRadius: number;
}

export interface Planet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  color: string;
  orbitingStarIndex: number;
  condition?: 'scorched' | 'habitable' | 'frozen' | 'barren';
  population?: number;
}

export class CosmosSimulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private stars: Star[] = [];
  private planets: Planet[] = [];
  private animationFrameId: number = 0;
  private isSparked: boolean = false;
  private timeSinceSpark: number = 0;
  private width: number = 0;
  private height: number = 0;

  // Physics Constants
  private readonly GRAVITY_CONSTANT = 0.05;
  private readonly FRICTION = 0.98;
  private readonly MAX_SPEED = 3;
  private readonly IGNITION_MASS = 30; // Mass required to ignite a star
  private readonly MERGE_DISTANCE_SQ = 16; // Distance squared to trigger a merge
  private readonly PLANET_FORMATION_MASS = 2; // Mass required for dust to become a planet

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
      const speed = Math.random() * 15 + 8; // CHANGED: Faster explosion to reach corners
      const radius = Math.random() * 2 + 0.5;
      
      // Offset the initial spawn position slightly so they don't all spawn at distance 0
      // and instantly merge into a single star on frame 1.
      const spawnX = x + (Math.cos(angle) * speed * 2);
      const spawnY = y + (Math.sin(angle) * speed * 2);

      this.particles.push({
        x: spawnX,
        y: spawnY,
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
    this.stars = [];
    this.isSparked = false;
    this.timeSinceSpark = 0;
    // Clear the canvas immediately to pure black
    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  public getStats() {
    const totalPopulation = this.planets.reduce((sum, p) => sum + Math.floor((p.population || 0) / 10), 0);
    return {
      particleCount: this.particles.length,
      starCount: this.stars.length,
      planetCount: this.planets.length,
      habitableCount: this.planets.filter(p => p.condition === 'habitable').length,
      totalPopulation: totalPopulation,
      isSparked: this.isSparked,
      timeSinceSpark: this.timeSinceSpark
    };
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
    this.timeSinceSpark++;
    
    // Phase 2 Gate: Gravity & Accretion only start after 600 frames (~10 seconds)
    if (this.timeSinceSpark >= 600) {
      // 1. Gravity & Accretion (Particles vs Particles)
      for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      if (p1.mass <= 0) continue; // Skip if already merged this frame
      
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        if (p2.mass <= 0) continue;
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        
        // Accretion (Merging)
        if (distSq < this.MERGE_DISTANCE_SQ) {
          // Conservation of momentum: (m1*v1 + m2*v2) / (m1 + m2)
          const totalMass = p1.mass + p2.mass;
          p1.vx = (p1.vx * p1.mass + p2.vx * p2.mass) / totalMass;
          p1.vy = (p1.vy * p1.mass + p2.vy * p2.mass) / totalMass;
          
          // p1 absorbs p2
          p1.mass = totalMass;
          p1.radius = Math.min(p1.mass / 2, 8); // Cap radius size
          
          // Mark p2 for deletion
          p2.mass = 0; 
          continue;
        }

        // Gravity
        if (distSq < 100) continue; 
        
        // NEW: Local Gravity Well Limit (canvas.width / 6)
        // If particles are too far apart, they do not attract each other.
        const maxGravityDist = this.width / 6; // CHANGED: Smaller wells = more independent clusters
        if (distSq > maxGravityDist * maxGravityDist) continue;
        
        const dist = Math.sqrt(distSq);
        const force = (this.GRAVITY_CONSTANT * p1.mass * p2.mass) / distSq;
        const ax = (force * dx) / dist;
        const ay = (force * dy) / dist;
        
        p1.vx += ax / p1.mass;
        p1.vy += ay / p1.mass;
        p2.vx -= ax / p2.mass;
        p2.vy -= ay / p2.mass;
      }
    }

    // 2. Gravity & Accretion (Particles vs Stars)
    for (let sIndex = 0; sIndex < this.stars.length; sIndex++) {
      const star = this.stars[sIndex];
      for (const p of this.particles) {
        if (p.mass <= 0) continue;

        const dx = star.x - p.x;
        const dy = star.y - p.y;
        const distSq = dx * dx + dy * dy;

        // Star absorbs particle
        if (distSq < star.radius * star.radius * 2) {
          star.mass += p.mass;
          star.radius = Math.min(10 + Math.log(star.mass), 25); // Grow slowly
          star.heatRadius = star.radius * 4;
          
          // Conservation of momentum
          star.vx = (star.vx * star.mass + p.vx * p.mass) / star.mass;
          star.vy = (star.vy * star.mass + p.vy * p.mass) / star.mass;
          
          p.mass = 0;
          continue;
        }

        // Gravity (Stars pull particles strongly)
        if (distSq < 100) continue;
        const dist = Math.sqrt(distSq);
        // Stars exert 5x gravity
        const force = (this.GRAVITY_CONSTANT * 5 * star.mass * p.mass) / distSq;
        const ax = (force * dx) / dist;
        const ay = (force * dy) / dist;

        p.vx += ax / p.mass;
        p.vy += ay / p.mass;
        // Stars are heavy, they move slightly towards the particle
        star.vx -= ax / star.mass;
        star.vy -= ay / star.mass;
      }
    }
    
    // 3. Gravity (Planets vs Stars) - Planets orbit stars
    for (const planet of this.planets) {
       const star = this.stars[planet.orbitingStarIndex];
       if (!star) continue; // Should not happen unless star dies
       
       const dx = star.x - planet.x;
       const dy = star.y - planet.y;
       const distSq = dx * dx + dy * dy;
       
       if (distSq < 100) continue;
       const dist = Math.sqrt(distSq);
       
       // Calculate perfect orbital velocity magnitude: v = sqrt(G * M / r)
       // We use a multiplier to make it look good on screen
       const orbitalSpeed = Math.sqrt((this.GRAVITY_CONSTANT * 5 * star.mass) / dist) * 1.5;
       
       // Calculate the tangent vector (perpendicular to the vector pointing to the star)
       const tangentX = -dy / dist;
       const tangentY = dx / dist;
       
       // Force the planet's velocity to be exactly the orbital velocity along the tangent
       // This guarantees a perfect, stable circular orbit
       planet.vx = tangentX * orbitalSpeed + star.vx;
       planet.vy = tangentY * orbitalSpeed + star.vy;
       
       // Module 5: Planetary Conditions (Goldilocks Zone)
       // Determine if the planet is scorched, habitable, or frozen based on distance to star
       const HABITABLE_INNER = star.heatRadius * 1.5;
       const HABITABLE_OUTER = star.heatRadius * 3.5;
       
       if (dist < HABITABLE_INNER) {
         planet.condition = 'scorched';
         planet.color = '#ff4400'; // Red/Orange
         planet.population = 0; // Life dies
       } else if (dist >= HABITABLE_INNER && dist <= HABITABLE_OUTER) {
         planet.condition = 'habitable';
         planet.color = '#00ff88'; // Neon Green
         
         // Phase 5 Gate: The Spark of Life (after 2600 frames, ~43 seconds)
         if (this.timeSinceSpark >= 2600) {
           planet.population = (planet.population || 0) + 1;
         }
       } else {
         planet.condition = 'frozen';
         planet.color = '#aaddff'; // Icy Blue
         planet.population = 0; // Life dies
       }
    }
    } // End of Phase 2 Gate

    // 4. Clean up merged particles and check for Stellar Ignition
    const survivingParticles: Particle[] = [];
    for (const p of this.particles) {
      if (p.mass > 0) {
        // Phase 3 Gate: Ignition only allowed after 1800 frames (~30 seconds)
        if (this.timeSinceSpark >= 1800 && p.mass >= this.IGNITION_MASS) {
          // IGNITION! Particle becomes a Star
          this.stars.push({
            x: p.x,
            y: p.y,
            vx: p.vx * 0.5, // Stars move slower
            vy: p.vy * 0.5,
            radius: 10,
            mass: p.mass,
            color: '#ffb700', // Gold/Amber
            heatRadius: 40
          });
        } else if (this.timeSinceSpark >= 2000 && p.mass >= this.PLANET_FORMATION_MASS && this.stars.length > 0) {
          // Phase 4 Gate: Planet Formation (after 2000 frames, ~33 seconds)
          // Find nearest star to orbit
          let nearestStarIndex = 0;
          let minDistSq = Infinity;
          for (let i = 0; i < this.stars.length; i++) {
             const dx = this.stars[i].x - p.x;
             const dy = this.stars[i].y - p.y;
             const distSq = dx * dx + dy * dy;
             if (distSq < minDistSq) {
                minDistSq = distSq;
                nearestStarIndex = i;
             }
          }
          
          this.planets.push({
            x: p.x,
            y: p.y,
            vx: p.vx,
            vy: p.vy,
            radius: Math.max(p.radius, 2), // Ensure visible size
            mass: p.mass,
            color: '#888888', // Rocky grey
            orbitingStarIndex: nearestStarIndex
          });
          console.log("Planet spawned from surviving dust!");
        } else {
          survivingParticles.push(p);
        }
      }
    }
    this.particles = survivingParticles;
    
    // GUARANTEE PLANETS: If we hit 2000 frames, force spawn 2 planets per star
    // This ensures planets appear even if all dust was eaten by the stars
    if (this.timeSinceSpark === 2000 && this.stars.length > 0) {
      for (let i = 0; i < this.stars.length; i++) {
        const star = this.stars[i];
        for (let j = 0; j < 2; j++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = star.radius * 4 + Math.random() * 60; // Orbit distance
          this.planets.push({
            x: star.x + Math.cos(angle) * dist,
            y: star.y + Math.sin(angle) * dist,
            vx: star.vx - Math.sin(angle) * 3, // Tangential velocity
            vy: star.vy + Math.cos(angle) * 3,
            radius: 3 + Math.random() * 2,
            mass: 5,
            color: '#888888', // Rocky grey
            orbitingStarIndex: i
          });
        }
      }
      console.log("Forced planet spawn at 2000 frames!");
    }

    // 4. Update Positions & Screen Wrap
    for (const p of this.particles) {
      const speedSq = p.vx * p.vx + p.vy * p.vy;
      if (speedSq > this.MAX_SPEED * this.MAX_SPEED) {
        const speed = Math.sqrt(speedSq);
        p.vx = (p.vx / speed) * this.MAX_SPEED;
        p.vy = (p.vy / speed) * this.MAX_SPEED;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= this.FRICTION;
      p.vy *= this.FRICTION;
      
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;
    }

    for (const star of this.stars) {
      // Stars have a lower max speed
      const STAR_MAX_SPEED = 1;
      const speedSq = star.vx * star.vx + star.vy * star.vy;
      if (speedSq > STAR_MAX_SPEED * STAR_MAX_SPEED) {
        const speed = Math.sqrt(speedSq);
        star.vx = (star.vx / speed) * STAR_MAX_SPEED;
        star.vy = (star.vy / speed) * STAR_MAX_SPEED;
      }

      star.x += star.vx;
      star.y += star.vy;
      star.vx *= this.FRICTION;
      star.vy *= this.FRICTION;

      if (star.x < 0) star.x = this.width;
      if (star.x > this.width) star.x = 0;
      if (star.y < 0) star.y = this.height;
      if (star.y > this.height) star.y = 0;
    }
    
    for (const planet of this.planets) {
       planet.x += planet.vx;
       planet.y += planet.vy;
       
       if (planet.x < 0) planet.x = this.width;
       if (planet.x > this.width) planet.x = 0;
       if (planet.y < 0) planet.y = this.height;
       if (planet.y > this.height) planet.y = 0;
    }
  }

  private draw() {
    // Fill with deep black, low opacity for motion blur
    this.ctx.fillStyle = 'rgba(5, 5, 5, 0.2)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (!this.isSparked) return;

    this.ctx.globalCompositeOperation = 'lighter';
    
    // Draw Particles
    for (const p of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();
    }
    
    // Draw Planets and their Life Particles
    for (let i = 0; i < this.planets.length; i++) {
      const planet = this.planets[i];
      this.ctx.beginPath();
      this.ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = planet.color;
      this.ctx.fill();
      
      // Draw Life Particles (tiny green dots orbiting the planet)
      if (planet.population && planet.population > 0) {
        const numLifeParticles = Math.min(Math.floor(planet.population / 50), 12); // Max 12 dots
        for (let j = 0; j < numLifeParticles; j++) {
          // Pseudo-random but consistent orbit based on planet index and particle index
          const orbitSpeed = 0.05 + (j * 0.01);
          const orbitAngle = (this.timeSinceSpark * orbitSpeed) + (j * Math.PI * 2 / numLifeParticles);
          const orbitDist = planet.radius + 3 + (j % 3); // Slightly varying distances
          
          const lx = planet.x + Math.cos(orbitAngle) * orbitDist;
          const ly = planet.y + Math.sin(orbitAngle) * orbitDist;
          
          this.ctx.beginPath();
          this.ctx.arc(lx, ly, 0.8, 0, Math.PI * 2);
          this.ctx.fillStyle = '#00ff00'; // Pure green life
          this.ctx.fill();
        }
        
        // Add a faint green glow to the planet itself
        const glow = this.ctx.createRadialGradient(
          planet.x, planet.y, planet.radius,
          planet.x, planet.y, planet.radius + 8
        );
        glow.addColorStop(0, 'rgba(0, 255, 0, 0.4)');
        glow.addColorStop(1, 'rgba(0, 255, 0, 0)');
        this.ctx.beginPath();
        this.ctx.arc(planet.x, planet.y, planet.radius + 8, 0, Math.PI * 2);
        this.ctx.fillStyle = glow;
        this.ctx.fill();
      }
    }

    // Draw Stars
    for (const star of this.stars) {
      // Heat Radius (Glow)
      const gradient = this.ctx.createRadialGradient(
        star.x, star.y, star.radius,
        star.x, star.y, star.heatRadius
      );
      gradient.addColorStop(0, 'rgba(255, 183, 0, 0.8)'); // Intense core color
      gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.2)'); // Orange fade
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)'); // Fade to black

      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.heatRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      // Solid Core
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff'; // White hot center
      this.ctx.fill();
    }
    
    this.ctx.globalCompositeOperation = 'source-over';
  }
}
