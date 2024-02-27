import argparse
from PIL import Image, ImageDraw
import json

def create_color_banner_and_json(hex_colors, size):
    # Create a new image with a white background
    image = Image.new('RGB', size, "white")

    # Create a drawing context
    draw = ImageDraw.Draw(image)
    total_colors = len(hex_colors)
    
    # Initialize a dictionary to store color distribution
    color_distribution = {}

    for i, color in enumerate(hex_colors):
        start = (size[0] * i) // total_colors
        end = (size[0] * (i + 1)) // total_colors
        if i == total_colors - 1:
            end = size[0]
        draw.rectangle([start, 0, end, size[1]], fill=color)
        
        # Assign color to each pixel in the range
        for pixel in range(start, end):
            color_distribution[pixel] = color

    return image, color_distribution

def main():
    # Parse arguments from command line
    parser = argparse.ArgumentParser(description='Create a PNG color banner and a JSON color distribution file.')
    parser.add_argument('--hex', nargs='+', help='Hex color codes', required=True)
    parser.add_argument('--size', type=str, help='Size of the banner as WIDTHxHEIGHT', required=True)
    args = parser.parse_args()

    # Parse size
    width, height = map(int, args.size.split('x'))
    size = (width, height)

    # Create the color banner and color distribution
    image, color_distribution = create_color_banner_and_json(args.hex, size)

    # Save the image
    image_path = 'color_banner.png'
    image.save(image_path)
    print(f'Banner saved as {image_path}')
    
    # Save the color distribution to a JSON file
    json_path = 'color_distribution.json'
    with open(json_path, 'w') as json_file:
        json.dump(color_distribution, json_file)
    print(f'Color distribution saved as {json_path}')

if __name__ == '__main__':
    main()
