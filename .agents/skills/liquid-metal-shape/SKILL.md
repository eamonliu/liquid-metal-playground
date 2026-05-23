---
name: liquid-metal-shape
description: Create or adapt a liquid-metal rendering effect for flat SVG logos, icon silhouettes, vector paths, masks, or high-contrast images. Use when AI agents need to give a 2D shape a chrome/liquid metal/glossy mercury appearance with WebGL/WebGPU/canvas shaders, procedural reflections, animated liquify distortion, RGB dispersion, beveled edges, or reusable controls for metal-look parameters.
---

# Liquid Metal Shape

## Core Idea

Turn the source SVG or flat image into a grayscale shape field, then let a fragment shader recolor every pixel as distorted studio-light reflections. The SVG supplies only the silhouette; the metal appearance comes from a mask-derived bevel field, procedural reflection bands, time-varying noise, and slight RGB channel offsets.

Prefer a WebGL/WebGPU/canvas shader for high fidelity. CSS gradients or SVG filters can approximate the look, but they usually cannot reproduce animated liquid distortion, per-channel dispersion, and curved reflection bands cleanly.

## Workflow

1. Rasterize the source shape at high resolution.
   - Use transparent or pure-white background as outside shape.
   - Use 500-1000 px on the longest side for interactive use.
   - For SVG input, force a large rasterization size before reading pixels.

2. Build a binary shape mask.
   - Outside: fully transparent pixels or pure white opaque pixels.
   - Inside: every other pixel.
   - Thin text and complex multi-color artwork are weaker inputs than bold silhouettes.

3. Derive a bevel/thickness field with a Poisson-style solve.
   - Mark inside pixels adjacent to outside pixels as boundary.
   - Solve `Delta u = -C` with `u = 0` at the boundary using Jacobi iterations:

```ts
newU[x, y] = (C + u[x + 1, y] + u[x - 1, y] + u[x, y + 1] + u[x, y - 1]) / 4;
```

   - Normalize `u` by the max value and remap:

```ts
gray = 255 * (1 - Math.pow(u / maxU, alpha));
```

   - Store the result as an RGBA texture where outside pixels are white and inside pixels are grayscale. In the shader, sample this as `edge = texture(mask, uv).r`.

4. Render a full-screen quad.
   - Vertex shader only passes UVs.
   - Fragment shader samples the grayscale mask and computes alpha, reflection direction, color bands, noise distortion, and RGB dispersion.
   - Upload the mask texture with `LINEAR` filtering and `CLAMP_TO_EDGE`; use device-pixel-ratio-aware canvas size.

5. Simulate metal through procedural reflections.
   - Use two endpoint colors: near-white highlight and very dark gray/blue shadow.
   - Create repeating reflection bands with `mod`, `mix`, and `smoothstep`.
   - Distort the band coordinate by screen UV, diagonal position, mask field, fake bulge, and animated noise.
   - Offset red and blue band positions from green for chromatic dispersion.
   - Use the mask field to fade/cut the logo edge.

## Shader Model

To achieve a truly "radiant" (流光溢彩) and premium liquid metal look, a simple linear stripe gradient is not enough. You must implement a highly tuned optical approximation in the fragment shader:

- **Mask field**: `edge = texture(mask, imgUv).r`; white means outside/edge, dark means shape interior.
- **Fake bulge & Rotation**: Derive a broad convex surface (`bulge`) from centered UV distance, but apply a diagonal offset and rotation. Use `bulge` to strongly modulate both the reflection direction and the chromatic dispersion.
- **Complex Reflection Bands**: Do not use a simple repeating `smoothstep`. Instead, construct a complex band function (`get_color_channel`) that creates a pattern of "thin bright strip -> dark strip -> thin bright strip -> gradient". This mimics complex studio lighting reflecting off curved glass/metal.
- **Non-linear Dispersion**: Do not apply a flat refraction offset to R and B channels. Compute `refr_r` and `refr_b` dynamically by blending noise, diagonal screen position, `bulge` magnitude, and `edge` distance. This ensures rainbow fringes appear intensely at the thickest parts and edges, rather than uniformly across the shape.
- **Dynamic Shadows**: The dark reflection color (`color2`) should not be a flat dark gray. Add a subtle ambient occlusion or directional tint (e.g., `vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, uv.x + uv.y))`) to enhance depth.

Representative complex stripe sampling function:

