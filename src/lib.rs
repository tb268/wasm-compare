use wasm_bindgen::prelude::*;

// Manage particle data flatly to make it easier to interact with JS
#[wasm_bindgen]
pub struct PhysicsEngine {
    width: f32,
    height: f32,
    count: usize,
    // Aggregate into a single Vec instead of individual structs to arrange in contiguous memory (ultra-fast)
    px: Vec<f32>,
    py: Vec<f32>,
    vx: Vec<f32>,
    vy: Vec<f32>,
    coords_buffer: Vec<f32>,
}

#[wasm_bindgen]
impl PhysicsEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(width: f32, height: f32, count: usize) -> PhysicsEngine {
        let mut px = vec![0.0; count];
        let mut py = vec![0.0; count];
        let mut vx = vec![0.0; count];
        let mut vy = vec![0.0; count];
        let coords_buffer = vec![0.0; count * 2];

        for i in 0..count {
            let seed = i as f32;
            px[i] = (seed * 17.5) % (width - 20.0) + 10.0;
            py[i] = (seed * 13.2) % (height - 20.0) + 10.0;
            vx[i] = ((seed * 1.5) % 3.0) - 1.5;
            vy[i] = ((seed * 2.3) % 3.0) - 1.5;
        }

        PhysicsEngine {
            width,
            height,
            count,
            px,
            py,
            vx,
            vy,
            coords_buffer,
        }
    }

    pub fn update(&mut self) {
        let gravity = 0.03;
        let bounce = -0.7;
        let min_dist = 4.0;
        let min_dist_sq = min_dist * min_dist;

        // 1. Collision detection between particles (safe parallel access via indices)
        for i in 0..self.count {
            for j in (i + 1)..self.count {
                let dx = self.px[j] - self.px[i];
                let dy = self.py[j] - self.py[i];
                let distance_sq = dx * dx + dy * dy;

                if distance_sq < min_dist_sq && distance_sq > 0.0 {
                    let distance = distance_sq.sqrt();
                    let overlap = min_dist - distance;
                    let nx = dx / distance;
                    let ny = dy / distance;
                    let push = overlap * 0.5;

                    self.px[i] -= nx * push;
                    self.py[i] -= ny * push;
                    self.px[j] += nx * push;
                    self.py[j] += ny * push;

                    let kx = self.vx[i] - self.vx[j];
                    let ky = self.vy[i] - self.vy[j];
                    let p = 0.1 * (kx * nx + ky * ny);

                    self.vx[i] -= p * nx;
                    self.vy[i] -= p * ny;
                    self.vx[j] += p * nx;
                    self.vy[j] += p * ny;
                }
            }
        }

        // 2. Movement and wall collision detection
        for i in 0..self.count {
            this_update_particle(
                i,
                self.width,
                self.height,
                gravity,
                bounce,
                &mut self.px,
                &mut self.py,
                &mut self.vx,
                &mut self.vy,
                &mut self.coords_buffer,
            );
        }
    }

    pub fn get_coordinates(&self) -> Vec<f32> {
        self.coords_buffer.clone()
    }
}

// Helper function to safely extract the loop process
#[inline(always)]
fn this_update_particle(
    i: usize,
    width: f32,
    height: f32,
    gravity: f32,
    bounce: f32,
    px: &mut Vec<f32>,
    py: &mut Vec<f32>,
    vx: &mut Vec<f32>,
    vy: &mut Vec<f32>,
    coords_buffer: &mut Vec<f32>,
) {
    vy[i] += gravity;
    px[i] += vx[i];
    py[i] += vy[i];

    let r = 2.0;
    if px[i] - r < 0.0 {
        px[i] = r;
        vx[i] *= bounce;
    } else if px[i] + r > width {
        px[i] = width - r;
        vx[i] *= bounce;
    }

    if py[i] - r < 0.0 {
        py[i] = r;
        vy[i] *= bounce;
    } else if py[i] + r > height {
        py[i] = height - r;
        vy[i] *= bounce;
    }

    coords_buffer[i * 2] = px[i];
    coords_buffer[i * 2 + 1] = py[i];
}
