import sys
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# ==============================================================================
# 1. ส่วนเช็คและสลับเข้า Virtual Environment อัตโนมัติ (Self-Bootstrapping)
# ==============================================================================
VENV_PYTHON = Path(r"D:\applications\momelo-post-processing\venv-py313\Scripts\python.exe")

def ensure_venv():
    """ตรวจสอบว่ารันด้วย Python ของ venv หรือยัง ถ้ายังให้สลับไปรันใน venv ทันที"""
    current_python = Path(sys.executable).resolve()
    
    if VENV_PYTHON.exists():
        target_python = VENV_PYTHON.resolve()
        if current_python != target_python:
            print(f"[*] กำลังสลับไปรันบน Virtual Environment: {target_python}")
            result = subprocess.run([str(target_python), *sys.argv])
            sys.exit(result.returncode)
    else:
        print(f"[WARNING] ไม่พบ Virtual Environment ที่: {VENV_PYTHON}")
        print("[*] กำลังรันด้วย Python ปัจจุบันของระบบแทน...")

ensure_venv()

# ==============================================================================
# 2. ส่วนประมวลผลการแปลงไฟล์ภาพ
# ==============================================================================
try:
    from PIL import Image
except ImportError:
    print("[ERROR] ไม่พบไลบรารี Pillow ใน Virtual Environment นี้ค่ะ")
    print(f"กรุณาติดตั้งด้วยคำสั่ง: \"{VENV_PYTHON}\" -m pip install Pillow")
    sys.exit(1)

FORMAT_MAP = {
    'webp': 'WEBP',
    'png': 'PNG',
    'jpg': 'JPEG',
    'jpeg': 'JPEG',
    'bmp': 'BMP',
    'tiff': 'TIFF',
    'avif': 'AVIF',
    'ico': 'ICO'
}

SUPPORTED_INPUT_EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.avif'}
DEFAULT_OUT_FOLDER_NAME = "img-type-converted"

def parse_quality(val_str: str) -> int:
    """แปลงค่า Detail/Quality จากข้อความเป็นตัวเลข 1-100"""
    try:
        q = int(val_str.rstrip('%'))
        if not (1 <= q <= 100):
            raise ValueError
        return q
    except ValueError:
        print(f"[ERROR] ค่า detail ('{val_str}') ต้องเป็นตัวเลขระหว่าง 1 ถึง 100 ค่ะ")
        sys.exit(1)

def parse_arguments(argv: list):
    """
    ระบบแยกแยะพารามิเตอร์อัจฉริยะ รองรับทั้งแบบระบุและไม่ระบุ destination:
    รูปแบบที่ 1 (ระบุครบ):   <source> <destination> <type> [detail]
    รูปแบบที่ 2 (ข้าม dest): <source> <type> [detail] -> สร้าง img-type-converted ใน source
    """
    args = argv[1:]
    if len(args) < 2 or len(args) > 4:
        print("การใช้งาน (Usage):")
        print("  แบบระบุปลายทาง:   python convert-img-type.py <source> <destination> <type> [detail 1-100]")
        print("  แบบไม่ระบุปลายทาง: python convert-img-type.py <source> <type> [detail 1-100]")
        print(f"                   (ระบบจะสร้างโฟลเดอร์ '{DEFAULT_OUT_FOLDER_NAME}' ไว้ใน source ให้อัตโนมัติค่ะ)")
        print("\nตัวอย่างการรัน:")
        print("  python convert-img-type.py ./images webp 85")
        print("  python convert-img-type.py ./images webp")
        print("  python convert-img-type.py ./images ./custom_out webp 85")
        sys.exit(1)

    src_path = Path(args[0]).resolve()
    if not src_path.exists():
        print(f"[ERROR] ไม่พบไฟล์หรือโฟลเดอร์ต้นทาง: {src_path}")
        sys.exit(1)

    # ตรวจสอบว่า Argument ตัวที่ 2 เป็นชนิดไฟล์ (เช่น webp, png) หรือเป็น Path ปลายทาง
    potential_type = args[1].lower().lstrip('.')
    
    if potential_type in FORMAT_MAP and (len(args) == 2 or (len(args) == 3 and args[2].rstrip('%').isdigit())):
        # กรณีไม่ใส่ destination: สร้างโฟลเดอร์ img-type-converted ใน source
        target_ext = potential_type
        base_dir = src_path if src_path.is_dir() else src_path.parent
        dst_path = (base_dir / DEFAULT_OUT_FOLDER_NAME).resolve()
        quality = parse_quality(args[2]) if len(args) == 3 else 100
    else:
        # กรณีใส่ destination มาตามปกติ
        if len(args) < 3:
            print(f"[ERROR] พารามิเตอร์ไม่ครบถ้วน หรือไม่รองรับชนิดไฟล์ '{args[1]}' ค่ะ")
            sys.exit(1)
        dst_path = Path(args[1]).resolve()
        target_ext = args[2].lower().lstrip('.')
        if target_ext not in FORMAT_MAP:
            print(f"[ERROR] ไม่รองรับนามสกุลปลายทาง '{target_ext}' (รองรับเฉพาะ: {', '.join(FORMAT_MAP.keys())})")
            sys.exit(1)
        quality = parse_quality(args[3]) if len(args) == 4 else 100

    return src_path, dst_path, target_ext, quality