```glsl
float get_color_channel(float c1, float c2, float stripe_p, vec3 w, float extra_blur, float b) {
    float ch = c2;
    float border = 0.;
    float blur = u_patternBlur + extra_blur;

    // Thin strip 1
    ch = mix(ch, c1, smoothstep(.0, blur, stripe_p));
    border = w[0];
    ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));

    // Thin strip 2 (offset dynamically by bulge 'b')
    b = smoothstep(.2, .8, b);
    border = w[0] + .4 * (1. - b) * w[1];
    ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));
    border = w[0] + .5 * (1. - b) * w[1];
    ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));

    // Wide gradient
    border = w[0] + w[1];
    ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));
    float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
    float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
    ch = mix(ch, gradient, smoothstep(border - blur, border + blur, stripe_p));

    return ch;
}
```

This complex non-linear distortion combined with precise multi-band studio lighting approximations is what transforms a flat mask into stunning, iridescent liquid metal.

## Adjustable Parameters

Expose these controls when building an interactive implementation:

| Parameter | User label | Range | Step | Default | Effect |
|---|---:|---:|---:|---:|---|
| `refraction` | Dispersion | `0`-`0.06` | `0.001` | `0.015` | RGB channel offset. Higher values create stronger rainbow/fringe effects. |
| `edge` | Edge | `0`-`1` | `0.01` | `0.4` | Controls edge cutoff/softness from the grayscale mask. Lower values preserve more edge; higher values eat/soften more. |
| `patternBlur` | Pattern Blur | `0`-`0.05` | `0.001` | `0.005` | Blurs reflection band transitions. Higher values make softer, less mirror-like bands. |
| `liquid` | Liquify | `0`-`1` | `0.01` | `0.07` | Amount of animated noise distortion applied to the mask/reflection field. |
| `speed` | Speed | `0`-`1` | `0.01` | `0.3` | Time multiplier for animated reflection/noise movement. |
| `patternScale` | Pattern Scale | `1`-`10` | `0.1` | `2` | Frequency/spacing of reflection bands. Higher values create denser stripes. |
| `background` | Background | color/string | n/a | `metal` | Canvas/page background. `metal` can map to `linear-gradient(to bottom, #eee, #b8b8b8)`. |

Useful internal constants from the reference implementation:

| Constant | Default | Purpose |
|---|---:|---|
| `MAX_SIZE` | `1000` | Max raster size for input image/mask. |
| `MIN_SIZE` | `500` | Min raster size for stable mask detail. |
| `POISSON_C` | `0.01` | Source term for the bevel/thickness solve. |
| `POISSON_ITERATIONS` | `300` | Jacobi iteration count; increase for smoother large masks. |
| `alpha` | `2.0` | Nonlinear remap exponent for bevel contrast. |
| `frameAlphaWidth` | `0.01` | Safety fade near image-frame edges. |
| `color1` | `vec3(0.98, 0.98, 1.0)` | Bright reflected highlight color. |
| `color2` | `vec3(0.1, 0.1, 0.1+)` | Dark reflected shadow color. |

## Implementation Guidance

- Treat the source SVG as shape data, not as final artwork. Ignore original fill colors unless the user explicitly wants colored metal.
- Keep preprocessing on CPU and per-frame shading on GPU. Recompute the Poisson mask only when the input shape changes.
- Preserve aspect ratio in shader UVs; flip Y consistently between canvas image data and WebGL texture sampling.
- Prefer `highp` floats if banding appears on mobile GPUs.
- Keep the output alpha premultiplied visually: multiply color by opacity before writing if compositing over custom backgrounds.
- For static exports, render the canvas to PNG/WebP after uniforms settle. SVG output should embed a raster image or use a simpler fallback filter.
- If the user wants editable vector-only output, explain that the full liquid-metal look depends on raster shader evaluation; provide an SVG filter/gradient approximation only as a lower-fidelity variant.

## Quality Checks

Verify the effect with at least one bold logo and one thin/complex shape:

- The outside background must be transparent in the canvas output.
- Reflection bands should bend with the silhouette, not appear as flat linear gradients.
- Edge cutoff should not destroy thin strokes at default settings.
- Increasing `refraction` should visibly separate color fringes.
- Increasing `liquid` and `speed` should animate motion without changing the silhouette beyond acceptable shimmer.
- The result should still read as metal on white, black, and gray/metal backgrounds.
