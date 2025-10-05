precision mediump float;

varying vec3 vNormalW;
varying vec3 vPositionW; // world-space position from vertex shader
varying vec2 vUV;

uniform vec3 uBaseColor;
uniform vec3 uLightDir;        // light → surface (ray dir)
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform vec3 uAmbient;
uniform bool uUseMap;
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uAlphaTest;

// ---- Point Light Support ----
#ifndef MAX_POINT_LIGHTS
#define MAX_POINT_LIGHTS 10
#endif

struct PointLight {
  vec3 color;    // linear 0..1
  vec3 position; // world-space
  float distance;
  float decay;
  float intensity;
};

uniform int uPointLightCount;
uniform PointLight uPointLights[MAX_POINT_LIGHTS];
// -----------------------------

// Compute diffuse Lambert contribution for a point light
vec3 computePointLight(PointLight light, vec3 normal, vec3 posW, vec3 baseColor) {
  vec3 L = light.position - posW;       // surface → light
  float d = max(length(L), 0.0001);     // 🔒 avoid div-by-zero / NaN
  L = L / d;                            // normalize

  // classic lambert term
  float NdotL = max(dot(normal, L), 0.0);

  // attenuation: smooth cutoff (if distance > 0) and inverse-power falloff
  float attenuation = 1.0;
  if(light.distance > 0.0) {
    float falloff = 1.0 - clamp(d / light.distance, 0.0, 1.0);
    attenuation = falloff * falloff;
  }
  attenuation /= max(pow(d, max(light.decay, 0.0001)), 1e-6);

  return baseColor * light.color * (light.intensity * NdotL * attenuation);
}

void main() {
  vec3 N = normalize(vNormalW);

  vec3 baseColor = uBaseColor;
  float alpha = uOpacity;

  if(uUseMap) {
    vec4 texColor = texture2D(uMap, vUV);
    baseColor *= texColor.rgb;
    alpha *= texColor.a;
  }

  // Alpha test: discard fragments below threshold
  if(uAlphaTest > 0.0 && alpha < uAlphaTest) {
    discard;
  }

  // Directional diffuse
  float NdotL = max(dot(N, -normalize(uLightDir)), 0.0); // uLightDir is light→surface
  vec3 diffuse = baseColor * uLightColor * (uLightIntensity * NdotL);

  // Accumulate point lights
  vec3 plColor = vec3(0.0);
  for(int i = 0; i < MAX_POINT_LIGHTS; i++) {
    if(i >= uPointLightCount)
      break; // respects runtime count
    plColor += computePointLight(uPointLights[i], N, vPositionW, baseColor);
  }

  // Final
  vec3 color = uAmbient * baseColor + diffuse + plColor;
  color = clamp(color, 0.0, 1.0); // temporary safety; swap for tone mapping later
  gl_FragColor = vec4(color, alpha);
}