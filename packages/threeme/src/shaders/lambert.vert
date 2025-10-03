// World-space normal path, matching renderer
attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 uMVP;           // Projection * View * Model
uniform mat3 uNormalMatrix;  // inverse-transpose of Model (upper-left 3x3)

varying vec3 vNormalW;
varying vec3 vPositionW;

void main() {
    vNormalW = normalize(uNormalMatrix * aNormal);
    vPositionW = (uMVP * vec4(aPosition, 1.0)).xyz;
    gl_Position = uMVP * vec4(aPosition, 1.0);
}
