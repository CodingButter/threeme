// World-space normal path, matching renderer
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUV;

uniform mat4 uModel;         // Model matrix
uniform mat4 uMVP;           // Projection * View * Model
uniform mat3 uNormalMatrix;  // inverse-transpose of Model (upper-left 3x3)

varying vec3 vNormalW;
varying vec3 vPositionW;
varying vec2 vUV;

void main() {
    vNormalW = normalize(uNormalMatrix * aNormal);
    vPositionW = (uModel * vec4(aPosition, 1.0)).xyz;
    vUV = aUV;
    gl_Position = uMVP * vec4(aPosition, 1.0);
}
