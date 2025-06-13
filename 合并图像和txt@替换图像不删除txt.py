# 文件名: run_清理模式.py
# 行为：保留原图，删除txt
from core_logic import process_single_image
import os

print("--- 模式: 清理模式 (保留原图, 删除TXT) ---")
current_dir = os.path.dirname(os.path.realpath(__file__))
for filename in os.listdir(current_dir):
    base_name, ext = os.path.splitext(filename)
    if ext.lower() in ['.png', '.jpg', '.jpeg', '.webp']:
        txt_path = os.path.join(current_dir, base_name + ".txt")
        if os.path.exists(txt_path):
            print(f"\n找到配对: {filename}")
            process_single_image(
                image_path=os.path.join(current_dir, filename),
                txt_path=txt_path,
                replace_image_flag=True, # 替换
                delete_txt_flag=False,     # 不删除
                output_folder_name="processed_images"
            )
input("\n处理完成。按 Enter 键退出...")