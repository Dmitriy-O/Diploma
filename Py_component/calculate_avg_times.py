import os
from collections import defaultdict

def calculate_avg_times():
    """
    Підраховує середній час обробки та середню MSE для кожного методу інтерполяції на основі логів.
    Обмежує кількість зображень до 10 для кожного методу.
    """
    times = defaultdict(list)
    mses = defaultdict(list)
    results_path = "static/results"
    
    if not os.path.exists(results_path):
        print(f"Папка {results_path} не існує. Переконайтеся, що ви обробили зображення.")
        return {}
    
    # Збираємо дані з усіх файлів
    for task_dir in os.listdir(results_path):
        times_file = os.path.join(results_path, task_dir, "times.txt")
        mse_file = os.path.join(results_path, task_dir, "mse.txt")
        
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

    avg_stats = {}
    max_images = 10  # Обмежуємо кількість зображень до 10
    for method in times.keys():
        time_list = times[method][:max_images]  # Беремо лише перші 10 записів
        mse_list = mses.get(method, [])[:max_images]  # Беремо перші 10 записів MSE, якщо є
        
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
        
        avg_stats[method] = {
            "avg_time": avg_time,
            "avg_mse": avg_mse,
            "image_count": image_count
        }
        print(f"{method}: Середній час = {avg_time:.2f} сек, Середня MSE = {avg_mse:.2f} (на основі {image_count} зображень)")

    return avg_stats

if __name__ == "__main__":
    calculate_avg_times()