def convert_single_file(src_file: Path, dst_file: Path, target_ext: str, quality: int):
    """ฟังก์ชันแปลงไฟล์ภาพเดี่ยว พร้อมจัดการโหมดสีและระดับการบีบอัด"""
    pil_format = FORMAT_MAP[target_ext]
    dst_file.parent.mkdir(parents=True, exist_ok=True)

    try:
        with Image.open(src_file) as img:
            if pil_format == 'JPEG':
                if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                    bg = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode != 'RGBA':
                        img = img.convert('RGBA')
                    bg.paste(img, mask=img.split()[3])
                    img = bg
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
            else:
                if img.mode == 'P' and 'transparency' in img.info:
                    img = img.convert('RGBA')

            save_kwargs = {}
            if pil_format == 'WEBP':
                if quality == 100:
                    save_kwargs = {'lossless': True, 'quality': 100, 'method': 6}
                else:
                    save_kwargs = {'lossless': False, 'quality': quality, 'alpha_quality': 100, 'method': 6}
            elif pil_format == 'JPEG':
                save_kwargs = {'quality': quality, 'optimize': True}
                if quality == 100:
                    save_kwargs['subsampling'] = 0
            elif pil_format == 'PNG':
                save_kwargs = {'optimize': True}

            img.save(dst_file, format=pil_format, **save_kwargs)

        orig_kb = src_file.stat().st_size / 1024
        new_kb = dst_file.stat().st_size / 1024
        diff_pct = ((orig_kb - new_kb) / orig_kb) * 100 if orig_kb > 0 else 0
        print(f"[OK] {src_file.name} -> {dst_file.name} ({orig_kb:.1f}KB -> {new_kb:.1f}KB | ลดลง {diff_pct:.1f}%)")
        return True
    except Exception as e:
        print(f"[ERROR] แปลงไฟล์ {src_file.name} ไม่สำเร็จ: {e}")
        return False

def main():
    src_path, dst_path, target_ext, quality = parse_arguments(sys.argv)

    # กรณีที่ 1: Source เป็นไฟล์เดี่ยว
    if src_path.is_file():
        if dst_path.suffix.lower() != f".{target_ext}":
            final_dst = dst_path / f"{src_path.stem}.{target_ext}"
        else:
            final_dst = dst_path
        print(f"[*] โฟลเดอร์ปลายทาง: {final_dst.parent}")
        convert_single_file(src_path, final_dst, target_ext, quality)

    # กรณีที่ 2: Source เป็นโฟลเดอร์
    elif src_path.is_dir():
        tasks = []
        for file_path in src_path.rglob("*"):
            if not file_path.is_file() or file_path.suffix.lower() not in SUPPORTED_INPUT_EXTS:
                continue

            # ป้องกันการสแกนซ้ำเข้าไปในโฟลเดอร์ปลายทาง (กรณีปลายทางเป็นซับโฟลเดอร์อยู่ในต้นทาง เช่น img-type-converted)
            try:
                file_path.resolve().relative_to(dst_path.resolve())
                continue  # ถ้าไฟล์นี้อยู่ในโฟลเดอร์ปลายทางอยู่แล้ว ให้ข้ามทันที
            except ValueError:
                pass

            rel_path = file_path.relative_to(src_path)
            out_file = (dst_path / rel_path).with_suffix(f".{target_ext}")
            
            if file_path.resolve() == out_file.resolve():
                continue
            tasks.append((file_path, out_file))

        if not tasks:
            print("[INFO] ไม่พบไฟล์รูปภาพที่ต้องการแปลงในโฟลเดอร์ต้นทางค่ะ")
            sys.exit(0)

        print(f"[*] ต้นทาง: {src_path}")
        print(f"[*] ปลายทาง: {dst_path}")
        print(f"[*] พบไฟล์รูปภาพ {len(tasks)} ไฟล์ | เป้าหมาย: .{target_ext} | ความละเอียด (Detail): {quality}%")
        
        with ThreadPoolExecutor() as executor:
            futures = [executor.submit(convert_single_file, s, d, target_ext, quality) for s, d in tasks]
            success_count = sum(1 for f in futures if f.result())
            
        print(f"[*] เสร็จสมบูรณ์: แปลงสำเร็จ {success_count}/{len(tasks)} ไฟล์ค่ะ")

if __name__ == "__main__":
    main()