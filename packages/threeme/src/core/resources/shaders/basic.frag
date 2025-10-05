precision mediump float;

uniform vec3 uColor;
uniform bool uUseMap;
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uAlphaTest;

varying vec2 vUV;

void main() {
    vec3 color = uColor;
    float alpha = uOpacity;

    if(uUseMap) {
        vec4 texColor = texture2D(uMap, vUV);
        color = texColor.rgb;
        alpha *= texColor.a;
    }

    // Alpha test: discard fragments below threshold
    if(uAlphaTest > 0.0 && alpha < uAlphaTest) {
        discard;
    }

    gl_FragColor = vec4(color, alpha);
}
