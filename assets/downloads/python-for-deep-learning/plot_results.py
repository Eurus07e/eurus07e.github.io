"""与 train.py 放在同一目录，运行 python plot_results.py 生成三张图。"""
from pathlib import Path

import matplotlib.pyplot as plt
import torch

from train import run_experiment


def draw_results(model, history, test_x, test_y):
    plt.rcParams.update({"font.size": 12, "axes.spines.top": False,
                         "axes.spines.right": False, "figure.dpi": 130})
    colors = ["#2864a0", "#bf701e"]
    markers = ["o", "^"]
    figures = []
    model.eval()
    with torch.no_grad():
        predictions = model(test_x).argmax(dim=1)

    for title, labels in [("Test samples: true labels", test_y),
                          ("Test samples: model predictions", predictions)]:
        fig, ax = plt.subplots(figsize=(6, 5), layout="constrained")
        for category in [0, 1]:
            points = test_x[labels == category]
            ax.scatter(points[:, 0], points[:, 1], s=32, alpha=0.8,
                       color=colors[category], marker=markers[category],
                       label=f"Class {category}")
        ax.plot([-3.5, 3.5], [3.5, -3.5], color="#555555",
                linestyle="--", linewidth=1.3, label="True boundary")
        ax.set(xlabel="x1", ylabel="x2", title=title,
               xlim=(-3.5, 3.5), ylim=(-3.5, 3.5))
        ax.set_aspect("equal")
        ax.legend(fontsize=10, loc="upper right")
        figures.append(fig)

    fig, ax = plt.subplots(figsize=(6, 4), layout="constrained")
    ax.plot(range(1, len(history) + 1), history, color=colors[0], linewidth=1.8)
    ax.set(xlabel="Epoch", ylabel="Mean training loss",
           title="Training loss: 480 synthetic samples", ylim=(0, None),
           xlim=(1, len(history)), xticks=[1, 10, 20, 30, 40])
    ax.grid(axis="y", alpha=0.2)
    figures.append(fig)
    return figures


if __name__ == "__main__":
    torch.set_num_threads(1)
    model, history, test_x, test_y, accuracy = run_experiment()
    output_dir = Path("outputs")
    output_dir.mkdir(exist_ok=True)
    figures = draw_results(model, history, test_x, test_y)
    for name, figure in zip(["samples", "predictions", "training-loss"], figures):
        figure.savefig(output_dir / f"{name}.png", dpi=160)
        plt.close(figure)
