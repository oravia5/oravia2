from PIL import Image, ImageDraw
import os

src_path = os.path.abspath("../frontend/public/favicon.png")
dest_favicon = os.path.abspath("../frontend/public/favicon.png")
dest_192 = os.path.abspath("../frontend/public/logo192.png")
dest_512 = os.path.abspath("../frontend/public/logo512.png")
dest_preview = os.path.abspath("../frontend/public/logo-preview.png")
dest_video = os.path.abspath("../frontend/public/video-placeholder.png")

print("Processing images using Pillow...")

# Load source image
img = Image.open(src_path)

# 1. Save favicon.png (64x64)
img.resize((64, 64), Image.Resampling.LANCZOS).save(dest_favicon, "PNG", optimize=True)
print("Saved favicon.png")

# 2. Save logo192.png (192x192)
img.resize((192, 192), Image.Resampling.LANCZOS).save(dest_192, "PNG", optimize=True)
print("Saved logo192.png")

# 3. Save logo512.png (512x512)
img.resize((512, 512), Image.Resampling.LANCZOS).save(dest_512, "PNG", optimize=True)
print("Saved logo512.png")

# 4. Save logo-preview.png (120x120) for general image post previews
preview = img.resize((120, 120), Image.Resampling.LANCZOS)
preview.save(dest_preview, "PNG", optimize=True)
print("Saved logo-preview.png")

# 5. Create video-placeholder.png (120x120) with a play button overlay
video_preview = preview.copy()
draw = ImageDraw.Draw(video_preview)

# Draw semi-transparent dark circle in center
center_x, center_y = 60, 60
radius = 24
draw.ellipse((center_x - radius, center_y - radius, center_x + radius, center_y + radius), fill=(0, 0, 0, 180))

# Draw white play triangle inside the circle
# Vertices for a triangle pointing right:
draw.polygon([(52, 48), (52, 72), (73, 60)], fill=(255, 255, 255, 255))

video_preview.save(dest_video, "PNG", optimize=True)
print("Saved video-placeholder.png with play button overlay!")

print("All image processes completed successfully!")
