"""Validation shared by canvas saves and individual node writes."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Node


class NodeLike(Protocol):
    id: str
    type: str
    parent_id: str | None


@dataclass(slots=True)
class HierarchyError(ValueError):
    message: str
    node_ids: list[str]
    cycle: bool = False

    def detail(self) -> dict[str, object]:
        return {"message": self.message, "node_ids": self.node_ids}


def validate_hierarchy(nodes: Iterable[NodeLike]) -> None:
    """Validate one complete design payload before it changes the database."""
    items = list(nodes)
    by_id = {node.id: node for node in items}

    for node in items:
        parent_id = node.parent_id
        if not parent_id:
            continue
        parent = by_id.get(parent_id)
        if parent is None:
            raise HierarchyError("Parent must exist on the same design", [node.id, parent_id])
        if node.type in {"text", "group"}:
            raise HierarchyError(f"{node.type} nodes cannot be nested", [node.id, parent_id])
        if parent.type == "text":
            raise HierarchyError("A text annotation cannot be a parent node", [node.id, parent_id])
        if parent.type == "group" and node.type == "groupRect":
            raise HierarchyError("Zones cannot be nested inside fixed groups", [node.id, parent_id])

    # Every node has at most one parent, so following each chain finds all
    # cycles without needing a general graph algorithm.
    checked: set[str] = set()
    for start in items:
        if start.id in checked:
            continue
        path: list[str] = []
        at: dict[str, int] = {}
        current: NodeLike | None = start
        while current is not None:
            if current.id in at:
                cycle = path[at[current.id] :]
                raise HierarchyError("Node hierarchy would contain a cycle", cycle, cycle=True)
            if current.id in checked:
                break
            at[current.id] = len(path)
            path.append(current.id)
            current = by_id.get(current.parent_id or "")
        checked.update(path)


async def validate_parent_assignment(
    db: AsyncSession,
    *,
    node_id: str,
    node_type: str,
    design_id: str | None,
    parent_id: str | None,
) -> None:
    """Validate a create/PATCH parent assignment against persisted nodes."""
    if not parent_id:
        return
    if node_type in {"text", "group"}:
        raise HierarchyError(f"{node_type} nodes cannot be nested", [node_id, parent_id])

    parent = await db.get(Node, parent_id)
    if parent is None or parent.design_id != design_id:
        raise HierarchyError("Parent must exist on the same design", [node_id, parent_id])
    if parent.type == "text":
        raise HierarchyError("A text annotation cannot be a parent node", [node_id, parent_id])
    if parent.type == "group" and node_type == "groupRect":
        raise HierarchyError("Zones cannot be nested inside fixed groups", [node_id, parent_id])

    path = [node_id]
    seen = {node_id}
    current: Node | None = parent
    while current is not None:
        path.append(current.id)
        if current.id in seen:
            raise HierarchyError("Node hierarchy would contain a cycle", path[:-1], cycle=True)
        seen.add(current.id)
        current = await db.get(Node, current.parent_id) if current.parent_id else None


async def validate_role_change(
    db: AsyncSession,
    *,
    node_id: str,
    node_type: str,
    parent_id: str | None,
) -> None:
    """A text node cannot gain children; groups additionally cannot be nested."""
    if node_type == "text":
        child = (await db.execute(select(Node.id).where(Node.parent_id == node_id).limit(1))).scalar()
        if child is not None:
            raise HierarchyError("A text annotation cannot be a parent node", [node_id, child])
    if node_type in {"text", "group"} and parent_id:
        raise HierarchyError(f"{node_type} nodes cannot be nested", [node_id, parent_id])
