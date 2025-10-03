// World-space normal path, matching renderer
attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 uMVP;           // Projection * View * Model
uniform mat3 uNormalMatrix;  // inverse-transpose of Model (upper-left 3x3)

varying vec3 vNormalW;

void main() {
    vNormalW = normalize(uNormalMatrix * aNormal);
    gl_Position = uMVP * vec4(aPosition, 1.0);
}
