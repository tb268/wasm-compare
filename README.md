# WebAssembly vs JavaScript Physics Collision Load Test (wasm-compare)

A simple benchmark tool to compare the computational performance of WebAssembly (Rust) vs JavaScript (V8 Engine) through a physics collision simulation. Both engines use the exact same calculation algorithms and drawing methods for a fair performance comparison.

## Requirements

To build and run this project, you will need:
- [Rust](https://www.rust-lang.org/tools/install) installed.
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) installed.
- Python 3 (for running a local HTTP server).

## How to Run

1. **Build the WebAssembly Module**
   Run the following command in the project root directory to compile the Rust code to WebAssembly:
   ```bash
   wasm-pack build --target web
   ```

2. **Start a Local HTTP Server**
   Start a simple web server to serve the HTML, JavaScript, and WebAssembly files. You can use Python's built-in HTTP server:
   ```bash
   python3 -m http.server 8080
   ```

3. **Open the App in Your Browser**
   Open your web browser and navigate to:
   ```text
   http://localhost:8080/
   ```

## Features
- **Dynamic Particle Adjustment**: Use the UI slider to change the number of particles simulated in real-time.
- **Toggle Execution Modes**: You can run both simulations simultaneously, or run them independently to benchmark their maximum possible framerates.
- **FPS Monitor**: Check the real-time FPS counter to compare performance.
