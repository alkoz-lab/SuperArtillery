import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectileAnimator } from '../ts/projectile-animator';

function createRendererMock() {
  return {
    getCastleTopY: vi.fn().mockReturnValue(100),
    getTerrainY: vi.fn().mockReturnValue(140)
  };
}

describe('ProjectileAnimator active trajectory lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('emits an active frame and clears it when stopped', () => {
    const renderer = createRendererMock();
    const animator = new ProjectileAnimator(renderer as any, 420);
    const frames: Array<{ projectile: unknown; trajectory: Array<{ x: number; y: number }> }> = [];
    const requestFrame = vi.fn().mockReturnValue(1);
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    animator.onFrame((frame) => frames.push(frame));

    animator.fire(45, 100, 25, 0);
    animator.stop();

    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(frames).toEqual([{ projectile: null, trajectory: [] }]);
  });

  it('clears the active channel when a projectile reaches the terrain', () => {
    const renderer = createRendererMock();
    renderer.getTerrainY.mockReturnValue(100);
    const animator = new ProjectileAnimator(renderer as any, 420);
    const frames: Array<{ projectile: unknown; trajectory: Array<{ x: number; y: number }> }> = [];
    const callbacks: Array<(timestamp: number) => void> = [];
    vi.stubGlobal('requestAnimationFrame', (callback: (timestamp: number) => void) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    animator.onFrame((frame) => frames.push(frame));

    animator.fire(0, 0, 25, 0);
    callbacks.shift()?.(16);
    callbacks.shift()?.(32);

    expect(frames.at(-1)).toEqual({ projectile: null, trajectory: [] });
  });

  it('notifies completion separately from the active-frame clear', () => {
    const renderer = createRendererMock();
    renderer.getTerrainY.mockReturnValue(100);
    const animator = new ProjectileAnimator(renderer as any, 420);
    const callbacks: Array<(timestamp: number) => void> = [];
    const complete = vi.fn();
    vi.stubGlobal('requestAnimationFrame', (callback: (timestamp: number) => void) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    animator.onComplete(complete);

    animator.fire(0, 0, 25, 0);
    callbacks.shift()?.(16);
    callbacks.shift()?.(32);

    expect(complete).toHaveBeenCalledOnce();
  });
});
