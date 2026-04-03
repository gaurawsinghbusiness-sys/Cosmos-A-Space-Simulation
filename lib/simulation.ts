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

export interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetPlanetIndex: number;
}

export interface BlackHole {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
  width: number;
}

export interface BgStar {
  x: number;
  y: number;
  size: number;
  alpha: number;
  parallax: number;
}

export class CosmosSimulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private stars: Star[] = [];
  private planets: Planet[] = [];
  private ships: Ship[] = [];
  private blackHoles: BlackHole[] = [];
  private supernovas: {x: number, y: number, radius: number, maxRadius: number, alpha: number}[] = [];
  private shockwaves: Shockwave[] = [];
  private bgStars: BgStar[] = [];
  private supernovaCount: number = 0;
  private animationFrameId: number = 0;
  private isSparked: boolean = false;
  private timeSinceSpark: number = 0;
  private width: number = 0;
  private height: number = 0;

  // Camera & Polish
  public camera = { x: 0, y: 0, zoom: 1 };
  public isPanning: boolean = false;
  private panTimeout: number | null = null;

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
    this.generateBgStars();
    window.addEventListener('resize', () => this.resize());
  }

  private resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  public pan(dx: number, dy: number) {
    this.camera.x += dx;
    this.camera.y += dy;
    this.isPanning = true;
  }

  public endPan() {
    this.isPanning = false;
  }

  public setZoom(delta: number, mouseX: number, mouseY: number) {
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(this.camera.zoom * zoomFactor, 10));
    
    const worldX = (mouseX - this.camera.x) / this.camera.zoom;
    const worldY = (mouseY - this.camera.y) / this.camera.zoom;
    
    this.camera.x = mouseX - worldX * newZoom;
    this.camera.y = mouseY - worldY * newZoom;
    this.camera.zoom = newZoom;
    
    this.isPanning = true;
    if (this.panTimeout) window.clearTimeout(this.panTimeout);
    this.panTimeout = window.setTimeout(() => {
        this.isPanning = false;
    }, 150);
  }

  public spark(screenX: number, screenY: number) {
    if (this.isSparked) return; // Only one Big Bang allowed
    this.isSparked = true;
    
    const x = (screenX - this.camera.x) / this.camera.zoom;
    const y = (screenY - this.camera.y) / this.camera.zoom;
    
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
    this.planets = [];
    this.ships = [];
    this.blackHoles = [];
    this.supernovas = [];
    this.shockwaves = [];
    this.supernovaCount = 0;
    this.isSparked = false;
    this.timeSinceSpark = 0;
    this.camera = { x: 0, y: 0, zoom: 1 };
    
    this.generateBgStars();

    // Clear the canvas immediately to pure black
    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private generateBgStars() {
    this.bgStars = [];
    for (let i = 0; i < 1500; i++) {
      this.bgStars.push({
        x: (Math.random() - 0.5) * this.width * 10,
        y: (Math.random() - 0.5) * this.height * 10,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        parallax: Math.random() * 0.2 + 0.05
      });
    }
  }

  public getStats() {
    const totalPopulation = this.planets.reduce((sum, p) => sum + Math.floor((p.population || 0) / 10), 0);
    return {
      particleCount: this.particles.length,
      starCount: this.stars.length,
      planetCount: this.planets.length,
      habitableCount: this.planets.filter(p => p.condition === 'habitable').length,
      totalPopulation: totalPopulation,
      blackHoleCount: this.blackHoles.length,
      supernovaCount: this.supernovaCount,
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
           
           // Phase 6 Gate: Civilization Expansion (after 3200 frames, ~53 seconds)
           if (this.timeSinceSpark >= 3200 && planet.population > 1000 && Math.random() < 0.005) {
             const possibleTargets = this.planets.map((p, idx) => ({ p, idx }))
               .filter(t => t.p.condition === 'habitable' && t.idx !== this.planets.indexOf(planet));
             
             if (possibleTargets.length > 0) {
               const target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
               this.ships.push({
                 x: planet.x,
                 y: planet.y,
                 vx: planet.vx,
                 vy: planet.vy,
                 targetPlanetIndex: target.idx
               });
             }
           }
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
    
    // Phase 7 Gate: Cosmic Events (after 4000 frames, ~66 seconds)
    if (this.timeSinceSpark >= 4000 && Math.random() < 0.0005 && this.blackHoles.length === 0) {
      this.blackHoles.push({
        x: -50, 
        y: Math.random() * this.height,
        vx: 0.5 + Math.random() * 0.5,
        vy: (Math.random() - 0.5) * 0.2,
        mass: 2000,
        radius: 15
      });
    }
    
    // Ship Movement & Colonization
    const survivingShips: Ship[] = [];
    for (const ship of this.ships) {
      const target = this.planets[ship.targetPlanetIndex];
      if (!target || target.condition !== 'habitable') continue; // Target lost
      
      const dx = target.x - ship.x;
      const dy = target.y - ship.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < target.radius) {
        target.population = (target.population || 0) + 500; // Colonization successful!
        continue; 
      }
      
      ship.vx = (dx / dist) * 4; // Speed = 4
      ship.vy = (dy / dist) * 4;
      ship.x += ship.vx;
      ship.y += ship.vy;
      survivingShips.push(ship);
    }
    this.ships = survivingShips;

    // Black Hole Physics & Destruction
    const survivingBlackHoles: BlackHole[] = [];
    for (const bh of this.blackHoles) {
      bh.x += bh.vx;
      bh.y += bh.vy;
      
      if (bh.x > this.width + 100 || bh.y < -100 || bh.y > this.height + 100) continue;
      
      survivingBlackHoles.push(bh);

      this.stars = this.stars.filter(star => {
        const dx = bh.x - star.x;
        const dy = bh.y - star.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        if (dist < bh.radius + star.radius) return false; // Swallowed!
        
        const force = (this.GRAVITY_CONSTANT * bh.mass) / Math.max(distSq, 100);
        star.vx += (dx / dist) * force;
        star.vy += (dy / dist) * force;
        return true;
      });

      this.planets = this.planets.filter(planet => {
        const dx = bh.x - planet.x;
        const dy = bh.y - planet.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        if (dist < bh.radius + planet.radius) return false; // Swallowed!
        
        const force = (this.GRAVITY_CONSTANT * bh.mass) / Math.max(distSq, 100);
        planet.vx += (dx / dist) * force;
        planet.vy += (dy / dist) * force;
        return true;
      });
    }
    this.blackHoles = survivingBlackHoles;

    // Module 9: Supernovas (after 4800 frames, ~80 seconds)
    if (this.timeSinceSpark >= 4800) {
      for (let i = this.stars.length - 1; i >= 0; i--) {
        const star = this.stars[i];
        // Stars with high mass have a chance to go supernova
        if (star.mass > 80 && Math.random() < 0.002) {
          this.supernovaCount++;
          
          // 1. Create explosion visual effect
          this.supernovas.push({
            x: star.x,
            y: star.y,
            radius: star.radius,
            maxRadius: star.heatRadius * 5,
            alpha: 1
          });

          // ADD SHOCKWAVE
          this.shockwaves.push({
            x: star.x,
            y: star.y,
            radius: star.radius,
            maxRadius: star.heatRadius * 15,
            color: ['#00f0ff', '#ffb700', '#ffffff'][Math.floor(Math.random() * 3)],
            life: 1,
            maxLife: 1,
            width: 4 + Math.random() * 6
          });

          // 2. Create explosion particles
          for (let j = 0; j < 100; j++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 4;
            this.particles.push({
              x: star.x,
              y: star.y,
              vx: Math.cos(angle) * speed + star.vx,
              vy: Math.sin(angle) * speed + star.vy,
              radius: Math.random() * 2 + 0.5,
              mass: 2,
              color: ['#ffffff', '#00f0ff', '#ffb700'][Math.floor(Math.random() * 3)],
              alpha: 1
            });
          }
          
          // 3. Destroy nearby planets
          const blastRadiusSq = star.heatRadius * star.heatRadius * 25;
          this.planets = this.planets.filter(p => {
            const dx = p.x - star.x;
            const dy = p.y - star.y;
            return (dx * dx + dy * dy) > blastRadiusSq;
          });
          
          // 4. Leave behind a black hole
          this.blackHoles.push({
            x: star.x,
            y: star.y,
            vx: star.vx,
            vy: star.vy,
            mass: star.mass * 3, // Black hole is massive
            radius: star.radius * 0.8
          });
          
          // 5. Remove the star
          this.stars.splice(i, 1);
        }
      }
    }

    // Update supernova effects
    const survivingSupernovas = [];
    for (const sn of this.supernovas) {
      sn.radius += 5;
      sn.alpha -= 0.02;
      if (sn.alpha > 0) {
        survivingSupernovas.push(sn);
      }
    }
    this.supernovas = survivingSupernovas;

    // Update shockwaves
    const survivingShockwaves = [];
    for (const sw of this.shockwaves) {
      sw.radius += (sw.maxRadius - sw.radius) * 0.05;
      sw.life -= 0.015;
      if (sw.life > 0) {
        survivingShockwaves.push(sw);
      }
    }
    this.shockwaves = survivingShockwaves;
  }

  private draw() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Fill with deep black, low opacity for motion blur
    if (this.isPanning) {
      this.ctx.fillStyle = '#050505';
    } else {
      this.ctx.fillStyle = 'rgba(5, 5, 5, 0.2)';
    }
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (!this.isSparked) return;

    this.ctx.translate(this.camera.x, this.camera.y);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);

    // Draw universe bounds
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 2 / this.camera.zoom;
    this.ctx.strokeRect(0, 0, this.width, this.height);

    // Draw Parallax Background Stars
    this.ctx.fillStyle = '#ffffff';
    for (const bgStar of this.bgStars) {
      // Parallax effect: move stars slightly based on camera position
      // Since context is already translated by camera.x, we subtract a fraction of camera.x
      // to make them appear further away (moving slower than foreground)
      const px = bgStar.x - this.camera.x * bgStar.parallax;
      const py = bgStar.y - this.camera.y * bgStar.parallax;
      
      this.ctx.globalAlpha = bgStar.alpha;
      this.ctx.beginPath();
      this.ctx.arc(px, py, bgStar.size / this.camera.zoom, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    this.ctx.globalCompositeOperation = 'lighter';
    
    // Draw Particles
    for (const p of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();
    }
    
    // Draw Ships
    for (const ship of this.ships) {
      this.ctx.beginPath();
      this.ctx.moveTo(ship.x, ship.y);
      this.ctx.lineTo(ship.x - ship.vx * 2, ship.y - ship.vy * 2);
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }
    
    // Draw Black Holes
    for (const bh of this.blackHoles) {
      const glow = this.ctx.createRadialGradient(bh.x, bh.y, bh.radius, bh.x, bh.y, bh.radius * 4);
      glow.addColorStop(0, 'rgba(100, 0, 255, 0.8)');
      glow.addColorStop(0.5, 'rgba(50, 0, 100, 0.3)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      this.ctx.beginPath();
      this.ctx.arc(bh.x, bh.y, bh.radius * 4, 0, Math.PI * 2);
      this.ctx.fillStyle = glow;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#000000';
      this.ctx.fill();
      this.ctx.strokeStyle = '#330066';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
    
    // Draw Supernovas
    for (const sn of this.supernovas) {
      const gradient = this.ctx.createRadialGradient(sn.x, sn.y, 0, sn.x, sn.y, sn.radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${sn.alpha})`);
      gradient.addColorStop(0.2, `rgba(0, 240, 255, ${sn.alpha * 0.8})`);
      gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
      
      this.ctx.beginPath();
      this.ctx.arc(sn.x, sn.y, sn.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }

    // Draw Shockwaves
    for (const sw of this.shockwaves) {
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = sw.color;
      this.ctx.lineWidth = sw.width / this.camera.zoom;
      this.ctx.globalAlpha = sw.life;
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;

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
      const twinkle = 0.7 + Math.sin(this.timeSinceSpark * 0.05 + star.x) * 0.3;

      // Heat Radius (Glow)
      const gradient = this.ctx.createRadialGradient(
        star.x, star.y, star.radius,
        star.x, star.y, star.heatRadius
      );
      gradient.addColorStop(0, `rgba(255, 183, 0, ${0.8 * twinkle})`); // Intense core color
      gradient.addColorStop(0.5, `rgba(255, 100, 0, ${0.2 * twinkle})`); // Orange fade
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
