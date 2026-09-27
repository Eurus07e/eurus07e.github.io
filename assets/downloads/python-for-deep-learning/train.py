"""二维点分类。运行：python train.py。仅使用 CPU，不下载数据。"""
from pathlib import Path
import json

import torch
from torch import nn
from torch.utils.data import Dataset, DataLoader


class PointDataset(Dataset):
    def __init__(self, points, labels):
        if len(points) != len(labels):
            raise ValueError("样本数量与标签数量不一致")
        self.points = points
        self.labels = labels

    def __len__(self):
        return len(self.points)

    def __getitem__(self, index):
        return self.points[index], self.labels[index]


class Classifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(2, 16),
            nn.ReLU(),
            nn.Linear(16, 2),
        )

    def forward(self, x):
        return self.layers(x)


def make_data(seed=42):
    generator = torch.Generator().manual_seed(seed)
    points = torch.randn(600, 2, generator=generator)
    labels = (points[:, 0] + points[:, 1] > 0).long()
    order = torch.randperm(len(points), generator=generator)
    train_ids, test_ids = order[:480], order[480:]
    return points[train_ids], labels[train_ids], points[test_ids], labels[test_ids]


def train_epoch(model, loader, loss_fn, optimizer):
    model.train()
    loss_sum = 0.0
    sample_count = 0
    for inputs, targets in loader:
        optimizer.zero_grad()
        logits = model(inputs)
        loss = loss_fn(logits, targets)
        loss.backward()
        optimizer.step()
        loss_sum += loss.item() * len(inputs)
        sample_count += len(inputs)
    return loss_sum / sample_count


def evaluate(model, points, labels, loss_fn):
    model.eval()
    with torch.no_grad():
        logits = model(points)
        loss = loss_fn(logits, labels).item()
        predictions = logits.argmax(dim=1)
        accuracy = (predictions == labels).float().mean().item()
    return loss, accuracy


def run_experiment(learning_rate=0.03, epochs=40, seed=42, verbose=True):
    torch.manual_seed(seed)
    train_x, train_y, test_x, test_y = make_data(seed)
    dataset = PointDataset(train_x, train_y)
    generator = torch.Generator().manual_seed(seed + 1)
    loader = DataLoader(dataset, batch_size=32, shuffle=True,
                        num_workers=0, generator=generator)
    model = Classifier()
    loss_fn = nn.CrossEntropyLoss()
    optimizer = torch.optim.SGD(model.parameters(), lr=learning_rate)
    history = []
    for epoch in range(epochs):
        loss = train_epoch(model, loader, loss_fn, optimizer)
        history.append(loss)
        if verbose and (epoch == 0 or (epoch + 1) % 10 == 0):
            print(f"epoch={epoch + 1:02d}, train_loss={loss:.4f}")
    test_loss, test_accuracy = evaluate(model, test_x, test_y, loss_fn)
    if verbose:
        print(f"test_loss={test_loss:.4f}, test_accuracy={test_accuracy:.1%}")
    return model, history, test_x, test_y, test_accuracy


def main():
    # 小数据使用一个 CPU 线程，减少线程调度开销。
    torch.set_num_threads(1)
    model, history, test_x, test_y, test_accuracy = run_experiment()
    output_dir = Path("outputs")
    output_dir.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), output_dir / "point-model.pt")
    with (output_dir / "history.json").open("w", encoding="utf-8") as file:
        json.dump({"train_loss": history, "test_accuracy": test_accuracy}, file, indent=2)

    restored = Classifier()
    state = torch.load(output_dir / "point-model.pt", map_location="cpu", weights_only=True)
    restored.load_state_dict(state)
    restored.eval()
    model.eval()
    with torch.no_grad():
        before = model(test_x)
        after = restored(test_x)
        print("保存前后预测一致：", torch.allclose(before, after))
        new_points = torch.tensor([[0.2, 0.7], [-0.8, -0.3]], dtype=torch.float32)
        print("新样本预测：", restored(new_points).argmax(dim=1).tolist())


if __name__ == "__main__":
    main()
