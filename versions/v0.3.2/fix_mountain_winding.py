"""Fix the derived release mesh only, retaining all embedded textures."""
from pathlib import Path
import json, struct
import numpy as np

root = Path(__file__).resolve().parent
source = root.parent / 'v0.3.0/assets/mountain-web.glb'
b = bytearray(source.read_bytes())
json_size = struct.unpack_from('<I', b, 12)[0]
g = json.loads(b[20:20+json_size])
binary_start = 28 + json_size
def accessor(i):
    a = g['accessors'][i]; v = g['bufferViews'][a['bufferView']]
    dt = {5126:'<f4', 5125:'<u4', 5123:'<u2'}[a['componentType']]
    dim = {'VEC3':3, 'VEC4':4, 'SCALAR':1}[a['type']]
    assert 'byteStride' not in v, 'Interleaved mesh requires a strided view'
    return np.frombuffer(b, dtype=dt, count=a['count']*dim,
        offset=binary_start+v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,dim)
report = []
for mesh in g['meshes']:
    for p in mesh['primitives']:
        pos = accessor(p['attributes']['POSITION']); normals = accessor(p['attributes']['NORMAL'])
        ix = accessor(p['indices']).reshape(-1,3)
        before = float(np.mean(normals[:,1] > 0))
        assert before < .1, 'Source orientation changed; inspect before modifying'
        ix[:,[1,2]] = ix[:,[2,1]]; normals *= -1
        if 'TANGENT' in p['attributes']: accessor(p['attributes']['TANGENT'])[:,3] *= -1
        cross = np.cross(pos[ix[:,1]]-pos[ix[:,0]], pos[ix[:,2]]-pos[ix[:,0]])
        report.append({'source_up_normal_fraction':before,'repaired_up_normal_fraction':float(np.mean(normals[:,1]>0)),
            'up_triangle_fraction':float(np.mean(cross[:,1]>0)), 'triangles':len(ix)})
(root/'assets/mountain-web.glb').write_bytes(b)
(root/'mountain-repair.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
