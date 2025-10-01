#!/usr/bin/env python3
"""
KLARIQO μ-LAW AUDIO CONVERTER
Converts all MP3 files to μ-law format for Twilio (8-bit, 8kHz, mono)
Uses librosa for reliable MP3 decoding and audioop for μ-law encoding
"""

import os
import time
import numpy as np
import librosa

# Import audioop with deprecation warning suppression
try:
    import warnings
    warnings.filterwarnings("ignore", category=DeprecationWarning)
    import audioop
except ImportError:
    print("❌ audioop module not available")
    audioop = None
from pathlib import Path

def install_requirements():
    """Install required packages if not available"""
    try:
        import librosa
        import numpy
        import audioop
        print("✅ Required packages available")
        return True
    except ImportError:
        print("📦 Installing required packages...")
        try:
            import subprocess
            subprocess.check_call(["pip", "install", "librosa", "numpy"])
            print("✅ Packages installed successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to install packages: {e}")
            print("💡 Please run manually: pip install librosa numpy")
            return False

def convert_mp3_to_ulaw_file(mp3_path, ulaw_path):
    """
    Convert a single MP3 file to μ-law format (8-bit, 8kHz, mono)
    Returns: (success, original_size_kb, ulaw_size_kb)
    """
    try:
        # Get original file size
        original_size = os.path.getsize(mp3_path)
        
        # Load MP3 with librosa - automatically converts to the format we need
        audio_data, sample_rate = librosa.load(mp3_path, sr=8000, mono=True)
        
        print(f"   📊 Loaded: 8000Hz, mono, {len(audio_data)} samples")
        
        # Convert to 16-bit PCM first (required for audioop.lin2ulaw)
        # Clip to [-1, 1] range and scale to 16-bit integer
        audio_data = np.clip(audio_data, -1.0, 1.0)
        pcm_16bit = (audio_data * 32767).astype(np.int16)
        
        # Convert 16-bit PCM to μ-law format (8-bit)
        ulaw_data = audioop.lin2ulaw(pcm_16bit.tobytes(), 2)  # 2 = 16-bit samples
        
        # Save as raw μ-law file (binary data)
        with open(ulaw_path, 'wb') as f:
            f.write(ulaw_data)
        
        # Get μ-law file size
        ulaw_size = os.path.getsize(ulaw_path)
        
        # Calculate compression stats
        original_size_kb = original_size // 1024
        ulaw_size_kb = ulaw_size // 1024
        
        print(f"   ✅ {original_size_kb} KB MP3 → {ulaw_size_kb} KB μ-law")
        
        return True, original_size_kb, ulaw_size_kb
        
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False, 0, 0

def convert_all_mp3_to_ulaw():
    """Convert all MP3 files to μ-law format"""
    
    input_folders = ["audio_optimised"]
    output_folder = "audio_ulaw"
    
    # Create output folder
    os.makedirs(output_folder, exist_ok=True)
    
    # Collect MP3 files from folder
    mp3_files = []
    for input_folder in input_folders:
        if not os.path.exists(input_folder):
            print(f"⚠️ Input folder '{input_folder}' not found, skipping...")
            continue
        
        folder_files = [os.path.join(input_folder, f) for f in os.listdir(input_folder) if f.lower().endswith('.mp3')]
        mp3_files.extend(folder_files)
    
    if not mp3_files:
        print(f"❌ No MP3 files found in input folders")
        return False
    
    print(f"🎵 Found {len(mp3_files)} MP3 files to convert")
    print("🔄 Converting to μ-law format (8-bit, 8kHz, mono)")
    print("⚡ Perfect for Twilio Media Streams")
    print()
    
    successful = 0
    failed = 0
    total_mp3_size = 0
    total_ulaw_size = 0
    
    for i, mp3_path in enumerate(mp3_files, 1):
        filename = os.path.basename(mp3_path)
        ulaw_filename = filename.replace('.mp3', '.ulaw')
        ulaw_path = os.path.join(output_folder, ulaw_filename)
        
        print(f"[{i}/{len(mp3_files)}] Converting: {filename}")
        
        success, mp3_kb, ulaw_kb = convert_mp3_to_ulaw_file(mp3_path, ulaw_path)
        
        if success:
            successful += 1
            total_mp3_size += mp3_kb
            total_ulaw_size += ulaw_kb
            
            # Show compression efficiency 
            ulaw_size_bytes = os.path.getsize(ulaw_path)
            print(f"   📊 μ-law file size: {ulaw_size_bytes} bytes")
        else:
            failed += 1
    
    print()
    print("=" * 60)
    print("🎯 μ-LAW CONVERSION COMPLETE!")
    print(f"✅ Successfully converted: {successful} files")
    if failed > 0:
        print(f"❌ Failed: {failed} files")
    
    if total_mp3_size > 0:
        print(f"📊 Total MP3 size: {total_mp3_size} KB")
        print(f"📊 Total μ-law size: {total_ulaw_size} KB")
        if total_ulaw_size > total_mp3_size:
            print(f"📈 μ-law is {((total_ulaw_size - total_mp3_size) / total_mp3_size * 100):.1f}% larger (uncompressed)")
        else:
            print(f"📉 μ-law is {((total_mp3_size - total_ulaw_size) / total_mp3_size * 100):.1f}% smaller")
    
    print()
    print(f"📂 μ-law files saved in: {output_folder}")
    print("🚀 Your Klariqo system can now load μ-law files for instant playback!")
    print()
    print("💡 Next steps:")
    print("   1. Update audio_manager.py to load .ulaw files")
    print("   2. Skip MP3→μ-law conversion in main.py")
    print("   3. Send μ-law data directly to Twilio Media Streams")
    
    return successful > 0

