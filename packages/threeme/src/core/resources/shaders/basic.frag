precision mediump float;

uniform vec3 uColor;
uniform bool uUseMap;
uniform sampler2D uMap;

varying vec2 vUV;

void main() {
    vec3 color = uColor;

    if(uUseMap) {
        vec4 texColor = texture2D(uMap, vUV);
        color = texColor.rgb;
    }
    gl_FragColor = vec4(color, 1.0);
}
