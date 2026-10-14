import sys
from collections import deque
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
w, h = im.size
px = im.load()
def es_fondo(p):
    r, g, b, _ = p
    return min(r, g, b) > 205 and max(r, g, b) - min(r, g, b) < 14
vis = bytearray(w * h)
q = deque()
for x in range(w):
    q.append((x, 0)); q.append((x, h - 1))
for y in range(h):
    q.append((0, y)); q.append((w - 1, y))
while q:
    x, y = q.popleft()
    i = y * w + x
    if vis[i] or not es_fondo(px[x, y]):
        continue
    vis[i] = 1
    px[x, y] = (255, 255, 255, 0)
    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h and not vis[ny * w + nx]:
            q.append((nx, ny))
# Zonas cerradas (adentro del anillo): componentes claros con mucho gris de cuadrícula
def es_gris_cuadricula(p):
    r, g, b, _ = p
    return 222 <= min(r, g, b) and max(r, g, b) <= 244 and max(r, g, b) - min(r, g, b) < 10
for sy in range(h):
    for sx in range(w):
        if vis[sy * w + sx] or not es_fondo(px[sx, sy]):
            continue
        comp, grises = [], 0
        q = deque([(sx, sy)]); vis[sy * w + sx] = 2
        while q:
            x, y = q.popleft()
            comp.append((x, y))
            if es_gris_cuadricula(px[x, y]):
                grises += 1
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and not vis[ny * w + nx] and es_fondo(px[nx, ny]):
                    vis[ny * w + nx] = 2
                    q.append((nx, ny))
        es_cuadricula = len(comp) > 200 and grises / len(comp) > 0.25
        for x, y in comp:
            if es_cuadricula:
                vis[y * w + x] = 1
                px[x, y] = (255, 255, 255, 0)
            else:
                vis[y * w + x] = 3
vis = bytearray(1 if v == 1 else 0 for v in vis)
# Suavizar el borde: píxeles claros pegados al fondo pasan a semitransparentes
for y in range(1, h - 1):
    for x in range(1, w - 1):
        if vis[y * w + x]:
            continue
        if any(vis[(y + dy) * w + x + dx] for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))):
            r, g, b, a = px[x, y]
            lum = (r + g + b) / 3
            if min(r, g, b) > 120 and max(r, g, b) - min(r, g, b) < 30:
                px[x, y] = (0, 0, 0, int(255 * (1 - lum / 255) ** 0.8))
im = im.crop(im.getbbox())
im.save(dst, optimize=True)
print(im.size)
