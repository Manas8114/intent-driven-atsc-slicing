import os
import subprocess
import sys
import platform
import shutil
from pathlib import Path

def setup_portable_toolchain(project_root):
    """Adds portable CMake and GCC to PATH if they exist in tools/"""
    tools_dir = project_root / "tools"
    
    found_gcc = False
    
    # 1. Setup CMake
    cmake_bin = tools_dir / "cmake-3.29.0-windows-x86_64" / "bin"
    if cmake_bin.exists():
        print(f"🔧 Found portable CMake at {cmake_bin}")
        os.environ["PATH"] = str(cmake_bin) + os.pathsep + os.environ["PATH"]

    # 2. Setup GCC (w64devkit)
    gcc_dir = tools_dir / "w64devkit" / "w64devkit" / "bin"
    if gcc_dir.exists():
        print(f"🔧 Found portable GCC at {gcc_dir}")
        os.environ["PATH"] = str(gcc_dir) + os.pathsep + os.environ["PATH"]
        os.environ["CC"] = str(gcc_dir / "gcc.exe")
        os.environ["CXX"] = str(gcc_dir / "g++.exe")
        found_gcc = True
        
    return found_gcc

def check_cmake():
    try:
        subprocess.check_output(["cmake", "--version"])
        return True
    except FileNotFoundError:
        return False

def compile_zlib(project_root, install_prefix, portable_gcc_found):
    print("\n📦 Preparing ZLIB dependency...")
    zlib_src = project_root / "tools" / "zlib" / "zlib-1.3.1"
    
    if not zlib_src.exists():
        print(f"❌ ZLIB source not found at {zlib_src}")
        return False
        
    local_lib = install_prefix / "lib"
    local_include = install_prefix / "include"
    local_bin = install_prefix / "bin"
    
    # Check if already installed
    if (local_lib / "libz.dll.a").exists() and (local_bin / "zlib1.dll").exists():
         print("✅ ZLIB appears to be installed already.")
         return True
    
    # Create include/lib/bin dirs
    local_lib.mkdir(exist_ok=True, parents=True)
    local_include.mkdir(exist_ok=True, parents=True)
    local_bin.mkdir(exist_ok=True, parents=True)
    
    try:
        if portable_gcc_found and platform.system() == "Windows":
             print("🔨 Building ZLIB using Makefile.gcc...")
             
             # Ensure zconf.h exists and is fresh
             shutil.copy(zlib_src / "zconf.h.in", zlib_src / "zconf.h")
             
             # Build
             subprocess.check_call(["make", "-f", "win32/Makefile.gcc"], cwd=zlib_src, shell=True)
             
             print("📦 Installing ZLIB manually...")
             # Copy headers
             shutil.copy(zlib_src / "zlib.h", local_include / "zlib.h")
             shutil.copy(zlib_src / "zconf.h", local_include / "zconf.h")
             
             # Copy libs
             shutil.copy(zlib_src / "libz.a", local_lib / "libz.a")
             shutil.copy(zlib_src / "libz.dll.a", local_lib / "libz.dll.a")
             
             # Copy DLL
             shutil.copy(zlib_src / "zlib1.dll", local_bin / "zlib1.dll")
             
             print("✅ ZLIB compiled and installed.")
             return True
        else:
            print("❌ Compile ZLIB: Only MinGW/portable GCC supported currently.")
            return False

    except Exception as e:
        print(f"❌ ZLIB compilation failed: {e}")
        return False

def compile_libatsc3():
    print("🚀 Starting libatsc3 compilation...")
    
    # Paths
    project_root = Path(__file__).parent.parent
    lib_dir = project_root / "libatsc3"
    build_dir = lib_dir / "build"
    local_install_dir = project_root / "tools" / "local"
    
    portable_gcc_found = setup_portable_toolchain(project_root)

    # Check for CMake
    if not check_cmake():
        print("❌ Error: CMake is not installed or not in PATH.")
        return False

    # Compile ZLIB
    if not compile_zlib(project_root, local_install_dir, portable_gcc_found):
        return False

    if not lib_dir.exists():
        print(f"❌ Error: libatsc3 directory not found at {lib_dir}")
        return False

    # Clean build directory for fresh start
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir(exist_ok=True, parents=True)
    
    # Configure
    print(f"\n📂 Configuring libatsc3 in {build_dir}...")
    try:
        # Determine generator
        config_cmd = ["cmake", "..", 
                      f"-DCMAKE_PREFIX_PATH={local_install_dir}",
                      f"-DCMAKE_INSTALL_PREFIX={local_install_dir}",
                      "-DCMAKE_C_FLAGS=-fpermissive -Wno-int-conversion"] 
        
        # If using portable GCC (MinGW), force MinGW Makefiles
        if portable_gcc_found and platform.system() == "Windows":
             config_cmd.extend(["-G", "MinGW Makefiles"])
            
        subprocess.check_call(config_cmd, cwd=build_dir)
        
        # Build
        print("🔨 Building libatsc3...")
        subprocess.check_call(["cmake", "--build", ".", "--config", "Release"], cwd=build_dir)
        
        print("✅ libatsc3 Compilation success!")
        
        # Look for the output DLL
        dll_found = list(build_dir.glob("**/*.dll"))
        if dll_found:
            print(f"🎉 Generated DLLs: {[f.name for f in dll_found]}")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Compilation failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = compile_libatsc3()
    if success:
        print("\n🎉 Native compilation complete.")
        sys.exit(0)
    else:
        print("\n⚠️  Could not compile native library.")
        print("   Using Python simulation fallback in bridge.")
        sys.exit(1)
