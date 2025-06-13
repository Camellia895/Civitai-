import os
from PIL import Image
from PIL import PngImagePlugin
import piexif

# --- 配置 ---
OUTPUT_FOLDER_NAME = "processed_images"
# piexif 中 UserComment 的标签ID
EXIF_USER_COMMENT_TAG = 37510  # piexif.ImageIFD.UserComment

def extract_existing_metadata(image_obj):
    """
    从一个Pillow图像对象中提取已存在的AI元数据。
    返回一个元组 (key, value)，例如 ('workflow', '{"nodes":...}')。
    如果未找到，则返回 (None, None)。
    """
    # 1. 尝试从PNG info块中提取
    if image_obj.format == "PNG":
        # ComfyUI 使用 'workflow', A1111 使用 'parameters'
        if 'workflow' in image_obj.info:
            return 'workflow', image_obj.info['workflow']
        elif 'parameters' in image_obj.info:
            return 'parameters', image_obj.info['parameters']
            
    # 2. 尝试从JPEG/WebP的EXIF数据中提取
    elif image_obj.format in ["JPEG", "WEBP"] and "exif" in image_obj.info:
        try:
            exif_dict = piexif.load(image_obj.info['exif'])
            if piexif.ImageIFD.UserComment in exif_dict["Exif"]:
                user_comment_bytes = exif_dict["Exif"][piexif.ImageIFD.UserComment]
                if len(user_comment_bytes) > 8:
                    try:
                        # 跳过8字节的编码头 (e.g., 'ASCII\x00\x00\x00')
                        metadata = user_comment_bytes[8:].decode('utf-8', errors='ignore').strip()
                        # A1111/ComfyUI 的 EXIF 数据也是一个字符串，但我们统一用 'parameters' 作为 key
                        return 'parameters', metadata
                    except Exception:
                        pass
        except Exception:
            pass

    return None, None


def process_images_in_folder():
    """
    处理当前文件夹中的所有图像和txt文件，保留原始工作流并添加新元数据。
    """
    current_dir = os.path.dirname(os.path.realpath(__file__))
    print(f"开始处理文件夹: {current_dir}\n")

    output_dir = os.path.join(current_dir, OUTPUT_FOLDER_NAME)
    os.makedirs(output_dir, exist_ok=True)
    print(f"输出文件夹已准备好: {output_dir}")
    print("-" * 40)

    processed_count = 0
    for filename in os.listdir(current_dir):
        base_name, extension = os.path.splitext(filename)
        
        if extension.lower() in ['.png', '.jpg', '.jpeg', '.webp']:
            txt_filename = base_name + ".txt"
            txt_path = os.path.join(current_dir, txt_filename)

            if os.path.exists(txt_path):
                print(f"找到配对: {filename} 和 {txt_filename}")
                
                try:
                    # 1. 打开图片并提取已存在的元数据及其key
                    image_path = os.path.join(current_dir, filename)
                    img = Image.open(image_path)
                    original_key, original_meta = extract_existing_metadata(img)
                    
                    # 2. 读取.txt文件中的新元数据
                    with open(txt_path, 'r', encoding='utf-8') as f:
                        meta_from_txt = f.read().strip()

                    # 3. 创建新的PNG元数据对象
                    pnginfo = PngImagePlugin.PngInfo()
                    
                    # 4. 如果存在原始元数据，原封不动地加回去
                    if original_key and original_meta:
                        pnginfo.add_text(original_key, original_meta)
                        print(f"  -> 已保留原始元数据 (Key: {original_key})。")

                    # 5. 将.txt中的内容作为一个独立的 'Comment' 块添加
                    if meta_from_txt:
                        pnginfo.add_text("Comment", meta_from_txt)
                        print("  -> 已将.txt内容添加为 'Comment' 元数据。")

                    # 6. 定义输出路径并保存为新的PNG文件
                    output_filename = base_name + ".png"
                    output_path = os.path.join(output_dir, output_filename)
                    
                    # 保存时，Pillow会自动转换格式为PNG
                    img.save(output_path, "PNG", pnginfo=pnginfo)
                    
                    print(f"  -> 成功保存到: {output_filename}\n")
                    processed_count += 1

                except Exception as e:
                    print(f"  -> 处理 {filename} 时出错: {e}\n")

    print("-" * 40)
    print(f"处理完成！总共处理了 {processed_count} 个图片文件。")


if __name__ == "__main__":
    process_images_in_folder()
    input("\n按 Enter 键退出...")