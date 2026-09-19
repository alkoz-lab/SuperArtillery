// Projectile physics
import type { Projectile } from './types/game';

export class Physics {
  /**
   * Convert angle and velocity to velocity components
   */
  public static calculateVelocityComponents(angle: number, velocity: number): { vx: number; vy: number } {
    const angleRad = (angle * Math.PI) / 180;
    return {
      vx: velocity * Math.cos(angleRad),
      vy: -velocity * Math.sin(angleRad), // Negative because Y increases downward
    };
  }

  /**
   * Update projectile position based on physics
   */
  public static updateProjectile(projectile: Projectile, dt: number, gravity: number, wind: number): Projectile {
    return {
      x: projectile.x + projectile.vx * dt + 0.5 * wind * dt * dt,
      y: projectile.y + projectile.vy * dt,
      vx: projectile.vx + wind * dt,
      vy: projectile.vy + gravity * dt,
    };
  }
}
