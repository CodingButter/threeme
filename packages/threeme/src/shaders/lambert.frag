precision mediump float;

varying vec3 vNormalW;

uniform vec3 uBaseColor;
uniform vec3 uLightDir;        // light → surface (ray dir)
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform vec3 uAmbient;
uniform bool uDoubleSided;     // ✅ required

void main() {
    vec3 N = normalize(vNormalW);

  // ✅ flip the normal when drawing the back face IF material is double-sided
    if(uDoubleSided && !gl_FrontFacing) {
        N = -N;
    }

    float NdotL = max(dot(N, -normalize(uLightDir)), 0.0);
    vec3 diffuse = uBaseColor * uLightColor * (uLightIntensity * NdotL);
    gl_FragColor = vec4(uAmbient * uBaseColor + diffuse, 1.0);
}
