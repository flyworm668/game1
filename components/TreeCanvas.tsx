import React, { useEffect, useRef, useState } from 'react';
import { Particle, SnowFlake, Gift, TextParticle } from '../types';
import { getRandomPointInTriangle, getRandomPointInRect, isPointInStar } from '../utils/geometry';

interface TreeCanvasProps {
  onScoreUpdate: (scoreToAdd: number) => void;
  currentScore: number;
}

const TreeCanvas: React.FC<TreeCanvasProps> = ({ onScoreUpdate, currentScore }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const mouse = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const prevMouse = useRef<{ x: number | null; y: number | null }>({ x: null, y: null }); // Track previous mouse position
  
  const particles = useRef<Particle[]>([]); // Tree particles
  const trailParticles = useRef<Particle[]>([]); // Mouse trail
  const snowParticles = useRef<SnowFlake[]>([]);
  const gifts = useRef<Gift[]>([]);
  
  // New features refs
  const groundParticles = useRef<Particle[]>([]);
  const skyStars = useRef<Particle[]>([]);
  const fireworks = useRef<Particle[]>([]);
  const textParticles = useRef<TextParticle[]>([]);
  const shockwaves = useRef<Particle[]>([]); 
  
  const animationFrameId = useRef<number>(0);
  const giftSpawnTimer = useRef<number>(0);
  const prevScoreRef = useRef<number>(0);

  // Configuration Constants
  const TREE_LAYERS = 3;
  const PARTICLE_DENSITY_LEAVES = 1.2;
  const PARTICLE_DENSITY_TRUNK = 2;
  const MOUSE_RADIUS = 100;
  const RETURN_SPEED = 0.05;
  const SNOW_COUNT = 150;
  const GIFT_BASE_SPEED = 2;

  // Colors
  const COLORS = {
    TRUNK: '#5D4037',
    LEAVES: ['#14532d', '#15803d', '#166534', '#047857', '#065f46'],
    STAR: '#fbbf24',
    ORNAMENTS: ['#ef4444', '#3b82f6', '#eab308', '#a855f7', '#f472b6', '#ffffff']
  };
  
  const TRAIL_COLORS = ['#ef4444', '#22c55e', '#ffffff'];
  
  const FIREWORK_TEXTS = [
      "如意", "开心", "平安", "暴富", "健康", "喜乐", 
      "心想事成", "万事如意", "财源广进", "大吉大利", "好运连连", "岁岁平安"
  ];

  // Handle Score Based Events
  useEffect(() => {
    const prevScore = prevScoreRef.current;
    if (currentScore <= prevScore) {
        prevScoreRef.current = currentScore;
        return;
    }
    
    // 1. Ground Particles (Every 16 points)
    const newGroundParticles = Math.floor(currentScore / 16) - Math.floor(prevScore / 16);
    if (newGroundParticles > 0 && canvasRef.current) {
        spawnGroundParticles(newGroundParticles);
    }

    // 2. Sky Stars (Every 100 points)
    const newSkyStars = Math.floor(currentScore / 100) - Math.floor(prevScore / 100);
    if (newSkyStars > 0 && canvasRef.current) {
        spawnSkyStars(newSkyStars);
    }

    // 3. Fireworks (Every 66 points - Small batch)
    const newFireworks = Math.floor(currentScore / 66) - Math.floor(prevScore / 66);
    if (newFireworks > 0 && canvasRef.current) {
        launchFirework(newFireworks);
    }

    // 4. Massive Firework Show (Every 150 points) - 10 to 28 fireworks
    const newBigFireworkBatch = Math.floor(currentScore / 150) - Math.floor(prevScore / 150);
    if (newBigFireworkBatch > 0 && canvasRef.current) {
        // Random count between 10 and 28
        const count = Math.floor(Math.random() * 19) + 10; 
        launchFirework(count);
    }

    // 5. Auto-Decorate Tree (Every 10 points)
    const newOrnaments = Math.floor(currentScore / 10) - Math.floor(prevScore / 10);
    if (newOrnaments > 0 && particles.current.length > 0) {
        spawnAutoOrnaments(newOrnaments);
    }

    prevScoreRef.current = currentScore;
  }, [currentScore]);

  const spawnAutoOrnaments = (count: number) => {
      // Find valid leaf positions to attach ornaments to
      const leaves = particles.current.filter(p => p.type === 'leaf');
      if (leaves.length === 0) return;

      for (let i = 0; i < count; i++) {
          const randomLeaf = leaves[Math.floor(Math.random() * leaves.length)];
          const color = COLORS.ORNAMENTS[Math.floor(Math.random() * COLORS.ORNAMENTS.length)];
          
          // Create ornament at the leaf's origin position
          const ornament = createParticle(
              randomLeaf.originX, 
              randomLeaf.originY, 
              color, 
              'ornament', 
              Math.random() * 3 + 3, // Random size
              false
          );
          
          // Ensure it changes color and sways
          ornament.canSway = true;
          ornament.colorTimer = Math.floor(Math.random() * 150) + 50;

          // Layering: Insert at a random index instead of just pushing to the end
          // This allows ornaments to appear both "behind" and "in front" of some leaves
          const insertIndex = Math.floor(Math.random() * particles.current.length);
          particles.current.splice(insertIndex, 0, ornament);
          
          // Small spark effect at creation
          createExplosion(randomLeaf.originX, randomLeaf.originY, color, false);
      }
  };

  const spawnGroundParticles = (count: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const width = canvas.width;
      const height = canvas.height;

      for (let i = 0; i < count; i++) {
          const x = Math.random() * width;
          const groundY = height - 60; 
          const y = groundY + Math.random() * 60;
          
          const colors = ['#ef4444', '#3b82f6', '#eab308', '#a855f7', '#f472b6', '#22c55e'];
          const color = colors[Math.floor(Math.random() * colors.length)];

          groundParticles.current.push({
              x: x,
              y: y,
              originX: x,
              originY: y,
              vx: 0,
              vy: 0,
              size: Math.random() * 2.5 + 1,
              color: color,
              density: 1, 
              friction: 0.9,
              ease: 0.05,
              type: 'ground_light',
          });
      }
  };

  const spawnSkyStars = (count: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const width = canvas.width;
      
      for (let c = 0; c < count; c++) {
          const cx = Math.random() * width;
          const cy = Math.random() * 200 + 40; // Top 240px
          const outerRadius = 15;
          const innerRadius = 7;
          
          // Generate denser stars (80 particles)
          let particlesCreated = 0;
          let attempts = 0;
          
          while(particlesCreated < 80 && attempts < 300) {
              attempts++;
              const x = cx + (Math.random() - 0.5) * 2 * outerRadius;
              const y = cy + (Math.random() - 0.5) * 2 * outerRadius;
              
              if (isPointInStar(x, y, cx, cy, 5, outerRadius, innerRadius)) {
                    skyStars.current.push({
                        x: x,
                        y: y,
                        originX: x,
                        originY: y,
                        vx: 0,
                        vy: 0,
                        size: Math.random() * 1.5 + 0.5,
                        color: '#fef08a', // Light yellow
                        density: 0,
                        friction: 0.9,
                        ease: 0,
                        type: 'sky_star'
                    });
                    particlesCreated++;
              }
          }
      }
  };

  const launchFirework = (count: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      for (let i = 0; i < count; i++) {
          const startX = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
          const color = COLORS.ORNAMENTS[Math.floor(Math.random() * COLORS.ORNAMENTS.length)];
          
          // Target Height: Sky area (Top 10% to 40% of screen)
          const targetY = canvas.height * 0.1 + Math.random() * (canvas.height * 0.3);

          fireworks.current.push({
              x: startX,
              y: canvas.height,
              originX: startX,
              originY: targetY, 
              vx: (Math.random() - 0.5) * 4, // Spread out a bit more
              vy: -(Math.random() * 4 + 10), // High initial velocity to reach sky
              size: 3,
              color: color,
              density: 1,
              friction: 0.96, // Slightly more drag so they stop at apex
              ease: 0,
              type: 'firework_rocket',
              life: 1
          });
      }
  };

  const initTree = (width: number, height: number) => {
    if (width === 0 || height === 0) return;

    particles.current = [];
    groundParticles.current = [];
    skyStars.current = []; 
    
    const centerX = width / 2;
    // Tree dimensions
    const treeHeight = Math.min(height * 0.7, 600);
    const treeBaseWidth = Math.min(width * 0.8, 500);
    const trunkHeight = treeHeight * 0.15;
    const trunkWidth = treeBaseWidth * 0.2;
    const leavesHeight = treeHeight * 0.85;
    const bottomY = height - (height - treeHeight-50) / 2;
    const startY = bottomY - trunkHeight;

    // 1. Generate Trunk Particles
    const numTrunkParticles = (trunkWidth * trunkHeight) / 20 * PARTICLE_DENSITY_TRUNK;
    const trunkBounds = { minX: centerX - trunkWidth/2, maxX: centerX + trunkWidth/2 };
    
    for (let i = 0; i < numTrunkParticles; i++) {
      const p = getRandomPointInRect(centerX - trunkWidth / 2, startY, trunkWidth, trunkHeight);
      const particle = createParticle(p.x, p.y, COLORS.TRUNK, 'trunk');
      particle.bounds = trunkBounds;
      particles.current.push(particle);
    }

    // 2. Generate Leaves (3 Triangles stacked)
    // Modified: No initial ornaments, just leaves
    const layerHeight = leavesHeight / TREE_LAYERS;
    
    for (let i = 0; i < TREE_LAYERS; i++) {
      const currentBaseY = startY - (i * (layerHeight * 0.7));
      const nextTopY = currentBaseY - layerHeight * 1.5;
      const currentWidth = treeBaseWidth * (1 - i * 0.25);
      
      const p1 = { x: centerX, y: nextTopY };
      const p2 = { x: centerX - currentWidth / 2, y: currentBaseY };
      const p3 = { x: centerX + currentWidth / 2, y: currentBaseY };

      const area = (currentWidth * (currentBaseY - nextTopY)) / 2;
      const numParticles = (area / 15) * PARTICLE_DENSITY_LEAVES;

      for (let j = 0; j < numParticles; j++) {
        const p = getRandomPointInTriangle(p1, p2, p3);
        
        // Calculate Edge Logic
        const progress = (p.y - nextTopY) / (currentBaseY - nextTopY);
        const halfWidthAtY = (currentWidth / 2) * progress;
        const distFromCenter = Math.abs(p.x - centerX);
        const isEdge = distFromCenter > (halfWidthAtY * 0.85);
        
        // Calculate Bounds for inner sway
        const innerBound = halfWidthAtY * 0.85;
        const bounds = { minX: centerX - innerBound, maxX: centerX + innerBound };

        // Only create LEAVES initially. Ornaments are user-added later.
        const color = COLORS.LEAVES[Math.floor(Math.random() * COLORS.LEAVES.length)];
        const particle = createParticle(p.x, p.y, color, 'leaf', undefined, isEdge);
        if (!isEdge) particle.bounds = bounds;
        particles.current.push(particle);
      }
    }

    // 3. Generate Star
    const starCenterY = startY - (TREE_LAYERS - 1) * (layerHeight * 0.7) - layerHeight * 1.5;
    const starRadius = 25;
    
    for(let i = 0; i < 400; i++) {
       const x = (Math.random() * starRadius * 2) - starRadius + centerX;
       const y = (Math.random() * starRadius * 2) - starRadius + starCenterY;
       
       if (isPointInStar(x, y, centerX, starCenterY, 5, starRadius, starRadius * 0.4)) {
         particles.current.push(createParticle(x, y, COLORS.STAR, 'star', Math.random() * 2 + 1));
       }
    }

    // 4. Initialize Snow
    initSnow(width, height);
    
    // Restore score effects
    if (prevScoreRef.current > 0) {
        spawnGroundParticles(Math.floor(prevScoreRef.current / 16));
        spawnSkyStars(Math.floor(prevScoreRef.current / 100));
    }

    setIsLoaded(true);
  };

  const initSnow = (width: number, height: number) => {
    snowParticles.current = [];
    for (let i = 0; i < SNOW_COUNT; i++) {
        snowParticles.current.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2 + 1,
            speed: Math.random() * 1.5 + 0.5,
            wind: (Math.random() - 0.5) * 0.5
        });
    }
  };

  const createParticle = (x: number, y: number, color: string, type: Particle['type'], sizeOverride?: number, isEdge: boolean = false): Particle => {
    const size = sizeOverride || (Math.random() * 2 + 1);
    
    // Only 20% of non-edge particles should sway
    const canSway = !isEdge && Math.random() < 0.2;

    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight, 
      originX: x,
      originY: y,
      color: color,
      size: size,
      vx: 0,
      vy: 0,
      density: (Math.random() * 20) + 10,
      friction: 0.9,
      ease: RETURN_SPEED + (Math.random() * 0.05),
      type: type,
      isEdge: isEdge,
      canSway: canSway, // Assign sway capability
      colorTimer: (type === 'ornament' || type === 'user_ornament') ? Math.floor(Math.random() * 200) + 50 : undefined
    };
  };

  const spawnGift = (width: number) => {
      const rand = Math.random();
      let type: Gift['type'] = 'small';
      let widthPx = 30;
      let heightPx = 30;
      let color = '#22c55e'; // Green
      let speedMult = 1;
      let score = 2;

      // Distribution: 50% Small, 30% Medium, 20% Large
      if (rand > 0.8) {
          type = 'large';
          widthPx = 50;
          heightPx = 50;
          color = '#ef4444'; // Red
          speedMult = 2;
          score = 8;
      } else if (rand > 0.5) {
          type = 'medium';
          widthPx = 40;
          heightPx = 40;
          color = '#ffffff'; // White
          speedMult = 1.5;
          score = 6;
      }

      const x = Math.random() * (width - widthPx) + widthPx/2;

      gifts.current.push({
          id: Date.now() + Math.random(),
          x: x,
          y: -60, // Start above screen
          width: widthPx,
          height: heightPx,
          color: color,
          type: type,
          speedMultiplier: speedMult,
          baseScore: score,
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 0.05
      });
  };

  const createExplosion = (x: number, y: number, color: string, isFirework: boolean = false) => {
      // Create particles
      const count = isFirework ? 60 : 25;
      for(let i=0; i<count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * (isFirework ? 8 : 5) + 2;
          
          const explosionColors = isFirework 
            ? [color, '#ffffff', '#fbbf24', '#f472b6'] 
            : [color, '#ffffff', '#fbbf24'];
            
          const pColor = explosionColors[Math.floor(Math.random() * explosionColors.length)];

          particles.current.push({
              x: x,
              y: y,
              originX: x,
              originY: y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: Math.random() * (isFirework ? 5 : 4) + 2,
              color: pColor,
              density: 1,
              friction: 0.95,
              ease: 0,
              type: isFirework ? 'firework_spark' : 'explosion',
              life: 1.0,
              decay: (0.02 + Math.random() * 0.02) * (isFirework ? 0.7 : 1),
              isEdge: false
          });
      }
      
      if (isFirework) {
          const text = FIREWORK_TEXTS[Math.floor(Math.random() * FIREWORK_TEXTS.length)];
          textParticles.current.push({
              x: x,
              y: y,
              text: text,
              opacity: 1,
              vy: -1,
              color: '#ffffff',
              scale: 0.5
          });
      }
  };

  const createShockwave = (x: number, y: number) => {
      shockwaves.current.push({
          x: x,
          y: y,
          originX: x, originY: y,
          vx: 0, vy: 0,
          size: 0, // Starts at 0 radius
          color: 'rgba(255, 255, 255, 0.5)',
          density: 0, friction: 0, ease: 0,
          type: 'shockwave',
          life: 1.0,
          decay: 0.02
      });
  };

  const update = (width: number, height: number) => {
    // 1. Update Snow
    for (let i = 0; i < snowParticles.current.length; i++) {
        const s = snowParticles.current[i];
        s.y += s.speed;
        s.x += s.wind;
        if (s.y > height) {
            s.y = -5;
            s.x = Math.random() * width;
        }
    }

    // 2. Gift Spawning & Logic
    giftSpawnTimer.current++;
    if (giftSpawnTimer.current > 60) {
        if (Math.random() < 0.4) {
            spawnGift(width);
        }
        giftSpawnTimer.current = 0;
    }

    for (let i = gifts.current.length - 1; i >= 0; i--) {
        const g = gifts.current[i];
        g.y += GIFT_BASE_SPEED * g.speedMultiplier;
        g.rotation += g.rotationSpeed;
        if (g.y > height + 60) gifts.current.splice(i, 1);
    }

    // 3. Update Mouse Trail - Only when moving
    const mx = mouse.current.x;
    const my = mouse.current.y;
    
    // Calculate movement delta if mouse is active
    let hasMoved = false;
    if (mx !== null && my !== null && prevMouse.current.x !== null && prevMouse.current.y !== null) {
        if (mx !== prevMouse.current.x || my !== prevMouse.current.y) {
            hasMoved = true;
        }
    } else if (mx !== null && my !== null) {
        // First entry
        hasMoved = true;
    }

    if (mx !== null && my !== null && hasMoved) {
        for(let k = 0; k < 4; k++) { 
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 0.5;
            trailParticles.current.push({
                x: mx,
                y: my,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                originX: 0,
                originY: 0,
                size: Math.random() * 4 + 2,
                color: TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)],
                density: 1,
                friction: 0.95,
                ease: 0,
                type: 'trail',
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03
            });
        }
    }
    
    // Update previous mouse position for next frame
    prevMouse.current = { x: mx, y: my };

    // 4. Update Trail Particles
    for (let i = trailParticles.current.length - 1; i >= 0; i--) {
        const p = trailParticles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= p.friction;
        p.vy *= p.friction;
        if (p.life !== undefined && p.decay !== undefined) {
            p.life -= p.decay;
            if (p.life <= 0) trailParticles.current.splice(i, 1);
        }
    }
    
    // 5. Update Fireworks Rockets
    for (let i = fireworks.current.length - 1; i >= 0; i--) {
        const p = fireworks.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        
        // Add trail for rocket
        trailParticles.current.push({
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5),
            vy: (Math.random() - 0.5),
            originX: 0, originY: 0,
            size: Math.random() * 2 + 1,
            color: p.color,
            density: 0, friction: 0, ease: 0,
            type: 'trail',
            life: 0.5,
            decay: 0.05
        });

        // Explode condition (reached apex or target Y)
        if (p.vy >= 0 || p.y <= p.originY) {
            createExplosion(p.x, p.y, p.color, true);
            fireworks.current.splice(i, 1);
        }
    }

    // 6. Update Firework Text
    for (let i = textParticles.current.length - 1; i >= 0; i--) {
        const t = textParticles.current[i];
        t.y += t.vy;
        t.vy *= 0.9; // Slow down upward movement
        t.opacity -= 0.01;
        t.scale = Math.min(t.scale + 0.05, 1.5);
        
        if (t.opacity <= 0) {
            textParticles.current.splice(i, 1);
        }
    }

    // 7. Update Shockwaves
    for (let i = shockwaves.current.length - 1; i >= 0; i--) {
        const sw = shockwaves.current[i];
        sw.size += 5; // Expand radius
        if (sw.life !== undefined && sw.decay !== undefined) {
            sw.life -= sw.decay;
            if (sw.life <= 0) {
                shockwaves.current.splice(i, 1);
            }
        }
    }
    
    // mx, my already defined above

    // 8. Update Ground Particles (Up/Down/Left/Right Sway)
    // Add sinusoidal movement + Mouse influence
    const time = Date.now() * 0.002;
    for (let i = 0; i < groundParticles.current.length; i++) {
        const p = groundParticles.current[i];
        
        let targetX = p.originX;
        let targetY = p.originY;

        // Mouse Influence (Sway X/Y)
        if (mx !== null && my !== null) {
            targetX += (mx - width/2) * 0.02; // Gentle follow X
            targetY += (my - height/2) * 0.02; // Gentle follow Y
        }

        // Add some life (breathing)
        targetY += Math.sin(time + p.originX * 0.05) * 5; 

        // Standard ease to target
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        
        p.vx += dx * p.ease;
        p.vy += dy * p.ease;
        
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.x += p.vx;
        p.y += p.vy;
    }

    // 9. Update Tree & Explosion Particles
    if (!particles.current) return;

    // Pre-calculate global mouse sway for tree
    const swayX = (mx !== null ? (mx - width/2) * 0.03 : 0);
    const swayY = (my !== null ? (my - height/2) * 0.03 : 0);

    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];

      // Handle Explosion/Spark Particles
      if (p.type === 'explosion' || p.type === 'firework_spark') {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.15; // Gravity
          p.vx *= p.friction;
          p.vy *= p.friction;
          
          if (p.life !== undefined && p.decay !== undefined) {
              p.life -= p.decay;
              if (p.life <= 0) {
                  particles.current.splice(i, 1);
                  continue;
              }
          }
          continue; 
      }

      // Normal Tree Particles Logic
      // Updated: Allow user_ornament to change colors too
      if ((p.type === 'ornament' || p.type === 'user_ornament') && p.colorTimer !== undefined) {
          p.colorTimer--;
          if (p.colorTimer <= 0) {
              p.color = COLORS.ORNAMENTS[Math.floor(Math.random() * COLORS.ORNAMENTS.length)];
              p.colorTimer = Math.floor(Math.random() * 150) + 50; 
          }
      }

      // Physics interactions (Mouse Repulsion for all tree parts)
      let dx = (mx !== null ? mx : -9999) - p.x;
      let dy = (my !== null ? my : -9999) - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < MOUSE_RADIUS) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
          const directionX = forceDirectionX * force * p.density;
          const directionY = forceDirectionY * force * p.density;
          
          p.vx -= directionX;
          p.vy -= directionY;
      }

      // Shockwave Interaction (Push all tree particles)
      for(const sw of shockwaves.current) {
          const distSw = Math.sqrt(Math.pow(p.x - sw.x, 2) + Math.pow(p.y - sw.y, 2));
          // Shockwave pushes particles near its expanding ring
          if (distSw < sw.size + 20 && distSw > sw.size - 20) {
              const forceSw = 5; // Strong push
              const angleSw = Math.atan2(p.y - sw.y, p.x - sw.x);
              p.vx += Math.cos(angleSw) * forceSw;
              p.vy += Math.sin(angleSw) * forceSw;
          }
      }

      // Return to origin with Sway (Clamped)
      let targetX = p.originX;
      let targetY = p.originY;

      // Apply sway ONLY if NOT edge AND particle has sway capability (20% chance)
      // Note: User ornaments (User added) always sway lightly
      if ((!p.isEdge && p.canSway) || p.type === 'user_ornament') {
          if (mx !== null && my !== null) {
            targetX += swayX;
            targetY += swayY;
          }
      }

      // Physics integration
      const dxHome = targetX - p.x;
      const dyHome = targetY - p.y;
      p.vx += dxHome * p.ease;
      p.vy += dyHome * p.ease;

      p.vx *= p.friction;
      p.vy *= p.friction;
      
      let nextX = p.x + p.vx;
      let nextY = p.y + p.vy;

      // Clamp X to bounds if they exist (Prevent flying off tree too far)
      if (p.bounds) {
          if (nextX < p.bounds.minX) nextX = p.bounds.minX;
          if (nextX > p.bounds.maxX) nextX = p.bounds.maxX;
      }
      
      p.x = nextX;
      p.y = nextY;
    }
  };

  const drawGift = (ctx: CanvasRenderingContext2D, g: Gift) => {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rotation);
      
      ctx.fillStyle = g.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = g.color;
      ctx.fillRect(-g.width/2, -g.height/2, g.width, g.height);
      
      ctx.fillStyle = g.type === 'medium' ? '#ef4444' : '#fbbf24'; 
      const ribbonWidth = g.width * 0.2;
      ctx.fillRect(-g.width/2, -ribbonWidth/2, g.width, ribbonWidth); 
      ctx.fillRect(-ribbonWidth/2, -g.height/2, ribbonWidth, g.height); 
      
      ctx.shadowBlur = 0;
      ctx.restore();
  };

  const drawGround = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.beginPath();
      // Draw a curve for the ground
      ctx.moveTo(0, height);
      ctx.lineTo(0, height - 50);
      ctx.quadraticCurveTo(width / 2, height - 150, width, height - 50);
      ctx.lineTo(width, height);
      ctx.closePath();
      
      // Create gradient for snowy ground
      const grad = ctx.createLinearGradient(0, height - 150, 0, height);
      grad.addColorStop(0, '#f8fafc'); // White/Slate-50
      grad.addColorStop(1, '#e2e8f0'); // Slate-200
      
      ctx.fillStyle = grad;
      ctx.fill();
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // 0. Draw Sky Stars (Background)
    for (let i = 0; i < skyStars.current.length; i++) {
        const p = skyStars.current[i];
        const time = Date.now() * 0.003;
        const opacity = 0.5 + Math.sin(time + p.x) * 0.5;
        ctx.globalAlpha = opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 1. Draw Ground
    drawGround(ctx, width, height);
    
    // 2. Draw Ground Particles (Lights)
    for (let i = 0; i < groundParticles.current.length; i++) {
        const p = groundParticles.current[i];
        const time = Date.now() * 0.005;
        const flicker = 0.8 + Math.sin(time * 3 + p.x) * 0.2;
        ctx.globalAlpha = flicker;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    // 3. Draw Tree & Explosion Particles
    for (let i = 0; i < particles.current.length; i++) {
      const p = particles.current[i];
      
      // Star Flicker Effect
      if (p.type === 'star') {
        const time = Date.now() * 0.005;
        const flicker = 0.7 + Math.sin(time * 2 + p.x) * 0.3;
        ctx.globalAlpha = flicker;
      } else if (p.type === 'explosion' || p.type === 'firework_spark') {
        ctx.globalAlpha = p.life || 0;
      } else {
        ctx.globalAlpha = 1.0;
      }
      
      // Breathing color for leaves
      if (p.type === 'leaf') {
          const time = Date.now() * 0.002;
          const breathe = Math.sin(time + p.originX * 0.01) * 0.2; // -0.2 to 0.2
          // Very simple lighting: modify brightness by alpha or overlay
          ctx.globalAlpha = 0.8 + breathe; 
      }

      ctx.fillStyle = p.color;
      ctx.beginPath();
      
      if (p.type === 'ornament' || p.type === 'star' || p.type === 'user_ornament') {
          ctx.shadowBlur = p.type === 'user_ornament' ? 15 : 8; // Extra glow for user ornaments
          ctx.shadowColor = p.color;
      } else if (p.type === 'explosion' || p.type === 'firework_spark') {
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
      } else {
          ctx.shadowBlur = 0;
      }

      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1.0;

    // Draw Shockwaves
    for (let i = 0; i < shockwaves.current.length; i++) {
        const sw = shockwaves.current[i];
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.size, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${sw.life})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // 4. Draw Gifts
    for (let i = 0; i < gifts.current.length; i++) {
        drawGift(ctx, gifts.current[i]);
    }

    // 5. Draw Mouse & Firework Trail
    ctx.shadowBlur = 5;
    for (let i = 0; i < trailParticles.current.length; i++) {
        const p = trailParticles.current[i];
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = p.life || 0;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0; 

    // 6. Draw Firework Rockets
    for (let i = 0; i < fireworks.current.length; i++) {
        const p = fireworks.current[i];
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // 7. Draw Firework Text
    for (let i = 0; i < textParticles.current.length; i++) {
        const t = textParticles.current[i];
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.scale(t.scale, t.scale);
        ctx.globalAlpha = t.opacity;
        ctx.fillStyle = '#fbbf24'; // Gold
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15;
        ctx.font = "bold 32px serif";
        ctx.textAlign = "center";
        ctx.fillText(t.text, 0, 0);
        ctx.restore();
    }
    ctx.globalAlpha = 1.0;

    // 8. Draw Snow
    ctx.fillStyle = 'white';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'white';
    for (let i = 0; i < snowParticles.current.length; i++) {
        const s = snowParticles.current[i];
        ctx.beginPath();
        ctx.globalAlpha = 0.7;
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    update(canvas.width, canvas.height);
    draw(ctx);
    animationFrameId.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const w = window.innerWidth || document.documentElement.clientWidth || 800;
      const h = window.innerHeight || document.documentElement.clientHeight || 600;
      canvas.width = w;
      canvas.height = h;
      initTree(w, h);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); 

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if(rect) {
        mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  };

  const handleMouseLeave = () => {
    mouse.current = { x: null, y: null };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
        mouse.current = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
     if (!canvasRef.current) return;
     const rect = canvasRef.current.getBoundingClientRect();
     const clickX = e.clientX - rect.left;
     const clickY = e.clientY - rect.top;
     
     // 1. Check for gift clicks
     let hitGift = false;
     for (let i = gifts.current.length - 1; i >= 0; i--) {
         const g = gifts.current[i];
         if (clickX >= g.x - g.width/2 - 10 && clickX <= g.x + g.width/2 + 10 &&
             clickY >= g.y - g.height/2 - 10 && clickY <= g.y + g.height/2 + 10) {
                 
             const score = g.baseScore * g.speedMultiplier;
             onScoreUpdate(score);
             createExplosion(g.x, g.y, g.color);
             gifts.current.splice(i, 1);
             hitGift = true;
             return; 
         }
     }

     // 2. Shockwave logic
     // Trigger if score > 0 AND (score is multiple of 9 OR score is multiple of 28)
     if (!hitGift && currentScore > 0 && (currentScore % 9 === 0 || currentScore % 28 === 0)) {
         createShockwave(clickX, clickY);
         createExplosion(clickX, clickY, 'rgba(255,255,255,0.8)', false); 
     }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onMouseDown={handleMouseDown}
        className="block cursor-pointer touch-none"
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none">
          <p className="text-xl animate-pulse">Planting tree...</p>
        </div>
      )}
    </div>
  );
};

export default TreeCanvas;