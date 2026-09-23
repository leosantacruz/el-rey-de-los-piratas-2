'use strict';

const VS = 'attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}';

const FS_BRIGHT = `precision mediump float;
varying vec2 v;
uniform sampler2D t;
uniform vec2 px;
uniform float th;
void main(){
  vec3 c = texture2D(t, v + px * vec2(-.5,-.5)).rgb + texture2D(t, v + px * vec2(.5,-.5)).rgb
         + texture2D(t, v + px * vec2(-.5,.5)).rgb + texture2D(t, v + px * vec2(.5,.5)).rgb;
  c *= .25;
  float l = max(dot(c, vec3(.3, .55, .15)), max(c.r, max(c.g, c.b)) * .85);
  gl_FragColor = vec4(c * smoothstep(th, th + .25, l), 1.);
}`;

const FS_BLUR = `precision mediump float;
varying vec2 v;
uniform sampler2D t;
uniform vec2 dir;
void main(){
  vec3 c = texture2D(t, v).rgb * .227;
  c += (texture2D(t, v + dir * 1.385).rgb + texture2D(t, v - dir * 1.385).rgb) * .316;
  c += (texture2D(t, v + dir * 3.231).rgb + texture2D(t, v - dir * 3.231).rgb) * .07;
  gl_FragColor = vec4(c, 1.);
}`;

const FS_COMP = `precision highp float;
varying vec2 v;
uniform sampler2D base, b1, b2;
uniform vec2 res, off;
uniform float zoom, rot, time, aberr, sat, flash, vig, heat, bk1, bk2, grain, scan, bright;
uniform vec3 flashC, tint;
uniform vec4 w0, w1, w2;
const float ASP = 480.0 / 270.0;

vec2 wave(vec2 uv, vec4 w){
  if (w.w <= 0.0) return uv;
  vec2 d = uv - w.xy;
  d.x *= ASP;
  float dist = length(d);
  float x = dist - w.z;
  float f = w.w * x * exp(-x * x * 260.0) * 6.0;
  vec2 n = d / max(dist, 0.0001);
  n.x /= ASP;
  return uv - n * f;
}
float inside(vec2 uv){
  return step(0.0, uv.x) * step(0.0, uv.y) * step(uv.x, 1.0) * step(uv.y, 1.0);
}
vec3 samp(vec2 uv){
  vec2 p = (floor(uv * res) + 0.5) / res;
  return texture2D(base, p).rgb * inside(uv);
}
void main(){
  vec2 uv = v - 0.5;
  uv.x *= ASP;
  float c = cos(rot), s = sin(rot);
  uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y) / zoom;
  uv.x /= ASP;
  uv += 0.5 + off;
  uv = wave(uv, w0);
  uv = wave(uv, w1);
  uv = wave(uv, w2);
  float hz = heat * smoothstep(0.16, 0.0, uv.y);
  uv.x += hz * sin(floor(uv.y * res.y) * 0.7 + time * 9.0) * 0.0025;
  vec2 dir = uv - 0.5;
  vec2 ab = dir * aberr * 0.014 + vec2(aberr * 0.0022, 0.0);
  vec3 col;
  col.r = samp(uv + ab).r;
  col.g = samp(uv).g;
  col.b = samp(uv - ab).b;
  float fy = fract(uv.y * res.y);
  float fx = fract(uv.x * res.x);
  col *= 1.0 - scan * (smoothstep(0.78, 1.0, 1.0 - fy) * 0.8 + smoothstep(0.85, 1.0, fx) * 0.35);
  vec3 bl = texture2D(b1, uv).rgb * bk1 + texture2D(b2, uv).rgb * bk2;
  col += bl * inside(uv);
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, sat) * tint * bright;
  col = mix(col, flashC, flash);
  vec2 q = (v - 0.5) * vec2(1.0, 0.9);
  float vg = clamp(1.0 - dot(q, q) * 2.4, 0.0, 1.0);
  col *= mix(1.0, vg, vig);
  float n = fract(sin(dot(v * 713.13 + time * 17.0, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * grain;
  gl_FragColor = vec4(col, 1.0);
}`;

