from PIL import Image
import os
import sys

def create_icons(source_path, output_dir):
    if not os.path.exists(source_path):
        print(f"Error: Source file {source_path} not found")
        sys.exit(1)

    try:
        img = Image.open(source_path)
        # Convert to RGBA if not already
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Define sizes
        sizes = {
            'favicon.png': (64, 64), # Favicon usually small, but 64x64 is good
            'apple-touch-icon.png': (180, 180),
            'icon-192.png': (192, 192),
            'icon-512.png': (512, 512)
        }

        for filename, size in sizes.items():
            # Resize with high quality resampling
            # Aspect ratio preservation is tricky if source is not square.
            # We will create a square canvas and center the image.
            
            target_size = size
            canvas = Image.new('RGBA', target_size, (255, 255, 255, 0)) # Transparent canvas
            
            # Calculate resize dimensions to fit within target
            img_ratio = img.width / img.height
            target_ratio = target_size[0] / target_size[1]
            
            if img_ratio > target_ratio:
                # Width is limiting factor
                new_width = target_size[0]
                new_height = int(new_width / img_ratio)
            else:
                # Height is limiting factor
                new_height = target_size[1]
                new_width = int(new_height * img_ratio)
                
            resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Center on canvas
            x = (target_size[0] - new_width) // 2
            y = (target_size[1] - new_height) // 2
            
            canvas.paste(resized_img, (x, y))
            
            # For apple-touch-icon, we might want a white background instead of transparent
            if filename == 'apple-touch-icon.png':
                bg = Image.new('RGBA', target_size, (255, 255, 255, 255))
                bg.paste(canvas, (0, 0), canvas)
                canvas = bg
                
            output_path = os.path.join(output_dir, filename)
            canvas.save(output_path)
            print(f"Generated {filename}")

    except Exception as e:
        print(f"Error processing image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 2:
        source = sys.argv[1]
        output = sys.argv[2]
    else:
        # Default fallback
        source = r"public/clients/fit-training/logo.png"
        output = r"public/clients/fit-training"
    
    print(f"Generating icons from: {source}")
    print(f"Output directory: {output}")
    create_icons(source, output)
