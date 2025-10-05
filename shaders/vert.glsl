attribute vec3 aPosition;
attribute vec2 aTexcoord;

uniform mat4 uMVPMatrix;

varying vec2 vTexcoord;

void main() {
    vTexcoord = aTexcoord;
    gl_Position = uMVPMatrix * vec4(aPosition, 1.0);
}