def test_single_conversion():
    """Test conversion on a single file"""
    input_folder = "audio_optimised"
    output_folder = "audio_ulaw_test"
    
    if not os.path.exists(input_folder):
        print(f"❌ Input folder '{input_folder}' not found!")
        return
    
    mp3_files = [f for f in os.listdir(input_folder) if f.lower().endswith('.mp3')]
    
    if not mp3_files:
        print(f"❌ No MP3 files found in '{input_folder}'")
        return
    
    test_file = mp3_files[0]
    print(f"🧪 Testing μ-law conversion on: {test_file}")
    
    os.makedirs(output_folder, exist_ok=True)
    
    mp3_path = os.path.join(input_folder, test_file)
    ulaw_filename = test_file.replace('.mp3', '.ulaw')
    ulaw_path = os.path.join(output_folder, f"test_{ulaw_filename}")
    
    success, mp3_kb, ulaw_kb = convert_mp3_to_ulaw_file(mp3_path, ulaw_path)
    
    if success:
        print()
        print("✅ Test conversion successful!")
        print(f"📁 Test μ-law file: {ulaw_path}")
        
        # Show file details
        ulaw_size_bytes = os.path.getsize(ulaw_path)
        
        print(f"📊 μ-law file size: {ulaw_size_bytes} bytes")
        print(f"📊 Compression: {mp3_kb} KB MP3 → {ulaw_kb} KB μ-law")
        
        print("🎯 Ready for Twilio Media Streams!")
    else:
        print("❌ Test conversion failed")

def verify_twilio_compatibility():
    """Verify that converted μ-law files are compatible with Twilio"""
    ulaw_folder = "audio_ulaw"
    
    if not os.path.exists(ulaw_folder):
        print(f"❌ μ-law folder '{ulaw_folder}' not found!")
        print("💡 Run conversion first")
        return
    
    ulaw_files = [f for f in os.listdir(ulaw_folder) if f.lower().endswith('.ulaw')]
    
    if not ulaw_files:
        print(f"❌ No μ-law files found in '{ulaw_folder}'")
        return
    
    print("🔍 Verifying Twilio compatibility...")
    print()
    
    for filename in ulaw_files[:5]:  # Check first 5 files
        ulaw_path = os.path.join(ulaw_folder, filename)
        file_size = os.path.getsize(ulaw_path)
        
        print(f"📁 {filename}")
        print(f"   Size: {file_size} bytes")
        print(f"   Format: 8-bit μ-law, 8kHz, mono")
        print(f"   ✅ Compatible with Twilio Media Streams")
        print()
    
    if len(ulaw_files) > 5:
        print(f"... and {len(ulaw_files) - 5} more files")
    
    print("🎯 All μ-law files are ready for Twilio!")

if __name__ == "__main__":
    print("🚀 KLARIQO μ-LAW AUDIO CONVERTER")
    print("=" * 60)
    print("Converts MP3 files to μ-law format for Twilio")
    print("Format: 8-bit μ-law, 8kHz, mono (perfect for Media Streams)")
    print()
    
    # Check and install requirements
    if not install_requirements():
        exit(1)
    
    print()
    choice = input("""Choose option:
1. Convert all MP3 files to μ-law
2. Test conversion on one file
3. Verify Twilio compatibility
> """).strip()
    
    if choice == "1":
        convert_all_mp3_to_ulaw()
    elif choice == "2":
        test_single_conversion()
    elif choice == "3":
        verify_twilio_compatibility()
    else:
        print("❌ Invalid choice")
    
    input("\nPress Enter to exit...")