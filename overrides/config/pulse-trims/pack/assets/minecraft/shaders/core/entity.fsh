#version 330

//  Trim detection adapted from Emissive Trims by Bluebird (CC BY 4.0)
//  https://creativecommons.org/licenses/by/4.0/

#moj_import <minecraft:fog.glsl>
#moj_import <minecraft:dynamictransforms.glsl>
#moj_import <minecraft:globals.glsl>

uniform sampler2D Sampler0;

in float sphericalVertexDistance;
in float cylindricalVertexDistance;
#ifdef PER_FACE_LIGHTING
in vec4 vertexPerFaceColorBack;
in vec4 vertexPerFaceColorFront;
#else
in vec4 vertexColor;
#endif
in vec4 lightMapColor;
in vec4 overlayColor;
in vec2 texCoord0;

out vec4 fragColor;

void main() {
    vec4 color = texture(Sampler0, texCoord0);
    ivec2 texSize = textureSize(Sampler0, 0);
    vec2 texSizeF = vec2(texSize);
    vec4 colorTemp = texture(Sampler0, vec2(64.0 / texSizeF.x, 0.0 / texSizeF.y));
    bool isTrimAtlas = (texture(Sampler0, vec2(70.0 / texSizeF.x, 5.0 / texSizeF.y)) == vec4(0.0, 0.0, 0.0, 1.0));
    bool isTrimAtlas2 = (texture(Sampler0, vec2(70.0 / texSizeF.x, 13.0 / texSizeF.y)) == vec4(248.0 / 255.0, 0.0, 248.0 / 255.0, 1.0));
    bool isTrim = (texSize.x == 2048 && mod(texSizeF.y, 1024.0) == 0.0 && colorTemp.a != 1.0) && isTrimAtlas && isTrimAtlas2;

#ifdef ALPHA_CUTOUT
    if (color.a < ALPHA_CUTOUT) { discard; }
#endif

#ifdef PER_FACE_LIGHTING
    color *= (gl_FrontFacing ? vertexPerFaceColorFront : vertexPerFaceColorBack) * ColorModulator;
#else
    color *= vertexColor * ColorModulator;
#endif

#ifndef NO_OVERLAY
    color.rgb = mix(overlayColor.rgb, color.rgb, overlayColor.a);
#endif

    if (isTrim) {
        vec4 glow = vec4(color.rgb * vec3(1.0, 1.0, 1.0) * 5.0, color.a);
        float sat = 1.0000000;
        if (sat != 1.0) {
            vec3 gray = vec3(dot(glow.rgb, vec3(0.299, 0.587, 0.114)));
            glow.rgb = mix(gray, glow.rgb, sat);
        }
        float h = 0.0000000;
        if (h != 0.0) {
            float ha = h * 0.017453292;
            float c = cos(ha), s = sin(ha);
            glow.rgb *= mat3(
                vec3(0.299+0.701*c+0.168*s, 0.587-0.587*c+0.330*s, 0.114-0.114*c-0.497*s),
                vec3(0.299-0.299*c-0.328*s, 0.587+0.413*c+0.035*s, 0.114-0.114*c+0.292*s),
                vec3(0.299-0.300*c+1.250*s, 0.587-0.588*c-1.050*s, 0.114+0.886*c-0.203*s)
            );
        }
        float el = 0.0000000;
        if (el > 0.0) {
            float em = 1.0 - el * ((lightMapColor.r + lightMapColor.g + lightMapColor.b) / 3.0);
            glow.rgb *= max(0.0, em);
        }
        color = glow;
    } else {
    #ifndef EMISSIVE
        color *= lightMapColor;
    #endif
    }

    fragColor = apply_fog(color, sphericalVertexDistance, cylindricalVertexDistance,
        FogEnvironmentalStart, FogEnvironmentalEnd,
        FogRenderDistanceStart, FogRenderDistanceEnd, FogColor);
}
