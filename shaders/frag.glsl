precision mediump float;

varying vec2 vTexcoord;

uniform sampler2D uTexture;
uniform int uUseTexture; // 1 if texture should be used
uniform vec4 uColor;

void main() {
    if (uUseTexture == 1) {
        gl_FragColor = texture2D(uTexture, vTexcoord);
    } else {
        gl_FragColor = uColor;
    }
}
