#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BossClaw Agent Team 打包脚本

使用 PyInstaller 将 Python 运行时打包为可执行文件

用法:
    python build-executable.py <export_dir> <output_dir> [platform]

参数:
    export_dir: 导出的团队配置目录路径
    output_dir: 输出目录路径
    platform: 目标平台 (windows/macos/linux/auto, 默认 auto)
"""

import sys
import io

# 设置标准输出编码为 UTF-8（Windows 兼容）
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import json
import os
import shutil
import subprocess
from pathlib import Path


def check_pyinstaller():
    """检查 PyInstaller 是否已安装"""
    try:
        import PyInstaller
        print("✅ PyInstaller 已安装")
        return True
    except ImportError:
        print("❌ PyInstaller 未安装")
        print("请运行: pip install pyinstaller")
        return False


def prepare_build_directory(export_dir, work_dir):
    """准备构建目录"""
    print(f"\n📂 准备构建目录...")
    
    # 清理旧的构建目录
    if os.path.exists(work_dir):
        print(f"   清理旧目录: {work_dir}")
        shutil.rmtree(work_dir)
    
    # 复制运行时模板
    template_dir = Path(__file__).parent / 'runtime-template'
    if not template_dir.exists():
        raise FileNotFoundError(f"运行时模板目录不存在: {template_dir}")
    
    print(f"   复制模板: {template_dir} -> {work_dir}")
    shutil.copytree(template_dir, work_dir)
    
    # 注入团队配置
    config_file = Path(export_dir) / 'config' / 'team-config.json'
    if not config_file.exists():
        raise FileNotFoundError(f"团队配置文件不存在: {config_file}")
    
    dest_config = Path(work_dir) / 'config' / 'team-config.json'
    print(f"   注入配置: {config_file} -> {dest_config}")
    shutil.copy2(config_file, dest_config)
    
    # 复制 Skills
    skills_dir = Path(export_dir) / 'skills'
    if skills_dir.exists():
        dest_skills = Path(work_dir) / 'skills'
        print(f"   复制 Skills: {skills_dir} -> {dest_skills}")
        if dest_skills.exists():
            shutil.rmtree(dest_skills)
        shutil.copytree(skills_dir, dest_skills)
    
    print("✅ 构建目录准备完成")


def get_platform_args(platform):
    """获取平台特定的 PyInstaller 参数"""
    args = []
    
    if platform == 'windows':
        args.extend([
            '--windowed',  # 无控制台窗口
            '--icon=NONE',  # 可以添加 .ico 图标
        ])
    elif platform == 'macos':
        args.extend([
            '--windowed',  # macOS app bundle
            '--icon=NONE',  # 可以添加 .icns 图标
        ])
    elif platform == 'linux':
        args.extend([
            '--onedir',  # Linux 使用目录形式
        ])
    
    return args


def run_pyinstaller(work_dir, output_dir, team_name, platform):
    """运行 PyInstaller"""
    print(f"\n🔨 开始打包...")
    print(f"   团队名称: {team_name}")
    print(f"   目标平台: {platform}")
    print(f"   输出目录: {output_dir}")
    
    # 构建 PyInstaller 命令
    main_script = Path(work_dir) / 'main.py'
    
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        str(main_script),
        '--name', team_name,
        '--onefile',  # 单文件模式
        f'--distpath={output_dir}',
        f'--workpath={Path(output_dir).parent / "pyinstaller-build"}',
        '--clean',
        '--noconfirm',
    ]
    
    # 添加平台特定参数
    cmd.extend(get_platform_args(platform))
    
    # 添加额外数据文件
    cmd.extend([
        f'--add-data={str(Path(work_dir) / "config")}{os.pathsep}config',
        f'--add-data={str(Path(work_dir) / "skills")}{os.pathsep}skills',
        f'--add-data={str(Path(work_dir) / "README.md")}{os.pathsep}.',
    ])
    
    print(f"\n   执行命令: {' '.join(cmd)}\n")
    
    # 执行打包
    try:
        result = subprocess.run(
            cmd,
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=600  # 10分钟超时
        )
        
        if result.returncode != 0:
            print(f"❌ 打包失败:")
            print(result.stderr)
            return False
        
        print("✅ 打包成功")
        return True
        
    except subprocess.TimeoutExpired:
        print("❌ 打包超时 (>10分钟)")
        return False
    except Exception as e:
        print(f"❌ 打包异常: {e}")
        return False


def create_distribution_package(output_dir, team_name, platform):
    """创建分发包"""
    print(f"\n📦 创建分发包...")
    
    if platform == 'macos':
        # macOS 生成 .dmg (需要额外工具,这里先打包为 .zip)
        package_name = f"{team_name}-macos.zip"
    elif platform == 'windows':
        package_name = f"{team_name}-windows.exe"
    else:
        package_name = f"{team_name}-linux.tar.gz"
    
    # 对于 MVP 版本,直接返回可执行文件路径
    # 后续可以集成 create-dmg, Inno Setup 等工具生成安装包
    
    executable_path = Path(output_dir) / team_name
    if platform == 'windows':
        executable_path = executable_path.with_suffix('.exe')
    
    if executable_path.exists():
        print(f"✅ 可执行文件: {executable_path}")
        return str(executable_path)
    else:
        print(f"⚠️  未找到可执行文件: {executable_path}")
        return None


def build_team_package(export_dir, output_dir, platform='auto'):
    """
    构建 Agent Team 可执行包
    
    Args:
        export_dir: 导出的团队配置目录
        output_dir: 输出目录
        platform: windows/macos/linux/auto
    
    Returns:
        str: 生成的可执行文件路径,失败返回 None
    """
    print("="*60)
    print("🚀 BossClaw Agent Team 打包工具")
    print("="*60)
    
    # 检查依赖
    if not check_pyinstaller():
        return None
    
    # 自动检测平台
    if platform == 'auto':
        if sys.platform == 'win32':
            platform = 'windows'
        elif sys.platform == 'darwin':
            platform = 'macos'
        else:
            platform = 'linux'
        print(f"\n🖥️  自动检测平台: {platform}")
    
    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    
    # 准备工作目录
    work_dir = Path(output_dir) / 'build-temp'
    
    try:
        # Step 1: 准备构建目录
        prepare_build_directory(export_dir, work_dir)
        
        # Step 2: 读取团队配置获取名称
        config_file = Path(work_dir) / 'config' / 'team-config.json'
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        team_name = config['metadata']['teamName']
        # 清理文件名中的非法字符
        team_name = ''.join(c for c in team_name if c.isalnum() or c in ' _-')
        
        # Step 3: 运行 PyInstaller
        success = run_pyinstaller(work_dir, output_dir, team_name, platform)
        
        if not success:
            return None
        
        # Step 4: 创建分发包
        package_path = create_distribution_package(output_dir, team_name, platform)
        
        # Step 5: 清理临时文件
        print(f"\n🧹 清理临时文件...")
        if os.path.exists(work_dir):
            shutil.rmtree(work_dir)
        
        build_dir = Path(output_dir).parent / 'pyinstaller-build'
        if os.path.exists(build_dir):
            shutil.rmtree(build_dir)
        
        print("\n" + "="*60)
        print(f"✅ 打包完成!")
        print(f"📦 输出: {package_path}")
        print("="*60)
        
        return package_path
        
    except Exception as e:
        print(f"\n❌ 打包失败: {e}")
        import traceback
        traceback.print_exc()
        
        # 清理临时文件
        if os.path.exists(work_dir):
            shutil.rmtree(work_dir)
        
        return None


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("用法: python build-executable.py <export_dir> <output_dir> [platform]")
        print("示例: python build-executable.py ./exports/xxx ./dist windows")
        sys.exit(1)
    
    export_dir = sys.argv[1]
    output_dir = sys.argv[2]
    platform = sys.argv[3] if len(sys.argv) > 3 else 'auto'
    
    result = build_team_package(export_dir, output_dir, platform)
    
    if result:
        sys.exit(0)
    else:
        sys.exit(1)
