import os
from collections import defaultdict

times = defaultdict(list)
for task_dir in os.listdir("static/results"):
    with open(f"static/results/{task_dir}/times.txt", "r") as f:
        for line in f:
            method, time = line.strip().split(": ")
            times[method].append(float(time))

for method, time_list in times.items():
    avg_time = sum(time_list) / len(time_list)
    print(f"{method}: Average time = {avg_time:.2f} sec")