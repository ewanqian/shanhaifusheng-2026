export function smoothUnit(value) {
  const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);
}
export function stoneOpacity(birth, field, index) {
  return smoothUnit((birth*14-index)/2)*Math.max(0,Math.min(1,field));
}
// 50-second round trip, maximum speed ~0.10m/s; only geometry moves.
export function mountainDepth(time, layer=0) {
  return (layer===0?-10:-70)+Math.sin(time*Math.PI/25-layer*.4)*.8;
}
