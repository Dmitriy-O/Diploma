import os
from collections import defaultdict

def calculate_avg_times():
    """
    Підраховує середній час обробки, середню MSE, SSIM, PSNR для кожного методу інтерполяції.
    Також повертає списки значень для гістограм (на основі максимум 10 зображень).
    """
    times = defaultdict(list)
    mses = defaultdict(list)
    ssims = defaultdict(list)
    psnrs = defaultdict(list)
    results_path = "static/results"
    
    if not os.path.exists(results_path):
        print(f"Папка {results_path} не існує. Переконайтеся, що ви обробили зображення.")
        return {}
    
    # Збираємо дані з усіх файлів
    for task_dir in os.listdir(results_path):
        task_dir_path = os.path.join(results_path, task_dir)
        if not os.path.isdir(task_dir_path):
            continue

        times_file = os.path.join(task_dir_path, "times.txt")
        mse_file = os.path.join(task_dir_path, "mse.txt")
        ssim_file = os.path.join(task_dir_path, "ssim.txt")
        psnr_file = os.path.join(task_dir_path, "psnr.txt")
        
        # Збираємо часи обробки
        if os.path.exists(times_file):
            with open(times_file, "r") as f:
                for line in f:
                    try:
                        method, time = line.strip().split(": ")
                        times[method].append(float(time))
                    except ValueError as e:
                        print(f"Помилка у файлі {times_file}: {line.strip()} - {e}")
                        continue
        else:
            print(f"Файл {times_file} не знайдено для завдання {task_dir}")
        
        # Збираємо MSE
        if os.path.exists(mse_file):
            with open(mse_file, "r") as f:
                for line in f:
                    try:
                        method, mse = line.strip().split(": ")
                        mses[method].append(float(mse))
                    except ValueError as e:
                        print(f"Помилка у файлі {mse_file}: {line.strip()} - {e}")
                        continue
        else:
            print(f"Файл {mse_file} не знайдено для завдання {task_dir}")

        # Збираємо SSIM
        if os.path.exists(ssim_file):
            with open(ssim_file, "r") as f:
                for line in f:
                    try:
                        method, ssim_val = line.strip().split(": ")
                        ssims[method].append(float(ssim_val))
                    except ValueError as e:
                        print(f"Помилка у файлі {ssim_file}: {line.strip()} - {e}")
                        continue
        else:
            print(f"Файл {ssim_file} не знайдено для завдання {task_dir}")

        # Збираємо PSNR
        if os.path.exists(psnr_file):
            with open(psnr_file, "r") as f:
                for line in f:
                    try:
                        method, psnr_val = line.strip().split(": ")
                        psnrs[method].append(float(psnr_val))
                    except ValueError as e:
                        print(f"Помилка у файлі {psnr_file}: {line.strip()} - {e}")
                        continue
        else:
            print(f"Файл {psnr_file} не знайдено для завдання {task_dir}")

    avg_stats = {}
    max_images = 10  # Обмежуємо кількість зображень до 10
    for method in times.keys():
        time_list = times[method][:max_images]
        mse_list = mses.get(method, [])[:max_images]
        ssim_list = ssims.get(method, [])[:max_images]
        psnr_list = psnrs.get(method, [])[:max_images]
        
        if time_list:
            avg_time = sum(time_list) / len(time_list)
            image_count = len(time_list)
        else:
            avg_time = 0
            image_count = 0
        
        if mse_list:
            avg_mse = sum(mse_list) / len(mse_list)
        else:
            avg_mse = 0

        if ssim_list:
            avg_ssim = sum(ssim_list) / len(ssim_list)
        else:
            avg_ssim = 0

        if psnr_list:
            avg_psnr = sum(psnr_list) / len(psnr_list)
        else:
            avg_psnr = 0
        
        avg_stats[method] = {
            "avg_time": avg_time,
            "avg_mse": avg_mse,
            "avg_ssim": avg_ssim,
            "avg_psnr": avg_psnr,
            "image_count": image_count,
            "mse_values": mse_list,  # Список значень для гістограми
            "ssim_values": ssim_list,
            "psnr_values": psnr_list
        }
        print(f"{method}: Середній час = {avg_time:.2f} сек, Середня MSE = {avg_mse:.2f}, Середня SSIM = {avg_ssim:.4f}, Середня PSNR = {avg_psnr:.2f} (на основі {image_count} зображень)")

    return avg_stats

if __name__ == "__main__":
    calculate_avg_times()