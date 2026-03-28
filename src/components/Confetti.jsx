// src/components/Confetti.jsx
import { useEffect, useRef } from 'react';

var COLORS = [
  '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD',
  '#10B981', '#34D399', '#F59E0B', '#FBBF24',
  '#EF4444', '#F87171', '#3B82F6', '#60A5FA',
  '#EC4899', '#F472B6',
];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export default function Confetti(props) {
  var active = props.active;
  var duration = props.duration || 3000;
  var particleCount = props.particleCount || 80;

  var canvasRef = useRef(null);
  var animationRef = useRef(null);
  var particlesRef = useRef([]);

  useEffect(function () {
    if (!active || !canvasRef.current) return;

    var canvas = canvasRef.current;
    var ctx = canvas.getContext('2d');

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create particles
    var particles = [];
    for (var i = 0; i < particleCount; i++) {
      particles.push({
        x: randomBetween(0, canvas.width),
        y: randomBetween(-canvas.height * 0.5, 0),
        vx: randomBetween(-3, 3),
        vy: randomBetween(2, 7),
        width: randomBetween(6, 12),
        height: randomBetween(4, 8),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: randomBetween(0, 360),
        rotationSpeed: randomBetween(-8, 8),
        oscillation: randomBetween(0, Math.PI * 2),
        oscillationSpeed: randomBetween(0.02, 0.06),
        opacity: 1,
        gravity: randomBetween(0.02, 0.06),
        drag: randomBetween(0.97, 0.99),
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      });
    }
    particlesRef.current = particles;

    var startTime = Date.now();

    function animate() {
      var elapsed = Date.now() - startTime;
      var progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      var allDone = true;

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        // Update physics
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.x += p.vx + Math.sin(p.oscillation) * 0.5;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.oscillation += p.oscillationSpeed;

        // Fade out in last 30%
        if (progress > 0.7) {
          p.opacity = Math.max(0, 1 - (progress - 0.7) / 0.3);
        }

        // Check if still visible
        if (p.y < canvas.height + 50 && p.opacity > 0.01) {
          allDone = false;
        }

        // Draw
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(
            -p.width / 2,
            -p.height / 2,
            p.width,
            p.height
          );
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (!allDone && progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animationRef.current = requestAnimationFrame(animate);

    // Handle resize
    function handleResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', handleResize);

    return function () {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, duration, particleCount]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="confetti-canvas"
    />
  );
}