const Post = {
  gl: null,
  canvas: null,
  init(canvas) {
    let gl = null;
    try {
      gl = canvas.getContext('webgl', {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      gl = null;
    }
    if (!gl) return false;
    this.gl = gl;
    this.canvas = canvas;
    try {
      this.pBright = this.prog(FS_BRIGHT);
      this.pBlur = this.prog(FS_BLUR);
      this.pComp = this.prog(FS_COMP);
    } catch (e) {
      console.warn(e);
      return false;
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.base = this.tex(W, H, gl.NEAREST);
    this.a1 = this.target(W / 2, H / 2);
    this.c1 = this.target(W / 2, H / 2);
    this.a2 = this.target(120, 68);
    this.c2 = this.target(120, 68);
    return true;
  },
  prog(fs) {
    const gl = this.gl;
    const mk = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'a');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return { p, loc: {} };
  },
  tex(w, h, filter) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return t;
  },
  target(w, h) {
    const gl = this.gl;
    const t = this.tex(w, h, gl.LINEAR);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { t, f, w, h };
  },
  pass(pr, target, tex, uni) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null);
    gl.viewport(0, 0, target ? target.w : this.canvas.width, target ? target.h : this.canvas.height);
    gl.useProgram(pr.p);
    let unit = 0;
    for (const name in tex) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex[name]);
      gl.uniform1i(this.loc(pr, name), unit);
      unit++;
    }
    for (const name in uni) {
      const v = uni[name];
      const l = this.loc(pr, name);
      if (typeof v === 'number') gl.uniform1f(l, v);
      else if (v.length === 2) gl.uniform2fv(l, v);
      else if (v.length === 3) gl.uniform3fv(l, v);
      else gl.uniform4fv(l, v);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  },
  loc(pr, name) {
    if (!(name in pr.loc)) pr.loc[name] = this.gl.getUniformLocation(pr.p, name);
    return pr.loc[name];
  },
  render(src, time) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.base);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    this.pass(this.pBright, this.a1, { t: this.base }, { px: [1 / W, 1 / H], th: fx.threshold });
    this.pass(this.pBlur, this.c1, { t: this.a1.t }, { dir: [2 / W, 0] });
    this.pass(this.pBlur, this.a1, { t: this.c1.t }, { dir: [0, 2 / H] });
    this.pass(this.pBlur, this.a2, { t: this.a1.t }, { dir: [0.5 / 120, 0.5 / 68] });
    this.pass(this.pBlur, this.c2, { t: this.a2.t }, { dir: [1 / 120, 0] });
    this.pass(this.pBlur, this.a2, { t: this.c2.t }, { dir: [0, 1 / 68] });
    const wv = [0, 1, 2].map((i) => {
      const w = fx.waves[i];
      if (!w) return [0, 0, 0, 0];
      const k = w.t / w.life;
      return [w.x, w.y, w.t * w.speed, w.strength * (1 - k) * (1 - k)];
    });
    this.pass(
      this.pComp,
      null,
      { base: this.base, b1: this.a1.t, b2: this.a2.t },
      {
        res: [W, H],
        off: [cam.sx / W, -cam.sy / H],
        zoom: cam.zoom * (1 + cam.kick),
        rot: cam.rot + cam.sr,
        time,
        aberr: fx.aberr,
        sat: fx.sat,
        flash: Math.min(1, fx.flash),
        vig: fx.vig,
        heat: fx.heat,
        bk1: fx.bloom1,
        bk2: fx.bloom2,
        grain: fx.grain,
        scan: fx.scan,
        bright: fx.bright,
        flashC: fx.flashColor,
        tint: fx.tint,
        w0: wv[0],
        w1: wv[1],
        w2: wv[2],
      },
    );
  },
};
