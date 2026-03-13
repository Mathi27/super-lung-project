import os
from pathlib import Path

def scan_assets(directory):
    output_file = "asset_list.txt"
    
    # Safety check: ensure the folder actually exists
    if not os.path.isdir(directory):
        print(f"Error: The directory '{directory}' does not exist.")
        return

    # Dictionaries to hold our found files
    assets = {
        ".fbx": [],
        ".glb": [],
        ".obj": []
    }

    # Walk through the directory and subdirectories
    print(f"Scanning for assets in '{directory}'...")
    for root, _, files in os.walk(directory):
        for file in files:
            ext = Path(file).suffix.lower()
            if ext in assets:
                # Store the relative path so you know exactly where it is
                rel_path = os.path.relpath(os.path.join(root, file), directory)
                assets[ext].append(rel_path)

    # Write to text file in the specific order
    with open(output_file, "w", encoding="utf-8") as f:
        for ext in [".fbx", ".glb", ".obj"]:
            f.write(f"--- {ext.upper()} FILES ---\n")
            if not assets[ext]:
                f.write("None found.\n")
            for item in sorted(assets[ext]):
                f.write(f"{item}\n")
            f.write("\n")

    print(f"Scan complete! Check {output_file} for the results.")

if __name__ == "__main__":
    # Prompt the user for the target folder
    target_folder = input("Enter the relative path to scan (e.g., assets/models): ").strip()
    
    # Default to current directory if the user just presses Enter
    if not target_folder:
        target_folder = "."
        
    scan_assets(target_folder)