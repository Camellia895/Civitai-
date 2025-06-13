# 文件名: core_logic.py
import os
from PIL import Image
from PIL import PngImagePlugin
import piexif

EXIF_USER_COMMENT_TAG = 37510

def process_single_image(image_path, txt_path, replace_image_flag, delete_txt_flag, output_folder_name):
    """处理单个图片的核心逻辑函数"""
    try:
        base_name = os.path.splitext(os.path.basename(image_path))[0]
        current_dir = os.path.dirname(image_path)
        
        img = Image.open(image_path)
        
        # 提取元数据
        original_key, original_meta, has_comment = None, None, False
        if img.format == "PNG" and img.info:
            if 'workflow' in img.info: original_key, original_meta = 'workflow', img.info['workflow']
            elif 'parameters' in img.info: original_key, original_meta = 'parameters', img.info['parameters']
            if 'Comment' in img.info: has_comment = True
        elif img.format in ["JPEG", "WEBP"] and "exif" in img.info:
            exif_dict = piexif.load(img.info.get('exif', b''))
            if piexif.ImageIFD.UserComment in exif_dict.get("Exif", {}):
                user_comment_bytes = exif_dict["Exif"][piexif.ImageIFD.UserComment]
                if len(user_comment_bytes) > 8:
                    original_key = 'parameters'
                    original_meta = user_comment_bytes[8:].decode('utf-8', errors='ignore').strip()

        # 如果已处理过，则跳过
        if has_comment:
            print(f"  -> 警告: {os.path.basename(image_path)} 已被处理过，跳过注入。")
            if delete_txt_flag:
                os.remove(txt_path)
                print(f"  -> 已删除多余的.txt文件: {os.path.basename(txt_path)}")
            return "skipped"

        # 注入新元数据
        with open(txt_path, 'r', encoding='utf-8') as f: meta_from_txt = f.read().strip()
        pnginfo = PngImagePlugin.PngInfo()
        if original_key and original_meta: pnginfo.add_text(original_key, original_meta)
        if meta_from_txt: pnginfo.add_text("Comment", meta_from_txt)

        # 决定输出路径
        if replace_image_flag:
            output_path = os.path.join(current_dir, base_name + ".png")
        else:
            output_dir = os.path.join(current_dir, output_folder_name)
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, base_name + ".png")

        # 保存并清理
        img.save(output_path, "PNG", pnginfo=pnginfo)
        print(f"  -> 成功注入元数据并保存为: {os.path.basename(output_path)}")
        if delete_txt_flag:
            os.remove(txt_path)
            print(f"  -> 已删除源文件: {os.path.basename(txt_path)}")
        if replace_image_flag and image_path != output_path:
            os.remove(image_path)
            print(f"  -> 已删除原始图片: {os.path.basename(image_path)}")
        
        return "processed"
    except Exception as e:
        print(f"  -> 处理 {os.path.basename(image_path)} 时发生严重错误: {e}")
        return "error"