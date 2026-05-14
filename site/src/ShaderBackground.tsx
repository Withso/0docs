import { useEffect, useRef } from "react";

/**
 * Subtle full-bleed shader background. Renders a slow, organic flow-field
 * of value noise in neutral grayscale tones. Designed to sit behind page
 * content as ambient motion — extremely low contrast, no color, slow tempo.
 *
 * Implementation notes:
 *  - Raw WebGL (no three.js) to keep the bundle light.
 *  - Single full-screen triangle, fragment shader does all the work.
 *  - Honors `prefers-reduced-motion` by freezing the time uniform.
 *  - Adapts to light/dark by sampling --background luminance once on mount
 *    (and on theme changes via a MutationObserver on <html>).
 */
const ShaderBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      antialias: false,
      premultipliedAlpha: false,
      alpha: true,
    });
    if (!gl) return;

    const vert = `
      attribute vec2 a_pos;
      void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `;

    // Smooth value-noise based flow. Two octaves are warped by a slow
    // domain-distortion pass to get organic, drifting cloud-like ridges.
    // Output is mapped to a thin band around mid-gray and then mixed with
    // the page base color so the effect stays subtle on both themes.
    const frag = `
      precision highp float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform float u_isDark;

      // Hash + value noise (cheap, no textures).
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.02;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
        float t = u_time * 0.04;

        // Domain warp for organic flow.
        vec2 q = vec2(fbm(uv * 1.2 + vec2(0.0, t)),
                      fbm(uv * 1.2 + vec2(5.2, -t)));
        vec2 r = vec2(fbm(uv * 1.6 + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t),
                      fbm(uv * 1.6 + 4.0 * q + vec2(8.3, 2.8) - 0.12 * t));
        float n = fbm(uv * 1.4 + 4.0 * r);

        // Soft contrast tightening keeps it from looking like flat fog.
        n = smoothstep(0.25, 0.85, n);

        // Neutral-only output. Dark theme: lift toward near-black greys,
        // light theme: drop toward near-white greys. Amplitude is tiny.
        float base = mix(0.96, 0.06, u_isDark);
        float amp  = mix(0.045, 0.055, u_isDark);
        float v = base + (n - 0.5) * amp;

        // Subtle vignette so corners stay calm.
        float vig = smoothstep(1.4, 0.2, length(uv));
        v = mix(base, v, vig);

        gl_FragColor = vec4(vec3(v), 1.0);
      }
    `;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        // Surface the error to the console once; don't crash the page.
        // eslint-disable-next-line no-console
        console.warn("ShaderBackground compile failed:", gl.getShaderInfoLog(sh));
      }
      return sh;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(program);
    gl.useProgram(program);

    // Full-viewport triangle.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uDark = gl.getUniformLocation(program, "u_isDark");

    const isDark = () =>
      document.documentElement.classList.contains("dark") ? 1 : 0;
    gl.uniform1f(uDark, isDark());

    const themeObserver = new MutationObserver(() => {
      gl.uniform1f(uDark, isDark());
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uRes, w, h);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    const start = performance.now();
    const render = (now: number) => {
      const t = reduceMotion ? 0 : (now - start) / 1000;
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      themeObserver.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 w-full h-full -z-10 opacity-70"
    />
  );
};

export default ShaderBackground;
